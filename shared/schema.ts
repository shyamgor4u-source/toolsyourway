import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// USERS
// ============================================================
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password"),
  authProvider: text("auth_provider").notNull().default("email"),
  authProviderId: text("auth_provider_id"),
  role: text("role").notNull().default("user"), // user | admin
  plan: text("plan").default("none"), // none | individual | bundle | custom
  userType: text("user_type").default("business"), // business | influencer
  selectedBots: text("selected_bots"), // JSON array of bot keys user purchased
  hasAiManager: integer("has_ai_manager").default(0), // 0 or 1
  avatarUrl: text("avatar_url"),
  // Free Trial fields
  trialStartedAt: text("trial_started_at"), // ISO timestamp
  trialEndsAt: text("trial_ends_at"), // ISO timestamp — null = no trial (e.g. admin)
  trialStatus: text("trial_status").default("active"), // active | expired | converted | none
  hasUsedResumeTrial: integer("has_used_resume_trial").default(0), // 0 or 1 — one-time resume allowed
  // PAYG credits (for overages beyond plan caps)
  paygCredits: integer("payg_credits").default(0), // credits available
  videoUsageCount: integer("video_usage_count").default(0), // monthly video generation count
  imageUsageCount: integer("image_usage_count").default(0), // monthly image generation count
  usageResetAt: text("usage_reset_at"), // ISO timestamp — next monthly reset
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Registration form schema
export const registerSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Login form schema (allows admin@tw format for owner login)
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

// ============================================================
// SUBSCRIPTIONS
// ============================================================
export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  plan: text("plan").notNull(), // ultra | pro | premium
  status: text("status").notNull().default("active"), // active | cancelled | expired
  paymentGateway: text("payment_gateway"), // razorpay | stripe
  paymentId: text("payment_id"),
  amount: integer("amount"), // in cents (USD)
  startDate: text("start_date").notNull().$defaultFn(() => new Date().toISOString()),
  endDate: text("end_date"),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  startDate: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// ============================================================
// BOT CONFIGS (per user)
// ============================================================
export const botConfigs = sqliteTable("bot_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  botType: text("bot_type").notNull(), // marketing | data | email | sales | hr
  status: text("status").notNull().default("inactive"), // active | inactive | paused
  config: text("config"), // JSON config
  lastRunAt: text("last_run_at"),
  metrics: text("metrics"), // JSON metrics
});

export const insertBotConfigSchema = createInsertSchema(botConfigs).omit({ id: true });
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotConfig = typeof botConfigs.$inferSelect;

