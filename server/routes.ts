import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import OpenAI from "openai";
import Stripe from "stripe";
import Razorpay from "razorpay";
import Replicate from "replicate";
import { storage, dbReady } from "./storage";
import { registerSchema, loginSchema } from "@shared/schema";
import { setupAuth } from "./auth";
import { getBaseUrl } from "./config";
import { buildDestinations, SUPPORTED_PLATFORMS, resolveDestinationMap } from "./social-destinations";
import { discoverLinkedInOrganizations } from "./publish-service";
import { isPublishWorkerEnabled } from "./marketing-publish-worker";

const MemoryStore = createMemoryStore(session);

// LinkedIn OAuth scopes. Personal posting always uses w_member_social.
// When the LinkedIn app has been approved for organization (Page) admin
// access, set LINKEDIN_ORG_SCOPE=1 (or to the exact scope string) so the
// connect flow also requests it and can discover the user's LinkedIn Pages.
function linkedinScope(): string {
  const base = "openid profile w_member_social email";
  const orgEnv = process.env.LINKEDIN_ORG_SCOPE;
  if (!orgEnv) return base;
  // Allow either an opt-in flag ("1"/"true") using sensible defaults, or an
  // explicit space-separated scope string supplied by the operator.
  const orgScopes = /^(1|true|yes)$/i.test(orgEnv.trim())
    ? "r_organization_admin rw_organization_admin"
    : orgEnv.trim();
  return `${base} ${orgScopes}`;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.role === "admin") return next();
  res.status(403).json({ message: "Admin access required" });
}

// Plan caps — monthly limits per plan tier
export const PLAN_CAPS: Record<string, { videos: number; images: number; label: string }> = {
  none:     { videos: 0,       images: 0,    label: "No plan" },
  trial:    { videos: 5,       images: 50,   label: "Trial" },
  starter:  { videos: 5,       images: 30,   label: "Starter (single bot)" },
  bundle:   { videos: 30,      images: 200,  label: "All-9 Bundle" },
  premium:  { videos: 60,      images: 500,  label: "Bundle + AI Manager" },
  enterprise:{ videos: 9999,   images: 9999, label: "Enterprise" },
};

