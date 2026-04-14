import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import OpenAI from "openai";
import { storage, dbReady } from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";
import { setupAuth } from "./auth";

const MemoryStore = createMemoryStore(session);

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.role === "admin") return next();
  res.status(403).json({ message: "Admin access required" });
}

export async function registerRoutes(server: Server, app: Express) {
  // Session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "toolsyourway-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        // Only enable secure cookies when explicitly behind HTTPS (e.g. Render/Railway)
        secure: process.env.SECURE_COOKIES === "true",
      },
    })
  );

  // Wait for database tables to be created before anything else
  await dbReady;

  setupAuth(app);
  await storage.seedAdmin();

  // ============================================================
  // AUTH ROUTES
  // ============================================================
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { email, name, password } = parsed.data;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email, name,
        password: hashedPassword,
        authProvider: "email",
        role: "user",
        plan: "none",
      });

      const { password: _, authProviderId, ...safeUser } = user;
      req.login(safeUser as Express.User, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        return res.status(201).json(safeUser);
      });
    } catch (err) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
    }
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });

  app.get("/api/auth/providers", (_req: Request, res: Response) => {
    res.json({
      google: !!process.env.GOOGLE_CLIENT_ID,
      microsoft: !!process.env.MICROSOFT_CLIENT_ID,
    });
  });

  // ============================================================
  // USER ROUTES
  // ============================================================
  app.get("/api/user/dashboard", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const subscription = await storage.getActiveSubscription(userId);
    let bots = await storage.getBotConfigs(userId);

    if (bots.length === 0 && req.user!.plan && req.user!.plan !== "none") {
      const defaultBots = ["marketing", "data", "email", "sales", "hr", "finance", "legal", "seo", "support"];
      const maxBots = req.user!.plan === "ultra" ? 5 : req.user!.plan === "pro" ? 7 : 9;
      for (const botType of defaultBots.slice(0, maxBots)) {
        await storage.upsertBotConfig({
          userId,
          botType,
          status: "inactive",
          config: JSON.stringify({}),
          metrics: JSON.stringify({ tasks: 0, successRate: 0 }),
        });
      }
      bots = await storage.getBotConfigs(userId);
    }

    res.json({ user: req.user, subscription, bots });
  });

  app.post("/api/user/bots/:botType/toggle", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { botType } = req.params;
    const bots = await storage.getBotConfigs(userId);
    const bot = bots.find((b) => b.botType === botType);
    if (!bot) return res.status(404).json({ message: "Bot not found" });

    const newStatus = bot.status === "active" ? "inactive" : "active";
    const updated = await storage.upsertBotConfig({
      userId, botType,
      status: newStatus,
      lastRunAt: newStatus === "active" ? new Date().toISOString() : bot.lastRunAt,
      config: bot.config,
      metrics: bot.metrics,
    });
    res.json(updated);
  });

  // ============================================================
  // ADMIN ROUTES
  // ============================================================
  app.get("/api/admin/stats", requireAdmin, async (_req: Request, res: Response) => {
    const userCount = await storage.getUserCount();
    const { totalRevenue, activeCount, planBreakdown } = await storage.getRevenueStats();
    res.json({ userCount, totalRevenue, activeSubscriptions: activeCount, planBreakdown });
  });

  app.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
    const allUsers = (await storage.getAllUsers()).map(({ password, authProviderId, ...u }) => u);
    res.json(allUsers);
  });

  app.get("/api/admin/subscriptions", requireAdmin, async (_req: Request, res: Response) => {
    res.json(await storage.getAllSubscriptions());
  });

  // ============================================================
  // VIRTUAL AI MANAGER — Chat endpoint
  // ============================================================
  app.post("/api/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, history } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      const user = req.user!;
      const bots = await storage.getBotConfigs(user.id);
      const activeBots = bots.filter(b => b.status === "active").map(b => b.botType).join(", ");
      const subscription = await storage.getActiveSubscription(user.id);

      const systemPrompt = `You are the Virtual AI Manager for ToolsYourWay — an AI-powered business automation platform.

You are speaking with ${user.name} (${user.email}).
Their plan: ${user.plan || "free"} (${subscription ? "active subscription" : "no subscription"})
Active bots: ${activeBots || "none"}
Total bots available: Marketing, Data, Email, Sales, HR, Finance, Legal, SEO, Support

Your role:
- Help them grow their business using the platform's AI bots
- Suggest which bots to activate and how to configure them
- Explain what each bot does in simple terms
- Provide business growth tips, marketing ideas, sales strategies
- Guide them through the platform features
- Answer questions about plans, pricing, integrations
- Be encouraging, practical, and results-oriented
- Speak in a friendly, professional tone — like a smart COO who genuinely cares
- If they ask in Hindi, Gujarati, or any other language, respond in that language
- Keep responses concise (2-4 paragraphs max) unless they ask for detail

Plan details:
- Ultra ($49/mo): 5 bots, basic AI Manager, 3-5 visuals/mo
- Pro ($99/mo): 7 bots, advanced scheduling, 5-10 visuals + 1-3 videos/mo
- Premium ($199/mo): All 9 bots, custom workflows, 5-10 visuals + 1-5 videos/mo, dedicated support

Do NOT say "I'm an AI" or "I'm a language model". You ARE the Virtual AI Manager. Act like it.`;

      // Build messages array
      const messages: Array<{role: string; content: string}> = [];
      if (history && Array.isArray(history)) {
        for (const h of history.slice(-10)) { // last 10 messages for context
          messages.push({ role: h.role, content: h.content });
        }
      }
      messages.push({ role: "user", content: message });

      // Try Claude API first, fall back to smart preset responses
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey) {
        const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 600,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          }),
        });
        const data = await apiRes.json();
        if (data.content?.[0]?.text) {
          return res.json({ reply: data.content[0].text });
        }
      }

      // Smart fallback — no API key needed
      const lower = message.toLowerCase();
      let reply = "";

      if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
        reply = `Hey ${user.name}! 👋 I'm your Virtual AI Manager. I'm here to help you automate and grow your business.\n\nYou currently have ${activeBots ? activeBots.split(", ").length + " bots active (" + activeBots + ")" : "no bots active yet"}. ${!activeBots ? "Want me to recommend which bots to start with based on your business?" : "What would you like to work on today?"}`;
      } else if (lower.includes("marketing") || lower.includes("social") || lower.includes("content") || lower.includes("post")) {
        reply = "Great question! Your Marketing Bot can auto-publish content across Instagram, LinkedIn, X, and Facebook. Here's what I'd suggest:\n\n1. **Start with LinkedIn** — it has the best organic reach right now for B2B\n2. **Post 3x per week** minimum — consistency beats virality\n3. **Use the AI visual generator** — it creates branded graphics from your prompts\n\nWant me to help you set up your first content calendar?";
      } else if (lower.includes("sales") || lower.includes("lead") || lower.includes("revenue") || lower.includes("customer")) {
        reply = "Your Sales Bot is built to run your entire funnel on autopilot:\n\n1. **Lead capture** from your website, WhatsApp, and social DMs\n2. **Auto-qualification** — scores each lead based on fit and intent\n3. **Follow-up sequences** via WhatsApp and email\n4. **Proposal generation** — creates and sends quotes automatically\n\nMost of our users see a 3-5× increase in qualified leads within the first month. Which part of your sales process needs the most help?";
      } else if (lower.includes("finance") || lower.includes("invoice") || lower.includes("billing") || lower.includes("gst") || lower.includes("tax")) {
        reply = "The Finance Bot handles all your money ops:\n\n• **Auto-invoicing** — generates and sends invoices when a deal closes\n• **Payment tracking** — syncs with Razorpay and Stripe in real-time\n• **GST/Tax prep** — calculates and prepares return data quarterly\n• **Expense tracking** — categorizes and reports all business expenses\n\nIt connects to Tally, Zoho Books, and Google Sheets. Want me to activate it for you?";
      } else if (lower.includes("plan") || lower.includes("upgrade") || lower.includes("pricing") || lower.includes("cost")) {
        reply = `You're currently on the **${(user.plan || "free").charAt(0).toUpperCase() + (user.plan || "free").slice(1)}** plan.\n\nHere's what each tier offers:\n• **Ultra** ($49/mo) — 5 bots, AI Manager, 3-5 visuals\n• **Pro** ($99/mo) — 7 bots, advanced scheduling, videos\n• **Premium** ($199/mo) — All 9 bots, custom workflows, dedicated support\n\nAll plans include 20+ language support and 24/7 operation. ${user.plan === "premium" ? "You already have full access!" : "Would you like to upgrade?"}`;
      } else if (lower.includes("help") || lower.includes("what can") || lower.includes("guide")) {
        reply = `Here's what I can help you with:\n\n🤖 **Bot management** — activate, configure, and optimize your AI bots\n📈 **Growth strategy** — marketing ideas, sales tips, content planning\n💰 **Finance & billing** — invoicing, GST, expense tracking\n🔍 **SEO & content** — keyword research, blog ideas, rank tracking\n👥 **HR & hiring** — job postings, candidate screening\n⚖️ **Legal** — contracts, NDAs, compliance\n\nJust ask me anything — I'm your AI COO!`;
      } else if (lower.includes("hindi") || lower.includes("हिन्दी")) {
        reply = `बिलकुल, ${user.name}! 🙏 मैं आपका Virtual AI Manager हूँ। मैं हिन्दी, गुजराती, तमिल और 20+ भाषाओं में बात कर सकता हूँ।\n\nआप अपने बिजनेस के बारे में मुझसे कुछ भी पूछ सकते हैं — मार्केटिंग, सेल्स, HR, फाइनेंस कुछ भी!`;
      } else {
        reply = `Good question! Let me think about that...\n\nAs your AI Manager, I can help you with:\n• Activating and configuring any of your 9 AI bots\n• Growing your revenue with marketing and sales strategies\n• Managing finances, hiring, legal docs, and customer support\n• Content creation and SEO optimization\n\nCould you tell me more about what you're trying to achieve? The more specific you are, the better I can help!`;
      }

      res.json({ reply });
    } catch (err) {
      console.error("Chat error:", err);
      res.status(500).json({ reply: "I'm having a moment — please try again. If this keeps happening, check your connection." });
    }
  });

  // ============================================================
  // EMAIL BOT ROUTES
  // ============================================================
  app.post("/api/bots/email/send", requireAuth, async (req: Request, res: Response) => {
    try {
      const { to, subject, body } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ success: false, message: "to, subject, and body are required" });
      }

      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        return res.json({ success: false, message: "Email service not configured. Add RESEND_API_KEY to .env" });
      }

      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from: "ToolsYourWay <onboarding@resend.dev>",
        to: [to],
        subject,
        html: body,
      });

      if (result.error) {
        return res.status(500).json({ success: false, message: result.error.message });
      }

      res.json({ success: true, messageId: result.data?.id });
    } catch (err: any) {
      console.error("Email send error:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to send email" });
    }
  });

  app.post("/api/bots/email/campaign", requireAuth, async (req: Request, res: Response) => {
    try {
      const { recipients, subject, body } = req.body;
      if (!Array.isArray(recipients) || !subject || !body) {
        return res.status(400).json({ success: false, message: "recipients (array), subject, and body are required" });
      }

      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        return res.json({ success: false, message: "Email service not configured. Add RESEND_API_KEY to .env" });
      }

      const resend = new Resend(apiKey);
      let sent = 0;
      let failed = 0;

      for (const recipient of recipients) {
        try {
          const result = await resend.emails.send({
            from: "ToolsYourWay <onboarding@resend.dev>",
            to: [recipient],
            subject,
            html: body,
          });
          if (result.error) {
            failed++;
          } else {
            sent++;
          }
        } catch {
          failed++;
        }
        // Small delay between sends
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      res.json({ success: true, sent, failed });
    } catch (err: any) {
      console.error("Email campaign error:", err);
      res.status(500).json({ success: false, message: err.message || "Campaign failed" });
    }
  });

  // ============================================================
  // MARKETING BOT ROUTES
  // ============================================================
  app.post("/api/bots/marketing/generate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { topic, platform, tone } = req.body;
      if (!topic || !platform) {
        return res.status(400).json({ message: "topic and platform are required" });
      }

      const effectiveTone = tone || "professional";
      const apiKey = process.env.ANTHROPIC_API_KEY;

      if (apiKey) {
        const systemPrompt = `You are a social media expert. Generate a ${platform} post about ${topic}. Tone: ${effectiveTone}. Include relevant hashtags. Keep it within platform character limits.`;
        const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 600,
            system: systemPrompt,
            messages: [{ role: "user", content: `Write a ${platform} post about: ${topic}. Return a JSON object with fields: content (the post text) and hashtags (array of strings without the # symbol). Only return valid JSON, no extra text.` }],
          }),
        });
        const data = await apiRes.json();
        const text = data.content?.[0]?.text;
        if (text) {
          try {
            // Try to parse as JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              return res.json({
                content: parsed.content || text,
                hashtags: parsed.hashtags || [],
                platform,
              });
            }
          } catch {
            // Fall through to return raw text
          }
          return res.json({ content: text, hashtags: [], platform });
        }
      }

      // Fallback template when no API key
      const templatePost = `🚀 Exciting news about ${topic}!\n\nWe're thrilled to share insights about ${topic} with our community. Whether you're a beginner or expert, there's something here for everyone.\n\nWhat are your thoughts on ${topic}? Share in the comments below! 👇\n\n#${topic.replace(/\s+/g, "")} #Business #Growth #Innovation`;
      res.json({
        content: templatePost,
        hashtags: [topic.replace(/\s+/g, ""), "Business", "Growth", "Innovation"],
        platform,
      });
    } catch (err: any) {
      console.error("Marketing generate error:", err);
      res.status(500).json({ message: err.message || "Content generation failed" });
    }
  });

  app.post("/api/bots/marketing/schedule", requireAuth, async (req: Request, res: Response) => {
    try {
      const { content, platform, scheduledFor } = req.body;
      if (!content || !platform) {
        return res.status(400).json({ message: "content and platform are required" });
      }

      const post = await storage.createScheduledPost({
        userId: req.user!.id,
        content,
        platform,
        status: "scheduled",
        scheduledFor: scheduledFor || null,
      });

      res.json(post);
    } catch (err: any) {
      console.error("Schedule post error:", err);
      res.status(500).json({ message: err.message || "Failed to schedule post" });
    }
  });

  app.get("/api/bots/marketing/posts", requireAuth, async (req: Request, res: Response) => {
    try {
      const posts = await storage.getScheduledPosts(req.user!.id);
      res.json(posts);
    } catch (err: any) {
      console.error("Get posts error:", err);
      res.status(500).json({ message: err.message || "Failed to fetch posts" });
    }
  });

  // ============================================================
  // FINANCE BOT ROUTES
  // ============================================================
  app.post("/api/bots/finance/invoice", requireAuth, async (req: Request, res: Response) => {
    try {
      const { clientName, clientEmail, items, notes } = req.body;
      if (!clientName || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "clientName and items are required" });
      }

      const userId = req.user!.id;
      const invoiceNumber = `TW-INV-${userId}-${Date.now()}`;

      // Calculate totals (amounts in paise — 1 INR = 100 paise)
      let subtotalRupees = 0;
      const lineItems = items.map((item: { description: string; quantity: number; rate: number }) => {
        const amount = item.quantity * item.rate;
        subtotalRupees += amount;
        return { ...item, amount };
      });

      const gstRupees = Math.round(subtotalRupees * 0.18);
      const totalRupees = subtotalRupees + gstRupees;

      // Store in paise
      const subtotalPaise = Math.round(subtotalRupees * 100);
      const gstPaise = Math.round(gstRupees * 100);
      const totalPaise = Math.round(totalRupees * 100);

      // Generate HTML invoice
      const itemRows = lineItems.map((item: { description: string; quantity: number; rate: number; amount: number }) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${item.description}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">₹${item.rate.toLocaleString("en-IN")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">₹${item.amount.toLocaleString("en-IN")}</td>
        </tr>`).join("");

      const invoiceHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Invoice ${invoiceNumber}</title></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#333">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
    <div>
      <h1 style="margin:0;font-size:28px;color:#2563eb">ToolsYourWay</h1>
      <p style="margin:4px 0;color:#666">AI-Powered Business Automation</p>
    </div>
    <div style="text-align:right">
      <h2 style="margin:0;font-size:22px">INVOICE</h2>
      <p style="margin:4px 0;color:#666">${invoiceNumber}</p>
      <p style="margin:4px 0;color:#666">${new Date().toLocaleDateString("en-IN")}</p>
    </div>
  </div>
  <div style="margin-bottom:32px">
    <h3 style="margin:0 0 8px;color:#555;font-size:14px;text-transform:uppercase">Bill To</h3>
    <p style="margin:2px 0;font-weight:bold">${clientName}</p>
    ${clientEmail ? `<p style="margin:2px 0;color:#666">${clientEmail}</p>` : ""}
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <thead>
      <tr style="background:#f8fafc">
        <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0">Description</th>
        <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #e2e8f0">Qty</th>
        <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e2e8f0">Rate</th>
        <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e2e8f0">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div style="display:flex;justify-content:flex-end">
    <table style="min-width:280px">
      <tr><td style="padding:6px 12px;color:#666">Subtotal</td><td style="padding:6px 12px;text-align:right">₹${subtotalRupees.toLocaleString("en-IN")}</td></tr>
      <tr><td style="padding:6px 12px;color:#666">GST (18%)</td><td style="padding:6px 12px;text-align:right">₹${gstRupees.toLocaleString("en-IN")}</td></tr>
      <tr style="border-top:2px solid #2563eb">
        <td style="padding:10px 12px;font-weight:bold;font-size:16px">Total</td>
        <td style="padding:10px 12px;text-align:right;font-weight:bold;font-size:16px;color:#2563eb">₹${totalRupees.toLocaleString("en-IN")}</td>
      </tr>
    </table>
  </div>
  ${notes ? `<div style="margin-top:32px;padding:16px;background:#f8fafc;border-radius:6px"><h4 style="margin:0 0 8px;color:#555">Notes</h4><p style="margin:0;color:#666">${notes}</p></div>` : ""}
  <p style="margin-top:40px;color:#999;font-size:12px;text-align:center">Generated by ToolsYourWay — AI-Powered Business Automation</p>
</body>
</html>`;

      // Persist invoice to DB
      const invoice = await storage.createInvoice({
        userId,
        invoiceNumber,
        clientName,
        clientEmail: clientEmail || null,
        items: JSON.stringify(lineItems),
        subtotal: subtotalPaise,
        gst: gstPaise,
        total: totalPaise,
        status: "draft",
      });

      res.json({
        invoiceHtml,
        invoiceNumber,
        total: totalRupees,
        invoice,
      });
    } catch (err: any) {
      console.error("Invoice generation error:", err);
      res.status(500).json({ message: err.message || "Invoice generation failed" });
    }
  });

  app.get("/api/bots/finance/invoices", requireAuth, async (req: Request, res: Response) => {
    try {
      const userInvoices = await storage.getInvoices(req.user!.id);
      res.json(userInvoices);
    } catch (err: any) {
      console.error("Get invoices error:", err);
      res.status(500).json({ message: err.message || "Failed to fetch invoices" });
    }
  });

  // ============================================================
  // AI IMAGE & VIDEO GENERATION
  // ============================================================
  app.post("/api/media/generate-image", requireAuth, async (req: Request, res: Response) => {
    try {
      const { prompt, style, size } = req.body;
      if (!prompt) return res.status(400).json({ message: "Prompt is required" });

      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return res.json({
          message: "Add OPENAI_API_KEY to .env to enable real image generation",
          demo: true,
          imageUrl: `https://placehold.co/1024x1024/1E1650/E9A820/png?text=${encodeURIComponent(prompt.slice(0, 40))}`,
          prompt,
        });
      }

      const openai = new OpenAI({ apiKey: openaiKey });
      const fullPrompt = style ? `${prompt}. Style: ${style}` : prompt;

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size: (size as "1024x1024" | "1024x1792" | "1792x1024") || "1024x1024",
        quality: "standard",
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) return res.status(500).json({ message: "No image returned" });

      await storage.createMedia({ userId: req.user!.id, type: "image", prompt: fullPrompt, url: imageUrl, status: "completed" });
      res.json({ imageUrl, prompt: fullPrompt });
    } catch (err: any) {
      console.error("Image gen error:", err);
      res.status(500).json({ message: err.message || "Image generation failed" });
    }
  });

  app.post("/api/media/generate-video", requireAuth, async (req: Request, res: Response) => {
    try {
      const { prompt, style } = req.body;
      if (!prompt) return res.status(400).json({ message: "Prompt is required" });

      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return res.json({
          message: "Add OPENAI_API_KEY to .env to enable video storyboard generation",
          demo: true,
          frames: [],
        });
      }

      const openai = new OpenAI({ apiKey: openaiKey });
      // Generate 3 key frames as a video storyboard
      const frames: string[] = [];
      const scenes = [
        `Opening shot: ${prompt}. Style: ${style || "cinematic"}. Wide establishing shot, professional quality.`,
        `Detail shot: ${prompt}. Style: ${style || "cinematic"}. Close-up focused detail, dramatic lighting.`,
        `Closing shot: ${prompt}. Style: ${style || "cinematic"}. Wide pull-back, with text overlay space.`,
      ];

      for (const scene of scenes) {
        const response = await openai.images.generate({
          model: "dall-e-3", prompt: scene, n: 1,
          size: "1792x1024", quality: "standard",
        });
        if (response.data[0]?.url) frames.push(response.data[0].url);
      }

      await storage.createMedia({ userId: req.user!.id, type: "video-storyboard", prompt, url: JSON.stringify(frames), status: "completed" });
      res.json({ type: "storyboard", frames, prompt, message: "3 key frames generated. Use as storyboard or combine into a slideshow video." });
    } catch (err: any) {
      console.error("Video gen error:", err);
      res.status(500).json({ message: err.message || "Video generation failed" });
    }
  });

  app.get("/api/media/gallery", requireAuth, async (req: Request, res: Response) => {
    try {
      res.json(await storage.getMedia(req.user!.id));
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });
}