// ============================================================
// GENERATED MEDIA
// ============================================================
export const generatedMedia = sqliteTable("generated_media", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // image | video-storyboard
  prompt: text("prompt").notNull(),
  url: text("url").notNull(), // image URL or JSON array of frame URLs
  status: text("status").notNull().default("completed"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type GeneratedMedia = typeof generatedMedia.$inferSelect;

// ============================================================
// SOCIAL CONNECTIONS (Marketing Bot integrations)
// ============================================================
export const socialConnections = sqliteTable("social_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(), // linkedin | instagram | tiktok | facebook | twitter
  accountName: text("account_name"), // display name or handle
  accountId: text("account_id"), // platform user ID
  accountType: text("account_type").default("profile"), // profile | page | group
  pageId: text("page_id"), // selected page/company ID (for LinkedIn/Facebook)
  pageName: text("page_name"), // selected page name
  pages: text("pages"), // JSON array of available pages [{id, name, type}]
  profilePictureUrl: text("profile_picture_url"), // URL to avatar/profile image
  displayName: text("display_name"), // Human-readable name (e.g. "Shyam Gor" vs handle)
  profileUrl: text("profile_url"), // Public URL to profile
  followerCount: integer("follower_count"), // Latest known follower count
  accessToken: text("access_token"), // encrypted in production
  refreshToken: text("refresh_token"),
  // OAuth 1.0a (X/Twitter) — kept separately so OAuth 2.0 PKCE record is not clobbered
  oauth1Token: text("oauth1_token"), // OAuth 1.0a access token
  oauth1TokenSecret: text("oauth1_token_secret"), // OAuth 1.0a access token secret
  authVersion: text("auth_version").default("oauth2"), // oauth2 | oauth2_pkce | oauth1
  status: text("status").notNull().default("connected"), // connected | expired | disconnected
  connectedAt: text("connected_at").notNull().$defaultFn(() => new Date().toISOString()),
  expiresAt: text("expires_at"),
});

export type SocialConnection = typeof socialConnections.$inferSelect;

// ============================================================
// SCHEDULED POSTS (Marketing Bot)
// ============================================================
export const scheduledPosts = sqliteTable("scheduled_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  platform: text("platform").notNull(),
  // Lifecycle status. The publish worker ONLY acts on `approved` posts that are
  // due. Drafts / scheduled-but-unapproved posts are never auto-published.
  //   draft           — not yet ready (legacy rows are migrated here, see storage.ts)
  //   scheduled       — composed & time set, but NOT approved for auto-publish
  //   approved        — explicitly approved by the user; worker will publish when due
  //   publishing      — worker has claimed this row (in-flight lock)
  //   published       — all destinations succeeded
  //   partial_failed  — some destinations succeeded, some failed
  //   failed          — no destination succeeded / fatal error
  //   cancelled       — user cancelled; worker ignores it
  status: text("status").notNull().default("draft"),
  scheduledFor: text("scheduled_for"),
  publishedAt: text("published_at"),
  // Per-post destination snapshot. JSON array of normalized destinations the
  // post targets, captured at creation time so the record stays auditable even
  // if the connection/page is later changed or removed. Never contains tokens.
  // Shape per entry: { platform, destinationId, accountId, destinationType,
  //                    displayName, handle, pageName, capabilities }
  destinations: text("destinations"), // JSON array (nullable for legacy rows)
  // Denormalized first-destination type for cheap filtering/display.
  destinationPlatform: text("destination_platform"),
  // Publish bookkeeping (all nullable / token-free).
  approvedAt: text("approved_at"), // when the user approved it for publishing
  publishAttempts: integer("publish_attempts").default(0), // worker run count
  lastAttemptAt: text("last_attempt_at"), // last time the worker tried
  lastError: text("last_error"), // last fatal/overall error message (truncated)
  // JSON array of per-destination outcomes. Never contains tokens. Shape:
  //   { platform, destinationId, displayName, ok, id?, url?, error?, at }
  publishResults: text("publish_results"),
  // Optional link back to the Growth Mission that authored this post.
  // null for one-off posts created outside a mission.
  missionId: integer("mission_id"),
  // Optional image URL Nexus generated for the post. Stored once at draft
  // time so the user reviewing the email/UI sees what will go live.
  imageUrl: text("image_url"),
  // Persona/role copy was authored under ("war_story" | "hot_take" | etc.).
  pillar: text("pillar"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertScheduledPostSchema = createInsertSchema(scheduledPosts).omit({ id: true, createdAt: true });
export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;
export type ScheduledPost = typeof scheduledPosts.$inferSelect;

// ============================================================
// INVOICES (Finance Bot)
// ============================================================
export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  items: text("items").notNull(), // JSON
  subtotal: integer("subtotal").notNull(), // in paise
  gst: integer("gst").notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull().default("draft"), // draft | sent | paid
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// ============================================================
// PAYG CREDIT PURCHASES
// ============================================================
export const creditPurchases = sqliteTable("credit_purchases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  pack: text("pack").notNull(), // small | medium | large
  credits: integer("credits").notNull(),
  amount: integer("amount").notNull(), // cents
  paymentGateway: text("payment_gateway"),
  paymentId: text("payment_id"),
  status: text("status").notNull().default("pending"), // pending | completed | failed
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export type CreditPurchase = typeof creditPurchases.$inferSelect;

// ============================================================
// OUTREACH: PROSPECTS + CAMPAIGNS
// ============================================================
export const prospects = sqliteTable("prospects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  source: text("source").default("manual"), // manual | csv | apollo | linkedin
  // Identity
  name: text("name"),
  email: text("email"),
  company: text("company"),
  title: text("title"),
  location: text("location"),
  // Platform handles
  linkedinUrl: text("linkedin_url"),
  twitterHandle: text("twitter_handle"),
  instagramHandle: text("instagram_handle"),
  tiktokHandle: text("tiktok_handle"),
  youtubeChannel: text("youtube_channel"),
  // Enrichment
  profilePictureUrl: text("profile_picture_url"),
  bio: text("bio"),
  followerCount: integer("follower_count"),
  engagementRate: text("engagement_rate"), // stored as string "4.2%"
  tags: text("tags"), // JSON array ["warm", "VC", "fintech"]
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export const insertProspectSchema = createInsertSchema(prospects).omit({ id: true, createdAt: true });
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Prospect = typeof prospects.$inferSelect;

export const outreachCampaigns = sqliteTable("outreach_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  platform: text("platform").notNull(), // linkedin | twitter | instagram | email | tiktok
  goal: text("goal"), // intro | partnership | sponsorship | investment | sales
  tone: text("tone").default("professional"), // professional | casual | enthusiastic
  status: text("status").notNull().default("draft"), // draft | ready | running | completed | paused
  messageTemplate: text("message_template"), // with {{name}}, {{company}}, {{hook}} placeholders
  prospectIds: text("prospect_ids"), // JSON array of prospect IDs
  sentCount: integer("sent_count").default(0),
  repliedCount: integer("replied_count").default(0),
  scheduledFor: text("scheduled_for"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export const insertCampaignSchema = createInsertSchema(outreachCampaigns).omit({ id: true, createdAt: true, sentCount: true, repliedCount: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof outreachCampaigns.$inferSelect;

export const outreachMessages = sqliteTable("outreach_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  campaignId: integer("campaign_id").references(() => outreachCampaigns.id),
  prospectId: integer("prospect_id").references(() => prospects.id),
  platform: text("platform").notNull(),
  draftMessage: text("draft_message"), // AI-drafted text
  finalMessage: text("final_message"), // after user edit
  status: text("status").notNull().default("draft"), // draft | approved | sent | failed | replied
  sentAt: text("sent_at"),
  repliedAt: text("replied_at"),
  reply: text("reply"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type OutreachMessage = typeof outreachMessages.$inferSelect;

// ============================================================
// FOUNDER SUITE
// ============================================================
export const pitchDecks = sqliteTable("pitch_decks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  companyName: text("company_name").notNull(),
  oneLiner: text("one_liner"),
  slides: text("slides"), // JSON array of {title, bullets, imagePrompt}
  deckUrl: text("deck_url"), // URL to rendered HTML deck
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type PitchDeck = typeof pitchDecks.$inferSelect;

export const competitors = sqliteTable("competitors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  website: text("website"),
  description: text("description"),
  pricing: text("pricing"),
  strengths: text("strengths"), // JSON array
  weaknesses: text("weaknesses"), // JSON array
  recentNews: text("recent_news"),
  logoUrl: text("logo_url"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type Competitor = typeof competitors.$inferSelect;

export const launchKits = sqliteTable("launch_kits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  productName: text("product_name").notNull(),
  description: text("description"),
  phPost: text("ph_post"), // Product Hunt
  hnPost: text("hn_post"), // Hacker News
  twitterThread: text("twitter_thread"), // JSON array of tweets
  linkedinPost: text("linkedin_post"),
  emailBlast: text("email_blast"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type LaunchKit = typeof launchKits.$inferSelect;

// ============================================================
// INFLUENCER SUITE
// ============================================================
export const mediaKits = sqliteTable("media_kits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  creatorName: text("creator_name").notNull(),
  niche: text("niche"),
  bio: text("bio"),
  stats: text("stats"), // JSON {ig_followers, yt_subs, tiktok_followers, avg_views, engagement_rate}
  rateCard: text("rate_card"), // JSON {ig_post, ig_story, ig_reel, yt_dedicated, yt_integration, tiktok_video}
  pastBrands: text("past_brands"), // JSON array of brand names
  testimonials: text("testimonials"), // JSON array
  contactEmail: text("contact_email"),
  kitUrl: text("kit_url"), // URL to rendered HTML kit
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type MediaKit = typeof mediaKits.$inferSelect;

export const brandCollabs = sqliteTable("brand_collabs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  brandName: text("brand_name").notNull(),
  brandLogo: text("brand_logo"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  stage: text("stage").notNull().default("pitched"), // pitched | negotiating | delivering | completed | paid
  dealValue: integer("deal_value"), // in cents
  currency: text("currency").default("USD"),
  deliverables: text("deliverables"), // JSON array
  deadline: text("deadline"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type BrandCollab = typeof brandCollabs.$inferSelect;

export const contentCalendar = sqliteTable("content_calendar", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  date: text("date").notNull(), // YYYY-MM-DD
  platform: text("platform").notNull(), // instagram | tiktok | youtube | twitter
  contentType: text("content_type"), // reel | post | story | short | video
  topic: text("topic"),
  caption: text("caption"),
  hook: text("hook"),
  hashtags: text("hashtags"),
  status: text("status").default("idea"), // idea | filming | editing | scheduled | published
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type ContentCalendarEntry = typeof contentCalendar.$inferSelect;

// ============================================================
// NEXUS CHAT MESSAGES — per-user persistent chat history
// ============================================================
// We persist every chat turn so the user sees the same Nexus context
// across devices, logouts, and refreshes. Conversations are scoped per
// user (no per-thread separation yet — single rolling thread per user).
export const nexusMessages = sqliteTable("nexus_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),       // "user" | "assistant" | "system"
  content: text("content").notNull(),
  // Optional role the user asked Nexus to play (e.g. "LinkedIn Content Strategist").
  asRole: text("as_role"),
  // For assistant messages: which model actually served the response.
  model: text("model"),
  modelLabel: text("model_label"),
  provider: text("provider"),
  // For assistant messages that emitted a [[NEXUS_ACTION:...]] marker,
  // we store the parsed action so the UI can re-render the inline
  // "Start this Mission" button after a refresh.
  actionType: text("action_type"),    // e.g. "create_mission"
  actionPayload: text("action_payload"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type NexusMessage = typeof nexusMessages.$inferSelect;
export const insertNexusMessageSchema = createInsertSchema(nexusMessages).omit({
  id: true, createdAt: true,
});
export type InsertNexusMessage = z.infer<typeof insertNexusMessageSchema>;

// ============================================================
// GROWTH MISSIONS — Nexus-orchestrated end-to-end campaigns
// ============================================================
// A Growth Mission is a goal-driven, autonomous campaign that Nexus runs:
//   plan → generate copy → generate visuals → send for review
//   → user approves → worker publishes on schedule.
//
// Each mission spawns N rows in `scheduled_posts` (status=draft until approved).
// We DO NOT duplicate post storage here — the missionId on scheduled_posts is
// the link back, kept loose (no FK) so legacy posts continue to work.
export const growthMissions = sqliteTable("growth_missions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  // Human-readable mission name (e.g. "LinkedIn 0 → 50K in 60 days").
  name: text("name").notNull(),
  // Free-text goal exactly as the user stated it (verbatim from chat).
  goal: text("goal").notNull(),
  // Primary platform this mission targets. "linkedin" | "twitter" | etc.
  platform: text("platform").notNull().default("linkedin"),
  // Quantitative targets parsed by Nexus.
  targetMetric: text("target_metric"),       // e.g. "followers"
  targetValue: integer("target_value"),       // e.g. 50000
  startValue: integer("start_value"),         // baseline at mission creation
  // Cadence + timeline.
  postsPerWeek: integer("posts_per_week").default(5),
  durationDays: integer("duration_days").default(60),
  startDate: text("start_date"),              // YYYY-MM-DD
  endDate: text("end_date"),                  // YYYY-MM-DD
  // Where to send drafts for human approval.
  reviewChannel: text("review_channel").default("email"), // email | whatsapp | in_app
  reviewEmail: text("review_email"),
  reviewWhatsapp: text("review_whatsapp"),
  // Authoring direction Nexus uses each batch (positioning, voice, audience).
  voice: text("voice"),                       // e.g. "warm, contrarian, story-led"
  audience: text("audience"),                 // e.g. "TA leaders, HR execs, founders"
  pillars: text("pillars"),                   // JSON array of strings
  // The full plan Nexus produced at creation time, kept for context on each
  // batch generation. JSON: { weeks: [...], summary: "..." }.
  plan: text("plan"),
  // LinkedIn profile snapshot fetched at creation (so Nexus writes in user's voice).
  // JSON: { name, headline, summary, industry, location, currentCompany, etc. }
  profileSnapshot: text("profile_snapshot"),
  // Lifecycle.
  //   active     — generating + publishing
  //   paused     — user paused; worker ignores
  //   completed  — reached deadline or hit target
  //   archived
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});
export type GrowthMission = typeof growthMissions.$inferSelect;
export const insertGrowthMissionSchema = createInsertSchema(growthMissions).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertGrowthMission = z.infer<typeof insertGrowthMissionSchema>;
