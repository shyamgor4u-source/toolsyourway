// ============================================================
// MARKETING SCHEDULED PUBLISH WORKER
// ============================================================
// Polls for APPROVED + due scheduled posts and publishes each to the
// per-post destination snapshots captured at creation time (NOT the current
// Marketing Bot defaults). Tokens are resolved live, per platform, at publish
// time and never stored on the post.
//
// SAFETY (read before enabling in production — social posting is irreversible):
//   - The worker runs ONLY when ENABLE_MARKETING_PUBLISH_WORKER=true. Default
//     is OFF, so a deploy never silently starts auto-posting.
//   - It publishes ONLY posts in status `approved` whose scheduled time is due.
//     Drafts, `scheduled` (composed-but-unapproved), `cancelled`, and already
//     `published` posts are ignored.
//   - Each post is claimed via a conditional status transition
//     (approved -> publishing) so a post is never published twice within a
//     single-instance deploy. See `claimPostForPublish` in storage.ts.
//
// CONCURRENCY: the claim is safe for the single-instance Render web service
// this app deploys as. For MULTI-INSTANCE deploys the conditional UPDATE is
// still atomic at the SQLite/libSQL level, but you should additionally run the
// worker on exactly ONE instance (e.g. a dedicated worker process) to avoid
// redundant polling. This is documented in docs/marketing-publish-worker.md.

import { storage } from "./storage";
import type { ScheduledPost, SocialConnection } from "@shared/schema";
import {
  buildPlatformDestinations,
  resolveDestinations,
  type PersistedDestination,
} from "./social-destinations";
import { publishToDestination, type PublishOutcome } from "./publish-service";

// Auto-repair: resolve a sensible destination snapshot for a post that has none.
// Mirrors the mission approval fallback (profile / business_account / first
// available) so legacy approved posts created before destination stamping can
// still publish instead of dying with "No destinations on this post". Returns
// [] when the platform isn't connected or has no publishable target.
function resolveFallbackDestinations(
  connections: SocialConnection[],
  platform: string,
): PersistedDestination[] {
  const conn = connections.find(
    (c) => c.platform === platform && c.status === "connected",
  );
  if (!conn) return [];
  const available = buildPlatformDestinations(platform, conn, []).destinations;
  const profile = available.find(
    (d) => d.destinationType === "profile" || d.destinationType === "business_account",
  );
  const fallback = profile || available[0];
  if (!fallback) return [];
  const { resolved } = resolveDestinations(platform, conn, [fallback.destinationId]);
  return resolved;
}

const ENABLED = process.env.ENABLE_MARKETING_PUBLISH_WORKER === "true";
const INTERVAL_MS = Math.max(
  10_000,
  parseInt(process.env.MARKETING_PUBLISH_WORKER_INTERVAL_MS || "60000", 10) || 60000,
);
const BATCH_LIMIT = 25;

export interface DestinationResult {
  platform: string;
  destinationId: string;
  displayName: string;
  ok: boolean;
  code: PublishOutcome["code"];
  id?: string;
  url?: string;
  error?: string;
  at: string;
}

