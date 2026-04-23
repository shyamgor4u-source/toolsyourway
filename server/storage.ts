import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq, desc, count, sql } from "drizzle-orm";
import {
  users, subscriptions, botConfigs, scheduledPosts, invoices, generatedMedia, socialConnections, creditPurchases,
  prospects, outreachCampaigns, outreachMessages,
  pitchDecks, competitors, launchKits, mediaKits, brandCollabs, contentCalendar,
  type Prospect, type InsertProspect, type Campaign, type InsertCampaign, type OutreachMessage,
  type User, type InsertUser,
  type Subscription, type InsertSubscription,
  type BotConfig, type InsertBotConfig,
  type ScheduledPost, type InsertScheduledPost,
  type Invoice, type InsertInvoice,
  type GeneratedMedia,
  type SocialConnection,
} from "@shared/schema";
import bcrypt from "bcryptjs";

const client = createClient({ url: "file:toolsyourway.db" });
export const db = drizzle(client);

// Auto-create tables on startup
async function initDb() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password TEXT,
      auth_provider TEXT NOT NULL DEFAULT 'email',
      auth_provider_id TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      plan TEXT DEFAULT 'none',
      user_type TEXT DEFAULT 'business',
      selected_bots TEXT,
      has_ai_manager INTEGER DEFAULT 0,
      avatar_url TEXT,
      trial_started_at TEXT,
      trial_ends_at TEXT,
      trial_status TEXT DEFAULT 'active',
      has_used_resume_trial INTEGER DEFAULT 0,
      payg_credits INTEGER DEFAULT 0,
      video_usage_count INTEGER DEFAULT 0,
      image_usage_count INTEGER DEFAULT 0,
      usage_reset_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      payment_gateway TEXT,
      payment_id TEXT,
      amount INTEGER,
      start_date TEXT NOT NULL DEFAULT (datetime('now')),
      end_date TEXT
    );
    CREATE TABLE IF NOT EXISTS social_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      platform TEXT NOT NULL,
      account_name TEXT,
      account_id TEXT,
      account_type TEXT DEFAULT 'profile',
      page_id TEXT,
      page_name TEXT,
      pages TEXT,
      access_token TEXT,
      refresh_token TEXT,
      status TEXT NOT NULL DEFAULT 'connected',
      connected_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT
    );
    CREATE TABLE IF NOT EXISTS generated_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bot_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      bot_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inactive',
      config TEXT,
      last_run_at TEXT,
      metrics TEXT
    );
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      scheduled_for TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      source TEXT DEFAULT 'manual',
      name TEXT,
      email TEXT,
      company TEXT,
      title TEXT,
      location TEXT,
      linkedin_url TEXT,
      twitter_handle TEXT,
      instagram_handle TEXT,
      tiktok_handle TEXT,
      youtube_channel TEXT,
      profile_picture_url TEXT,
      bio TEXT,
      follower_count INTEGER,
      engagement_rate TEXT,
      tags TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS outreach_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      goal TEXT,
      tone TEXT DEFAULT 'professional',
      status TEXT NOT NULL DEFAULT 'draft',
      message_template TEXT,
      prospect_ids TEXT,
      sent_count INTEGER DEFAULT 0,
      replied_count INTEGER DEFAULT 0,
      scheduled_for TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS outreach_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      campaign_id INTEGER REFERENCES outreach_campaigns(id),
      prospect_id INTEGER REFERENCES prospects(id),
      platform TEXT NOT NULL,
      draft_message TEXT,
      final_message TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      sent_at TEXT,
      replied_at TEXT,
      reply TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pitch_decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      company_name TEXT NOT NULL,
      one_liner TEXT,
      slides TEXT,
      deck_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS competitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      website TEXT,
      description TEXT,
      pricing TEXT,
      strengths TEXT,
      weaknesses TEXT,
      recent_news TEXT,
      logo_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS launch_kits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      product_name TEXT NOT NULL,
      description TEXT,
      ph_post TEXT, hn_post TEXT, twitter_thread TEXT, linkedin_post TEXT, email_blast TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS media_kits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      creator_name TEXT NOT NULL,
      niche TEXT, bio TEXT, stats TEXT, rate_card TEXT,
      past_brands TEXT, testimonials TEXT, contact_email TEXT, kit_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS brand_collabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      brand_name TEXT NOT NULL,
      brand_logo TEXT, contact_name TEXT, contact_email TEXT,
      stage TEXT NOT NULL DEFAULT 'pitched',
      deal_value INTEGER, currency TEXT DEFAULT 'USD',
      deliverables TEXT, deadline TEXT, notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS content_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      platform TEXT NOT NULL,
      content_type TEXT, topic TEXT, caption TEXT, hook TEXT, hashtags TEXT,
      status TEXT DEFAULT 'idea',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS credit_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      pack TEXT NOT NULL,
      credits INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      payment_gateway TEXT,
      payment_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      invoice_number TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT,
      items TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      gst INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add trial/PAYG columns to existing users table (safe if already exist)
  const migrations = [
    "ALTER TABLE users ADD COLUMN trial_started_at TEXT",
    "ALTER TABLE users ADD COLUMN trial_ends_at TEXT",
    "ALTER TABLE users ADD COLUMN trial_status TEXT DEFAULT 'active'",
    "ALTER TABLE users ADD COLUMN has_used_resume_trial INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN payg_credits INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN video_usage_count INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN image_usage_count INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN usage_reset_at TEXT",
    "ALTER TABLE social_connections ADD COLUMN profile_picture_url TEXT",
    "ALTER TABLE social_connections ADD COLUMN display_name TEXT",
    "ALTER TABLE social_connections ADD COLUMN profile_url TEXT",
    "ALTER TABLE social_connections ADD COLUMN follower_count INTEGER",
  ];
  for (const sql of migrations) {
    try { await client.execute(sql); } catch (e: any) {
      // Ignore "duplicate column name" errors
      if (!String(e?.message || "").includes("duplicate column")) console.warn("Migration:", e?.message);
    }
  }
}