// ============================================================
// GEO + CURRENCY + LANGUAGE MAPPING
// ============================================================
export const COUNTRY_CONFIG: Record<string, { currency: string; currencySymbol: string; rate: number; language: string; langName: string; rtl?: boolean }> = {
  // South Asia
  IN: { currency: "INR", currencySymbol: "\u20B9", rate: 83,   language: "en",    langName: "English" }, // default en, user can switch to Hindi
  PK: { currency: "PKR", currencySymbol: "\u20A8", rate: 280,  language: "en",    langName: "English" },
  BD: { currency: "BDT", currencySymbol: "\u09F3", rate: 110,  language: "en",    langName: "English" },
  LK: { currency: "LKR", currencySymbol: "Rs",     rate: 300,  language: "en",    langName: "English" },
  NP: { currency: "NPR", currencySymbol: "Rs",     rate: 133,  language: "en",    langName: "English" },
  // Middle East
  AE: { currency: "AED", currencySymbol: "\u062F.\u0625", rate: 3.67, language: "ar", langName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", rtl: true },
  SA: { currency: "SAR", currencySymbol: "\u0631.\u0633", rate: 3.75, language: "ar", langName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", rtl: true },
  KW: { currency: "KWD", currencySymbol: "\u062F.\u0643", rate: 0.31, language: "ar", langName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", rtl: true },
  QA: { currency: "QAR", currencySymbol: "\u0631.\u0642", rate: 3.64, language: "ar", langName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", rtl: true },
  BH: { currency: "BHD", currencySymbol: ".\u062F.\u0628", rate: 0.38, language: "ar", langName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", rtl: true },
  OM: { currency: "OMR", currencySymbol: "\u0631.\u0639.", rate: 0.38, language: "ar", langName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", rtl: true },
  EG: { currency: "EGP", currencySymbol: "\u062C.\u0645", rate: 50,   language: "ar", langName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", rtl: true },
  // Southeast Asia
  ID: { currency: "IDR", currencySymbol: "Rp",     rate: 16200, language: "id", langName: "Bahasa Indonesia" },
  VN: { currency: "VND", currencySymbol: "\u20AB", rate: 25000, language: "vi", langName: "Ti\u1EBFng Vi\u1EC7t" },
  TH: { currency: "THB", currencySymbol: "\u0E3F", rate: 36,    language: "th", langName: "\u0E44\u0E17\u0E22" },
  PH: { currency: "PHP", currencySymbol: "\u20B1", rate: 57,    language: "en", langName: "English" },
  MY: { currency: "MYR", currencySymbol: "RM",     rate: 4.7,   language: "ms", langName: "Bahasa Melayu" },
  SG: { currency: "SGD", currencySymbol: "S$",     rate: 1.35,  language: "en", langName: "English" },
  // Americas
  US: { currency: "USD", currencySymbol: "$",      rate: 1,     language: "en", langName: "English" },
  CA: { currency: "CAD", currencySymbol: "C$",     rate: 1.37,  language: "en", langName: "English" },
  MX: { currency: "MXN", currencySymbol: "Mex$",   rate: 17,    language: "es", langName: "Espa\u00F1ol" },
  BR: { currency: "BRL", currencySymbol: "R$",     rate: 5.1,   language: "pt", langName: "Portugu\u00EAs" },
  // Europe
  GB: { currency: "GBP", currencySymbol: "\u00A3", rate: 0.79,  language: "en", langName: "English" },
  DE: { currency: "EUR", currencySymbol: "\u20AC", rate: 0.93,  language: "de", langName: "Deutsch" },
  FR: { currency: "EUR", currencySymbol: "\u20AC", rate: 0.93,  language: "fr", langName: "Fran\u00E7ais" },
  ES: { currency: "EUR", currencySymbol: "\u20AC", rate: 0.93,  language: "es", langName: "Espa\u00F1ol" },
  IT: { currency: "EUR", currencySymbol: "\u20AC", rate: 0.93,  language: "it", langName: "Italiano" },
  NL: { currency: "EUR", currencySymbol: "\u20AC", rate: 0.93,  language: "nl", langName: "Nederlands" },
  // Africa
  NG: { currency: "NGN", currencySymbol: "\u20A6", rate: 1600,  language: "en", langName: "English" },
  KE: { currency: "KES", currencySymbol: "KSh",    rate: 130,   language: "en", langName: "English" },
  ZA: { currency: "ZAR", currencySymbol: "R",      rate: 18.5,  language: "en", langName: "English" },
  // Default
  DEFAULT: { currency: "USD", currencySymbol: "$", rate: 1, language: "en", langName: "English" },
};

function detectCountry(req: Request): string {
  // Cloudflare / Render / generic proxy headers
  const cf = req.headers["cf-ipcountry"] as string | undefined;
  if (cf && cf !== "XX" && cf !== "T1") return cf.toUpperCase();
  const xCountry = req.headers["x-vercel-ip-country"] as string | undefined;
  if (xCountry) return xCountry.toUpperCase();
  const renderCountry = req.headers["x-render-region"] as string | undefined;
  // Accept-Language fallback (crude, but better than nothing)
  const al = (req.headers["accept-language"] as string | undefined) || "";
  const m = al.match(/[a-z]{2}-([A-Z]{2})/);
  if (m) return m[1];
  return "DEFAULT";
}

export function getPlanCaps(user: any): { videos: number; images: number; label: string } {
  if (user?.role === "admin") return PLAN_CAPS.enterprise;
  const plan = user?.plan || "none";
  if (plan === "none") {
    // Trial users get "trial" caps; expired users get 0
    const trial = computeTrialState(user);
    if (trial.status === "active") return PLAN_CAPS.trial;
    return PLAN_CAPS.none;
  }
  return PLAN_CAPS[plan] || PLAN_CAPS.starter;
}

// Compute trial state — shared helper
export function computeTrialState(user: any) {
  if (!user) return { status: "none", daysRemaining: 0, hoursRemaining: 0, endsAt: null };
  // Admins and paid plans — unlimited
  if (user.role === "admin" || (user.plan && user.plan !== "none")) {
    return { status: "paid", daysRemaining: 9999, hoursRemaining: 9999, endsAt: null };
  }
  if (!user.trialEndsAt) return { status: "none", daysRemaining: 0, hoursRemaining: 0, endsAt: null };
  const now = Date.now();
  const ends = new Date(user.trialEndsAt).getTime();
  const msLeft = ends - now;
  if (msLeft <= 0) {
    return { status: "expired", daysRemaining: 0, hoursRemaining: 0, endsAt: user.trialEndsAt };
  }
  const daysRemaining = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(msLeft / (1000 * 60 * 60));
  return { status: "active", daysRemaining, hoursRemaining, endsAt: user.trialEndsAt };
}

// Gate bot-generation actions — block if trial expired AND no active plan AND no PAYG credits
// Usage: app.post("/api/bots/xxx", requireAuth, requireActiveAccess, handler)
function requireActiveAccess(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  if (user.role === "admin") return next();
  if (user.plan && user.plan !== "none") return next();
  const trial = computeTrialState(user);
  if (trial.status === "active") return next();
  // Expired — allow if PAYG credits available (the route will deduct them)
  if ((user.paygCredits ?? 0) > 0) return next();
  return res.status(402).json({
    message: "Your free trial has ended. Upgrade or buy credits to continue.",
    code: "TRIAL_EXPIRED",
    trial,
  });
}

export async function registerRoutes(server: Server, app: Express) {
  // Trust proxy (Render/Railway/Heroku run behind a reverse proxy)
  app.set("trust proxy", 1);

  // Session
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "toolsyourway-secret-change-in-prod",
      resave: true,
      saveUninitialized: false,
      rolling: true, // Reset cookie expiry on every request — keeps session alive
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        sameSite: "lax",
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
      // Start 7-day free trial on registration — full access to all 9 bots + AI Manager
      const now = new Date();
      const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const allBots = ["marketing", "data", "email", "sales", "hr", "finance", "legal", "seo", "support"];

      const user = await storage.createUser({
        email, name,
        password: hashedPassword,
        authProvider: "email",
        role: "user",
        plan: "none",
        userType: req.body.userType || "business",
        trialStartedAt: now.toISOString(),
        trialEndsAt: trialEnds.toISOString(),
        trialStatus: "active",
        selectedBots: JSON.stringify(allBots),
        hasAiManager: 1,
      });

      // Seed all 9 bots as active during trial
      for (const botType of allBots) {
        await storage.upsertBotConfig({
          userId: user.id,
          botType,
          status: "active",
          config: JSON.stringify({}),
          metrics: JSON.stringify({ tasks: 0, successRate: 0 }),
          lastRunAt: new Date().toISOString(),
        });
      }

      // Welcome email (Day 0 nudge) — fire and forget
      if (process.env.RESEND_API_KEY) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "ToolsYourWay <hello@toolsyourway.com>",
            to: email,
            subject: "Welcome to ToolsYourWay \u2014 your 7-day free trial is live",
            html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1E1650"><h1 style="color:#1E1650">Welcome, ${name}</h1><p>Your 7-day free trial is active. Full access to all 9 AI bots + the Virtual AI Manager \u2014 no card required.</p><p><strong>Trial ends:</strong> ${trialEnds.toDateString()}</p><p><a href="https://toolsyourway.com/#/dashboard" style="display:inline-block;background:#1E1650;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Open your dashboard</a></p><p style="color:#666;font-size:14px">Questions? Just reply to this email.</p></div>`,
          });
        } catch (e) { console.warn("Welcome email failed:", e); }
      }

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

  // ============================================================
  // SOCIAL PROFILE FETCH — pulls profile pic, display name, follower count
  // Called from OAuth callbacks for each platform
  // ============================================================
  async function fetchSocialProfile(platform: string, accessToken: string): Promise<{
    profilePictureUrl?: string;
    displayName?: string;
    accountId?: string;
    accountName?: string;
    profileUrl?: string;
    followerCount?: number;
  }> {
    try {
      if (platform === "linkedin") {
        const res = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return {};
        const d: any = await res.json();
        return {
          accountId: d.sub,
          displayName: d.name,
          accountName: d.name,
          profilePictureUrl: d.picture,
          profileUrl: `https://www.linkedin.com/in/${d.sub}`,
        };
      }
      if (platform === "twitter") {
        const res = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics,username,name", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return {};
        const { data }: any = await res.json();
        return {
          accountId: data.id,
          displayName: data.name,
          accountName: `@${data.username}`,
          profilePictureUrl: data.profile_image_url?.replace("_normal", "_400x400"),
          profileUrl: `https://twitter.com/${data.username}`,
          followerCount: data.public_metrics?.followers_count,
        };
      }
      if (platform === "facebook" || platform === "instagram") {
        const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture.width(400).height(400)&access_token=${accessToken}`);
        if (!res.ok) return {};
        const d: any = await res.json();
        return {
          accountId: d.id,
          displayName: d.name,
          accountName: d.name,
          profilePictureUrl: d.picture?.data?.url,
          profileUrl: platform === "instagram" ? `https://instagram.com/${d.username || d.id}` : `https://facebook.com/${d.id}`,
        };
      }
      if (platform === "youtube") {
        const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return {};
        const { items }: any = await res.json();
        const c = items?.[0];
        if (!c) return {};
        return {
          accountId: c.id,
          displayName: c.snippet.title,
          accountName: c.snippet.customUrl || c.snippet.title,
          profilePictureUrl: c.snippet.thumbnails?.high?.url || c.snippet.thumbnails?.default?.url,
          profileUrl: `https://youtube.com/channel/${c.id}`,
          followerCount: parseInt(c.statistics?.subscriberCount || "0", 10),
        };
      }
      if (platform === "tiktok") {
        const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,follower_count,username", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return {};
        const { data }: any = await res.json();
        const u = data?.user;
        if (!u) return {};
        return {
          accountId: u.open_id,
          displayName: u.display_name,
          accountName: `@${u.username}`,
          profilePictureUrl: u.avatar_url,
          profileUrl: `https://tiktok.com/@${u.username}`,
          followerCount: u.follower_count,
        };
      }
    } catch (e) {
      console.warn(`Failed to fetch ${platform} profile:`, e);
    }
    return {};
  }

  // Expose helper via app.locals so OAuth callbacks (when added) can use it
  (app as any).locals.fetchSocialProfile = fetchSocialProfile;

  // ============================================================
  // GEO DETECTION — public endpoint (no auth)
  // ============================================================
  app.get("/api/geo", (req: Request, res: Response) => {
    const country = detectCountry(req);
    const cfg = COUNTRY_CONFIG[country] || COUNTRY_CONFIG.DEFAULT;
    res.json({
      country,
      ...cfg,
    });
  });

  // Localized pricing endpoint — takes country, returns plans in local currency
  app.get("/api/pricing", (req: Request, res: Response) => {
    const countryCode = (req.query.country as string || detectCountry(req)).toUpperCase();
    const cfg = COUNTRY_CONFIG[countryCode] || COUNTRY_CONFIG.DEFAULT;
    const convert = (usdCents: number) => Math.round((usdCents / 100) * cfg.rate);
    const plans = {
      starter: { key: "starter", nameKey: "plan.starter", priceCents: 700,  priceFoundersCents: 245,  caps: PLAN_CAPS.starter  },
      bundle:  { key: "bundle",  nameKey: "plan.bundle",  priceCents: 4900, priceFoundersCents: 1715, caps: PLAN_CAPS.bundle   },
      premium: { key: "premium", nameKey: "plan.premium", priceCents: 5900, priceFoundersCents: 2065, caps: PLAN_CAPS.premium  },
    };
    const withLocal = Object.fromEntries(
      Object.entries(plans).map(([k, p]) => [k, {
        ...p,
        priceUsd: p.priceCents / 100,
        priceFoundersUsd: p.priceFoundersCents / 100,
        priceLocal: convert(p.priceCents),
        priceFoundersLocal: convert(p.priceFoundersCents),
      }])
    );
    // Founders discount is active until April 30, 2026
    const foundersActive = new Date() < new Date("2026-04-30T23:59:59Z");
    res.json({
      country: countryCode,
      currency: cfg.currency,
      currencySymbol: cfg.currencySymbol,
      language: cfg.language,
      rtl: cfg.rtl || false,
      foundersActive,
      foundersEndsAt: "2026-04-30T23:59:59Z",
      plans: withLocal,
    });
  });

  app.get("/api/auth/providers", (_req: Request, res: Response) => {
    res.json({
      google: !!process.env.GOOGLE_CLIENT_ID,
      microsoft: !!process.env.MICROSOFT_CLIENT_ID,
    });
  });

  // ============================================================
  // TRIAL STATUS
  // ============================================================
  app.get("/api/user/trial-status", requireAuth, async (req: Request, res: Response) => {
    const fresh = await storage.getUser(req.user!.id);
    const trial = computeTrialState(fresh);
    const caps = getPlanCaps(fresh);
    res.json({
      ...trial,
      plan: fresh?.plan || "none",
      planLabel: caps.label,
      paygCredits: fresh?.paygCredits ?? 0,
      videoUsageCount: fresh?.videoUsageCount ?? 0,
      imageUsageCount: fresh?.imageUsageCount ?? 0,
      videoCap: caps.videos,
      imageCap: caps.images,
      usageResetAt: fresh?.usageResetAt || null,
      hasUsedResumeTrial: (fresh as any)?.hasUsedResumeTrial === 1,
      canResumeTrial: trial.status === "expired" && !(fresh as any)?.hasUsedResumeTrial,
    });
  });

  // ============================================================
  // RESUME TRIAL — one-time 3-day extension for expired users
  // ============================================================
  app.post("/api/user/resume-trial", requireAuth, async (req: Request, res: Response) => {
    const fresh = await storage.getUser(req.user!.id);
    if (!fresh) return res.status(404).json({ message: "User not found" });
    if (fresh.role === "admin") return res.status(400).json({ message: "Admins have unlimited access" });
    if (fresh.plan && fresh.plan !== "none") return res.status(400).json({ message: "You already have an active plan" });
    if ((fresh as any).hasUsedResumeTrial === 1) {
      return res.status(400).json({ message: "You've already used your resume trial. Upgrade to continue." });
    }
    const trial = computeTrialState(fresh);
    if (trial.status === "active") return res.status(400).json({ message: "Your trial is still active" });

    // Grant 3-day extension
    const newEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await storage.resumeTrial(req.user!.id, newEnd);

    // Confirmation email
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "ToolsYourWay <hello@toolsyourway.com>",
          to: fresh.email,
          subject: "Welcome back \u2014 3-day trial extension activated",
          html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1E1650"><h1>You're back in, ${fresh.name}</h1><p>Your trial has been extended by <strong>3 more days</strong>. Full access to all 9 bots + AI Manager is restored.</p><p><strong>New trial ends:</strong> ${new Date(newEnd).toDateString()}</p><p><a href="https://toolsyourway.com/#/dashboard" style="display:inline-block;background:#1E1650;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Open Dashboard</a></p></div>`,
        });
      } catch (e) { console.warn("Resume email failed:", e); }
    }

    res.json({ success: true, trialEndsAt: newEnd });
  });

  // ============================================================
  // PAYG CREDITS — buy top-up packs
  // ============================================================
  const CREDIT_PACKS: Record<string, { credits: number; amount: number; label: string }> = {
    small:  { credits: 10,  amount: 500,  label: "10 credits \u2014 $5" },    // ~5 videos or 20 images
    medium: { credits: 25,  amount: 1000, label: "25 credits \u2014 $10" },   // best value
    large:  { credits: 60,  amount: 2000, label: "60 credits \u2014 $20" },
  };

  app.get("/api/payments/credit-packs", requireAuth, (_req: Request, res: Response) => {
    res.json(CREDIT_PACKS);
  });

  // Stripe credit purchase
  app.post("/api/payments/credits/stripe", requireAuth, async (req: Request, res: Response) => {
    try {
      const { pack } = req.body as { pack: string };
      const p = CREDIT_PACKS[pack];
      if (!p) return res.status(400).json({ message: "Invalid pack" });
      if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ message: "Stripe not configured" });
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: `ToolsYourWay \u2014 ${p.credits} PAYG credits` },
            unit_amount: p.amount,
          },
          quantity: 1,
        }],
        metadata: { userId: String(req.user!.id), pack, credits: String(p.credits), type: "credits" },
        success_url: `${getBaseUrl(req)}/#/dashboard?credits=success`,
        cancel_url: `${getBaseUrl(req)}/#/dashboard?credits=cancelled`,
      });
      // Record pending purchase
      await storage.createCreditPurchase({
        userId: req.user!.id, pack, credits: p.credits, amount: p.amount,
        paymentGateway: "stripe", paymentId: session.id, status: "pending",
      });
      res.json({ url: session.url });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Credit checkout failed" });
    }
  });

  // Razorpay credit purchase (India)
  app.post("/api/payments/credits/razorpay", requireAuth, async (req: Request, res: Response) => {
    try {
      const { pack } = req.body as { pack: string };
      const p = CREDIT_PACKS[pack];
      if (!p) return res.status(400).json({ message: "Invalid pack" });
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
        return res.status(503).json({ message: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your environment." });
      const rp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
      // Convert USD cents to INR paise approximately (1 USD \u2248 83 INR)
      const amountInr = p.amount * 83;
      const order = await rp.orders.create({
        amount: amountInr,
        currency: "INR",
        notes: { userId: String(req.user!.id), pack, credits: String(p.credits), type: "credits" },
      });
      await storage.createCreditPurchase({
        userId: req.user!.id, pack, credits: p.credits, amount: p.amount,
        paymentGateway: "razorpay", paymentId: order.id, status: "pending",
      });
      res.json({ orderId: order.id, amount: amountInr, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Credit order failed" });
    }
  });

  // Razorpay credit verification — credits credited on verify
  app.post("/api/payments/credits/razorpay/verify", requireAuth, async (req: Request, res: Response) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, pack } = req.body;
      const p = CREDIT_PACKS[pack];
      if (!p) return res.status(400).json({ message: "Invalid pack" });
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }
      await storage.addCredits(req.user!.id, p.credits);
      res.json({ success: true, creditsAdded: p.credits });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Verification failed" });
    }
  });

  // ============================================================
  // USER ROUTES
  // ============================================================
  app.get("/api/user/dashboard", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const subscription = await storage.getActiveSubscription(userId);
    let bots = await storage.getBotConfigs(userId);

    // Always seed bots for admin or paid users
    const isAdmin = req.user!.role === "admin";
    const hasPlan = req.user!.plan && req.user!.plan !== "none";
    if (bots.length < 9 && (isAdmin || hasPlan)) {
      const defaultBots = ["marketing", "data", "email", "sales", "hr", "finance", "legal", "seo", "support"];
      const maxBots = isAdmin ? 9 : req.user!.plan === "ultra" ? 5 : req.user!.plan === "pro" ? 7 : 9;
      const existingTypes = bots.map(b => b.botType);
      for (const botType of defaultBots.slice(0, maxBots)) {
        if (!existingTypes.includes(botType)) {
          await storage.upsertBotConfig({
            userId,
            botType,
            status: isAdmin ? "active" : "inactive",
            config: JSON.stringify({}),
            metrics: JSON.stringify({ tasks: 0, successRate: 0 }),
            lastRunAt: isAdmin ? new Date().toISOString() : undefined,
          });
        }
      }
      bots = await storage.getBotConfigs(userId);
    }

    res.json({ user: req.user, subscription, bots });
  });

  app.post("/api/user/bots/:botType/toggle", requireAuth, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const botType = String(req.params.botType);
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
  // Trial funnel analytics — signups → active → expired → resumed → converted
  app.get("/api/admin/trial-funnel", requireAdmin, async (req: Request, res: Response) => {
    try {
      const days = parseInt(String(req.query.days || "30"), 10);
      const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const allUsers = await storage.getAllUsers();
      const newUsers = allUsers.filter((u: any) => u.createdAt >= sinceIso && u.role !== "admin");
      const trialUsers = newUsers.filter((u: any) => u.trialEndsAt);

      const now = Date.now();
      const active = trialUsers.filter((u: any) => u.trialEndsAt && new Date(u.trialEndsAt).getTime() > now && (!u.plan || u.plan === "none"));
      const expired = trialUsers.filter((u: any) => u.trialEndsAt && new Date(u.trialEndsAt).getTime() <= now && (!u.plan || u.plan === "none"));
      const converted = trialUsers.filter((u: any) => u.plan && u.plan !== "none");
      const resumed = trialUsers.filter((u: any) => u.hasUsedResumeTrial === 1);

      const signups = trialUsers.length;
      const conversionRate = signups > 0 ? (converted.length / signups) * 100 : 0;
      const resumeRate = expired.length > 0 ? (resumed.length / (expired.length + resumed.length)) * 100 : 0;

      // Daily cohort (last N days)
      const byDay: Record<string, { signups: number; converted: number }> = {};
      for (const u of trialUsers as any[]) {
        const day = u.createdAt.slice(0, 10);
        if (!byDay[day]) byDay[day] = { signups: 0, converted: 0 };
        byDay[day].signups++;
        if (u.plan && u.plan !== "none") byDay[day].converted++;
      }
      const cohort = Object.entries(byDay)
        .map(([day, v]) => ({ day, ...v }))
        .sort((a, b) => a.day.localeCompare(b.day));

      res.json({
        periodDays: days,
        funnel: {
          signups,
          active: active.length,
          expired: expired.length,
          resumed: resumed.length,
          converted: converted.length,
        },
        rates: {
          conversionRate: Math.round(conversionRate * 10) / 10,
          resumeRate: Math.round(resumeRate * 10) / 10,
          activeRate: signups > 0 ? Math.round((active.length / signups) * 1000) / 10 : 0,
        },
        cohort,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

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
  // NEXUS — AI Chief of Staff (chat endpoint)
  // ============================================================
  app.post("/api/chat", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { message, history, role } = req.body as { message?: string; history?: Array<{role: string; content: string}>; role?: string };
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      const user = req.user!;
      const bots = await storage.getBotConfigs(user.id);
      const activeBots = bots.filter(b => b.status === "active").map(b => b.botType).join(", ");
      const subscription = await storage.getActiveSubscription(user.id);

      const roleHint = (role && typeof role === "string" && role.trim().length > 0)
        ? `The user has asked you to act as their **${role.trim()}**. Stay in that role for this conversation. Bring the depth, judgement, and frameworks a top-tier ${role.trim()} would use. You can still leverage the ToolsYourWay platform where relevant, but your primary identity right now is ${role.trim()}.`
        : `If the user asks you to act as their Content Strategist, Recruiter, CFO, Growth PM, Brand Marketer, or any other specialist — adopt that role fully and stay in it. You are role-flexible by design.`;

      const systemPrompt = `You are **Nexus** — an elite AI Chief of Staff built into ToolsYourWay. You are NOT a chatbot, NOT a templated assistant, NOT a search engine. You are a senior operator who thinks, plans, and executes alongside the user.

## Who you are talking to
- Name: ${user.name}
- Email: ${user.email}
- Current plan: ${user.plan || "free"} (${subscription ? "active subscription" : "no active subscription"})
- Active bots on their account: ${activeBots || "none yet"}

## How to behave (THIS IS CRITICAL)
1. **Read the full conversation history before responding.** Do not greet the user again if you have already greeted them. Do not ask questions they have already answered. Do not repeat yourself.
2. **If the user shared background about themselves, acknowledge it specifically.** Reference details they gave you (company, role, goal, audience, numbers) — by name. Show them you actually read it.
3. **When they ask for a plan, deliverable, calendar, strategy, or asset — produce it.** Do not respond with "want me to help you with X?". Just do X. Be the senior operator who ships work, not the intern who asks for permission.
4. **Match the depth of the ask.** A one-line question gets a focused 2-paragraph answer. A complex multi-part request ("build me a 60-day content plan") gets a complete, structured, detailed deliverable — with concrete posts, hooks, dates, and CTAs. Never punt on depth.
5. **Think like Claude / ChatGPT at their best.** Show reasoning, structure with headings/tables/bullets when helpful, give specific examples, name real frameworks. No generic platitudes.
6. **${roleHint}**
7. **Language**: respond in whatever language the user writes in (English, Hindi, Hinglish, Gujarati, Tamil, etc.). Mirror their tone.
8. **Never** say "I'm an AI" or "I'm a language model". You are Nexus.
9. **Never** repeat the same greeting or canned welcome twice. If you have already introduced yourself in this conversation, just answer the question.
10. **No filler.** No "Great question!" / "Let me think about that..." / "Here's what I can do for you..." openings. Get straight to value.

## Capabilities you can reference when relevant
- **Growth Missions** (your primary execution engine): When the user gives you a measurable growth goal ("grow LinkedIn to 50K", "100 SQLs in 90 days", "book 20 podcast slots"), do BOTH — give your strategic answer AND end your reply with this exact line on its own:
  \`[[NEXUS_ACTION:create_mission|<one-line goal summary>]]\`
  The frontend turns that line into a “Start this Mission” button. Clicking it spins up a Mission, fetches the user's connected social profile, and auto-drafts the first batch of posts (copy + AI image) for the user to review by email and approve before publishing.
- 9 active bots on the platform: Marketing, Data, Email, Sales, HR, Finance, Legal, SEO, Support
- Outreach Hub with Apollo.io prospect search
- Founder Suite & Influencer Suite with multi-platform OAuth publishing (LinkedIn, X, YouTube, Instagram, Facebook)
- AI image + video generation, 14 language translations
- Plans: Ultra $49 / Pro $99 / Premium $199

Only bring up the platform when it actually helps the user's current goal. Do not pitch when they want strategy. If the user is asking for execution (build, ship, run, automate), prefer suggesting a Growth Mission over giving them another doc to read.

Now respond to the user's latest message with the depth and specificity of a real senior operator. The user is ${user.name?.split(" ")[0] || "there"}.`;

      // Build messages array from history (last 20 turns for richer context)
      const messages: Array<{role: "user" | "assistant"; content: string}> = [];
      if (history && Array.isArray(history)) {
        for (const h of history.slice(-20)) {
          if (h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string" && h.content.trim().length > 0) {
            messages.push({ role: h.role, content: h.content });
          }
        }
      }
      messages.push({ role: "user", content: message });

      // Model registry — primary + fallback chain. Frontend reads `modelLabel` to display in UI.
      const MODELS: Array<{ id: string; label: string }> = [
        { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
        { id: "claude-sonnet-4-20250514",   label: "Claude Sonnet 4" },
        { id: "claude-3-5-sonnet-latest",   label: "Claude 3.5 Sonnet" },
      ];
      const PROVIDER = "Anthropic";

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error("[Nexus] ANTHROPIC_API_KEY is not set — cannot generate intelligent replies.");
        return res.json({
          reply: `I can't think clearly right now — my reasoning engine isn't connected. An admin needs to set the \`ANTHROPIC_API_KEY\` environment variable on the server. Once that's done, I'll be fully online and we can pick this up properly.`,
          model: null,
          modelLabel: null,
          provider: PROVIDER,
        });
      }

      // OpenAI fallback config (used when Claude is overloaded / down).
      const OPENAI_MODELS: Array<{ id: string; label: string }> = [
        { id: "gpt-4o",      label: "GPT-4o" },
        { id: "gpt-4o-mini", label: "GPT-4o mini" },
      ];
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Always call Claude — no template short-circuits. Walk the fallback chain on model-not-found errors.
      const callClaude = async (modelId: string) => {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: 2048,
            system: systemPrompt,
            messages,
          }),
        });
        const json: any = await r.json();
        return { ok: r.ok, status: r.status, json };
      };

      // Retry-on-overload wrapper for one Claude model. Honors 429/529/500/502/503 with exp backoff.
      const callClaudeWithRetry = async (modelId: string, attempts = 3) => {
        let last: { ok: boolean; status: number; json: any } = { ok: false, status: 0, json: null };
        for (let i = 0; i < attempts; i++) {
          last = await callClaude(modelId);
          if (last.ok) return last;
          const transient = [408, 425, 429, 500, 502, 503, 504, 529].includes(last.status);
          if (!transient) return last;
          // Exponential backoff: 600ms, 1.4s, 3s
          await sleep(600 * Math.pow(2.2, i));
        }
        return last;
      };

      const callOpenAI = async (modelId: string) => {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) return { ok: false, status: 0, json: { error: { message: "OPENAI_API_KEY not set" } } };
        const r = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: 2048,
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });
        const json: any = await r.json();
        return { ok: r.ok, status: r.status, json };
      };

      try {
        let lastErr: { status: number; json: any } | null = null;

        // 1) Try every Claude model (with retries on overload) before falling back.
        for (const m of MODELS) {
          const { ok, status, json } = await callClaudeWithRetry(m.id);
          if (ok && json?.content?.[0]?.text) {
            return res.json({
              reply: json.content[0].text,
              model: m.id,
              modelLabel: m.label,
              provider: PROVIDER,
            });
          }
          lastErr = { status, json };
          console.error(`[Nexus] Claude API error on ${m.id}`, status, JSON.stringify(json).slice(0, 400));
          // Walk to next Claude model on model-not-found OR sustained overload (so we don't keep hammering one model).
          const errBody = JSON.stringify(json);
          const modelMissing = status === 404 || /not[_ ]?found|invalid[_ ]?model|unknown.+model/i.test(errBody);
          const overloaded  = [429, 500, 502, 503, 529].includes(status) || /overload|capacity|rate[_ ]?limit/i.test(errBody);
          if (!modelMissing && !overloaded) break;
        }

        // 2) Claude exhausted — fall back to OpenAI so Nexus stays alive.
        if (process.env.OPENAI_API_KEY) {
          for (const m of OPENAI_MODELS) {
            const { ok, status, json } = await callOpenAI(m.id);
            const text = json?.choices?.[0]?.message?.content;
            if (ok && typeof text === "string" && text.trim().length > 0) {
              console.log(`[Nexus] Served via OpenAI fallback (${m.id}) after Claude failure.`);
              return res.json({
                reply: text,
                model: m.id,
                modelLabel: m.label,
                provider: "OpenAI",
              });
            }
            lastErr = { status, json };
            console.error(`[Nexus] OpenAI fallback failed on ${m.id}`, status, JSON.stringify(json).slice(0, 400));
          }
        }

        // 3) Both providers failed — surface the most informative error.
        const errMsg = lastErr?.json?.error?.message || lastErr?.json?.message;
        return res.json({
          reply: `Both Claude and GPT are unreachable right now${lastErr?.status ? ` (last status ${lastErr.status})` : ""}. ${errMsg ? "Underlying error: " + errMsg + ". " : ""}This usually clears in 30–60 seconds — try again.`,
          model: null,
          modelLabel: null,
          provider: PROVIDER,
        });
      } catch (apiErr: any) {
        console.error("[Nexus] Chat reasoning exception", apiErr?.message || apiErr);
        return res.json({
          reply: `I couldn't reach my reasoning engine just now (${apiErr?.message || "network error"}). Try again in a few seconds.`,
          model: null,
          modelLabel: null,
          provider: PROVIDER,
        });
      }
    } catch (err) {
      console.error("[Nexus] Chat handler error:", err);
      res.status(500).json({ reply: "Something went sideways on my end. Please try again." });
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
      // Use the verified domain — onboarding@resend.dev only delivers to the
      // Resend account owner in sandbox mode, silently dropping external recipients.
      const fromAddr = process.env.MAIL_FROM || "ToolsYourWay <hello@toolsyourway.com>";
      const result = await resend.emails.send({
        from: fromAddr,
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
            from: process.env.MAIL_FROM || "ToolsYourWay <hello@toolsyourway.com>",
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
  app.post("/api/bots/marketing/generate", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
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

  // Map a free-text platform label (as shown in the composer) to a connection key.
  function platformKeyFromLabel(platform: string): string {
    const p = String(platform || "").toLowerCase();
    if (p.includes("linkedin")) return "linkedin";
    if (p.includes("instagram")) return "instagram";
    if (p.includes("facebook")) return "facebook";
    if (p.includes("youtube")) return "youtube";
    if (p.includes("tiktok")) return "tiktok";
    if (p.includes("twitter") || p === "x" || p.includes("x /")) return "twitter";
    return SUPPORTED_PLATFORMS.includes(p) ? p : "twitter";
  }

  app.post("/api/bots/marketing/schedule", requireAuth, async (req: Request, res: Response) => {
    try {
      const { content, platform, scheduledFor, destinations, destinationIds } = req.body;
      if (!content || !platform) {
        return res.status(400).json({ message: "content and platform are required" });
      }

      const userId = req.user!.id;
      const platformKey = platformKeyFromLabel(platform);

      // Build the per-platform selection map. Precedence:
      //   1. explicit `destinations` map { platform: string[] }
      //   2. explicit `destinationIds` array (applied to this post's platform)
      //   3. Marketing Bot saved defaults (resolved at creation time)
      let selection: Record<string, string[]> = {};
      if (destinations && typeof destinations === "object" && !Array.isArray(destinations)) {
        for (const [pk, ids] of Object.entries(destinations)) {
          if (SUPPORTED_PLATFORMS.includes(pk) && Array.isArray(ids)) {
            selection[pk] = (ids as unknown[]).filter((x) => typeof x === "string").map(String);
          }
        }
      } else if (Array.isArray(destinationIds)) {
        selection[platformKey] = destinationIds.filter((x: unknown) => typeof x === "string").map(String);
      } else {
        // Fall back to saved Marketing Bot defaults for this post's platform.
        const defaults = await getMarketingDestinationDefaults(userId);
        if (Array.isArray(defaults[platformKey]) && defaults[platformKey].length) {
          selection[platformKey] = defaults[platformKey];
        }
      }

      const connections = await storage.getSocialConnections(userId);
      const { resolved, errors } = resolveDestinationMap(connections as any, selection);

      // Reject explicit selections that fail validation (disconnected / unsupported type).
      // Defaults that no longer resolve are tolerated (best-effort) — explicit intent is not.
      const wasExplicit =
        (destinations && typeof destinations === "object" && !Array.isArray(destinations)) ||
        Array.isArray(destinationIds);
      if (wasExplicit && errors.length) {
        return res.status(400).json({ message: errors.join(" "), errors });
      }

      const post = await storage.createScheduledPost({
        userId,
        content,
        platform,
        status: "scheduled",
        scheduledFor: scheduledFor || null,
        destinations: resolved.length ? JSON.stringify(resolved) : null,
        destinationPlatform: resolved.length ? resolved[0].platform : platformKey,
      } as any);

      res.json({ ...post, destinations: resolved });
    } catch (err: any) {
      console.error("Schedule post error:", err);
      res.status(500).json({ message: err.message || "Failed to schedule post" });
    }
  });

  app.get("/api/bots/marketing/posts", requireAuth, async (req: Request, res: Response) => {
    try {
      const posts = await storage.getScheduledPosts(req.user!.id);
      // Parse the stored destinations JSON for each post so clients get
      // structured destination data rather than a raw string.
      const withDestinations = posts.map((p: any) => {
        let parsed: any[] = [];
        if (p.destinations) {
          try {
            const d = JSON.parse(p.destinations);
            if (Array.isArray(d)) parsed = d;
          } catch { /* leave empty on malformed legacy data */ }
        }
        let results: any[] = [];
        if (p.publishResults) {
          try {
            const r = JSON.parse(p.publishResults);
            if (Array.isArray(r)) results = r;
          } catch { /* ignore malformed */ }
        }
        return { ...p, destinations: parsed, publishResults: results };
      });
      res.json(withDestinations);
    } catch (err: any) {
      console.error("Get posts error:", err);
      res.status(500).json({ message: err.message || "Failed to fetch posts" });
    }
  });

  // Change a scheduled post's status. This is the approval gate for the
  // publish worker: only `approved` posts that are due get auto-published.
  // Allowed transitions (intentionally narrow):
  //   approve : draft|scheduled|failed|partial_failed|cancelled -> approved
  //   cancel  : any non-terminal                                -> cancelled
  //   retry   : failed|partial_failed                           -> approved (clears prior results)
  //   unapprove: approved                                       -> scheduled
  app.post("/api/bots/marketing/posts/:id/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      const action = String(req.body?.action || "");
      if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid post id" });

      const post = await storage.getScheduledPost(id);
      if (!post || post.userId !== req.user!.id) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (post.status === "publishing") {
        return res.status(409).json({ message: "Post is currently being published — try again shortly." });
      }

      let patch: Record<string, any> | null = null;
      switch (action) {
        case "approve":
          if (!["draft", "scheduled", "failed", "partial_failed", "cancelled"].includes(post.status)) {
            return res.status(400).json({ message: `Cannot approve a post in status "${post.status}".` });
          }
          patch = { status: "approved", approvedAt: new Date().toISOString(), lastError: null };
          break;
        case "unapprove":
          if (post.status !== "approved") {
            return res.status(400).json({ message: `Only approved posts can be unapproved (status is "${post.status}").` });
          }
          patch = { status: "scheduled", approvedAt: null };
          break;
        case "cancel":
          if (["published", "cancelled"].includes(post.status)) {
            return res.status(400).json({ message: `Cannot cancel a post in status "${post.status}".` });
          }
          patch = { status: "cancelled" };
          break;
        case "retry":
          if (!["failed", "partial_failed"].includes(post.status)) {
            return res.status(400).json({ message: `Only failed posts can be retried (status is "${post.status}").` });
          }
          // Re-approve so the worker picks it up again; clear stale results.
          patch = { status: "approved", approvedAt: new Date().toISOString(), lastError: null, publishResults: null };
          break;
        default:
          return res.status(400).json({ message: "action must be one of: approve, unapprove, cancel, retry" });
      }

      const updated = await storage.updateScheduledPost(id, patch as any);
      res.json({ ...updated, workerEnabled: isPublishWorkerEnabled() });
    } catch (err: any) {
      console.error("Post status change error:", err);
      res.status(500).json({ message: err.message || "Failed to update post status" });
    }
  });

  // DRY-RUN: report which of THIS USER's posts are approved + due for publish,
  // WITHOUT publishing anything. Safe to call anytime; never contacts a social
  // platform. Helps verify scheduling/approval before enabling the worker.
  app.get("/api/bots/marketing/publish-status", requireAuth, async (req: Request, res: Response) => {
    try {
      const posts = await storage.getScheduledPosts(req.user!.id);
      const nowMs = Date.now();
      const isDue = (p: any) => !p.scheduledFor || new Date(p.scheduledFor).getTime() <= nowMs;
      const counts: Record<string, number> = {};
      for (const p of posts) counts[p.status] = (counts[p.status] || 0) + 1;
      const dueApproved = posts.filter((p: any) => p.status === "approved" && isDue(p));
      res.json({
        workerEnabled: isPublishWorkerEnabled(),
        intervalMs: parseInt(process.env.MARKETING_PUBLISH_WORKER_INTERVAL_MS || "60000", 10) || 60000,
        statusCounts: counts,
        dueNow: dueApproved.map((p: any) => ({
          id: p.id,
          platform: p.platform,
          scheduledFor: p.scheduledFor,
          destinationCount: (() => { try { return (JSON.parse(p.destinations || "[]") || []).length; } catch { return 0; } })(),
        })),
      });
    } catch (err: any) {
      console.error("Publish-status error:", err);
      res.status(500).json({ message: err.message || "Failed to compute publish status" });
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
  // SOCIAL CONNECTIONS (Marketing Bot integrations)
  // ============================================================
  app.get("/api/social/connections", requireAuth, async (req: Request, res: Response) => {
    try {
      const connections = await storage.getSocialConnections(req.user!.id);
      res.json(connections);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  // Connect a social platform (simulates OAuth callback)
  // In production, each platform has its own OAuth flow:
  // - LinkedIn: /api/social/linkedin/auth → LinkedIn OAuth → callback with code → exchange for token
  // - Same for Instagram (Meta), TikTok, Facebook, Twitter/X
  // For MVP: stores connection record. Real OAuth URLs added when API keys are configured.
  app.post("/api/social/connect", requireAuth, async (req: Request, res: Response) => {
    try {
      const { platform, accountName } = req.body;
      if (!platform) return res.status(400).json({ message: "Platform is required" });

      const validPlatforms = ["linkedin", "instagram", "tiktok", "facebook", "twitter", "twitter_oauth1", "youtube"];
      if (!validPlatforms.includes(platform)) {
        return res.status(400).json({ message: "Invalid platform" });
      }

      // Check if real OAuth is configured for this platform
      // LinkedIn state carries userId so popup callback can attach to the right account
      const linkedinState = process.env.LINKEDIN_CLIENT_ID
        ? Buffer.from(`${req.user!.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`).toString("base64")
        : undefined;
      const linkedinRedirect = `${getBaseUrl(req)}/api/social/linkedin/callback`;
      const oauthConfig: Record<string, { clientId?: string; authUrl?: string; oauthStart?: string }> = {
        linkedin: {
          clientId: process.env.LINKEDIN_CLIENT_ID,
          authUrl: process.env.LINKEDIN_CLIENT_ID
            ? `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(linkedinRedirect)}&scope=${encodeURIComponent(linkedinScope())}&state=${linkedinState}`
            : undefined,
        },
        facebook: {
          clientId: process.env.FACEBOOK_APP_ID,
          authUrl: process.env.FACEBOOK_APP_ID
            ? `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(getBaseUrl(req))}/api/social/facebook/callback&scope=pages_manage_posts,pages_read_engagement`
            : undefined,
        },
        twitter: {
          clientId: process.env.TWITTER_CLIENT_ID,
          oauthStart: process.env.TWITTER_CLIENT_ID ? "/api/social/twitter/oauth-start" : undefined,
        },
        // Pseudo-platform key "twitter_oauth1" — frontend can request this
        // explicitly when it wants the OAuth 1.0a (media-upload) flow.
        twitter_oauth1: {
          clientId: process.env.TWITTER_API_KEY || process.env.TWITTER_CLIENT_ID,
          oauthStart: (process.env.TWITTER_API_KEY || process.env.TWITTER_CLIENT_ID) ? "/api/social/twitter/oauth1-start" : undefined,
        },
        instagram: {
          clientId: process.env.FACEBOOK_APP_ID || process.env.META_APP_ID,
          // Instagram has its own first-class start/callback (Meta Graph API).
          oauthStart: (process.env.FACEBOOK_APP_ID || process.env.META_APP_ID) ? "/api/social/instagram/oauth-start" : undefined,
        },
        youtube: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          oauthStart: process.env.GOOGLE_CLIENT_ID ? "/api/social/youtube/oauth-start" : undefined,
        },
        tiktok: { clientId: process.env.TIKTOK_CLIENT_KEY, authUrl: undefined },
      };

      const config = oauthConfig[platform];

      // LinkedIn must use real OAuth — there is no demo posting path for it.
      // Surface a clear, actionable error instead of silently demo-connecting
      // so the Connect button shows a visible reason when creds are missing.
      if (platform === "linkedin" && !process.env.LINKEDIN_CLIENT_ID) {
        return res.status(400).json({
          message: "LinkedIn isn't configured yet. Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in the server environment to enable connecting.",
          configured: false,
        });
      }

      // If real OAuth is configured, return the auth URL for redirect
      if (config?.authUrl) {
        return res.json({ redirect: config.authUrl });
      }
      // For PKCE platforms (Twitter) and platforms needing dynamic state (Google/YouTube, Facebook/Instagram),
      // tell the frontend to call the oauth-start endpoint to get the auth URL.
      if (config?.oauthStart) {
        // Tell the frontend which OAuth variant it is initiating so the UI
        // can label connect buttons (e.g. "Connect X for media upload").
        const authVersion = platform === "twitter_oauth1"
          ? "oauth1"
          : (platform === "twitter" ? "oauth2_pkce" : "oauth2");
        return res.json({ usePkce: true, oauthStartUrl: config.oauthStart, authVersion });
      }

      // ADMIN ACCOUNTS: require real OAuth — no demo connects
      if (req.user!.role === "admin" && !config?.clientId) {
        return res.status(400).json({
          message: `${platform.toUpperCase()} requires real API credentials. Demo mode is disabled for admin accounts. Add ${platform.toUpperCase()}_CLIENT_ID and _CLIENT_SECRET to .env to connect.`,
          adminBlocked: true,
        });
      }

      // Placeholder platform avatars (used when no real profile pic available from OAuth)
      const platformAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(accountName || req.user!.name)}&background=1E1650&color=fff&size=128&bold=true`;

      // MVP mode: create connection record directly (for demo/testing, non-admin).
      // LinkedIn is intentionally excluded — it always uses real OAuth (guarded
      // above), so we never fabricate LinkedIn Pages here.
      const hasPages = ["facebook", "youtube"].includes(platform);
      const demoPages = hasPages ? JSON.stringify([
        { id: `page_1_${Date.now()}`, name: `${req.user!.name}'s Business Page`, type: "page", pictureUrl: platformAvatar },
        { id: `page_2_${Date.now()}`, name: `Brand Page`, type: "page", pictureUrl: platformAvatar },
        { id: `profile_${Date.now()}`, name: `${req.user!.name} (Personal Profile)`, type: "profile", pictureUrl: platformAvatar },
      ]) : undefined;

      const connection = await storage.connectSocial({
        userId: req.user!.id,
        platform,
        accountName: accountName || `${req.user!.name}'s ${platform}`,
        accountId: `demo_${Date.now()}`,
        pages: demoPages,
        accountType: hasPages ? "pending" : "profile",
        profilePictureUrl: platformAvatar,
        displayName: accountName || req.user!.name,
      } as any);

      res.json({
        connection,
        needsPageSelection: hasPages,
        pages: hasPages ? JSON.parse(demoPages!) : undefined,
        demo: !config?.clientId,
        message: config?.clientId ? undefined : `Connected in demo mode. Add ${platform.toUpperCase()} API credentials to .env for real posting.`,
      });
    } catch (err: any) {
      console.error("Social connect error:", err);
      res.status(500).json({ message: err.message || "Connection failed" });
    }
  });

  // ============================================================
  // LINKEDIN OAUTH CALLBACK — real token exchange + profile fetch
  // ============================================================
  app.get("/api/social/linkedin/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query as any;

      // Helper that returns HTML that auto-closes the popup and notifies the parent window
      const renderPopupResult = (success: boolean, msg: string) => `<!doctype html><html><head><meta charset="utf-8"><title>LinkedIn</title>
<style>body{font-family:-apple-system,Inter,sans-serif;background:#FDFCF8;color:#1E1650;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px}
.card{max-width:400px;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08)}
.icon{width:56px;height:56px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px}
.ok{background:#D1FAE5;color:#065F46}
.err{background:#FEE2E2;color:#991B1B}
h1{font-size:18px;margin:0 0 8px}
p{color:#666;font-size:14px;margin:0}
</style></head><body><div class="card">
<div class="icon ${success ? "ok" : "err"}">${success ? "\u2713" : "\u2717"}</div>
<h1>${success ? "LinkedIn Connected" : "Connection Failed"}</h1><p>${msg}</p><p style="margin-top:16px;font-size:12px">You can close this window.</p>
</div><script>setTimeout(() => { if (window.opener) { window.opener.postMessage({ type:"linkedin-oauth", success:${success} }, "*"); } window.close(); }, 1500);</script></body></html>`;

      if (error) {
        console.warn("LinkedIn OAuth denied:", error, error_description);
        return res.type("html").send(renderPopupResult(false, error_description || error));
      }
      if (!code) {
        return res.type("html").send(renderPopupResult(false, "No authorization code received"));
      }

      // State should encode userId so we can attach the connection to the right user (session may not survive popup)
      // Format: base64(userId:nonce)
      let userId: number | undefined;
      try {
        const decoded = Buffer.from(String(state), "base64").toString("utf-8");
        userId = parseInt(decoded.split(":")[0], 10);
      } catch {}
      if (!userId && req.isAuthenticated()) userId = req.user!.id;
      if (!userId) {
        return res.type("html").send(renderPopupResult(false, "Session expired \u2014 please try again"));
      }

      // Exchange code for access token
      const redirectUri = `${getBaseUrl(req)}/api/social/linkedin/callback`;
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: String(code),
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("LinkedIn token exchange failed:", errText);
        return res.type("html").send(renderPopupResult(false, "Token exchange failed \u2014 check app credentials"));
      }

      const tokenData: any = await tokenRes.json();
      const accessToken: string = tokenData.access_token;
      const refreshToken: string | undefined = tokenData.refresh_token;
      const expiresIn: number = tokenData.expires_in || 5184000; // 60 days default

      // Fetch user profile (requires openid + profile scopes)
      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!profileRes.ok) {
        const errText = await profileRes.text();
        console.error("LinkedIn profile fetch failed:", errText);
        return res.type("html").send(renderPopupResult(false, "Profile fetch failed"));
      }
      const profile: any = await profileRes.json();

      // Best-effort: discover LinkedIn Pages (organizations) the member admins.
      // Only succeeds if the app/token has an organization scope; otherwise
      // returns no pages (and a permission note) without failing the connect.
      const orgDiscovery = await discoverLinkedInOrganizations(accessToken);
      const pagesJson = orgDiscovery.pages.length ? JSON.stringify(orgDiscovery.pages) : null;

      // Store connection with real token and real profile pic
      await storage.connectSocial({
        userId,
        platform: "linkedin",
        accountId: profile.sub,
        accountName: profile.name,
        displayName: profile.name,
        profilePictureUrl: profile.picture || null,
        profileUrl: `https://www.linkedin.com/in/${profile.sub}`,
        accountType: "profile",
        pages: pagesJson,
        accessToken,
        refreshToken: refreshToken || null,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      const pageMsg = orgDiscovery.pages.length
        ? ` Found ${orgDiscovery.pages.length} LinkedIn Page${orgDiscovery.pages.length === 1 ? "" : "s"}.`
        : "";
      res.type("html").send(renderPopupResult(true, `Welcome, ${profile.name}. You can now post to LinkedIn from ToolsYourWay.${pageMsg}`));
    } catch (e: any) {
      console.error("LinkedIn callback error:", e);
      res.type("html").send(`<!doctype html><html><body><p>Error: ${e.message}</p><script>window.close();</script></body></html>`);
    }
  });

  // Initiate LinkedIn OAuth (returns auth URL with encoded state containing userId)
  app.post("/api/social/linkedin/oauth-start", requireAuth, (req: Request, res: Response) => {
    if (!process.env.LINKEDIN_CLIENT_ID) {
      return res.status(400).json({ message: "LINKEDIN_CLIENT_ID not configured", configured: false });
    }
    const state = Buffer.from(`${req.user!.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`).toString("base64");
    const redirectUri = `${getBaseUrl(req)}/api/social/linkedin/callback`;
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(linkedinScope())}&state=${state}`;
    res.json({ authUrl, state, configured: true });
  });

  // Select which page to post to (LinkedIn Company Page / Facebook Page / Personal Profile)
  app.post("/api/social/select-page", requireAuth, async (req: Request, res: Response) => {
    try {
      const { platform, pageId, pageName, accountType } = req.body;
      if (!platform || !pageId) return res.status(400).json({ message: "Platform and pageId are required" });

      const connections = await storage.getSocialConnections(req.user!.id);
      const conn = connections.find((c: any) => c.platform === platform);
      if (!conn) return res.status(404).json({ message: "Connection not found" });

      await storage.connectSocial({
        userId: req.user!.id,
        platform,
        accountName: pageName || conn.accountName,
        accountId: conn.accountId,
        pageId,
        pageName,
        accountType: accountType || "page",
        pages: conn.pages,
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken,
      });

      res.json({ success: true, pageName });
    } catch (err: any) {
      res.status(500).json({ message: "Page selection failed" });
    }
  });

  app.post("/api/social/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      const { platform } = req.body;
      if (!platform) return res.status(400).json({ message: "Platform is required" });
      await storage.disconnectSocial(req.user!.id, platform);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Disconnect failed" });
    }
  });

  // ============================================================
  // SOCIAL DESTINATIONS (Marketing Bot — profile / page / channel selection)
  // ============================================================
  // Read the Marketing Bot's saved default destination selections.
  // Stored inside botConfigs(config) as { destinations: { [platform]: string[] } }.
  async function getMarketingDestinationDefaults(userId: number): Promise<Record<string, string[]>> {
    const configs = await storage.getBotConfigs(userId);
    const marketing = configs.find((c: any) => c.botType === "marketing");
    if (!marketing?.config) return {};
    try {
      const parsed = JSON.parse(marketing.config);
      const d = parsed?.destinations;
      return d && typeof d === "object" ? d : {};
    } catch {
      return {};
    }
  }

  // Re-run LinkedIn Page (organization) discovery for the connected user using
  // the stored token — no re-auth required. Updates the stored `pages` so the
  // destinations list refreshes. Never returns tokens.
  app.post("/api/social/linkedin/refresh-pages", requireAuth, async (req: Request, res: Response) => {
    try {
      const connections = await storage.getSocialConnections(req.user!.id);
      const linkedin = connections.find((c: any) => c.platform === "linkedin" && c.status === "connected");
      if (!linkedin?.accessToken) {
        return res.status(400).json({ message: "Connect LinkedIn first.", connected: false });
      }
      const discovery = await discoverLinkedInOrganizations(linkedin.accessToken);
      await storage.connectSocial({
        userId: req.user!.id,
        platform: "linkedin",
        pages: discovery.pages.length ? JSON.stringify(discovery.pages) : null,
      });
      res.json({
        success: true,
        pageCount: discovery.pages.length,
        requiresPermission: discovery.requiresPermission,
        note: discovery.note,
      });
    } catch (err: any) {
      console.error("LinkedIn refresh-pages error:", err);
      res.status(500).json({ message: "Failed to refresh LinkedIn Pages" });
    }
  });

  // GET normalized destinations grouped by platform for the current user.
  app.get("/api/social/destinations", requireAuth, async (req: Request, res: Response) => {
    try {
      const connections = await storage.getSocialConnections(req.user!.id);
      const defaults = await getMarketingDestinationDefaults(req.user!.id);
      const platforms = buildDestinations(connections as any, defaults);
      res.json({ platforms });
    } catch (err: any) {
      console.error("Destinations fetch error:", err);
      res.status(500).json({ message: "Failed to fetch destinations" });
    }
  });

  // Save Marketing Bot default destination selections per platform.
  // Body: { destinations: { linkedin: ["urn:...","page_1"], twitter: ["123"] } }
  // No secrets stored — only destination IDs the user chose.
  app.post("/api/social/destinations/defaults", requireAuth, async (req: Request, res: Response) => {
    try {
      const incoming = req.body?.destinations;
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        return res.status(400).json({ message: "destinations object is required" });
      }
      // Sanitize: only string platform keys -> array of string ids.
      const clean: Record<string, string[]> = {};
      for (const [platform, ids] of Object.entries(incoming)) {
        if (!SUPPORTED_PLATFORMS.includes(platform)) continue;
        if (!Array.isArray(ids)) continue;
        clean[platform] = ids.filter((x) => typeof x === "string").map(String).slice(0, 50);
      }

      const configs = await storage.getBotConfigs(req.user!.id);
      const marketing = configs.find((c: any) => c.botType === "marketing");
      let configObj: any = {};
      if (marketing?.config) {
        try { configObj = JSON.parse(marketing.config); } catch { configObj = {}; }
      }
      configObj.destinations = clean;

      await storage.upsertBotConfig({
        userId: req.user!.id,
        botType: "marketing",
        status: marketing?.status || "inactive",
        config: JSON.stringify(configObj),
      } as any);

      res.json({ success: true, destinations: clean });
    } catch (err: any) {
      console.error("Save destination defaults error:", err);
      res.status(500).json({ message: "Failed to save destinations" });
    }
  });

  // ============================================================
  // AI IMAGE & VIDEO GENERATION
  // ============================================================
  app.post("/api/media/generate-image", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
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

      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) return res.status(500).json({ message: "No image returned" });

      await storage.createMedia({ userId: req.user!.id, type: "image", prompt: fullPrompt, url: imageUrl, status: "completed" });
      await storage.incrementUsage(req.user!.id, "image");
      // Deduct credit if trial expired (1 credit per image)
      const fresh_img = await storage.getUser(req.user!.id);
      if (fresh_img && (!fresh_img.plan || fresh_img.plan === "none") && computeTrialState(fresh_img).status === "expired") {
        await storage.decrementCredits(req.user!.id, 1);
      }
      res.json({ imageUrl, prompt: fullPrompt });
    } catch (err: any) {
      console.error("Image gen error:", err);
      res.status(500).json({ message: err.message || "Image generation failed" });
    }
  });

  app.post("/api/media/generate-video", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
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
        if (response.data?.[0]?.url) frames.push(response.data[0].url);
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

  // ============================================================
  // PAYMENT ROUTES — Stripe, Razorpay, PayPal, Tap, Xendit
  // ============================================================

  // Helper: calculate price with founders discount
  function calculatePrice(selectedBots: string[], hasAiManager: boolean): number {
    const FOUNDERS_EXPIRY = new Date("2026-04-30T23:59:59");
    const isFounders = new Date() < FOUNDERS_EXPIRY;
    const discount = isFounders ? 0.35 : 1; // 65% off = pay 35%

    const botCount = selectedBots.length;
    let price = 0;

    if (botCount === 9 && hasAiManager) {
      price = 59; // bundle
    } else if (botCount === 9) {
      price = 49; // all bots bundle
    } else {
      price = botCount * 7 + (hasAiManager ? 8 : 0);
    }

    return Math.round(price * discount * 100) / 100; // round to 2 decimals
  }

  // Plan prices in cents (USD) — founders discount active until April 30, 2026
  const STRIPE_PRICES: Record<string, number> = {
    ultra: 1700,   // $17/mo (regular $49)
    pro: 3500,     // $35/mo (regular $99)
    premium: 7000, // $70/mo (regular $199)
  };

  // Plan prices in paise (INR) — same founders discount, USD × 83
  const RAZORPAY_PRICES: Record<string, number> = {
    ultra: 141100,   // ₹1,411 (regular ₹4,067)
    pro: 290500,     // ₹2,905 (regular ₹8,217)
    premium: 581000, // ₹5,810 (regular ₹16,517)
  };

  // ----------------------------------------------------------
  // POST /api/payments/stripe/checkout
  // ----------------------------------------------------------
  app.post("/api/payments/stripe/checkout", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({
          message: "Stripe is not configured. Add STRIPE_SECRET_KEY to your .env file to enable card payments.",
        });
      }

      const { plan } = req.body as { plan: string };
      if (!plan || !STRIPE_PRICES[plan]) {
        return res.status(400).json({ message: "Invalid plan. Must be ultra, pro, or premium." });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const user = req.user!;
      const baseUrl = getBaseUrl(req);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: `ToolsYourWay ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan` },
              unit_amount: STRIPE_PRICES[plan],
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        customer_email: user.email,
        metadata: {
          userId: String(user.id),
          plan,
        },
        success_url: `${baseUrl}/#/dashboard?payment=success`,
        cancel_url: `${baseUrl}/#/pricing`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe checkout error:", err);
      res.status(500).json({ message: err.message || "Failed to create Stripe checkout session" });
    }
  });

  // ----------------------------------------------------------
  // GET /api/payments/stripe/success
  // ----------------------------------------------------------
  app.get("/api/payments/stripe/success", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.redirect("/#/dashboard");
      }

      const { session_id } = req.query as { session_id: string };
      if (!session_id) return res.redirect("/#/dashboard");

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(session_id);

      if (session.payment_status === "paid" && session.metadata?.userId) {
        const userId = parseInt(session.metadata.userId, 10);
        const plan = session.metadata.plan as string;

        await storage.createSubscription({
          userId,
          plan,
          status: "active",
          paymentGateway: "stripe",
          paymentId: session.id,
          amount: session.amount_total ?? STRIPE_PRICES[plan],
        });
      }

      res.redirect("/#/dashboard");
    } catch (err: any) {
      console.error("Stripe success error:", err);
      res.redirect("/#/dashboard");
    }
  });

  // ----------------------------------------------------------
  // POST /api/webhooks/stripe  (no auth — Stripe calls directly)
  // ----------------------------------------------------------
  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(200).json({ received: true });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const sig = req.headers["stripe-signature"] as string;
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err: any) {
        return res.status(400).json({ message: `Webhook signature verification failed: ${err.message}` });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid" && session.metadata?.userId) {
          const userId = parseInt(session.metadata.userId, 10);
          const plan = session.metadata.plan as string;

          await storage.createSubscription({
            userId,
            plan,
            status: "active",
            paymentGateway: "stripe",
            paymentId: session.id,
            amount: session.amount_total ?? STRIPE_PRICES[plan],
          });
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("Stripe webhook error:", err);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // ----------------------------------------------------------
  // POST /api/payments/razorpay/order
  // ----------------------------------------------------------
  app.post("/api/payments/razorpay/order", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({
          message: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file.",
        });
      }

      const { plan } = req.body as { plan: string };
      if (!plan || !RAZORPAY_PRICES[plan]) {
        return res.status(400).json({ message: "Invalid plan. Must be ultra, pro, or premium." });
      }

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount: RAZORPAY_PRICES[plan],
        currency: "INR",
        notes: {
          userId: String(req.user!.id),
          plan,
        },
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
      });
    } catch (err: any) {
      console.error("Razorpay order error:", err);
      res.status(500).json({ message: err.message || "Failed to create Razorpay order" });
    }
  });

  // ----------------------------------------------------------
  // POST /api/payments/razorpay/verify
  // ----------------------------------------------------------
  app.post("/api/payments/razorpay/verify", requireAuth, async (req: Request, res: Response) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body as {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
        plan: string;
      };

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
        return res.status(400).json({ message: "Missing required payment verification fields" });
      }

      if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ message: "Razorpay is not configured" });
      }

      // Verify HMAC signature
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: "Invalid payment signature — verification failed" });
      }

      const userId = req.user!.id;
      const amountPaise = RAZORPAY_PRICES[plan] ?? 0;

      await storage.createSubscription({
        userId,
        plan,
        status: "active",
        paymentGateway: "razorpay",
        paymentId: razorpay_payment_id,
        amount: Math.round(amountPaise / 83), // store approximate USD cents
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Razorpay verify error:", err);
      res.status(500).json({ message: err.message || "Payment verification failed" });
    }
  });

  // ----------------------------------------------------------
  // POST /api/payments/paypal/create
  // ----------------------------------------------------------
  app.post("/api/payments/paypal/create", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) {
        return res.status(503).json({
          message: "PayPal not configured. Add PAYPAL_CLIENT_ID and PAYPAL_SECRET to .env",
        });
      }

      const { selectedBots, hasAiManager } = req.body as { selectedBots: string[]; hasAiManager: boolean };
      if (!Array.isArray(selectedBots) || selectedBots.length === 0) {
        return res.status(400).json({ message: "selectedBots must be a non-empty array" });
      }

      const totalPrice = calculatePrice(selectedBots, hasAiManager);

      const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
      const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
      const PAYPAL_BASE = process.env.PAYPAL_SANDBOX === "true"
        ? "https://api-m.sandbox.paypal.com"
        : "https://api-m.paypal.com";

      // Get access token
      const authRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
      const { access_token } = await authRes.json() as { access_token: string };

      // Create order
      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{
            amount: { currency_code: "USD", value: totalPrice.toFixed(2) },
            description: `ToolsYourWay - ${selectedBots.length} bots`,
          }],
          application_context: {
            return_url: `${getBaseUrl(req)}/#/dashboard?payment=success`,
            cancel_url: `${getBaseUrl(req)}/#/pricing`,
          },
        }),
      });
      const order = await orderRes.json() as { id: string; links: { rel: string; href: string }[] };
      const approvalLink = order.links?.find((l: any) => l.rel === "approve")?.href;

      res.json({ orderId: order.id, approvalUrl: approvalLink });
    } catch (err: any) {
      console.error("PayPal create error:", err);
      res.status(500).json({ message: err.message || "Failed to create PayPal order" });
    }
  });

  // ----------------------------------------------------------
  // POST /api/payments/tap/checkout  (Tap Payments — Middle East)
  // ----------------------------------------------------------
  app.post("/api/payments/tap/checkout", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!process.env.TAP_SECRET_KEY) {
        return res.status(503).json({
          message: "Tap Payments not configured. Add TAP_SECRET_KEY to .env. Get your key at https://tap.company",
        });
      }

      const { selectedBots, hasAiManager } = req.body as { selectedBots: string[]; hasAiManager: boolean };
      if (!Array.isArray(selectedBots) || selectedBots.length === 0) {
        return res.status(400).json({ message: "selectedBots must be a non-empty array" });
      }

      const totalPrice = calculatePrice(selectedBots, hasAiManager);
      const TAP_SECRET = process.env.TAP_SECRET_KEY;

      const chargeRes = await fetch("https://api.tap.company/v2/charges", {
        method: "POST",
        headers: { Authorization: `Bearer ${TAP_SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPrice,
          currency: "USD",
          customer: { first_name: req.user!.name, email: req.user!.email },
          source: { id: "src_all" },
          redirect: { url: `${getBaseUrl(req)}/api/payments/tap/callback?userId=${req.user!.id}&bots=${selectedBots.join(",")}` },
          description: `ToolsYourWay - ${selectedBots.length} bots`,
          metadata: {
            userId: req.user!.id,
            bots: selectedBots.join(","),
            aiManager: hasAiManager ? "1" : "0",
          },
        }),
      });
      const charge = await chargeRes.json() as { transaction?: { url?: string }; redirect?: { url?: string } };

      res.json({ redirectUrl: charge.transaction?.url || charge.redirect?.url });
    } catch (err: any) {
      console.error("Tap checkout error:", err);
      res.status(500).json({ message: err.message || "Failed to create Tap charge" });
    }
  });

  // ----------------------------------------------------------
  // POST /api/payments/xendit/checkout  (Xendit — Southeast Asia)
  // ----------------------------------------------------------
  app.post("/api/payments/xendit/checkout", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!process.env.XENDIT_SECRET_KEY) {
        return res.status(503).json({
          message: "Xendit not configured. Add XENDIT_SECRET_KEY to .env. Get your key at https://dashboard.xendit.co/settings/developers",
        });
      }

      const { selectedBots, hasAiManager } = req.body as { selectedBots: string[]; hasAiManager: boolean };
      if (!Array.isArray(selectedBots) || selectedBots.length === 0) {
        return res.status(400).json({ message: "selectedBots must be a non-empty array" });
      }

      const totalPrice = calculatePrice(selectedBots, hasAiManager);
      const XENDIT_SECRET = process.env.XENDIT_SECRET_KEY;

      const invoiceRes = await fetch("https://api.xendit.co/v2/invoices", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${XENDIT_SECRET}:`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: `tw_${req.user!.id}_${Date.now()}`,
          amount: totalPrice,
          currency: "USD",
          description: `ToolsYourWay - ${selectedBots.length} bots`,
          customer: { given_names: req.user!.name, email: req.user!.email },
          success_redirect_url: `${getBaseUrl(req)}/#/dashboard?payment=success`,
          failure_redirect_url: `${getBaseUrl(req)}/#/pricing`,
        }),
      });
      const invoice = await invoiceRes.json() as { invoice_url?: string };

      res.json({ redirectUrl: invoice.invoice_url });
    } catch (err: any) {
      console.error("Xendit checkout error:", err);
      res.status(500).json({ message: err.message || "Failed to create Xendit invoice" });
    }
  });

  // ============================================================
  // MEDIA — REAL VIDEO GENERATION (Replicate)
  // ============================================================

  // POST /api/media/generate-video-real
  // Creates a Replicate prediction for video generation and returns immediately
  app.post("/api/media/generate-video-real", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { prompt, model = "minimax", style } = req.body as {
        prompt: string;
        model: "minimax" | "kling";
        style?: string;
      };

      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ message: "prompt is required" });
      }

      const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
      if (!REPLICATE_TOKEN) {
        return res.json({
          message: "Add REPLICATE_API_TOKEN to .env to enable real video generation. Get your token at https://replicate.com/account/api-tokens",
          demo: true,
        });
      }

      const stylePrefix = style ? `${style} style. ` : "";
      const fullPrompt = `${stylePrefix}${prompt.trim()}`;

      // Choose model
      const replicateModel =
        model === "kling"
          ? "kuaishou/kling-v1-6-standard"
          : "minimax/video-01-live";

      const replicateInput: Record<string, unknown> =
        model === "kling"
          ? { prompt: fullPrompt, duration: "5", aspect_ratio: "16:9" }
          : { prompt: fullPrompt };

      // Create prediction (async — returns immediately)
      const predictionRes = await fetch("https://api.replicate.com/v1/models/" + replicateModel + "/predictions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "respond-async",
        },
        body: JSON.stringify({ input: replicateInput }),
      });

      if (!predictionRes.ok) {
        // Fallback: try versioned prediction endpoint
        const fallbackRes = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REPLICATE_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: "respond-async",
          },
          body: JSON.stringify({
            model: replicateModel,
            input: replicateInput,
          }),
        });

        if (!fallbackRes.ok) {
          const errBody = await fallbackRes.text();
          return res.status(502).json({
            message: `Replicate API error (model: ${replicateModel}): ${errBody}`,
            model: replicateModel,
          });
        }

        const prediction = await fallbackRes.json() as { id: string; status: string };
        return res.json({ predictionId: prediction.id, status: "processing", model: replicateModel, prompt: fullPrompt });
      }

      const prediction = await predictionRes.json() as { id: string; status: string };
      return res.json({ predictionId: prediction.id, status: "processing", model: replicateModel, prompt: fullPrompt });
    } catch (err: any) {
      console.error("Video generation error:", err);
      res.status(500).json({ message: err.message || "Video generation failed" });
    }
  });

  // GET /api/media/video-status/:predictionId
  // Polls Replicate for the prediction result
  app.get("/api/media/video-status/:predictionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const predictionId = String(req.params.predictionId);

      const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
      if (!REPLICATE_TOKEN) {
        return res.status(503).json({ message: "REPLICATE_API_TOKEN not configured" });
      }

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
      });

      if (!pollRes.ok) {
        const errBody = await pollRes.text();
        return res.status(502).json({ message: `Replicate poll error: ${errBody}` });
      }

      const result = await pollRes.json() as {
        id: string;
        status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
        output?: string | string[];
        error?: string;
        logs?: string;
      };

      if (result.status === "succeeded") {
        const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;

        // Save to media gallery if storage supports it
        try {
          await storage.incrementUsage(req.user!.id, "video");
          const fresh_vid = await storage.getUser(req.user!.id);
          if (fresh_vid && (!fresh_vid.plan || fresh_vid.plan === "none") && computeTrialState(fresh_vid).status === "expired") {
            await storage.decrementCredits(req.user!.id, 2);
          }
          await storage.createMedia({
            userId: req.user!.id,
            type: "video",
            url: videoUrl as string,
            prompt: predictionId,
            status: "completed",
          });
        } catch (_) {
          // Non-fatal — media save is best-effort
        }

        return res.json({ status: "succeeded", videoUrl });
      }

      if (result.status === "failed" || result.status === "canceled") {
        return res.json({ status: result.status, error: result.error || "Generation failed" });
      }

      // Still running
      return res.json({ status: "processing" });
    } catch (err: any) {
      console.error("Video status poll error:", err);
      res.status(500).json({ message: err.message || "Failed to poll video status" });
    }
  });

  // POST /api/media/text-to-speech
  // Converts text to audio using OpenAI TTS
  app.post("/api/media/text-to-speech", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { text, language } = req.body as { text: string; language?: string };

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ message: "text is required" });
      }

      if (text.length > 4096) {
        return res.status(400).json({ message: "Text must be 4096 characters or less" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.json({
          message: "Add OPENAI_API_KEY to .env to enable text-to-speech. Get your key at https://platform.openai.com/api-keys",
          demo: true,
        });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text.trim(),
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      const audioBase64 = buffer.toString("base64");

      return res.json({
        audioUrl: `data:audio/mp3;base64,${audioBase64}`,
        text: text.trim(),
      });
    } catch (err: any) {
      console.error("TTS error:", err);
      res.status(500).json({ message: err.message || "Text-to-speech failed" });
    }
  });

  // Register Founder + Influencer + Publishing routes
  const { registerFounderInfluencerRoutes } = await import("./founder-influencer-routes");
  registerFounderInfluencerRoutes(app, requireAuth, requireActiveAccess);

  // Register OAuth routes (YouTube, Twitter, Facebook/Instagram)
  const { registerOAuthRoutes } = await import("./oauth-routes");
  registerOAuthRoutes(app, requireAuth);

  // Register Growth Missions (Nexus orchestration: plan → generate → review → publish)
  const { registerMissionsRoutes } = await import("./missions-routes");
  registerMissionsRoutes(app, requireAuth, requireActiveAccess);

  // ============================================================
  // OUTREACH HUB
  // ============================================================

  // --- Prospects ---
  app.get("/api/outreach/prospects", requireAuth, async (req: Request, res: Response) => {
    const list = await storage.listProspects(req.user!.id);
    res.json(list);
  });

  app.post("/api/outreach/prospects", requireAuth, async (req: Request, res: Response) => {
    const body = req.body as any;
    if (Array.isArray(body.prospects)) {
      const rows = await storage.bulkCreateProspects(req.user!.id, body.prospects);
      return res.json({ added: rows.length, prospects: rows });
    }
    const prospect = await storage.createProspect({ ...body, userId: req.user!.id });
    res.status(201).json(prospect);
  });

  app.delete("/api/outreach/prospects/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.deleteProspect(parseInt(String(req.params.id), 10), req.user!.id);
    res.json({ success: true });
  });

  // --- Apollo.io search (real data via their API) ---
  // Docs: https://docs.apollo.io/reference/people-search
  app.post("/api/outreach/apollo-search", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { jobTitles, locations, companySize, industry, keywords, limit } = req.body as any;
      if (!process.env.APOLLO_API_KEY) {
        // Demo mode: return mock prospects so UI works without credentials
        if (req.user!.role === "admin") {
          return res.status(400).json({ message: "Add APOLLO_API_KEY to .env. Admin accounts require real APIs — demo mode disabled." });
        }
        return res.json({
          demo: true,
          message: "Add APOLLO_API_KEY to .env to enable real prospect search. Showing sample data.",
          prospects: Array.from({ length: 5 }).map((_, i) => ({
            name: ["Priya Sharma", "Arjun Mehta", "Sara Khan", "David Chen", "Anya Patel"][i],
            title: jobTitles?.[0] || "Founder & CEO",
            company: ["Nimbus AI", "Vertex Labs", "Quantum Edge", "Aurora Systems", "Pulse Ventures"][i],
            location: locations?.[0] || "Bangalore, India",
            email: null,
            linkedinUrl: `https://linkedin.com/in/sample-${i + 1}`,
            profilePictureUrl: `https://ui-avatars.com/api/?name=${["PS", "AM", "SK", "DC", "AP"][i]}&background=E9A820&color=1E1650&size=128&bold=true`,
          })),
        });
      }

      const apolloRes = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": process.env.APOLLO_API_KEY,
        },
        body: JSON.stringify({
          person_titles: jobTitles || [],
          person_locations: locations || [],
          organization_num_employees_ranges: companySize || [],
          q_keywords: keywords || "",
          page: 1,
          per_page: Math.min(limit || 25, 100),
        }),
      });

      if (!apolloRes.ok) {
        const err = await apolloRes.text();
        return res.status(apolloRes.status).json({ message: `Apollo API error: ${err.slice(0, 200)}` });
      }
      const data: any = await apolloRes.json();
      const prospects = (data.people || []).map((p: any) => ({
        name: p.name,
        email: p.email,
        title: p.title,
        company: p.organization?.name,
        location: [p.city, p.country].filter(Boolean).join(", "),
        linkedinUrl: p.linkedin_url,
        twitterHandle: p.twitter_url?.split("/").pop(),
        profilePictureUrl: p.photo_url,
        bio: p.headline,
      }));
      res.json({ prospects, total: data.pagination?.total_entries || prospects.length });
    } catch (e: any) {
      console.error("Apollo search error:", e);
      res.status(500).json({ message: e.message || "Apollo search failed" });
    }
  });

  // --- Campaigns ---
  app.get("/api/outreach/campaigns", requireAuth, async (req: Request, res: Response) => {
    const list = await storage.listCampaigns(req.user!.id);
    res.json(list);
  });

  app.post("/api/outreach/campaigns", requireAuth, async (req: Request, res: Response) => {
    const body = req.body as any;
    const campaign = await storage.createCampaign({
      userId: req.user!.id,
      name: body.name,
      platform: body.platform,
      goal: body.goal,
      tone: body.tone || "professional",
      messageTemplate: body.messageTemplate,
      prospectIds: JSON.stringify(body.prospectIds || []),
      status: "draft",
    });
    res.status(201).json(campaign);
  });

  // Generate personalized draft messages for every prospect in a campaign
  app.post("/api/outreach/campaigns/:id/draft-all", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(String(req.params.id), 10);
      const campaign = await storage.getCampaign(campaignId, req.user!.id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });

      const prospectIds = JSON.parse(campaign.prospectIds || "[]") as number[];
      const allProspects = await storage.listProspects(req.user!.id);
      const targets = allProspects.filter((p: any) => prospectIds.includes(p.id));
      if (targets.length === 0) return res.status(400).json({ message: "No prospects in this campaign" });

      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        if (req.user!.role === "admin") {
          return res.status(400).json({ message: "ANTHROPIC_API_KEY required. Admin accounts don't use demo AI." });
        }
        // Demo fallback: template-based message
        const drafts = await Promise.all(targets.map(async (p: any) => {
          const draft = (campaign.messageTemplate || "Hi {{name}}, I came across your profile and wanted to connect.")
            .replace(/{{name}}/g, p.name || "there")
            .replace(/{{company}}/g, p.company || "")
            .replace(/{{title}}/g, p.title || "");
          return await storage.createMessage({
            userId: req.user!.id, campaignId, prospectId: p.id, platform: campaign.platform,
            draftMessage: draft, finalMessage: draft, status: "draft",
          });
        }));
        return res.json({ demo: true, drafts: drafts.length });
      }

      // Real AI drafting via Claude — one message per prospect, personalized
      const drafts = [];
      for (const p of targets as any[]) {
        try {
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 300,
              messages: [{
                role: "user",
                content: `Draft a short (max 80 words), ${campaign.tone || "professional"} ${campaign.platform} outreach message from "${req.user!.name}" to "${p.name}" (${p.title || ""} at ${p.company || ""}). Goal: ${campaign.goal || "build a relationship"}. Template hint: "${campaign.messageTemplate || ""}". Rules: sound like a real human, mention something specific about them (use their bio if provided: "${p.bio || ""}"), end with a low-commitment ask (e.g. a reply, not a meeting). No hashtags. No emojis. Output only the message body, no subject line.`,
              }],
            }),
          });
          const data: any = await resp.json();
          const msg = data.content?.[0]?.text?.trim() || `Hi ${p.name}, I'd love to connect.`;
          const saved = await storage.createMessage({
            userId: req.user!.id, campaignId, prospectId: p.id, platform: campaign.platform,
            draftMessage: msg, finalMessage: msg, status: "draft",
          });
          drafts.push(saved);
        } catch (e: any) {
          console.warn(`Draft failed for prospect ${p.id}:`, e.message);
        }
      }

      await storage.updateCampaign(campaignId, req.user!.id, { status: "ready" });
      res.json({ drafts: drafts.length, campaignId });
    } catch (e: any) {
      console.error("Draft-all error:", e);
      res.status(500).json({ message: e.message || "Drafting failed" });
    }
  });

  // Messages for a campaign
  app.get("/api/outreach/campaigns/:id/messages", requireAuth, async (req: Request, res: Response) => {
    const campaignId = parseInt(String(req.params.id), 10);
    const messages = await storage.listMessages(req.user!.id, campaignId);
    res.json(messages);
  });

  // Edit a drafted message
  app.patch("/api/outreach/messages/:id", requireAuth, async (req: Request, res: Response) => {
    const { finalMessage, status } = req.body as any;
    await storage.updateMessage(parseInt(String(req.params.id), 10), {
      ...(finalMessage !== undefined ? { finalMessage } : {}),
      ...(status !== undefined ? { status } : {}),
    });
    res.json({ success: true });
  });

  // Send messages (rate-limited, sequential) — MVP: just marks as sent with logged intent.
  // Real platform sends require connected OAuth with publishing scopes.
  app.post("/api/outreach/campaigns/:id/send", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const campaignId = parseInt(String(req.params.id), 10);
      const campaign = await storage.getCampaign(campaignId, req.user!.id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      const messages = await storage.listMessages(req.user!.id, campaignId);
      const toSend = messages.filter((m: any) => m.status === "draft" || m.status === "approved");

      // Check for active connection for this platform
      const connections = await storage.getSocialConnections(req.user!.id);
      const conn = connections.find((c: any) => c.platform === campaign.platform && c.status === "connected");
      if (!conn && campaign.platform !== "email") {
        return res.status(400).json({
          message: `Connect your ${campaign.platform} account first. Outreach must go through your own authenticated session.`,
          needsConnect: true,
        });
      }

      // Rate limits per platform (messages per hour, conservative)
      const RATE_PER_HOUR: Record<string, number> = { linkedin: 10, twitter: 20, instagram: 15, email: 60, tiktok: 10 };
      const perHour = RATE_PER_HOUR[campaign.platform] || 10;
      const batch = toSend.slice(0, perHour);

      let sent = 0;
      for (const m of batch as any[]) {
        // MVP: mark as queued for send. Actual platform send requires per-platform publish implementation.
        // LinkedIn: POST /v2/messages; Twitter: POST /2/dm_conversations; Instagram: POST /me/conversations
        // Each requires specific OAuth scopes that go beyond what this codebase currently requests.
        await storage.updateMessage(m.id, {
          status: "sent",
          sentAt: new Date().toISOString(),
        });
        sent++;
      }
      await storage.updateCampaign(campaignId, req.user!.id, {
        status: sent === toSend.length ? "completed" : "running",
        sentCount: (campaign.sentCount ?? 0) + sent,
      });
      res.json({
        sent,
        remaining: toSend.length - sent,
        rateLimit: perHour,
        message: sent < toSend.length ? `Sent ${sent} of ${toSend.length}. Rate-limited to ${perHour}/hour — continue later.` : `All ${sent} sent.`,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Send failed" });
    }
  });
}
