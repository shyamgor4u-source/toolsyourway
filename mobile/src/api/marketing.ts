import { api } from "./client";

// Types mirror the backend's normalized Marketing Bot publish shapes.
// Source of truth: server/social-destinations.ts and server/routes.ts
// (GET /api/social/destinations, /api/bots/marketing/*).

export type DestinationCapabilities = {
  canPostText: boolean;
  canPostImage: boolean;
  canPostVideo: boolean;
  canPostCarousel: boolean;
};

export type DestinationType =
  | "profile"
  | "page"
  | "channel"
  | "business_account"
  | "organization";

export type Destination = {
  platform: string;
  destinationId: string;
  accountId: string | null;
  destinationType: DestinationType;
  displayName: string;
  handle: string | null;
  pageName: string | null;
  profilePictureUrl: string | null;
  connected: boolean;
  capabilities: DestinationCapabilities;
  selectedByDefault: boolean;
  note?: string;
};

export type PlatformDestinations = {
  platform: string;
  label: string;
  connected: boolean;
  supportsProfile: boolean;
  supportsPage: boolean;
  destinations: Destination[];
  note?: string;
};

export type DestinationsResponse = { platforms: PlatformDestinations[] };

export type PersistedDestination = {
  platform: string;
  destinationId: string;
  accountId: string | null;
  destinationType: DestinationType;
  displayName: string;
  handle: string | null;
  pageName: string | null;
  capabilities: DestinationCapabilities;
  connectedAtSelection: boolean;
};

export type PublishResult = {
  platform: string;
  destinationId: string;
  displayName: string;
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
  at: string;
};

export type PostStatus =
  | "draft"
  | "scheduled"
  | "approved"
  | "publishing"
  | "published"
  | "partial_failed"
  | "failed"
  | "cancelled";

export type ScheduledPost = {
  id: number;
  userId: number;
  content: string;
  platform: string;
  status: PostStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  destinations: PersistedDestination[];
  destinationPlatform: string | null;
  approvedAt: string | null;
  publishAttempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  publishResults: PublishResult[];
  createdAt: string;
};

export type PostStatusAction = "approve" | "unapprove" | "cancel" | "retry";

export type PostStatusResponse = ScheduledPost & { workerEnabled: boolean };

export type PublishStatusDue = {
  id: number;
  platform: string;
  scheduledFor: string | null;
  destinationCount: number;
};

export type PublishStatus = {
  workerEnabled: boolean;
  intervalMs: number;
  statusCounts: Partial<Record<PostStatus, number>>;
  dueNow: PublishStatusDue[];
};

// Per-platform selected destination IDs, e.g. { linkedin: ["urn:...", "page_1"] }.
export type DestinationDefaults = Record<string, string[]>;

export const marketing = {
  // Publish destinations grouped by platform, with connect state + capabilities.
  destinations: () => api.get<DestinationsResponse>("/api/social/destinations"),

  // Save the Marketing Bot default destination selections (IDs only, no secrets).
  saveDefaults: (destinations: DestinationDefaults) =>
    api.post<{ success: boolean; destinations: DestinationDefaults }>(
      "/api/social/destinations/defaults",
      { destinations },
    ),

  // Scheduled / awaiting-approval posts with parsed destinations + results.
  posts: () => api.get<ScheduledPost[]>("/api/bots/marketing/posts"),

  // Approval gate: approve | unapprove | cancel | retry. Worker stays
  // backend-controlled; this only changes a post's status.
  setStatus: (id: number, action: PostStatusAction) =>
    api.post<PostStatusResponse>(`/api/bots/marketing/posts/${id}/status`, { action }),

  // Dry-run worker status: never publishes. Reports worker on/off + due counts.
  publishStatus: () => api.get<PublishStatus>("/api/bots/marketing/publish-status"),
};
