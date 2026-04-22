import { Resend } from "resend";
import { storage, db } from "./storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Track which reminders we've sent to avoid duplicates within a single server process
// Key: `${userId}:${milestone}` => true
const sentReminders = new Set<string>();

const milestones = [
  { key: "day5", daysLeft: 2, subject: "2 days left on your ToolsYourWay trial", message: "You're halfway through your trial. Here's what you can still explore before it ends." },
  { key: "day6", daysLeft: 1, subject: "1 day left \u2014 lock in 65% off with Founders discount", message: "Your trial ends tomorrow. Pick a plan today and save 65% until April 30, 2026." },
  { key: "day7",  daysLeft: 0, subject: "Your trial ends today", message: "Last chance to lock in Founders pricing. Upgrade in one click." },
];

async function sendNudge(email: string, name: string, subject: string, bodyMessage: string, daysLeft: number) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: "ToolsYourWay <hello@toolsyourway.com>",
      to: email,
      subject,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1E1650">
          <h1 style="color:#1E1650;margin-bottom:8px">Hi ${name},</h1>
          <p style="font-size:16px">${bodyMessage}</p>
          <div style="background:#FDFCF8;border:1px solid #E9A820;border-radius:8px;padding:16px;margin:24px 0">
            <div style="font-weight:600;color:#C98A1A">Founders Discount \u2014 65% off</div>
            <div style="font-size:14px;color:#666;margin-top:4px">All 9 bots + AI Manager from $20/mo. Ends April 30, 2026.</div>
          </div>
          <p><a href="https://toolsyourway.com/#/pricing" style="display:inline-block;background:#1E1650;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Choose a Plan</a></p>
          <p style="color:#666;font-size:14px">${daysLeft === 0 ? "Trial ending today." : `${daysLeft} day${daysLeft > 1 ? "s" : ""} remaining.`}</p>
        </div>
      `,
    });
    console.log(`[trial-cron] Sent ${subject} to ${email}`);
  } catch (e) {
    console.warn(`[trial-cron] Email send failed for ${email}:`, e);
  }
}

async function sendExpiredEmail(email: string, name: string) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: "ToolsYourWay <hello@toolsyourway.com>",
      to: email,
      subject: "Your trial has ended \u2014 come back anytime",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1E1650">
          <h1 style="color:#1E1650;margin-bottom:8px">Thanks for trying ToolsYourWay, ${name}</h1>
          <p>Your 7-day free trial has ended. Your past work is still saved \u2014 just upgrade anytime to keep creating.</p>
          <p><a href="https://toolsyourway.com/#/pricing" style="display:inline-block;background:#E9A820;color:#1E1650;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Resume with a plan</a></p>
          <p style="color:#666;font-size:14px">Or buy PAYG credits for one-off usage. Questions? Just reply to this email.</p>
        </div>
      `,
    });
    console.log(`[trial-cron] Sent expired email to ${email}`);
  } catch (e) {
    console.warn(`[trial-cron] Expired email send failed for ${email}:`, e);
  }
}

export async function runTrialNudgeCheck() {
  try {
    const allUsers = await db.select().from(users).all?.() ?? await db.select().from(users);
    const now = Date.now();
    for (const u of allUsers as any[]) {
      if (u.role === "admin") continue;
      if (u.plan && u.plan !== "none") continue; // already paying
      if (!u.trialEndsAt) continue;
      const ends = new Date(u.trialEndsAt).getTime();
      const msLeft = ends - now;
      const daysLeft = msLeft / (1000 * 60 * 60 * 24);

      // Day 5 reminder: 2-3 days left
      for (const m of milestones) {
        if (Math.abs(daysLeft - m.daysLeft) < 0.5) {
          const key = `${u.id}:${m.key}`;
          if (!sentReminders.has(key)) {
            sentReminders.add(key);
            await sendNudge(u.email, u.name, m.subject, m.message, m.daysLeft);
          }
        }
      }

      // Just-expired: within the last hour of expiry
      if (msLeft < 0 && msLeft > -60 * 60 * 1000 && u.trialStatus === "active") {
        const key = `${u.id}:expired`;
        if (!sentReminders.has(key)) {
          sentReminders.add(key);
          await sendExpiredEmail(u.email, u.name);
        }
      }
    }

    // Mark all expired trials as expired in DB
    await storage.expireTrials();
  } catch (e) {
    console.warn("[trial-cron] Error:", e);
  }
}

export function startTrialCron() {
  // Run immediately on startup, then every 30 minutes
  runTrialNudgeCheck();
  setInterval(runTrialNudgeCheck, 30 * 60 * 1000);
  console.log("\u2705 Trial nudge cron started (runs every 30 minutes)");
}
