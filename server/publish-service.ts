// ============================================================
// PUBLISH SERVICE
// Reusable, request/response-free publishing helpers shared by the
// interactive publish endpoints AND the scheduled publish worker.
//
// Each function takes a resolved SocialConnection (with live tokens) plus the
// content/destination and returns a structured result. NONE of these functions
// read req/res or touch the DB — callers own auth, persistence and tokens.
//
// IMPORTANT: results never contain access tokens or secrets.
// ============================================================
import type { SocialConnection } from "@shared/schema";
import type { PersistedDestination } from "./social-destinations";

export interface PublishOutcome {
  ok: boolean;
  // Stable, machine-readable code so callers can branch without parsing prose.
  //   posted        — published successfully
  //   unsupported   — platform/destination cannot publish this content type
  //   not_connected — no valid live connection/token
  //   error         — attempted but the platform rejected it
  code: "posted" | "unsupported" | "not_connected" | "error";
  id?: string; // platform post/media id
  url?: string; // public URL to the published item, when known
  message?: string; // human-readable detail (success note or error)
}

function truncate(s: string, n = 300): string {
  return s.length > n ? s.slice(0, n) : s;
}

// ---- LinkedIn (profile + organization/page) ----
// Reuses the same UGC Posts call the interactive endpoint uses.
export async function publishLinkedIn(
  conn: SocialConnection,
  text: string,
  opts: { asOrganization?: boolean; organizationId?: string } = {},
): Promise<PublishOutcome> {
  if (!conn.accessToken) {
    return { ok: false, code: "not_connected", message: "LinkedIn token missing — reconnect LinkedIn." };
  }
  let authorUrn: string;
  if (opts.asOrganization) {
    const orgId = String(opts.organizationId || "").replace(/^urn:li:organization:/, "");
    if (!orgId) return { ok: false, code: "error", message: "LinkedIn organization id required to post to a Page." };
    authorUrn = `urn:li:organization:${orgId}`;
  } else {
    const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    });
    if (!userInfoRes.ok) return { ok: false, code: "not_connected", message: "LinkedIn token expired — reconnect." };
    const userInfo: any = await userInfoRes.json();
    authorUrn = `urn:li:person:${userInfo.sub}`;
  }

  const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  if (!postRes.ok) {
    return { ok: false, code: "error", message: `LinkedIn error: ${truncate(await postRes.text(), 200)}` };
  }
  const posted: any = await postRes.json();
  return { ok: true, code: "posted", id: posted.id, url: `https://www.linkedin.com/feed/update/${posted.id}` };
}

// ---- X / Twitter (profile, text only here) ----
// Media uploads still go through the interactive /api/publish/twitter-with-media
// endpoint (needs OAuth 1.0a). The worker only has text content, so this is the
// text path; media is a documented limitation for scheduled posts.
export async function publishTwitter(conn: SocialConnection, text: string): Promise<PublishOutcome> {
  if (!conn.accessToken) {
    return { ok: false, code: "not_connected", message: "X token missing — reconnect X (OAuth 2.0 PKCE)." };
  }
  const r = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${conn.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) {
    return { ok: false, code: "error", message: `X error: ${truncate(await r.text(), 200)}` };
  }
  const data: any = await r.json();
  const id = data.data?.id;
  return { ok: true, code: "posted", id, url: id ? `https://twitter.com/i/web/status/${id}` : undefined };
}

// ---- Facebook (Page only) ----
// `conn.pages` holds the page-scoped tokens captured at connect time.
export async function publishFacebookPage(
  conn: SocialConnection,
  text: string,
  pageId?: string,
): Promise<PublishOutcome> {
  let pages: any[] = [];
  try { pages = conn.pages ? JSON.parse(conn.pages) : []; } catch { pages = []; }
  const targetPage = pageId ? pages.find((p: any) => String(p.id) === String(pageId)) : pages[0];
  if (!targetPage?.accessToken) {
    return { ok: false, code: "not_connected", message: "No Facebook Page token available — reconnect Facebook." };
  }
  const postRes = await fetch(`https://graph.facebook.com/v19.0/${targetPage.id}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message: text, access_token: targetPage.accessToken }).toString(),
  });
  if (!postRes.ok) {
    return { ok: false, code: "error", message: `Facebook error: ${truncate(await postRes.text(), 200)}` };
  }
  const posted: any = await postRes.json();
  return { ok: true, code: "posted", id: posted.id, url: `https://facebook.com/${posted.id}` };
}

// ---- Instagram ----
// IG REQUIRES a media asset fetched from a public HTTPS URL — text-only feed
// posts are impossible. Scheduled posts in this product carry text only, so
// the worker cannot publish to Instagram. Return a clear unsupported result
// rather than faking success.
export function instagramUnsupported(): PublishOutcome {
  return {
    ok: false,
    code: "unsupported",
    message:
      "Instagram requires an image or video at a public HTTPS URL — text-only scheduled posts cannot be auto-published. Use the Instagram composer with media.",
  };
}

// ---- YouTube ----
// Community posting is not generally available via API; we never fake success.
export function youtubeUnsupported(): PublishOutcome {
  return {
    ok: false,
    code: "unsupported",
    message:
      "YouTube Community posting is not available via the public API yet, and video upload is not supported for text-only scheduled posts.",
  };
}

// ============================================================
// DISPATCH: publish one persisted destination using a live connection.
// ============================================================
export async function publishToDestination(
  conn: SocialConnection | undefined,
  destination: PersistedDestination,
  content: string,
): Promise<PublishOutcome> {
  if (!conn || conn.status !== "connected") {
    return { ok: false, code: "not_connected", message: `${destination.platform} is not connected.` };
  }

  try {
    switch (destination.platform) {
      case "linkedin": {
        const asOrg = destination.destinationType === "organization" || destination.destinationType === "page";
        return await publishLinkedIn(conn, content, {
          asOrganization: asOrg,
          organizationId: asOrg ? destination.destinationId : undefined,
        });
      }
      case "twitter":
        return await publishTwitter(conn, content);
      case "facebook":
        // For Facebook, destinationId is the Page id.
        return await publishFacebookPage(conn, content, destination.destinationId);
      case "instagram":
        return instagramUnsupported();
      case "youtube":
        return youtubeUnsupported();
      default:
        return { ok: false, code: "unsupported", message: `Publishing to ${destination.platform} is not supported by the worker.` };
    }
  } catch (e: any) {
    return { ok: false, code: "error", message: truncate(String(e?.message || e), 300) };
  }
}
