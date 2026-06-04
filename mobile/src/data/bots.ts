export type BotSuite = {
  key: string;
  name: string;
  tagline: string;
  emoji: string;
};

// Key bots/suites surfaced in the mobile foundation. These mirror the web
// product's command-center concept; live status is layered on from the
// /api/user/dashboard response where available.
export const BOT_SUITES: BotSuite[] = [
  { key: "founder", name: "Founder Suite", tagline: "Strategy, ops & fundraising copilots", emoji: "🚀" },
  { key: "influencer", name: "Influencer Suite", tagline: "Content, growth & audience tooling", emoji: "🌟" },
  { key: "outreach", name: "Outreach", tagline: "Cold outreach & lead follow-up", emoji: "📨" },
  { key: "marketing", name: "Marketing / Social", tagline: "Campaigns & multi-platform posting", emoji: "📣" },
  { key: "email", name: "Email", tagline: "Drafting, sequences & inbox triage", emoji: "✉️" },
  { key: "data", name: "Data", tagline: "Reporting, analysis & dashboards", emoji: "📊" },
];
