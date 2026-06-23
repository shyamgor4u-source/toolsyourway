// ============================================================
// GROWTH MISSIONS — Nexus orchestration layer
// ============================================================
// A Mission is the bridge between Nexus the strategist and the rest of the
// platform: it ingests the user's goal, reads their connected social profile,
// produces a plan, then auto-drafts copy + visuals for each scheduled post.
// The user reviews drafts (in-app or via email), approves, and the existing
// publish worker pushes them live on schedule.
//
// Storage:
//   growth_missions  — top-level mission rows (one per goal/campaign)
//   scheduled_posts  — per-post drafts, linked via mission_id (existing table)
//
// Reasoning:
//   We deliberately reuse `scheduled_posts` instead of creating a parallel
//   "mission_posts" table. The lifecycle (draft→approved→publishing→published)
//   is already battle-tested and the publish worker already enforces "only
//   publish approved + due" semantics.

import type { Express, Request, Response } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "./storage";
import { growthMissions, scheduledPosts, socialConnections } from "../shared/schema";
import type { GrowthMission, SocialConnection, ScheduledPost } from "../shared/schema";

// ----- AI provider helpers (mirror /api/chat fallback chain) -----

const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5" },
  { id: "claude-sonnet-4-20250514",   label: "Claude Sonnet 4" },
  { id: "claude-3-5-sonnet-latest",   label: "Claude 3.5 Sonnet" },
];
const OPENAI_MODELS = [
  { id: "gpt-4o",      label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callClaude(modelId: string, system: string, user: string, maxTokens = 3500) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, status: 0, json: { error: { message: "ANTHROPIC_API_KEY missing" } } };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: modelId, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  return { ok: r.ok, status: r.status, json: await r.json() as any };
}

async function callOpenAI(modelId: string, system: string, user: string, maxTokens = 3500) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, status: 0, json: { error: { message: "OPENAI_API_KEY missing" } } };
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelId,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      // Encourage JSON responses where applicable.
      response_format: { type: "text" },
    }),
  });
  return { ok: r.ok, status: r.status, json: await r.json() as any };
}

// Resilient text generation: walks Claude models with retry-on-overload, then
// falls back to OpenAI if all Claude attempts fail. Returns the raw text +
// the model that served the request.
async function generateText(system: string, user: string, maxTokens = 3500): Promise<{ text: string; modelId: string; modelLabel: string; provider: string } | null> {
  for (const m of CLAUDE_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { ok, status, json } = await callClaude(m.id, system, user, maxTokens);
      if (ok && json?.content?.[0]?.text) {
        return { text: json.content[0].text, modelId: m.id, modelLabel: m.label, provider: "Anthropic" };
      }
      const transient = [408, 425, 429, 500, 502, 503, 504, 529].includes(status);
      if (!transient) break; // hard error — try next Claude model
      await sleep(600 * Math.pow(2.2, attempt));
    }
  }
  for (const m of OPENAI_MODELS) {
    const { ok, json } = await callOpenAI(m.id, system, user, maxTokens);
    const text = json?.choices?.[0]?.message?.content;
    if (ok && typeof text === "string" && text.trim().length > 0) {
      return { text, modelId: m.id, modelLabel: m.label, provider: "OpenAI" };
    }
  }
  return null;
}

// ----- LinkedIn profile reader -----

interface LinkedInProfile {
  sub?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  picture?: string;
  locale?: string;
}

async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile | null> {
  if (!accessToken) return null;
  try {
    const r = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const j: any = await r.json();
    return {
      sub: j.sub,
      name: j.name,
      givenName: j.given_name,
      familyName: j.family_name,
      email: j.email,
      picture: j.picture,
      locale: j.locale?.country ? `${j.locale.language}-${j.locale.country}` : undefined,
    };
  } catch {
    return null;
  }
}

// ----- Plan generation prompt -----

