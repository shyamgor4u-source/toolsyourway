// Founder Suite + Influencer Suite + Real OAuth Publishing
// All routes registered into the same Express app from routes.ts

import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { Resend } from "resend";
import { publishLinkedIn, publishTwitter } from "./publish-service";

// ============================================================
// VC / INVESTOR DIRECTORIES (pre-built, updateable)
// ============================================================
export const VC_DIRECTORY = {
  india: [
    { name: "Peak XV Partners (ex-Sequoia India)", focus: "Seed-Growth, all sectors", url: "https://www.peakxv.com", contactUrl: "https://www.peakxv.com/contact-us", stage: "Seed, Series A-C", checks: "$500K-$50M" },
    { name: "Lightspeed India", focus: "Consumer, SaaS, Fintech", url: "https://lsip.com", stage: "Seed, Series A-B", checks: "$1M-$20M" },
    { name: "Accel India", focus: "Early-stage tech", url: "https://www.accel.com", stage: "Seed, Series A", checks: "$500K-$10M" },
    { name: "Matrix Partners India (Z47)", focus: "Consumer, SaaS", url: "https://www.z47.com", stage: "Seed, Series A-B", checks: "$1M-$15M" },
    { name: "Blume Ventures", focus: "Early-stage, India-first", url: "https://blume.vc", stage: "Pre-seed, Seed", checks: "$250K-$2M" },
    { name: "Elevation Capital", focus: "Consumer, Fintech, SaaS", url: "https://elevationcapital.com", stage: "Seed, Series A", checks: "$500K-$10M" },
    { name: "Nexus Venture Partners", focus: "Enterprise, SaaS", url: "https://nexusvp.com", stage: "Seed, Series A", checks: "$500K-$15M" },
    { name: "3one4 Capital", focus: "Early-stage, India", url: "https://3one4capital.com", stage: "Seed, Series A", checks: "$250K-$5M" },
    { name: "Kalaari Capital", focus: "Consumer, Tech", url: "https://www.kalaari.com", stage: "Seed, Series A-B", checks: "$500K-$10M" },
    { name: "India Quotient", focus: "Consumer India, Bharat", url: "https://www.indiaquotient.in", stage: "Pre-seed, Seed", checks: "$250K-$2M" },
    { name: "Y Combinator (India)", focus: "All sectors, 3-month program", url: "https://www.ycombinator.com/apply", stage: "Pre-seed, Seed", checks: "$500K standard" },
    { name: "Antler India", focus: "Pre-seed, founders", url: "https://www.antler.co/location/india", stage: "Pre-seed", checks: "$50K-$250K" },
  ],
  mena: [
    { name: "Wa'ed Ventures (Aramco)", focus: "Saudi, tech", url: "https://www.waed.net", stage: "Seed, Series A", checks: "$500K-$10M" },
    { name: "STV", focus: "MENA tech, SaaS, consumer", url: "https://www.stv.com", stage: "Series A-B", checks: "$2M-$50M" },
    { name: "BECO Capital", focus: "Dubai, fintech, mobility", url: "https://beco.capital", stage: "Seed, Series A", checks: "$500K-$10M" },
    { name: "Global Ventures", focus: "MENA-Africa, SaaS, fintech", url: "https://global.vc", stage: "Seed, Series A-B", checks: "$500K-$20M" },
    { name: "Middle East Venture Partners (MEVP)", focus: "Regional tech", url: "https://mevp.com", stage: "Seed, Series A", checks: "$500K-$5M" },
    { name: "Algebra Ventures", focus: "Egypt, MENA", url: "https://algebraventures.com", stage: "Seed, Series A", checks: "$500K-$5M" },
  ],
  sea: [
    { name: "East Ventures", focus: "SEA, all stages, consumer/tech", url: "https://east.vc", stage: "Pre-seed, Seed, Series A-B", checks: "$100K-$10M" },
    { name: "Monk's Hill Ventures", focus: "SEA early-stage tech", url: "https://www.monkshill.com", stage: "Seed, Series A", checks: "$500K-$5M" },
    { name: "Openspace Ventures", focus: "SEA consumer, SaaS", url: "https://openspace.vc", stage: "Seed, Series A-B", checks: "$1M-$20M" },
    { name: "Vertex Ventures SEA", focus: "Regional tech, SaaS", url: "https://www.vertexventures.com", stage: "Series A-B", checks: "$2M-$20M" },
    { name: "AC Ventures", focus: "Indonesia, SEA", url: "https://acv.vc", stage: "Seed, Series A", checks: "$500K-$10M" },
    { name: "Alpha JWC", focus: "Indonesia early-stage", url: "https://alphajwc.com", stage: "Pre-seed, Seed", checks: "$250K-$5M" },
  ],
  us: [
    { name: "Y Combinator", focus: "All, 3-month program", url: "https://www.ycombinator.com/apply", stage: "Pre-seed", checks: "$500K standard" },
    { name: "Sequoia Capital", focus: "All sectors", url: "https://www.sequoiacap.com", stage: "Seed-Growth", checks: "$1M-$100M+" },
    { name: "Andreessen Horowitz (a16z)", focus: "Tech, crypto, AI, bio", url: "https://a16z.com", stage: "Seed-Growth", checks: "$1M-$100M+" },
    { name: "Accel", focus: "Tech globally", url: "https://www.accel.com", stage: "Seed, Series A-B", checks: "$500K-$30M" },
    { name: "Lightspeed Venture Partners", focus: "Consumer, enterprise, fintech", url: "https://lsvp.com", stage: "Seed-Growth", checks: "$1M-$50M" },
    { name: "First Round Capital", focus: "Early-stage", url: "https://firstround.com", stage: "Seed", checks: "$500K-$3M" },
    { name: "Khosla Ventures", focus: "Deep tech, climate", url: "https://www.khoslaventures.com", stage: "Seed, Series A-B", checks: "$1M-$20M" },
  ],
  global_angels: [
    { name: "AngelList Syndicates", focus: "Global, all sectors", url: "https://www.angellist.com", stage: "Pre-seed, Seed", checks: "$10K-$500K" },
    { name: "On Deck Angels", focus: "Community of 2000+ angels", url: "https://www.beondeck.com", stage: "Pre-seed, Seed", checks: "$10K-$250K" },
    { name: "Hustle Fund", focus: "Very early, global", url: "https://www.hustlefund.vc", stage: "Pre-seed", checks: "$25K-$100K" },
  ],
};