// Exported so routes can await it before seeding
export const dbReady = initDb();

// ============================================================
// STORAGE INTERFACE (all async — works with libsql)
// ============================================================
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProvider(provider: string, providerId: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;

  getSubscription(id: number): Promise<Subscription | undefined>;
  getActiveSubscription(userId: number): Promise<Subscription | undefined>;
  createSubscription(data: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, data: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  getAllSubscriptions(): Promise<Subscription[]>;
  getRevenueStats(): Promise<{ totalRevenue: number; activeCount: number; planBreakdown: Record<string, number> }>;

  getBotConfigs(userId: number): Promise<BotConfig[]>;
  upsertBotConfig(data: InsertBotConfig): Promise<BotConfig>;

  getScheduledPosts(userId: number): Promise<ScheduledPost[]>;
  createScheduledPost(data: InsertScheduledPost): Promise<ScheduledPost>;
  updateScheduledPost(id: number, data: Partial<InsertScheduledPost>): Promise<ScheduledPost | undefined>;

  getInvoices(userId: number): Promise<Invoice[]>;
  createInvoice(data: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<InsertInvoice>): Promise<Invoice | undefined>;

  seedAdmin(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number) {
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }

  async getUserByEmail(email: string) {
    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return rows[0];
  }

  async getUserByProvider(provider: string, providerId: string) {
    const rows = await db.select().from(users)
      .where(sql`${users.authProvider} = ${provider} AND ${users.authProviderId} = ${providerId}`);
    return rows[0];
  }

  async createUser(data: InsertUser) {
    const rows = await db.insert(users).values({ ...data, email: data.email.toLowerCase() }).returning();
    return rows[0];
  }

  async updateUser(id: number, data: Partial<InsertUser>) {
    const rows = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return rows[0];
  }

  async getAllUsers() {
    return db.select().from(users).orderBy(desc(users.id));
  }

  async getUserCount() {
    const rows = await db.select({ count: count() }).from(users);
    return rows[0]?.count ?? 0;
  }

  async getSubscription(id: number) {
    const rows = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return rows[0];
  }

  async getActiveSubscription(userId: number) {
    const rows = await db.select().from(subscriptions)
      .where(sql`${subscriptions.userId} = ${userId} AND ${subscriptions.status} = 'active'`);
    return rows[0];
  }

  async createSubscription(data: InsertSubscription) {
    await db.update(users).set({ plan: data.plan }).where(eq(users.id, data.userId));
    const rows = await db.insert(subscriptions).values(data).returning();
    return rows[0];
  }

  async updateSubscription(id: number, data: Partial<InsertSubscription>) {
    const rows = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return rows[0];
  }

  async getAllSubscriptions() {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.id));
  }

  async getRevenueStats() {
    const allSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
    let totalRevenue = 0;
    const planBreakdown: Record<string, number> = {};
    for (const sub of allSubs) {
      totalRevenue += sub.amount ?? 0;
      planBreakdown[sub.plan] = (planBreakdown[sub.plan] ?? 0) + 1;
    }
    return { totalRevenue, activeCount: allSubs.length, planBreakdown };
  }

  async getBotConfigs(userId: number) {
    return db.select().from(botConfigs).where(eq(botConfigs.userId, userId));
  }

  async upsertBotConfig(data: InsertBotConfig) {
    const existing = await db.select().from(botConfigs)
      .where(sql`${botConfigs.userId} = ${data.userId} AND ${botConfigs.botType} = ${data.botType}`);
    if (existing[0]) {
      const rows = await db.update(botConfigs).set(data).where(eq(botConfigs.id, existing[0].id)).returning();
      return rows[0];
    }
    const rows = await db.insert(botConfigs).values(data).returning();
    return rows[0];
  }

  async getScheduledPosts(userId: number) {
    return db.select().from(scheduledPosts).where(eq(scheduledPosts.userId, userId));
  }

  async createScheduledPost(data: InsertScheduledPost) {
    const rows = await db.insert(scheduledPosts).values(data).returning();
    return rows[0];
  }

  async updateScheduledPost(id: number, data: Partial<InsertScheduledPost>) {
    const rows = await db.update(scheduledPosts).set(data).where(eq(scheduledPosts.id, id)).returning();
    return rows[0];
  }

  async getInvoices(userId: number) {
    return db.select().from(invoices).where(eq(invoices.userId, userId));
  }

  async createInvoice(data: InsertInvoice) {
    const rows = await db.insert(invoices).values(data).returning();
    return rows[0];
  }

  async updateInvoice(id: number, data: Partial<InsertInvoice>) {
    const rows = await db.update(invoices).set(data).where(eq(invoices.id, id)).returning();
    return rows[0];
  }

  // ---- SOCIAL CONNECTIONS ----
  async getSocialConnections(userId: number) {
    return db.select().from(socialConnections).where(eq(socialConnections.userId, userId));
  }

  async connectSocial(data: { userId: number; platform: string; accountName?: string | null; accountId?: string | null; accountType?: string | null; pages?: string | null; profilePictureUrl?: string | null; displayName?: string | null; profileUrl?: string | null; followerCount?: number | null; accessToken?: string | null; refreshToken?: string | null; expiresAt?: string | null; pageId?: string | null; pageName?: string | null }) {
    // Upsert — replace if same user+platform exists
    const existing = await db.select().from(socialConnections)
      .where(sql`${socialConnections.userId} = ${data.userId} AND ${socialConnections.platform} = ${data.platform}`);
    if (existing[0]) {
      const rows = await db.update(socialConnections).set({ ...data, status: "connected" }).where(eq(socialConnections.id, existing[0].id)).returning();
      return rows[0];
    }
    const rows = await db.insert(socialConnections).values(data).returning();
    return rows[0];
  }

  async disconnectSocial(userId: number, platform: string) {
    await db.update(socialConnections).set({ status: "disconnected", accessToken: null, refreshToken: null })
      .where(sql`${socialConnections.userId} = ${userId} AND ${socialConnections.platform} = ${platform}`);
  }

  // ---- MEDIA ----
  async getMedia(userId: number) {
    return db.select().from(generatedMedia).where(eq(generatedMedia.userId, userId)).orderBy(desc(generatedMedia.id));
  }

  async createMedia(data: { userId: number; type: string; prompt: string; url: string; status: string }) {
    const rows = await db.insert(generatedMedia).values(data).returning();
    return rows[0];
  }

  // ---- TRIAL & USAGE ----
  async incrementUsage(userId: number, type: "video" | "image") {
    const user = await this.getUser(userId);
    if (!user) return;
    const field = type === "video" ? "videoUsageCount" : "imageUsageCount";
    const currentVal = type === "video" ? (user.videoUsageCount ?? 0) : (user.imageUsageCount ?? 0);
    await db.update(users).set({ [field]: currentVal + 1 } as any).where(eq(users.id, userId));
  }

  async decrementCredits(userId: number, amount: number) {
    const user = await this.getUser(userId);
    if (!user) return;
    const current = user.paygCredits ?? 0;
    await db.update(users).set({ paygCredits: Math.max(0, current - amount) }).where(eq(users.id, userId));
  }

  async addCredits(userId: number, amount: number) {
    const user = await this.getUser(userId);
    if (!user) return;
    const current = user.paygCredits ?? 0;
    await db.update(users).set({ paygCredits: current + amount }).where(eq(users.id, userId));
  }

  async createCreditPurchase(data: { userId: number; pack: string; credits: number; amount: number; paymentGateway?: string; paymentId?: string; status?: string }) {
    const rows = await db.insert(creditPurchases).values({ ...data, status: data.status || "pending" }).returning();
    return rows[0];
  }

  async expireTrials() {
    // Mark users whose trial has ended as expired (but not converted users)
    const now = new Date().toISOString();
    await client.execute({
      sql: `UPDATE users SET trial_status = 'expired' WHERE trial_ends_at IS NOT NULL AND trial_ends_at < ? AND trial_status = 'active' AND (plan IS NULL OR plan = 'none') AND role != 'admin'`,
      args: [now],
    });
  }

  async markTrialConverted(userId: number) {
    await db.update(users).set({ trialStatus: "converted" }).where(eq(users.id, userId));
  }

  async resumeTrial(userId: number, newEndsAt: string) {
    await client.execute({
      sql: "UPDATE users SET trial_ends_at = ?, trial_status = 'active', has_used_resume_trial = 1 WHERE id = ?",
      args: [newEndsAt, userId],
    });
  }

  // ---- OUTREACH ----
  async listProspects(userId: number) {
    return await db.select().from(prospects).where(eq(prospects.userId, userId)).orderBy(desc(prospects.createdAt));
  }
  async createProspect(data: InsertProspect) {
    const rows = await db.insert(prospects).values(data).returning();
    return rows[0];
  }
  async bulkCreateProspects(userId: number, list: Partial<InsertProspect>[]) {
    const toInsert = list.map(p => ({ ...p, userId })) as InsertProspect[];
    if (toInsert.length === 0) return [];
    const rows = await db.insert(prospects).values(toInsert).returning();
    return rows;
  }
  async deleteProspect(id: number, userId: number) {
    await client.execute({ sql: "DELETE FROM prospects WHERE id = ? AND user_id = ?", args: [id, userId] });
  }

  async listCampaigns(userId: number) {
    return await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.userId, userId)).orderBy(desc(outreachCampaigns.createdAt));
  }
  async getCampaign(id: number, userId: number) {
    const rows = await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, id));
    const c = rows[0];
    return c && c.userId === userId ? c : undefined;
  }
  async createCampaign(data: InsertCampaign) {
    const rows = await db.insert(outreachCampaigns).values(data).returning();
    return rows[0];
  }
  async updateCampaign(id: number, userId: number, patch: Partial<Campaign>) {
    await db.update(outreachCampaigns).set(patch).where(eq(outreachCampaigns.id, id));
  }

  async listMessages(userId: number, campaignId?: number) {
    const rows = campaignId
      ? await db.select().from(outreachMessages).where(eq(outreachMessages.campaignId, campaignId))
      : await db.select().from(outreachMessages).where(eq(outreachMessages.userId, userId));
    return rows.sort((a: any, b: any) => (b.createdAt > a.createdAt ? 1 : -1));
  }
  async createMessage(data: Partial<OutreachMessage>) {
    const rows = await db.insert(outreachMessages).values(data as any).returning();
    return rows[0];
  }
  async updateMessage(id: number, patch: Partial<OutreachMessage>) {
    await db.update(outreachMessages).set(patch).where(eq(outreachMessages.id, id));
  }

  // ---- FOUNDER + INFLUENCER SUITES ----
  async listPitchDecks(userId: number) {
    return (await db.select().from(pitchDecks).where(eq(pitchDecks.userId, userId)).orderBy(desc(pitchDecks.createdAt))) as any[];
  }
  async createPitchDeck(data: Partial<typeof pitchDecks.$inferInsert>) {
    const rows = await db.insert(pitchDecks).values(data as any).returning();
    return rows[0];
  }
  async listCompetitors(userId: number) {
    return (await db.select().from(competitors).where(eq(competitors.userId, userId)).orderBy(desc(competitors.createdAt))) as any[];
  }
  async createCompetitor(data: Partial<typeof competitors.$inferInsert>) {
    const rows = await db.insert(competitors).values(data as any).returning();
    return rows[0];
  }
  async deleteCompetitor(id: number, userId: number) {
    await client.execute({ sql: "DELETE FROM competitors WHERE id = ? AND user_id = ?", args: [id, userId] });
  }
  async listLaunchKits(userId: number) {
    return (await db.select().from(launchKits).where(eq(launchKits.userId, userId)).orderBy(desc(launchKits.createdAt))) as any[];
  }
  async createLaunchKit(data: Partial<typeof launchKits.$inferInsert>) {
    const rows = await db.insert(launchKits).values(data as any).returning();
    return rows[0];
  }
  async listMediaKits(userId: number) {
    return (await db.select().from(mediaKits).where(eq(mediaKits.userId, userId)).orderBy(desc(mediaKits.createdAt))) as any[];
  }
  async createMediaKit(data: Partial<typeof mediaKits.$inferInsert>) {
    const rows = await db.insert(mediaKits).values(data as any).returning();
    return rows[0];
  }
  async listBrandCollabs(userId: number) {
    return (await db.select().from(brandCollabs).where(eq(brandCollabs.userId, userId)).orderBy(desc(brandCollabs.createdAt))) as any[];
  }
  async createBrandCollab(data: Partial<typeof brandCollabs.$inferInsert>) {
    const rows = await db.insert(brandCollabs).values(data as any).returning();
    return rows[0];
  }
  async updateBrandCollab(id: number, userId: number, patch: any) {
    await db.update(brandCollabs).set({ ...patch, updatedAt: new Date().toISOString() }).where(eq(brandCollabs.id, id));
  }
  async deleteBrandCollab(id: number, userId: number) {
    await client.execute({ sql: "DELETE FROM brand_collabs WHERE id = ? AND user_id = ?", args: [id, userId] });
  }
  async listContentCalendar(userId: number) {
    return (await db.select().from(contentCalendar).where(eq(contentCalendar.userId, userId)).orderBy(desc(contentCalendar.date))) as any[];
  }
  async bulkCreateCalendar(userId: number, entries: any[]) {
    if (!entries.length) return [];
    const toInsert = entries.map(e => ({ ...e, userId }));
    const rows = await db.insert(contentCalendar).values(toInsert).returning();
    return rows;
  }
  async updateCalendarEntry(id: number, userId: number, patch: any) {
    await db.update(contentCalendar).set(patch).where(eq(contentCalendar.id, id));
  }
  async deleteCalendarEntry(id: number, userId: number) {
    await client.execute({ sql: "DELETE FROM content_calendar WHERE id = ? AND user_id = ?", args: [id, userId] });
  }

  async resetMonthlyUsage(userId: number) {
    const nextReset = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await client.execute({
      sql: "UPDATE users SET video_usage_count = 0, image_usage_count = 0, usage_reset_at = ? WHERE id = ?",
      args: [nextReset, userId],
    });
  }

  async seedAdmin() {
    // Owner admin account (same credentials as owner test account)
    const adminExists = await this.getUserByEmail("shyam.gor@outlook.com");
    if (!adminExists) {
      // Admin account will be created below in the owner section
    } else if (adminExists.role !== "admin") {
      // Upgrade to admin if not already
      await this.updateUser(adminExists.id, { role: "admin" });
    }

    // Owner test account (free Premium — for testing)
    const ownerExists = await this.getUserByEmail("shyam.gor@outlook.com");
    if (!ownerExists) {
      const hashedPassword = await bcrypt.hash("Passw0rd", 10);
      const user = await this.createUser({
        email: "shyam.gor@outlook.com",
        name: "Shyam Gor",
        password: hashedPassword,
        authProvider: "email",
        role: "admin",
        plan: "enterprise", // unlimited caps for admin
        userType: "business",
        selectedBots: JSON.stringify(["marketing","data","email","sales","hr","finance","legal","seo","support"]),
        hasAiManager: 1,
        trialStatus: "converted", // admin is "converted" — skips all trial UI
      });
      // Create a free Premium subscription
      await db.insert(subscriptions).values({
        userId: user.id,
        plan: "premium",
        status: "active",
        paymentGateway: "owner-comp",
        paymentId: "FREE-OWNER",
        amount: 0,
        endDate: "2099-12-31T00:00:00.000Z",
      });
      // Seed all 9 bots active
      for (const botType of ["marketing", "data", "email", "sales", "hr", "finance", "legal", "seo", "support"]) {
        await this.upsertBotConfig({
          userId: user.id,
          botType,
          status: "active",
          config: JSON.stringify({}),
          metrics: JSON.stringify({ tasks: 0, successRate: 0 }),
          lastRunAt: new Date().toISOString(),
        });
      }
      console.log("✅ Owner account seeded: shyam.gor@outlook.com (Admin + Premium, free)");
    }
  }
}

export const storage = new DatabaseStorage();