function buildPlannerSystemPrompt(userName: string): string {
  return `You are Nexus, an elite AI Chief of Staff for ToolsYourWay. You are designing a measurable, executable growth campaign.

You return ONLY valid JSON matching this schema (no prose, no markdown, no code fences):

{
  "name": "<short campaign name, max 60 chars>",
  "summary": "<2-sentence why-this-will-work>",
  "voice": "<3-5 word voice descriptor, e.g. 'warm, contrarian, story-led'>",
  "audience": "<who the user is talking to>",
  "pillars": ["<pillar 1>", "<pillar 2>", "<pillar 3>", "<pillar 4>"],
  "postsPerWeek": <integer 3-7>,
  "durationDays": <integer, default 60>,
  "weeklyThemes": [
    { "week": 1, "theme": "<short theme>", "objective": "<one-sentence outcome>" },
    ... (one entry per week up to durationDays/7)
  ],
  "kickoffPosts": [
    {
      "pillar": "<one of the pillars>",
      "hook": "<scroll-stopping first line>",
      "body": "<full LinkedIn post body, 800-1400 chars, with line breaks as \\n\\n>",
      "cta": "<one-line call to action>",
      "imagePrompt": "<DALL-E image prompt that fits the post>",
      "dayOffset": 0
    },
    ... (exactly postsPerWeek entries, dayOffset 0..6)
  ]
}

Rules:
- Use ${userName}'s actual story, role, and goal — no generic corporate fluff.
- Every kickoff post must reference a specific lived detail from the user's profile or goal.
- Hooks should pattern-interrupt; no "Excited to share...", no buzzwords.
- imagePrompt: visual, specific, tasteful, brand-safe. Avoid celebrities/logos.
- Output MUST parse as JSON. Do not wrap in markdown fences.`;
}

function buildPostsBatchPrompt(mission: GrowthMission, count: number): { system: string; user: string } {
  const pillars = (() => { try { return JSON.parse(mission.pillars || "[]"); } catch { return []; } })();
  const profile = (() => { try { return JSON.parse(mission.profileSnapshot || "{}"); } catch { return {}; } })();
  const system = `You are Nexus authoring LinkedIn posts for an ongoing campaign. Return ONLY valid JSON: an array of ${count} post objects.

Schema per post:
{
  "pillar": "<one of: ${pillars.join(", ")}>",
  "hook": "<1-line scroll-stopper>",
  "body": "<800-1400 char LinkedIn post body with \\n\\n line breaks>",
  "cta": "<1-line CTA>",
  "imagePrompt": "<DALL-E prompt for an image that complements the post>"
}

Rules:
- Distribute pillars roughly evenly across the ${count} posts.
- Voice: ${mission.voice || "professional, warm, story-led"}.
- Audience: ${mission.audience || "general professionals"}.
- Reference concrete details from the user's profile and goal.
- Output MUST parse as JSON array. No markdown fences. No prose.`;
  const user = `Campaign: ${mission.name}
Goal: ${mission.goal}
Author: ${profile.name || "the user"} (${profile.headline || ""})
Profile summary: ${profile.summary || ""}

Generate ${count} posts now.`;
  return { system, user };
}

function safeParseJSON<T = any>(text: string): T | null {
  if (!text) return null;
  // Strip code fences if model added them despite instructions.
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  try { return JSON.parse(cleaned) as T; } catch { /* try harder */ }
  // Find first { or [ and last } or ] for sloppy outputs.
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  const start = firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) as T; } catch { /* fall through */ }
  }
  return null;
}

// ----- DALL-E image generation (best-effort, never fatal) -----

async function generatePostImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !prompt) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt.slice(0, 1000),
        size: "1024x1024",
        quality: "standard",
        n: 1,
      }),
    });
    if (!r.ok) {
      console.warn("[Missions] image gen failed", r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const j: any = await r.json();
    return j?.data?.[0]?.url || null;
  } catch (e: any) {
    console.warn("[Missions] image gen exception", e?.message || e);
    return null;
  }
}

// ----- Helpers: scheduling & email -----