function parseDestinations(post: ScheduledPost): PersistedDestination[] {
  if (!post.destinations) return [];
  try {
    const d = JSON.parse(post.destinations);
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}

// Resolve the live connection for a destination, validating it still belongs
// to the user. We match on platform first, then prefer an exact accountId
// match (the destination snapshot recorded which account it targeted) so we
// never publish through a different account the user later connected.
function resolveConnection(
  connections: SocialConnection[],
  dest: PersistedDestination,
): SocialConnection | undefined {
  const samePlatform = connections.filter(
    (c) => c.platform === dest.platform && c.status === "connected",
  );
  if (samePlatform.length === 0) return undefined;
  if (dest.accountId) {
    const exact = samePlatform.find((c) => c.accountId === dest.accountId);
    if (exact) return exact;
    // accountId recorded but no live connection matches it. If the user has a
    // single connected account on this platform, the mismatch is almost always
    // an accountId format drift or a reconnect (e.g. LinkedIn re-auth) rather
    // than a genuinely different owner — fall back to it so we don't spuriously
    // fail with "no longer connected". Only bail when the account is genuinely
    // ambiguous (multiple connected accounts, none matching).
    if (samePlatform.length === 1) {
      console.warn(
        `[publish-worker] ${dest.platform}: recorded accountId "${dest.accountId}" not found; ` +
          `falling back to the sole connected account "${samePlatform[0].accountId}".`,
      );
      return samePlatform[0];
    }
    return undefined;
  }
  // No accountId captured (legacy) — fall back to the platform connection.
  return samePlatform[0];
}

// Publish a single claimed post. Returns the final status it should be set to.
export async function publishClaimedPost(post: ScheduledPost): Promise<{
  status: "published" | "partial_failed" | "failed";
  results: DestinationResult[];
  error?: string;
}> {
  let destinations = parseDestinations(post);
  const nowIso = () => new Date().toISOString();

  const connections = await storage.getSocialConnections(post.userId);

  // Auto-repair legacy posts with no destination snapshot (created before
  // destinations were stamped at approval). Resolve a fallback from the live
  // connection and persist it so future ticks and audits see a concrete target.
  if (destinations.length === 0) {
    const platform = post.destinationPlatform || post.platform || "linkedin";
    const repaired = resolveFallbackDestinations(connections, platform);
    if (repaired.length === 0) {
      return {
        status: "failed",
        results: [],
        error: `No destinations on this post and ${platform} has no publishable profile/page — connect ${platform} and re-approve.`,
      };
    }
    destinations = repaired;
    try {
      await storage.updateScheduledPost(post.id, {
        destinations: JSON.stringify(repaired),
      } as any);
      console.log(`[publish-worker] post ${post.id}: auto-repaired ${repaired.length} destination(s) for ${platform}.`);
    } catch {
      // Non-fatal: still publish this tick even if the snapshot write fails.
    }
  }

  const results: DestinationResult[] = [];

  for (const dest of destinations) {
    const conn = resolveConnection(connections, dest);
    let outcome: PublishOutcome;
    if (!conn) {
      outcome = {
        ok: false,
        code: "not_connected",
        message: `${dest.platform} account "${dest.accountId ?? dest.destinationId}" is no longer connected for this user.`,
      };
    } else {
      outcome = await publishToDestination(conn, dest, post.content);
    }
    results.push({
      platform: dest.platform,
      destinationId: dest.destinationId,
      displayName: dest.displayName,
      ok: outcome.ok,
      code: outcome.code,
      id: outcome.id,
      url: outcome.url,
      error: outcome.ok ? undefined : outcome.message,
      at: nowIso(),
    });
  }

  const okCount = results.filter((r) => r.ok).length;
  const status = okCount === results.length ? "published" : okCount > 0 ? "partial_failed" : "failed";
  const firstError = results.find((r) => !r.ok)?.error;
  return { status, results, error: status === "published" ? undefined : firstError };
}

let running = false; // guard against overlapping ticks within this process

export async function runPublishTick(): Promise<{ processed: number; published: number; failed: number }> {
  if (running) return { processed: 0, published: 0, failed: 0 };
  running = true;
  let processed = 0;
  let published = 0;
  let failed = 0;
  try {
    const due = await storage.getDuePostsForPublish(new Date().toISOString(), BATCH_LIMIT);
    for (const post of due) {
      // Claim it (approved -> publishing). If claim fails, another tick/instance got it.
      const claimed = await storage.claimPostForPublish(post.id);
      if (!claimed) continue;
      processed++;
      try {
        const { status, results, error } = await publishClaimedPost(claimed);
        await storage.updateScheduledPost(claimed.id, {
          status,
          publishedAt: status === "published" || status === "partial_failed" ? new Date().toISOString() : null,
          publishAttempts: (claimed.publishAttempts ?? 0) + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: error ? error.slice(0, 500) : null,
          publishResults: JSON.stringify(results),
        } as any);
        if (status === "published") published++;
        else failed++;
        console.log(`[publish-worker] post ${claimed.id}: ${status} (${results.filter(r => r.ok).length}/${results.length} destinations)`);
      } catch (e: any) {
        // Never leave a post stuck in `publishing`; record a fatal failure.
        failed++;
        await storage.updateScheduledPost(claimed.id, {
          status: "failed",
          publishAttempts: (claimed.publishAttempts ?? 0) + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: String(e?.message || e).slice(0, 500),
        } as any);
        console.warn(`[publish-worker] post ${claimed.id} fatal error:`, e?.message || e);
      }
    }
  } catch (e: any) {
    console.warn("[publish-worker] tick error:", e?.message || e);
  } finally {
    running = false;
  }
  return { processed, published, failed };
}

let timer: NodeJS.Timeout | undefined;

export function startMarketingPublishWorker() {
  if (!ENABLED) {
    console.log(
      "[publish-worker] disabled (set ENABLE_MARKETING_PUBLISH_WORKER=true to enable). No scheduled posts will be auto-published.",
    );
    return;
  }
  if (timer) return; // already started
  console.log(`✅ Marketing publish worker started (interval ${INTERVAL_MS}ms). Publishing APPROVED + due posts only.`);
  // Do not run immediately on boot — wait one interval so an accidental enable
  // is easier to catch in logs before the first send.
  timer = setInterval(runPublishTick, INTERVAL_MS);
}

export function isPublishWorkerEnabled(): boolean {
  return ENABLED;
}