// ============================================================
// REGISTER ALL FOUNDER + INFLUENCER + PUBLISHING ROUTES
// ============================================================
export function registerFounderInfluencerRoutes(
  app: Express,
  requireAuth: any,
  requireActiveAccess: any,
) {
  // ============================================================
  // VC Directory (public-ish, requires auth to prevent abuse)
  // ============================================================
  app.get("/api/founders/vc-directory", requireAuth, (_req: Request, res: Response) => {
    res.json(VC_DIRECTORY);
  });

  // ============================================================
  // PITCH DECK GENERATOR
  // ============================================================
  app.post("/api/founders/pitch-deck", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { companyName, oneLiner, problem, solution, market, businessModel, traction, team, ask } = req.body as any;
      if (!companyName || !oneLiner) return res.status(400).json({ message: "companyName and oneLiner required" });

      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      let slides: any[] = [];

      if (anthropicKey) {
        const prompt = `Generate a 10-slide pitch deck for "${companyName}". One-liner: "${oneLiner}". Problem: "${problem || "not specified"}". Solution: "${solution || "not specified"}". Market: "${market || "not specified"}". Business model: "${businessModel || "not specified"}". Traction: "${traction || "not specified"}". Team: "${team || "not specified"}". Ask: "${ask || "not specified"}".

Output ONLY valid JSON array with 10 objects. Each: {"title": "...", "headline": "...", "bullets": ["...", "...", "..."]}. Slides in order: (1) Title, (2) Problem, (3) Solution, (4) Why Now, (5) Market Size, (6) Product, (7) Business Model, (8) Traction, (9) Team, (10) The Ask. Make bullets concrete and specific. Headline = the one sentence that sells that slide. No markdown, no preamble \u2014 just the JSON.`;

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
        });
        const d: any = await resp.json();
        const text: string = d.content?.[0]?.text || "[]";
        try {
          const jsonStart = text.indexOf("[");
          const jsonEnd = text.lastIndexOf("]");
          slides = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        } catch {
          slides = [];
        }
      }

      // Fallback template if no AI or parsing failed
      if (!slides.length) {
        const templates = [
          { title: companyName, headline: oneLiner, bullets: [`Founded ${new Date().getFullYear()}`, "Pre-seed stage"] },
          { title: "The Problem", headline: problem || "A major unsolved pain point", bullets: ["Customers waste hours/money today", "Existing solutions fall short", "Market is primed for change"] },
          { title: "Our Solution", headline: solution || "AI-powered automation", bullets: ["10x faster than alternatives", "Works out of the box", "Scales with the customer"] },
          { title: "Why Now", headline: "The timing is perfect", bullets: ["New AI capabilities", "Market shift post-2024", "Regulatory tailwinds"] },
          { title: "Market Size", headline: market || "$50B+ TAM", bullets: ["Top-down: $50B global", "Bottoms-up: 2M companies", "Growing 30% YoY"] },
          { title: "Product", headline: `How ${companyName} works`, bullets: ["Connect your stack", "AI does the work", "You review and approve"] },
          { title: "Business Model", headline: businessModel || "SaaS subscription", bullets: ["$49-$99 per user / month", "Expansion via PAYG credits", "75% gross margin"] },
          { title: "Traction", headline: traction || "Growing fast", bullets: ["100+ paying customers", "30% MoM growth", "NRR 120%"] },
          { title: "Team", headline: team || "Domain experts", bullets: ["10+ years combined experience", "Ex-Google, ex-Stripe", "Technical + GTM founders"] },
          { title: "The Ask", headline: ask || "Raising $2M seed", bullets: ["18-month runway", "Hire 5 engineers + 2 GTM", "Reach $2M ARR"] },
        ];
        slides = templates;
      }

      const saved = await storage.createPitchDeck({
        userId: req.user!.id, companyName, oneLiner,
        slides: JSON.stringify(slides),
      });
      res.status(201).json({ ...saved, slides });
    } catch (e: any) {
      console.error("Pitch deck error:", e);
      res.status(500).json({ message: e.message || "Failed to generate deck" });
    }
  });

  app.get("/api/founders/pitch-decks", requireAuth, async (req: Request, res: Response) => {
    const decks = await storage.listPitchDecks(req.user!.id);
    res.json(decks.map((d: any) => ({ ...d, slides: d.slides ? JSON.parse(d.slides) : [] })));
  });

  // Render a specific deck as a standalone HTML page (printable)
  app.get("/api/founders/pitch-decks/:id/html", requireAuth, async (req: Request, res: Response) => {
    const decks = await storage.listPitchDecks(req.user!.id);
    const deck = decks.find((d: any) => d.id === parseInt(String(req.params.id), 10));
    if (!deck) return res.status(404).send("Not found");
    const slides = deck.slides ? JSON.parse(deck.slides) : [];
    const slideHtml = slides.map((s: any, i: number) => `
      <section class="slide">
        <div class="slide-num">${String(i + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}</div>
        <h2>${s.title || ""}</h2>
        ${s.headline ? `<p class="headline">${s.headline}</p>` : ""}
        ${s.bullets ? `<ul>${s.bullets.map((b: string) => `<li>${b}</li>`).join("")}</ul>` : ""}
      </section>
    `).join("");
    res.type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>${deck.companyName} \u2014 Pitch Deck</title>
<style>
  :root { --primary: #1E1650; --accent: #E9A820; --bg: #FDFCF8; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,'Segoe UI',Inter,sans-serif;background:var(--bg);color:var(--primary)}
  .slide{page-break-after:always;min-height:100vh;padding:80px 60px;display:flex;flex-direction:column;justify-content:center;position:relative;border-bottom:1px solid #e5e5e5}
  .slide:first-child{background:linear-gradient(135deg,var(--primary),#3D309A);color:white}
  .slide-num{position:absolute;top:30px;right:60px;font-size:12px;letter-spacing:2px;opacity:0.5}
  h2{font-size:48px;font-weight:800;letter-spacing:-1px;margin-bottom:16px;line-height:1.1}
  .headline{font-size:24px;font-weight:500;color:var(--accent);margin-bottom:32px;line-height:1.3}
  ul{list-style:none;padding:0}
  li{font-size:20px;padding:12px 0;border-bottom:1px solid rgba(30,22,80,0.1);line-height:1.5}
  li:before{content:"\u2192 ";color:var(--accent);margin-right:12px;font-weight:700}
  .slide:first-child h2{font-size:72px;color:white}
  .slide:first-child .headline{color:var(--accent);font-size:28px}
  .slide:first-child li:before{color:var(--accent)}
  @media print{.slide{min-height:100vh;page-break-after:always}}
</style></head><body>${slideHtml}</body></html>`);
  });

  // ============================================================
  // COMPETITOR TRACKER
  // ============================================================
  app.get("/api/founders/competitors", requireAuth, async (req: Request, res: Response) => {
    const list = await storage.listCompetitors(req.user!.id);
    res.json(list.map((c: any) => ({
      ...c,
      strengths: c.strengths ? JSON.parse(c.strengths) : [],
      weaknesses: c.weaknesses ? JSON.parse(c.weaknesses) : [],
    })));
  });

  app.post("/api/founders/competitors", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { name, website } = req.body as any;
      if (!name) return res.status(400).json({ message: "name required" });

      let strengths: string[] = [];
      let weaknesses: string[] = [];
      let description = req.body.description || "";
      let pricing = req.body.pricing || "";
      let recentNews = "";

      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicKey && website) {
        try {
          const prompt = `Research the company "${name}" (${website}). Return ONLY a JSON object:
{"description": "2-sentence summary", "pricing": "starting at $X/mo or contact for pricing", "strengths": ["3 strengths"], "weaknesses": ["3 weaknesses or gaps"], "recentNews": "one recent noteworthy development if you know of any"}
No preamble, just JSON.`;
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
            body: JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
          });
          const d: any = await resp.json();
          const text = d.content?.[0]?.text || "{}";
          const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
          description = parsed.description || description;
          pricing = parsed.pricing || pricing;
          strengths = parsed.strengths || [];
          weaknesses = parsed.weaknesses || [];
          recentNews = parsed.recentNews || "";
        } catch (e) { console.warn("Competitor AI analysis failed:", e); }
      }

      // Fetch favicon as logoUrl
      const logoUrl = website ? `https://www.google.com/s2/favicons?domain=${new URL(website.startsWith("http") ? website : `https://${website}`).hostname}&sz=128` : undefined;

      const saved = await storage.createCompetitor({
        userId: req.user!.id, name, website,
        description, pricing,
        strengths: JSON.stringify(strengths),
        weaknesses: JSON.stringify(weaknesses),
        recentNews, logoUrl,
      });
      res.status(201).json({ ...saved, strengths, weaknesses });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/founders/competitors/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.deleteCompetitor(parseInt(String(req.params.id), 10), req.user!.id);
    res.json({ success: true });
  });

  // ============================================================
  // LAUNCH DAY KIT (PH + HN + Twitter + LinkedIn + Email)
  // ============================================================
  app.post("/api/founders/launch-kit", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { productName, description, tagline, url } = req.body as any;
      if (!productName || !description) return res.status(400).json({ message: "productName and description required" });

      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      let kit: any = {};

      if (anthropicKey) {
        const prompt = `Generate a launch-day content kit for "${productName}" (${tagline || ""}). Description: ${description}. URL: ${url || "https://example.com"}.
Return ONLY JSON:
{
  "phPost": {"tagline": "<60 char tagline>", "description": "<240 char Product Hunt description>", "firstComment": "<hunter's first comment, 300 chars, explains motivation>"},
  "hnPost": {"title": "Show HN: ${productName} \u2013 <benefit>", "body": "<HN Show HN body, 250 words, technical tone, mentions tech stack, what's novel, asks for feedback>"},
  "twitterThread": ["<tweet 1 \u2014 hook, \u2264280 chars>", "<tweet 2>", "<tweet 3>", "<tweet 4>", "<tweet 5 \u2014 CTA with URL>"],
  "linkedinPost": "<LinkedIn announcement, 3 paragraphs, professional tone, ends with 3 hashtags>",
  "emailBlast": "Subject: <subject>\\n\\n<body, 150 words, personal tone, clear CTA>"
}
No preamble.`;
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: 2500, messages: [{ role: "user", content: prompt }] }),
        });
        const d: any = await resp.json();
        const text = d.content?.[0]?.text || "{}";
        try { kit = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); }
        catch { kit = {}; }
      }

      // Fallback if no AI
      if (!kit.phPost) {
        kit = {
          phPost: { tagline: tagline || description.slice(0, 60), description: description.slice(0, 240), firstComment: `Hey Product Hunt! Building ${productName} because ${description.split(".")[0]}. Would love your feedback.` },
          hnPost: { title: `Show HN: ${productName} \u2013 ${tagline || description.split(".")[0]}`, body: `Hi HN, we built ${productName} because ${description}. We're using [stack]. Looking for feedback on [area]. Try it at ${url || "https://example.com"}.` },
          twitterThread: [
            `Today we're launching ${productName}. ${tagline || description.split(".")[0]}.`,
            `Here's why we built it: ${description}`,
            `It works like this: [explain in 280 chars]`,
            `Early results: [traction metric]`,
            `Try it: ${url || "https://example.com"} \u2014 feedback welcome.`,
          ],
          linkedinPost: `Excited to launch ${productName} today.\n\n${description}\n\nBuilding in public has been the best decision. Link in comments.\n\n#startup #product #launch`,
          emailBlast: `Subject: ${productName} is live\n\nHi,\n\nWe just launched ${productName}. ${description}\n\nTry it: ${url || "https://example.com"}\n\nReply if you have feedback \u2014 I read every email.\n\nShyam`,
        };
      }

      const saved = await storage.createLaunchKit({
        userId: req.user!.id, productName, description,
        phPost: JSON.stringify(kit.phPost || {}),
        hnPost: JSON.stringify(kit.hnPost || {}),
        twitterThread: JSON.stringify(kit.twitterThread || []),
        linkedinPost: kit.linkedinPost || "",
        emailBlast: kit.emailBlast || "",
      });
      res.status(201).json({ ...saved, kit });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/founders/launch-kits", requireAuth, async (req: Request, res: Response) => {
    const list = await storage.listLaunchKits(req.user!.id);
    res.json(list.map((k: any) => ({
      ...k,
      phPost: k.phPost ? JSON.parse(k.phPost) : {},
      hnPost: k.hnPost ? JSON.parse(k.hnPost) : {},
      twitterThread: k.twitterThread ? JSON.parse(k.twitterThread) : [],
    })));
  });

  // ============================================================
  // INFLUENCER: MEDIA KIT
  // ============================================================
  app.post("/api/influencers/media-kit", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const body = req.body as any;
      const saved = await storage.createMediaKit({
        userId: req.user!.id,
        creatorName: body.creatorName,
        niche: body.niche,
        bio: body.bio,
        stats: JSON.stringify(body.stats || {}),
        rateCard: JSON.stringify(body.rateCard || {}),
        pastBrands: JSON.stringify(body.pastBrands || []),
        testimonials: JSON.stringify(body.testimonials || []),
        contactEmail: body.contactEmail,
      });
      res.status(201).json(saved);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/influencers/media-kits", requireAuth, async (req: Request, res: Response) => {
    const list = await storage.listMediaKits(req.user!.id);
    res.json(list.map((k: any) => ({
      ...k,
      stats: k.stats ? JSON.parse(k.stats) : {},
      rateCard: k.rateCard ? JSON.parse(k.rateCard) : {},
      pastBrands: k.pastBrands ? JSON.parse(k.pastBrands) : [],
      testimonials: k.testimonials ? JSON.parse(k.testimonials) : [],
    })));
  });

  app.get("/api/influencers/media-kits/:id/html", requireAuth, async (req: Request, res: Response) => {
    const kits = await storage.listMediaKits(req.user!.id);
    const kit = kits.find((k: any) => k.id === parseInt(String(req.params.id), 10));
    if (!kit) return res.status(404).send("Not found");
    const stats = kit.stats ? JSON.parse(kit.stats) : {};
    const rate = kit.rateCard ? JSON.parse(kit.rateCard) : {};
    const brands = kit.pastBrands ? JSON.parse(kit.pastBrands) : [];

    const fmt = (n: any) => n ? new Intl.NumberFormat().format(n) : "\u2014";
    res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"/><title>${kit.creatorName} \u2014 Media Kit</title>
<style>
  :root{--primary:#1E1650;--accent:#E9A820;--bg:#FDFCF8}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,'Segoe UI',Inter,sans-serif;background:var(--bg);color:var(--primary);padding:40px;max-width:900px;margin:0 auto}
  header{text-align:center;padding:40px 0;border-bottom:2px solid var(--accent);margin-bottom:40px}
  header h1{font-size:48px;letter-spacing:-1px}
  header .niche{color:var(--accent);font-weight:600;letter-spacing:2px;text-transform:uppercase;font-size:14px;margin-top:8px}
  header p{margin-top:16px;color:#555;max-width:600px;margin-left:auto;margin-right:auto;line-height:1.6}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:48px}
  .stat{background:white;padding:24px;border-radius:12px;border:1px solid #e5e5e5;text-align:center}
  .stat .num{font-size:32px;font-weight:800;color:var(--primary)}
  .stat .lbl{font-size:11px;text-transform:uppercase;color:#666;letter-spacing:1px;margin-top:4px}
  section{margin-bottom:40px}
  h2{font-size:24px;margin-bottom:16px;color:var(--primary);padding-bottom:8px;border-bottom:1px solid #e5e5e5}
  .rate-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .rate{background:white;padding:16px;border-radius:8px;border:1px solid #e5e5e5;display:flex;justify-content:space-between;align-items:center}
  .rate .type{font-weight:600}
  .rate .price{font-weight:800;color:var(--accent);font-size:20px}
  .brands{display:flex;flex-wrap:wrap;gap:8px}
  .brand{background:var(--primary);color:white;padding:6px 14px;border-radius:20px;font-size:13px}
  .contact{background:var(--primary);color:white;padding:32px;border-radius:12px;text-align:center}
  .contact a{color:var(--accent);font-size:20px;font-weight:600;text-decoration:none}
</style></head><body>
<header>
  <div class="niche">${kit.niche || "Creator"}</div>
  <h1>${kit.creatorName}</h1>
  ${kit.bio ? `<p>${kit.bio}</p>` : ""}
</header>
<section class="stats">
  ${stats.ig_followers ? `<div class="stat"><div class="num">${fmt(stats.ig_followers)}</div><div class="lbl">Instagram Followers</div></div>` : ""}
  ${stats.yt_subs ? `<div class="stat"><div class="num">${fmt(stats.yt_subs)}</div><div class="lbl">YouTube Subscribers</div></div>` : ""}
  ${stats.tiktok_followers ? `<div class="stat"><div class="num">${fmt(stats.tiktok_followers)}</div><div class="lbl">TikTok Followers</div></div>` : ""}
  ${stats.avg_views ? `<div class="stat"><div class="num">${fmt(stats.avg_views)}</div><div class="lbl">Avg Views / Post</div></div>` : ""}
  ${stats.engagement_rate ? `<div class="stat"><div class="num">${stats.engagement_rate}%</div><div class="lbl">Engagement Rate</div></div>` : ""}
</section>
${Object.keys(rate).length > 0 ? `
<section>
  <h2>Rate Card</h2>
  <div class="rate-grid">
    ${rate.ig_post ? `<div class="rate"><span class="type">Instagram Post</span><span class="price">$${fmt(rate.ig_post)}</span></div>` : ""}
    ${rate.ig_story ? `<div class="rate"><span class="type">Instagram Story</span><span class="price">$${fmt(rate.ig_story)}</span></div>` : ""}
    ${rate.ig_reel ? `<div class="rate"><span class="type">Instagram Reel</span><span class="price">$${fmt(rate.ig_reel)}</span></div>` : ""}
    ${rate.yt_dedicated ? `<div class="rate"><span class="type">YouTube Dedicated</span><span class="price">$${fmt(rate.yt_dedicated)}</span></div>` : ""}
    ${rate.yt_integration ? `<div class="rate"><span class="type">YouTube Integration</span><span class="price">$${fmt(rate.yt_integration)}</span></div>` : ""}
    ${rate.tiktok_video ? `<div class="rate"><span class="type">TikTok Video</span><span class="price">$${fmt(rate.tiktok_video)}</span></div>` : ""}
  </div>
</section>
` : ""}
${brands.length > 0 ? `<section><h2>Past Brand Partners</h2><div class="brands">${brands.map((b: string) => `<span class="brand">${b}</span>`).join("")}</div></section>` : ""}
${kit.contactEmail ? `<section class="contact"><div style="font-size:12px;opacity:0.7;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Inquiries</div><a href="mailto:${kit.contactEmail}">${kit.contactEmail}</a></section>` : ""}
</body></html>`);
  });

  // ============================================================
  // RATE CARD CALCULATOR (pure formula, no AI)
  // ============================================================
  app.post("/api/influencers/rate-card", requireAuth, (req: Request, res: Response) => {
    const { followerCount, engagementRate, niche, geo } = req.body as any;
    if (!followerCount) return res.status(400).json({ message: "followerCount required" });

    // Industry-standard formula: base rate ~ followers / 100 per post
    // Modified by engagement rate (2% baseline), niche (tech/finance premium), geo (US > EU > ROW)
    const f = Number(followerCount);
    const er = Number(engagementRate) || 2; // default 2%
    const basePerPost = f / 100; // $10 per 1k followers baseline

    const engagementMultiplier = Math.max(0.5, er / 2); // 2% = 1.0x, 4% = 2.0x
    const nicheMultipliers: Record<string, number> = {
      tech: 1.5, finance: 1.5, business: 1.4, beauty: 1.3, fashion: 1.2,
      fitness: 1.1, food: 1.0, travel: 1.0, lifestyle: 0.9, entertainment: 0.8,
    };
    const nicheMultiplier = nicheMultipliers[String(niche || "").toLowerCase()] || 1.0;
    const geoMultipliers: Record<string, number> = { US: 1.5, UK: 1.3, CA: 1.3, AU: 1.2, IN: 0.5, SEA: 0.5, MENA: 0.8, EU: 1.1 };
    const geoMultiplier = geoMultipliers[String(geo || "US").toUpperCase()] || 1.0;

    const multiplier = engagementMultiplier * nicheMultiplier * geoMultiplier;
    const igPost = Math.round(basePerPost * multiplier);

    const rateCard = {
      ig_post: igPost,
      ig_story: Math.round(igPost * 0.3),
      ig_reel: Math.round(igPost * 1.5),
      yt_dedicated: Math.round(f / 50), // ~$20 per 1k sub dedicated video
      yt_integration: Math.round(f / 150),
      tiktok_video: Math.round(igPost * 1.2),
      breakdown: {
        basePerPost: Math.round(basePerPost),
        engagementMultiplier: Math.round(engagementMultiplier * 100) / 100,
        nicheMultiplier, geoMultiplier,
        finalMultiplier: Math.round(multiplier * 100) / 100,
      },
    };
    res.json(rateCard);
  });

  // ============================================================
  // BRAND COLLAB PIPELINE
  // ============================================================
  app.get("/api/influencers/collabs", requireAuth, async (req: Request, res: Response) => {
    const list = await storage.listBrandCollabs(req.user!.id);
    res.json(list.map((c: any) => ({ ...c, deliverables: c.deliverables ? JSON.parse(c.deliverables) : [] })));
  });

  app.post("/api/influencers/collabs", requireAuth, async (req: Request, res: Response) => {
    const body = req.body as any;
    const saved = await storage.createBrandCollab({
      userId: req.user!.id,
      brandName: body.brandName,
      brandLogo: body.brandLogo,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      stage: body.stage || "pitched",
      dealValue: body.dealValue,
      currency: body.currency || "USD",
      deliverables: JSON.stringify(body.deliverables || []),
      deadline: body.deadline,
      notes: body.notes,
    });
    res.status(201).json(saved);
  });

  app.patch("/api/influencers/collabs/:id", requireAuth, async (req: Request, res: Response) => {
    const body = req.body as any;
    if (body.deliverables && Array.isArray(body.deliverables)) body.deliverables = JSON.stringify(body.deliverables);
    await storage.updateBrandCollab(parseInt(String(req.params.id), 10), req.user!.id, body);
    res.json({ success: true });
  });

  app.delete("/api/influencers/collabs/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.deleteBrandCollab(parseInt(String(req.params.id), 10), req.user!.id);
    res.json({ success: true });
  });

  // ============================================================
  // CONTENT CALENDAR (AI auto-fill)
  // ============================================================
  app.get("/api/influencers/calendar", requireAuth, async (req: Request, res: Response) => {
    const list = await storage.listContentCalendar(req.user!.id);
    res.json(list);
  });

  app.post("/api/influencers/calendar/auto-fill", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { niche, platforms, startDate, days } = req.body as any;
      const daysCount = Math.min(Number(days) || 30, 60);
      const platformList: string[] = platforms || ["instagram", "tiktok"];
      const start = startDate ? new Date(startDate) : new Date();

      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      let ideas: any[] = [];

      if (anthropicKey) {
        const prompt = `Generate ${daysCount} content ideas for a "${niche || "lifestyle"}" creator across platforms: ${platformList.join(", ")}.
Return ONLY a JSON array of ${daysCount} objects. Each: {"dayOffset": 0-${daysCount - 1}, "platform": "one of ${platformList.join("/")}", "contentType": "reel|post|story|short|video", "topic": "<specific topic>", "hook": "<scroll-stopping first line>", "caption": "<full caption, 60-80 words>", "hashtags": "<10 hashtags space-separated>"}.
Mix content types. Aim for 1 post per day. Make topics SPECIFIC (not "share tips" but "5 tools I use daily for ${niche}"). No preamble.`;
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-3-5-sonnet-20241022", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
        });
        const d: any = await resp.json();
        const text = d.content?.[0]?.text || "[]";
        try {
          ideas = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1));
        } catch { ideas = []; }
      }

      // Fallback pattern
      if (!ideas.length) {
        const templates = ["Day in the life", "Tools I use", "Behind the scenes", "Q&A", "Tips for beginners", "My setup", "Mistakes I made", "Week recap", "Quick how-to", "Favorite products"];
        ideas = Array.from({ length: daysCount }).map((_, i) => ({
          dayOffset: i,
          platform: platformList[i % platformList.length],
          contentType: i % 3 === 0 ? "reel" : "post",
          topic: `${templates[i % templates.length]} (${niche || "general"})`,
          hook: `POV: You're about to learn ${templates[i % templates.length].toLowerCase()}`,
          caption: `Sharing ${templates[i % templates.length].toLowerCase()} today...`,
          hashtags: `#${(niche || "creator").replace(/\s+/g, "")} #contentcreator #trending`,
        }));
      }

      // Convert to dated entries
      const entries = ideas.slice(0, daysCount).map((idea: any) => {
        const d = new Date(start);
        d.setDate(d.getDate() + (idea.dayOffset || 0));
        return {
          date: d.toISOString().slice(0, 10),
          platform: idea.platform || platformList[0],
          contentType: idea.contentType,
          topic: idea.topic,
          hook: idea.hook,
          caption: idea.caption,
          hashtags: idea.hashtags,
          status: "idea",
        };
      });

      const saved = await storage.bulkCreateCalendar(req.user!.id, entries);
      res.json({ added: saved.length, entries: saved });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/influencers/calendar/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.updateCalendarEntry(parseInt(String(req.params.id), 10), req.user!.id, req.body);
    res.json({ success: true });
  });

  app.delete("/api/influencers/calendar/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.deleteCalendarEntry(parseInt(String(req.params.id), 10), req.user!.id);
    res.json({ success: true });
  });

  // ============================================================
  // OAUTH PUBLISHING \u2014 REAL SENDS
  // ============================================================

  // Email send via Resend (works out-of-the-box, no platform OAuth needed)
  app.post("/api/publish/email", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { to, subject, body, fromName } = req.body as any;
      if (!to || !subject || !body) return res.status(400).json({ message: "to, subject, body required" });
      if (!process.env.RESEND_API_KEY) return res.status(500).json({ message: "RESEND_API_KEY not configured" });

      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: `${fromName || req.user!.name} <hello@toolsyourway.com>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        replyTo: req.user!.email,
        html: body.replace(/\n/g, "<br>"),
      });
      if (error) return res.status(500).json({ message: error.message });
      res.json({ success: true, messageId: data?.id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // LinkedIn: post to user's profile feed or to a LinkedIn Page/Organization.
  // Pass `destinationId` (an organization id) + `destinationType: "organization"`
  // to publish as a Page; omit for the personal profile (default, backward-compatible).
  // Requires w_member_social (profile) and w_organization_social (page) scopes.
  app.post("/api/publish/linkedin-post", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { text, destinationId, destinationType } = req.body as any;
      if (!text) return res.status(400).json({ message: "text required" });
      const connections = await storage.getSocialConnections(req.user!.id);
      const linkedin = connections.find((c: any) => c.platform === "linkedin" && c.status === "connected" && c.accessToken);
      if (!linkedin?.accessToken) {
        return res.status(400).json({ message: "Connect your LinkedIn account first (requires w_member_social scope).", needsConnect: true });
      }

      const asOrganization = destinationType === "organization" || destinationType === "page";
      const outcome = await publishLinkedIn(linkedin as any, text, {
        asOrganization,
        organizationId: asOrganization ? destinationId : undefined,
      });
      if (!outcome.ok) {
        return res.status(outcome.code === "not_connected" ? 400 : 502).json({ message: outcome.message });
      }
      res.json({ success: true, postId: outcome.id, url: outcome.url });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Twitter: post a tweet or thread (requires tweet.write scope)
  // For tweets with media attached, prefer POST /api/publish/twitter-with-media,
  // which performs the OAuth 1.0a media upload first and then attaches media_ids
  // here. `mediaIds` (already-uploaded ids) can be passed for the first tweet.
  app.post("/api/publish/twitter-post", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const { text, thread, mediaIds, destinationType } = req.body as any; // thread = array of tweets
      // X has no Page concept — only the connected profile can post.
      if (destinationType && destinationType !== "profile") {
        return res.status(400).json({ message: "X / Twitter only supports posting to your profile. Pages are not available." });
      }
      const connections = await storage.getSocialConnections(req.user!.id);
      const twitter = connections.find((c: any) => c.platform === "twitter" && c.status === "connected" && c.accessToken);
      if (!twitter?.accessToken) {
        return res.status(400).json({ message: "Connect your X (Twitter) account first (OAuth 2.0 PKCE).", needsConnect: true });
      }
      const tweets = Array.isArray(thread) && thread.length > 0 ? thread : [text];
      let lastId: string | undefined;
      const posted: any[] = [];
      for (let i = 0; i < tweets.length; i++) {
        const tweetText = tweets[i];
        const body: any = { text: tweetText };
        if (lastId) body.reply = { in_reply_to_tweet_id: lastId };
        if (i === 0 && Array.isArray(mediaIds) && mediaIds.length > 0) {
          body.media = { media_ids: mediaIds };
        }
        const resp = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${twitter.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          return res.status(resp.status).json({ message: `Twitter error: ${errText.slice(0, 200)}`, postedCount: posted.length });
        }
        const data: any = await resp.json();
        lastId = data.data?.id;
        posted.push(data.data);
        // Small delay between tweets in thread
        if (tweets.length > 1) await new Promise(r => setTimeout(r, 500));
      }
      res.json({ success: true, tweets: posted, url: `https://twitter.com/i/web/status/${posted[0]?.id}` });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });
}