function nextPostingDate(start: Date, dayOffset: number, hour = 9): string {
  const d = new Date(start);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function sendReviewEmail(to: string, mission: GrowthMission, posts: ScheduledPost[], baseUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return { sent: false, reason: "Email not configured or no recipient" };
  const resend = new Resend(apiKey);
  const rows = posts.map((p) => `
    <tr>
      <td style="padding:14px 0; border-bottom:1px solid #eee;">
        <div style="font-size:12px;color:#888;margin-bottom:4px;">${p.pillar || "Post"} · scheduled ${p.scheduledFor ? new Date(p.scheduledFor).toLocaleDateString() : "TBD"}</div>
        <div style="font-size:14px;line-height:1.5;color:#222;white-space:pre-wrap;">${(p.content || "").slice(0, 600)}${(p.content || "").length > 600 ? "…" : ""}</div>
        ${p.imageUrl ? `<img src="${p.imageUrl}" style="max-width:320px;margin-top:10px;border-radius:8px;" />` : ""}
        <div style="margin-top:10px;">
          <a href="${baseUrl}/missions/${mission.id}#post-${p.id}" style="background:#1E1650;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:13px;">Review &amp; approve</a>
        </div>
      </td>
    </tr>`).join("");
  try {
    await resend.emails.send({
      from: "ToolsYourWay <onboarding@resend.dev>",
      to: [to],
      subject: `[Nexus] ${posts.length} new posts ready for your review — ${mission.name}`,
      html: `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:640px;margin:auto;padding:24px;">
        <h2 style="color:#1E1650;margin-bottom:8px;">Nexus drafted ${posts.length} posts for ${mission.name}</h2>
        <p style="color:#555;font-size:14px;">Goal: ${mission.goal}</p>
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <p style="margin-top:24px;color:#777;font-size:12px;">Posts only go live AFTER you approve them. Review them all in one place: <a href="${baseUrl}/missions/${mission.id}">Open mission →</a></p>
      </div>`,
    });
    return { sent: true };
  } catch (e: any) {
    console.error("[Missions] email send failed", e?.message || e);
    return { sent: false, reason: e?.message || "Email send failed" };
  }
}

// ============================================================
// Routes
// ============================================================
export function registerMissionsRoutes(
  app: Express,
  requireAuth: any,
  requireActiveAccess: any,
) {
  // ---- Read connected LinkedIn profile ----
  app.get("/api/linkedin/profile/me", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const conns = await db.select().from(socialConnections)
      .where(and(eq(socialConnections.userId, user.id), eq(socialConnections.platform, "linkedin")));
    const conn = conns[0];
    if (!conn || !conn.accessToken || conn.status !== "connected") {
      return res.status(404).json({ message: "LinkedIn is not connected. Connect it from the Marketing Bot page." });
    }
    const live = await fetchLinkedInProfile(conn.accessToken);
    res.json({
      cached: {
        accountName: conn.accountName,
        displayName: conn.displayName,
        profileUrl: conn.profileUrl,
        profilePictureUrl: conn.profilePictureUrl,
        followerCount: conn.followerCount,
      },
      live,
    });
  });

  // ---- List missions ----
  app.get("/api/missions", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const rows = await db.select().from(growthMissions)
      .where(eq(growthMissions.userId, user.id))
      .orderBy(desc(growthMissions.createdAt));
    res.json(rows);
  });

  // ---- Mission detail (with linked posts) ----
  app.get("/api/missions/:id", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const id = Number(req.params.id);
    const m = (await db.select().from(growthMissions).where(and(eq(growthMissions.id, id), eq(growthMissions.userId, user.id))))[0];
    if (!m) return res.status(404).json({ message: "Mission not found" });
    const posts = await db.select().from(scheduledPosts)
      .where(and(eq(scheduledPosts.userId, user.id), eq(scheduledPosts.missionId, id)))
      .orderBy(scheduledPosts.scheduledFor);
    res.json({ mission: m, posts });
  });

  // ---- Create a mission ----
  // Body: { goal: string, platform?: string, durationDays?: number, postsPerWeek?: number,
  //         reviewChannel?: "email"|"in_app", reviewEmail?: string }
  app.post("/api/missions", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const goal: string = String(req.body?.goal || "").trim();
      if (!goal) return res.status(400).json({ message: "goal is required" });
      const platform: string = String(req.body?.platform || "linkedin");
      const durationDays: number = Math.max(7, Math.min(180, Number(req.body?.durationDays) || 60));
      const postsPerWeek: number = Math.max(1, Math.min(7, Number(req.body?.postsPerWeek) || 5));
      const reviewChannel: string = String(req.body?.reviewChannel || "email");
      const reviewEmail: string = String(req.body?.reviewEmail || user.email || "").trim();

      // Read LinkedIn profile to ground the campaign.
      let profileSnapshot: any = {};
      if (platform === "linkedin") {
        const conns = await db.select().from(socialConnections)
          .where(and(eq(socialConnections.userId, user.id), eq(socialConnections.platform, "linkedin")));
        const conn = conns[0];
        if (conn?.accessToken) {
          const live = await fetchLinkedInProfile(conn.accessToken);
          profileSnapshot = {
            name: live?.name || conn.displayName || user.name,
            email: live?.email || user.email,
            picture: live?.picture || conn.profilePictureUrl,
            profileUrl: conn.profileUrl,
            headline: conn.accountName || "",
            // LinkedIn /v2/userinfo intentionally does NOT return headline/summary
            // (those need r_basicprofile or r_liteprofile, which Share-on-LinkedIn
            // products no longer grant). User can add their own context to the goal.
          };
        } else {
          profileSnapshot = { name: user.name, email: user.email, note: "linkedin_not_connected" };
        }
      } else {
        profileSnapshot = { name: user.name, email: user.email };
      }

      // Ask Nexus to produce a structured plan + first-week kickoff posts.
      const plannerSystem = buildPlannerSystemPrompt(profileSnapshot.name || user.name || "the user");
      const plannerUser = `User goal (verbatim): ${goal}
Platform: ${platform}
Duration: ${durationDays} days
Cadence: ${postsPerWeek} posts/week
User profile: ${JSON.stringify(profileSnapshot).slice(0, 1500)}

Produce the JSON plan now.`;
      const ai = await generateText(plannerSystem, plannerUser, 3500);
      if (!ai) return res.status(503).json({ message: "Both Claude and GPT are unreachable right now. Try again in 30 seconds." });

      const plan = safeParseJSON<any>(ai.text);
      if (!plan || !plan.name || !Array.isArray(plan.kickoffPosts)) {
        console.error("[Missions] planner returned unparseable JSON", ai.text.slice(0, 500));
        return res.status(502).json({ message: "Nexus produced an invalid plan. Try rephrasing your goal." });
      }

      // Persist the mission.
      const startDate = new Date();
      const endDate = new Date(startDate); endDate.setDate(endDate.getDate() + durationDays);
      const inserted = await db.insert(growthMissions).values({
        userId: user.id,
        name: String(plan.name).slice(0, 80),
        goal,
        platform,
        targetMetric: "followers",
        targetValue: extractTargetValue(goal),
        startValue: null,
        postsPerWeek: Number(plan.postsPerWeek) || postsPerWeek,
        durationDays: Number(plan.durationDays) || durationDays,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        reviewChannel,
        reviewEmail,
        voice: String(plan.voice || ""),
        audience: String(plan.audience || ""),
        pillars: JSON.stringify(plan.pillars || []),
        plan: JSON.stringify(plan),
        profileSnapshot: JSON.stringify(profileSnapshot),
        status: "active",
      } as any).returning();
      const mission = inserted[0];

      // Materialize kickoff posts as scheduled_posts drafts.
      const createdPosts: ScheduledPost[] = [];
      for (const kp of plan.kickoffPosts as any[]) {
        const content = `${kp.hook}\n\n${kp.body}\n\n${kp.cta || ""}`.trim();
        const scheduledFor = nextPostingDate(startDate, Number(kp.dayOffset) || 0, 9);
        // Generate image best-effort (do not block on failure).
        const imageUrl = await generatePostImage(kp.imagePrompt || kp.hook);
        const row = await db.insert(scheduledPosts).values({
          userId: user.id,
          content,
          platform,
          status: "draft",
          scheduledFor,
          destinationPlatform: platform,
          missionId: mission.id,
          imageUrl,
          pillar: kp.pillar || null,
        } as any).returning();
        createdPosts.push(row[0]);
      }

      // Email review summary.
      let emailResult: any = { sent: false };
      if (reviewChannel === "email" && reviewEmail) {
        const baseUrl = process.env.BASE_URL || `https://${req.get("host")}`;
        emailResult = await sendReviewEmail(reviewEmail, mission, createdPosts, baseUrl);
      }

      res.json({
        mission,
        posts: createdPosts,
        servedBy: { provider: ai.provider, model: ai.modelId, label: ai.modelLabel },
        email: emailResult,
      });
    } catch (e: any) {
      console.error("[Missions] create failed", e?.message || e);
      res.status(500).json({ message: e?.message || "Failed to create mission" });
    }
  });

  // ---- Generate next batch of N drafts for a mission ----
  app.post("/api/missions/:id/generate-batch", requireAuth, requireActiveAccess, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const id = Number(req.params.id);
      const count = Math.max(1, Math.min(14, Number(req.body?.count) || 7));
      const m = (await db.select().from(growthMissions).where(and(eq(growthMissions.id, id), eq(growthMissions.userId, user.id))))[0];
      if (!m) return res.status(404).json({ message: "Mission not found" });

      // Determine starting day offset: first scheduled date AFTER the latest existing post.
      const existing = await db.select().from(scheduledPosts)
        .where(and(eq(scheduledPosts.userId, user.id), eq(scheduledPosts.missionId, id)))
        .orderBy(desc(scheduledPosts.scheduledFor));
      const latestDate = existing[0]?.scheduledFor ? new Date(existing[0].scheduledFor) : new Date();
      const cadenceDays = Math.max(1, Math.round(7 / Math.max(1, m.postsPerWeek || 5)));

      const { system, user: userPrompt } = buildPostsBatchPrompt(m, count);
      const ai = await generateText(system, userPrompt, 3500);
      if (!ai) return res.status(503).json({ message: "Both Claude and GPT are unreachable. Retry in 30 seconds." });
      const arr = safeParseJSON<any[]>(ai.text);
      if (!Array.isArray(arr) || arr.length === 0) {
        return res.status(502).json({ message: "Nexus produced an invalid batch. Try again." });
      }

      const created: ScheduledPost[] = [];
      for (let i = 0; i < arr.length; i++) {
        const post = arr[i];
        if (!post?.body) continue;
        const content = `${post.hook || ""}\n\n${post.body}\n\n${post.cta || ""}`.trim();
        const scheduledFor = (() => {
          const d = new Date(latestDate); d.setDate(d.getDate() + cadenceDays * (i + 1)); d.setHours(9, 0, 0, 0);
          return d.toISOString();
        })();
        const imageUrl = await generatePostImage(post.imagePrompt || post.hook);
        const row = await db.insert(scheduledPosts).values({
          userId: user.id,
          content,
          platform: m.platform,
          status: "draft",
          scheduledFor,
          destinationPlatform: m.platform,
          missionId: m.id,
          imageUrl,
          pillar: post.pillar || null,
        } as any).returning();
        created.push(row[0]);
      }

      // Email summary.
      let emailResult: any = { sent: false };
      if (m.reviewChannel === "email" && m.reviewEmail) {
        const baseUrl = process.env.BASE_URL || `https://${req.get("host")}`;
        emailResult = await sendReviewEmail(m.reviewEmail, m, created, baseUrl);
      }

      // Touch updatedAt.
      await db.update(growthMissions).set({ updatedAt: new Date().toISOString() } as any).where(eq(growthMissions.id, id));

      res.json({ posts: created, servedBy: { provider: ai.provider, model: ai.modelId, label: ai.modelLabel }, email: emailResult });
    } catch (e: any) {
      console.error("[Missions] generate-batch failed", e?.message || e);
      res.status(500).json({ message: e?.message || "Failed to generate batch" });
    }
  });

  // ---- Approve a single post: flips status to "approved" so the worker publishes it ----
  app.post("/api/missions/:id/posts/:postId/approve", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const postId = Number(req.params.postId);
    const post = (await db.select().from(scheduledPosts).where(and(eq(scheduledPosts.id, postId), eq(scheduledPosts.userId, user.id))))[0];
    if (!post) return res.status(404).json({ message: "Post not found" });
    const updated = await db.update(scheduledPosts).set({
      status: "approved",
      approvedAt: new Date().toISOString(),
    } as any).where(eq(scheduledPosts.id, postId)).returning();
    res.json(updated[0]);
  });

  // ---- Reject a single post: marks cancelled (worker ignores) ----
  app.post("/api/missions/:id/posts/:postId/reject", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const postId = Number(req.params.postId);
    const post = (await db.select().from(scheduledPosts).where(and(eq(scheduledPosts.id, postId), eq(scheduledPosts.userId, user.id))))[0];
    if (!post) return res.status(404).json({ message: "Post not found" });
    const updated = await db.update(scheduledPosts).set({ status: "cancelled" } as any).where(eq(scheduledPosts.id, postId)).returning();
    res.json(updated[0]);
  });

  // ---- Approve ALL pending drafts in one go ----
  app.post("/api/missions/:id/approve-all", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const id = Number(req.params.id);
    await db.update(scheduledPosts).set({
      status: "approved",
      approvedAt: new Date().toISOString(),
    } as any).where(sql`${scheduledPosts.userId} = ${user.id} AND ${scheduledPosts.missionId} = ${id} AND ${scheduledPosts.status} = 'draft'`);
    res.json({ ok: true });
  });

  // ---- Pause / resume / archive ----
  app.post("/api/missions/:id/status", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const id = Number(req.params.id);
    const status = String(req.body?.status || "active");
    if (!["active", "paused", "completed", "archived"].includes(status)) {
      return res.status(400).json({ message: "invalid status" });
    }
    const updated = await db.update(growthMissions).set({ status, updatedAt: new Date().toISOString() } as any)
      .where(and(eq(growthMissions.id, id), eq(growthMissions.userId, user.id))).returning();
    res.json(updated[0]);
  });

  // ---- Re-send the review email manually ----
  app.post("/api/missions/:id/send-review", requireAuth, async (req: Request, res: Response) => {
    const user = req.user!;
    const id = Number(req.params.id);
    const m = (await db.select().from(growthMissions).where(and(eq(growthMissions.id, id), eq(growthMissions.userId, user.id))))[0];
    if (!m) return res.status(404).json({ message: "Mission not found" });
    const drafts = await db.select().from(scheduledPosts)
      .where(and(eq(scheduledPosts.userId, user.id), eq(scheduledPosts.missionId, id), eq(scheduledPosts.status, "draft")))
      .orderBy(scheduledPosts.scheduledFor);
    const baseUrl = process.env.BASE_URL || `https://${req.get("host")}`;
    const out = await sendReviewEmail(m.reviewEmail || user.email!, m, drafts, baseUrl);
    res.json({ ...out, count: drafts.length });
  });
}

// Pull a numeric target out of a free-text goal like "grow my linkedin to 50k".
function extractTargetValue(goal: string): number | null {
  const m = goal.match(/(\d[\d,\.]*)\s*(k|m)?/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(n)) return null;
  const mult = (m[2] || "").toLowerCase() === "k" ? 1_000 : (m[2] || "").toLowerCase() === "m" ? 1_000_000 : 1;
  return Math.round(n * mult);
}
