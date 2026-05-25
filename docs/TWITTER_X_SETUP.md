# X (Twitter) Setup — OAuth 2.0 + OAuth 1.0a (for media)

ToolsYourWay supports **two** X auth flows in parallel:

1. **OAuth 2.0 PKCE** — used to publish tweets (text/thread) via `POST /2/tweets`.
2. **OAuth 1.0a three-legged** — used to upload media (image / GIF / video) via the v1.1 chunked upload endpoint (`upload.twitter.com/1.1/media/upload.json`). The v2 PKCE bearer cannot sign the v1.1 upload endpoint, so a separate OAuth 1.0a connection is required if you want to attach media to tweets.

The two connections coexist on the same `twitter` social-connection row: the OAuth 2.0 fields (`accessToken` / `refreshToken`) and the OAuth 1.0a fields (`oauth1Token` / `oauth1TokenSecret`) are merged without clobbering one another.

---

## 1. Create / open your X app

[X Developer Portal → Projects & Apps](https://developer.twitter.com/en/portal/dashboard).

Posting via API requires the **Basic** plan ($200/mo) or higher. The free tier is read-only and cannot create tweets or upload media.

## 2. Enable User authentication

App → **User authentication settings → Set up**:

- **App permissions:** Read and write (add Direct Message if needed).
- **Type of app:** Web App, Automated App or Bot.
- **Callback URI / Redirect URL** — add **all of these**:
  - `https://www.toolsyourway.com/api/social/twitter/callback` (OAuth 2.0 PKCE)
  - `https://www.toolsyourway.com/api/social/twitter/oauth1/callback` (OAuth 1.0a — media)
  - `http://localhost:5000/api/social/twitter/callback` (local dev)
  - `http://localhost:5000/api/social/twitter/oauth1/callback` (local dev)
- **Website URL:** `https://www.toolsyourway.com`

Save.

## 3. Grab credentials

App → **Keys and tokens**:

- **API Key** and **API Key Secret** → these are the OAuth 1.0a "consumer key / secret".
- **OAuth 2.0 Client ID** and **Client Secret** → click "Generate" if not already.

## 4. Render environment variables

| Variable | Used for | Required? |
|---|---|---|
| `TWITTER_CLIENT_ID` | OAuth 2.0 PKCE (publish tweets) | Yes, for posting |
| `TWITTER_CLIENT_SECRET` | OAuth 2.0 PKCE | Yes, for posting |
| `TWITTER_API_KEY` | OAuth 1.0a (media upload) | Yes, for media |
| `TWITTER_API_SECRET` | OAuth 1.0a (media upload) | Yes, for media |
| `BASE_URL` | Building callback URLs | Always |

> **Fallback behavior:** if `TWITTER_API_KEY` / `TWITTER_API_SECRET` are not set, the server falls back to `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`. For many X apps the same credentials work for both flows; the explicit aliases are preferred for clarity.

## 5. Connect flows (UI)

**Connect X (publish):** `POST /api/social/connect` with `{ platform: "twitter" }` → response carries `{ usePkce: true, oauthStartUrl: "/api/social/twitter/oauth-start", authVersion: "oauth2_pkce" }`. Frontend then calls the start endpoint to obtain `authUrl` and opens the popup.

**Connect X (media upload):** `POST /api/social/connect` with `{ platform: "twitter_oauth1" }` → response carries `{ usePkce: true, oauthStartUrl: "/api/social/twitter/oauth1-start", authVersion: "oauth1" }`. After the user authorizes, `/api/social/twitter/oauth1/callback` saves `oauth1Token` + `oauth1TokenSecret` onto the existing `twitter` connection row.

Both connections can be linked independently; OAuth 2.0 is required to post text; OAuth 1.0a is only needed when attaching media.

## 6. Publishing

### Text or thread (no media)

```http
POST /api/publish/twitter-post
{
  "text": "hello world",
  "thread": ["tweet 1", "tweet 2"],          // optional
  "mediaIds": ["1234567890"]                  // optional, attached to first tweet
}
```

### Tweet with media (uploads from public URLs)

```http
POST /api/publish/twitter-with-media
{
  "text": "look at this",
  "imageUrls": ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"],
  "videoUrl":  "https://cdn.example.com/clip.mp4"
}
```

The server downloads each URL with a size/type check (SSRF guard rejects `localhost`, private IP ranges, and non-http/https schemes), then runs the **INIT → APPEND → FINALIZE → STATUS** chunked upload via OAuth 1.0a, and finally calls `POST /2/tweets` with the resulting `media_ids` via the OAuth 2.0 bearer.

You can also skip the upload step and pass pre-uploaded `mediaIds` directly.

### What media is supported

| Type | Max size | MIME types | Mixable | Notes |
|---|---|---|---|---|
| Image | 5 MB | `image/jpeg`, `image/png`, `image/webp` | Up to 4 images per tweet | Synchronous upload |
| GIF | 15 MB | `image/gif` | One only | Synchronous upload |
| Video | 512 MB | `video/mp4`, `video/quicktime` | One only (no images mixed) | Chunked + async STATUS polling |

Limits and types match the X v1.1 media upload reference. The `STATUS` polling loop waits for X's background processing for video uploads — large videos can take 1–2 minutes to finalize.

## 7. Known limits / risks

- **Single-instance only** — the OAuth 1.0a request-token store is process-local in `Map`. On multi-instance deploys, the user must hit the same instance for `oauth1-start` and the callback. Move to Redis if/when you scale beyond a single Render web service.
- **No video transcoding** — uploads pass bytes through as-is. If X rejects a codec/bitrate, the user sees the X error verbatim. Recommend re-encoding to H.264 + AAC, ≤ 1080p, ≤ 140 s before upload.
- **Token storage** — `oauth1Token` and `oauth1TokenSecret` are stored alongside `accessToken` in `social_connections`. Encrypt in production (same caveat as OAuth 2.0 access tokens).
- **API plan** — `tweet.write` and media upload both require the Basic plan or higher.
- **SSRF guard** — rejects `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, and any non-http/https scheme. DNS rebinding is NOT mitigated; do not point this at untrusted user-supplied hostnames in adversarial contexts.

## 8. Troubleshooting

**`Callback URL not approved by this client`** — the OAuth 1.0a callback URL (`/api/social/twitter/oauth1/callback`) is not whitelisted in the X portal. Add it under "User authentication settings → Callback URI / Redirect URL".

**`Could not authenticate you` on media upload** — `TWITTER_API_KEY` / `_SECRET` don't match the app whose OAuth 1.0a token was minted. Re-mint the OAuth 1.0a connection (`/api/social/twitter/oauth1-start`) after fixing env.

**Video stays `pending` forever** — usually a codec/bitrate the X transcoder can't handle. Check `processing_info.error.message` in the response logs.
