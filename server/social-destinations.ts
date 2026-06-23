// ============================================================
// SOCIAL DESTINATIONS
// Normalizes social_connections rows into a per-platform list of
// publishable destinations (profile / page / channel / business
// account / organization). Used by the Marketing Bot destination
// selector and the publish endpoints.
// ============================================================
import type { SocialConnection } from "@shared/schema";

export type DestinationType =
  | "profile"
  | "page"
  | "channel"
  | "business_account"
  | "organization";

export interface DestinationCapabilities {
  canPostText: boolean;
  canPostImage: boolean;
  canPostVideo: boolean;
  canPostCarousel: boolean;
}

export interface Destination {
  platform: string;
  destinationId: string; // page/channel/account id, or accountId for profiles
  accountId: string | null; // owning connection account id
  destinationType: DestinationType;
  displayName: string;
  handle: string | null;
  pageName: string | null;
  profilePictureUrl: string | null;
  connected: boolean;
  capabilities: DestinationCapabilities;
  selectedByDefault: boolean;
  note?: string; // helper/limitation text
}

export interface PlatformDestinations {
  platform: string;
  label: string;
  connected: boolean;
  supportsProfile: boolean;
  supportsPage: boolean;
  destinations: Destination[];
  note?: string;
}

const PLATFORM_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "X / Twitter",
  tiktok: "TikTok",
};

// What kinds of destinations each platform actually offers.
const PLATFORM_SHAPE: Record<string, { profile: boolean; page: boolean; pageType: DestinationType; note?: string }> = {
  linkedin: { profile: true, page: true, pageType: "organization", note: "Post to your personal profile, your LinkedIn Pages, or both." },
  facebook: { profile: false, page: true, pageType: "page", note: "Facebook only supports publishing to Pages via the Graph API — personal profile posting is not available." },
  instagram: { profile: true, page: false, pageType: "business_account", note: "Publishing requires an Instagram Business/Creator account linked to a Facebook Page." },
  youtube: { profile: false, page: true, pageType: "channel", note: "Posts target your YouTube channel. Community posts have limited API availability." },
  twitter: { profile: true, page: false, pageType: "profile", note: "X has no Page concept — posts go to your profile." },
  tiktok: { profile: true, page: false, pageType: "profile" },
};

function capsFor(platform: string, type: DestinationType): DestinationCapabilities {
  switch (platform) {
    case "linkedin":
      return { canPostText: true, canPostImage: true, canPostVideo: true, canPostCarousel: true };
    case "facebook":
      return { canPostText: true, canPostImage: true, canPostVideo: true, canPostCarousel: false };
    case "instagram":
      return { canPostText: false, canPostImage: true, canPostVideo: true, canPostCarousel: true };
    case "youtube":
      // Community/text posting is a placeholder; video upload is the real capability.
      return { canPostText: false, canPostImage: false, canPostVideo: true, canPostCarousel: false };
    case "twitter":
      return { canPostText: true, canPostImage: true, canPostVideo: true, canPostCarousel: false };
    default:
      return { canPostText: true, canPostImage: true, canPostVideo: false, canPostCarousel: false };
  }
}

