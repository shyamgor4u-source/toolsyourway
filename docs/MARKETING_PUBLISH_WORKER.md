# Marketing Scheduled Publish Worker

Background worker that auto-publishes **approved + due** Marketing Bot scheduled
posts to the per-post destinations captured when the post was created.

> ⚠️ **Publishing to social platforms is irreversible.** The worker is **OFF by
> default** and only ever publishes posts that the user has explicitly
> **approved** and whose scheduled time is due. Drafts and unapproved posts are
> never auto-published.

## How it works

1. The user composes a post in the Marketing Bot and schedules it. The post is
   saved with status `scheduled` and a **token-free destination snapshot**
   (`scheduled_posts.destinations`) recording exactly which profiles/pages it
   targets.
2. The user (or an admin flow) **approves** the post → status `approved`.
3. When `ENABLE_MARKETING_PUBLISH_WORKER=true`, the worker polls every
   `MARKETING_PUBLISH_WORKER_INTERVAL_MS` (default 60s) for posts that are
   `approved` **and** due (`scheduled_for <= now`, or null = send asap).
4. Each due post is **claimed** with a conditional status transition
   (`approved → publishing`) so it cannot be published twice.
5. For every destination in the snapshot, the worker resolves the user's
   **current** live social connection by platform + `accountId`, validates the
   destination still belongs to the user, and publishes via the correct
   platform implementation. Tokens are read live and never stored on the post.
6. The post is marked `published`, `partial_failed`, or `failed` based on the
   per-destination outcomes, which are saved (URLs/IDs/errors, token-free) to
   `scheduled_posts.publish_results`.

## Status model (`scheduled_posts.status`)

| status           | meaning                                                        | worker acts? |
|------------------|----------------------------------------------------------------|--------------|
| `draft`          | not ready                                                      | no |
| `scheduled`      | composed & time set, **not approved**                          | no |
| `approved`       | user approved; will publish when due                           | **yes** |
| `publishing`     | claimed by the worker (in-flight lock)                         | — |
| `published`      | all destinations succeeded                                     | no |
| `partial_failed` | some destinations succeeded, some failed                       | no (retry) |
| `failed`         | no destination succeeded                                       | no (retry) |
| `cancelled`      | user cancelled                                                 | no |

Legacy rows created before this feature have status `scheduled`, which is **not
publishable** — they will never be auto-published unless a user approves them.

## Platform support & limitations

| Platform   | Destination            | Scheduled (text) auto-publish |
|------------|------------------------|-------------------------------|
| LinkedIn   | Profile + Organization | ✅ supported |
| X / Twitter| Profile                | ✅ text only (media/threads only via interactive composer) |
| Facebook   | Page                   | ✅ supported (Pages only) |
| Instagram  | Business/Creator       | ❌ requires image/video at a public HTTPS URL — text-only scheduled posts cannot be published. Returns a clear `unsupported` result. |
| YouTube    | Channel                | ❌ Community posting not available via public API; video upload not supported for text posts. Returns `unsupported` — never faked. |

## Environment variables

| var | default | notes |
|-----|---------|-------|
| `ENABLE_MARKETING_PUBLISH_WORKER` | `false` | Must be `true` to run. |
| `MARKETING_PUBLISH_WORKER_INTERVAL_MS` | `60000` | Poll interval (min 10000). |

## API

- `POST /api/bots/marketing/posts/:id/status` — body `{ action }` where action
  is `approve` | `unapprove` | `cancel` | `retry`. The approval gate.
- `GET /api/bots/marketing/publish-status` — **dry run**: reports the worker's
  enabled state, status counts, and which of the caller's posts are due now.
  Never publishes anything; safe to call anytime.
- `GET /api/bots/marketing/posts` — includes `status`, `destinations`,
  `publishResults`, and `lastError` for the cards UI.

## Enabling safely in Render (do this only after testing)

1. **Connect** the social accounts you intend to publish to and set the matching
   platform credentials (`LINKEDIN_CLIENT_ID/SECRET`, `TWITTER_CLIENT_ID/SECRET`,
   `FACEBOOK_APP_ID/SECRET`, etc. — see the other docs in this folder).
2. **Dry run:** create a post, approve it, then call
   `GET /api/bots/marketing/publish-status` and confirm it appears under
   `dueNow`. Nothing is published by this call.
3. In the Render dashboard, set `ENABLE_MARKETING_PUBLISH_WORKER=true` (and
   optionally `MARKETING_PUBLISH_WORKER_INTERVAL_MS`). Redeploy / restart.
4. Watch logs: the worker logs `Marketing publish worker started` and one line
   per processed post. The first tick fires one interval after boot, not
   immediately.
5. To turn it off again, set `ENABLE_MARKETING_PUBLISH_WORKER=false` and restart.

## Concurrency note

The claim (`approved → publishing` conditional UPDATE) is atomic at the
SQLite/libSQL level and is safe for the **single-instance** Render web service
this app deploys as. If you scale to **multiple instances**, the claim still
prevents double-publish, but you should run the worker on exactly **one**
instance (e.g. a dedicated worker process with the flag set, flag unset on web
instances) to avoid redundant polling.
