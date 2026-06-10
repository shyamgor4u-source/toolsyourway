# Social Publish Destinations

The Marketing Bot can publish to different **destinations** within each connected
social platform — a personal **profile**, one or more **Pages / Channels /
Business accounts**, or several at once where the platform supports it.

Users choose their default destinations in the Marketing Bot under
**Actions → Publish Destinations**. Connected destinations are listed per
platform with capability badges (Text / Image / Video / Carousel) and a
checkbox to enable each one. Selections are saved per user and reused by the
bot when it publishes or schedules content.

## Data model

Available destinations are derived from the existing `social_connections` row
for each platform (no new tables); selected destinations are then snapshotted
per post (see *Per-post persistence* below):

- `accountType` — `profile | page | channel | business | organization | pending`
- `pageId` / `pageName` — the currently selected single page (legacy single-target flow)
- `pages` — JSON array `[{ id, name, type, pictureUrl }]` of all discoverable pages/channels
- `accountId`, `displayName`, `profilePictureUrl` — used for the profile destination

Default selections are stored (no secrets) inside the Marketing Bot's
`bot_configs.config` JSON:

```json
{ "destinations": { "linkedin": ["urn:li:organization:123", "li_profile_sub"], "twitter": ["acct_id"] } }
```

### Per-post persistence

Every scheduled/published post records exactly which destination(s) it
targeted, captured **at creation time**. This is stored on `scheduled_posts`:

- `destinations` — JSON array of normalized destination snapshots (nullable for
  legacy rows). Each entry is token-free and auditable even if the underlying
  connection/page is later changed or disconnected:

  ```jsonc
  [
    {
      "platform": "linkedin",
      "destinationId": "urn:li:organization:123",
      "accountId": "abc123",
      "destinationType": "organization",
      "displayName": "LinkedIn Page: Acme Inc",
      "handle": null,
      "pageName": "Acme Inc",
      "capabilities": { "canPostText": true, "canPostImage": true, "canPostVideo": true, "canPostCarousel": true },
      "connectedAtSelection": true
    }
  ]
  ```

- `destinationPlatform` — denormalized platform key of the first destination,
  for cheap filtering/display.

**No tokens or secrets** are ever written to a post record — only IDs, labels,
type, and a capability/connection snapshot.

### Defaults vs. per-post overrides

When a post is scheduled, destinations are resolved with this precedence:

1. An explicit `destinations` map in the request body (`{ platform: string[] }`).
2. An explicit `destinationIds` array (applied to the post's own platform).
3. The Marketing Bot's saved defaults (resolved & snapshotted at creation time).

Explicit selections (1 & 2) are **validated** — if any destination is
disconnected, removed, or an unsupported type for the platform, the request is
rejected with `400` and an `errors` array. Defaults (3) are best-effort: a
default that no longer resolves is silently skipped so old/stale defaults can't
block scheduling.

## API

### `GET /api/social/destinations`

Returns destinations grouped by platform for the authenticated user.

```jsonc
{
  "platforms": [
    {
      "platform": "linkedin",
      "label": "LinkedIn",
      "connected": true,
      "supportsProfile": true,
      "supportsPage": true,
      "note": "Post to your personal profile, your LinkedIn Pages, or both.",
      "destinations": [
        {
          "platform": "linkedin",
          "destinationId": "abc123",
          "accountId": "abc123",
          "destinationType": "profile",      // profile | page | channel | business_account | organization
          "displayName": "LinkedIn Profile: Shyam Gor",
          "handle": "Shyam Gor",
          "pageName": null,
          "profilePictureUrl": "https://…",
          "connected": true,
          "capabilities": { "canPostText": true, "canPostImage": true, "canPostVideo": true, "canPostCarousel": true },
          "selectedByDefault": true
        }
      ]
    }
  ]
}
```

### `POST /api/social/destinations/defaults`

Saves the per-platform default selections. No secrets are stored — only the
destination IDs the user selected.

```json
{ "destinations": { "linkedin": ["urn:li:organization:123"], "facebook": ["page_456"] } }
```

### `POST /api/bots/marketing/schedule` (destination-aware)

Schedules a post and persists its destination snapshot. Body:

```jsonc
{
  "content": "…",
  "platform": "LinkedIn",
  "scheduledFor": "2026-06-10T12:00:00.000Z",
  // Optional, in precedence order (first present wins):
  "destinations": { "linkedin": ["urn:li:organization:123"] }, // explicit map
  "destinationIds": ["urn:li:organization:123"]                 // explicit, this post's platform
  // If both omitted, the Marketing Bot's saved defaults are resolved & persisted.
}
```

The response echoes the created post plus a structured `destinations` array.
`GET /api/bots/marketing/posts` returns the same parsed `destinations` array on
each post so the UI can render destination chips.

### Publish endpoints (destination-aware)

- `POST /api/publish/linkedin-post` — accepts `destinationId` + `destinationType`.
  `organization`/`page` posts as `urn:li:organization:<id>`; otherwise posts to
  the personal profile (default, backward-compatible).
- `POST /api/publish/facebook-page` — accepts `pageId` (the destination id) and
  resolves the page-scoped token server-side.
- `POST /api/publish/twitter-post` — profile only; rejects non-profile destination types.

## Platform support & limitations

| Platform   | Profile | Page / Channel / Business        | Notes |
|------------|---------|----------------------------------|-------|
| LinkedIn   | ✅      | ✅ Pages (Organizations)          | Choose profile, Page(s), or both. |
| Facebook   | ❌      | ✅ Pages                          | Graph API does **not** support profile posting. |
| Instagram  | ✅*     | ✅ Business/Creator account       | Requires an IG Business/Creator account linked to a Facebook Page. |
| YouTube    | ❌      | ✅ Channel                        | Community/text posts have limited API availability — video is the real capability. |
| X / Twitter| ✅      | ❌ (no Pages exist)               | Labeled "X Profile". |
| TikTok     | ✅      | ❌                                | Profile only. |

\* Instagram's "profile" destination is the connected Business/Creator account.

## Mobile

The mobile app's Bots screen does not yet surface destination selection.
**TODO:** add a destination picker to the mobile Marketing Bot screen that
consumes `GET /api/social/destinations` and `POST /api/social/destinations/defaults`.