function parsePages(raw: unknown): Array<{ id: string; name: string; type?: string; pictureUrl?: string }> {
  if (!raw) return [];
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Build the normalized destination list for one platform from its
 * connection row (if any). Selected defaults are passed in from the
 * Marketing Bot config so the UI can pre-check them.
 */
export function buildPlatformDestinations(
  platformKey: string,
  conn: SocialConnection | undefined,
  selectedIds: string[],
): PlatformDestinations {
  const shape = PLATFORM_SHAPE[platformKey] || { profile: true, page: false, pageType: "profile" as DestinationType };
  const label = PLATFORM_LABEL[platformKey] || platformKey;
  const connected = !!conn && conn.status === "connected";
  const destinations: Destination[] = [];

  if (connected && conn) {
    // Profile destination
    if (shape.profile) {
      const id = conn.accountId || `profile_${platformKey}`;
      destinations.push({
        platform: platformKey,
        destinationId: id,
        accountId: conn.accountId ?? null,
        destinationType: platformKey === "instagram" ? "business_account" : "profile",
        displayName: platformKey === "twitter"
          ? `${label} Profile${conn.displayName ? `: ${conn.displayName}` : ""}`
          : `${label} Profile${conn.displayName ? `: ${conn.displayName}` : ""}`,
        handle: conn.accountName ?? null,
        pageName: null,
        profilePictureUrl: conn.profilePictureUrl ?? null,
        connected: true,
        capabilities: capsFor(platformKey, "profile"),
        selectedByDefault: selectedIds.includes(id),
      });
    }

    // Page / channel / org destinations from the discovered pages list
    if (shape.page) {
      const pages = parsePages(conn.pages);
      const pageLabelWord = shape.pageType === "channel" ? "Channel"
        : shape.pageType === "organization" ? "Page"
        : "Page";
      for (const p of pages) {
        if (!p?.id) continue;
        // Skip pseudo "profile" entries in the pages array — profile is handled above.
        if (p.type === "profile" && shape.profile) continue;
        destinations.push({
          platform: platformKey,
          destinationId: String(p.id),
          accountId: conn.accountId ?? null,
          destinationType: shape.pageType,
          displayName: `${label} ${pageLabelWord}: ${p.name}`,
          handle: null,
          pageName: p.name,
          profilePictureUrl: p.pictureUrl ?? null,
          connected: true,
          capabilities: capsFor(platformKey, shape.pageType),
          selectedByDefault: selectedIds.includes(String(p.id)),
        });
      }
      // If connection itself is a single page/channel/business (no pages array), surface it.
      if (pages.length === 0 && conn.pageId) {
        destinations.push({
          platform: platformKey,
          destinationId: String(conn.pageId),
          accountId: conn.accountId ?? null,
          destinationType: shape.pageType,
          displayName: `${label} ${pageLabelWord}: ${conn.pageName || conn.displayName || conn.accountName || ""}`.trim(),
          handle: null,
          pageName: conn.pageName ?? null,
          profilePictureUrl: conn.profilePictureUrl ?? null,
          connected: true,
          capabilities: capsFor(platformKey, shape.pageType),
          selectedByDefault: selectedIds.includes(String(conn.pageId)),
        });
      } else if (pages.length === 0 && conn.accountType === "channel" && conn.accountId) {
        // YouTube channel stored directly on the connection
        destinations.push({
          platform: platformKey,
          destinationId: String(conn.accountId),
          accountId: conn.accountId ?? null,
          destinationType: "channel",
          displayName: `${label} Channel: ${conn.displayName || conn.accountName || ""}`.trim(),
          handle: conn.accountName ?? null,
          pageName: null,
          profilePictureUrl: conn.profilePictureUrl ?? null,
          connected: true,
          capabilities: capsFor(platformKey, "channel"),
          selectedByDefault: selectedIds.includes(String(conn.accountId)),
        });
      }
    }
  }

  return {
    platform: platformKey,
    label,
    connected,
    supportsProfile: shape.profile,
    supportsPage: shape.page,
    destinations,
    note: shape.note,
  };
}

export const SUPPORTED_PLATFORMS = ["linkedin", "facebook", "instagram", "youtube", "twitter", "tiktok"];

// ============================================================
// PER-POST DESTINATION PERSISTENCE
// ============================================================

// The minimal, token-free snapshot stored on each scheduled/published post.
// Captures enough to audit what was selected even if the connection later
// changes. Never includes access tokens or secrets.
export interface PersistedDestination {
  platform: string;
  destinationId: string;
  accountId: string | null;
  destinationType: DestinationType;
  displayName: string;
  handle: string | null;
  pageName: string | null;
  capabilities: DestinationCapabilities;
  // Snapshot of connection state at selection time for auditing.
  connectedAtSelection: boolean;
}

export interface ResolveDestinationsResult {
  resolved: PersistedDestination[];
  errors: string[];
}

function toPersisted(d: Destination): PersistedDestination {
  return {
    platform: d.platform,
    destinationId: d.destinationId,
    accountId: d.accountId,
    destinationType: d.destinationType,
    displayName: d.displayName,
    handle: d.handle,
    pageName: d.pageName,
    capabilities: d.capabilities,
    connectedAtSelection: d.connected,
  };
}

/**
 * Resolve explicit destination IDs for a single platform against the user's
 * live connection, validating them with the same platform rules used by the
 * selector. Returns normalized snapshots plus any validation errors.
 *
 * - Unknown / unavailable IDs => error (e.g. disconnected or removed page).
 * - Destination types not supported by the platform => error.
 */
export function resolveDestinations(
  platformKey: string,
  conn: SocialConnection | undefined,
  ids: string[],
): ResolveDestinationsResult {
  const errors: string[] = [];
  const resolved: PersistedDestination[] = [];

  if (!SUPPORTED_PLATFORMS.includes(platformKey)) {
    return { resolved, errors: [`Unsupported platform: ${platformKey}`] };
  }

  const label = PLATFORM_LABEL[platformKey] || platformKey;
  if (!conn || conn.status !== "connected") {
    return {
      resolved,
      errors: ids.length
        ? [`${label} is not connected — connect it before publishing to its destinations.`]
        : [],
    };
  }

  // Build the available destinations once; match requested ids against them.
  const available = buildPlatformDestinations(platformKey, conn, []).destinations;
  const byId = new Map(available.map((d) => [d.destinationId, d]));
  const shape = PLATFORM_SHAPE[platformKey] || { profile: true, page: false, pageType: "profile" as DestinationType };

  for (const id of ids) {
    const match = byId.get(id);
    if (!match) {
      errors.push(`${label}: destination "${id}" is unavailable or disconnected.`);
      continue;
    }
    // Validate the destination type is allowed for this platform.
    const typeAllowed =
      (match.destinationType === "profile" && shape.profile) ||
      (match.destinationType !== "profile" && shape.page) ||
      // instagram "profile" is modeled as business_account
      (platformKey === "instagram" && match.destinationType === "business_account");
    if (!typeAllowed) {
      errors.push(`${label}: ${match.destinationType} destinations are not supported.`);
      continue;
    }
    resolved.push(toPersisted(match));
  }

  return { resolved, errors };
}

/**
 * Resolve a flat map of platform -> destinationIds (e.g. Marketing Bot
 * defaults or an explicit per-post selection) into a single normalized list.
 * Collects validation errors across all platforms.
 */
export function resolveDestinationMap(
  connections: SocialConnection[],
  selection: Record<string, string[]>,
): ResolveDestinationsResult {
  const resolved: PersistedDestination[] = [];
  const errors: string[] = [];
  for (const [platformKey, ids] of Object.entries(selection)) {
    if (!Array.isArray(ids) || ids.length === 0) continue;
    const conn = connections.find((c) => c.platform === platformKey);
    const r = resolveDestinations(platformKey, conn, ids);
    resolved.push(...r.resolved);
    errors.push(...r.errors);
  }
  return { resolved, errors };
}

/**
 * Build the full grouped destinations response for a user.
 * `defaults` maps platform -> array of selected destinationIds.
 */
export function buildDestinations(
  connections: SocialConnection[],
  defaults: Record<string, string[]>,
): PlatformDestinations[] {
  return SUPPORTED_PLATFORMS.map((platformKey) => {
    const conn = connections.find((c) => c.platform === platformKey);
    const selected = defaults[platformKey] || [];
    return buildPlatformDestinations(platformKey, conn, selected);
  });
}
