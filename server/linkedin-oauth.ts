// ============================================================
// LinkedIn OAuth — pure, side-effect-free helpers
// ============================================================
// Extracted from the callback route so the crash-prone bits (state parsing,
// HTML rendering, URL construction) are individually unit/smoke testable
// WITHOUT contacting LinkedIn. Every function here is total: it must never
// throw, regardless of input, so the callback can rely on them inside its
// hardened try/catch without introducing new failure modes.

// The canonical callback path. The full redirect URI is built off the app's
// BASE_URL (see linkedinRedirectUri) so production always uses the www origin
// registered in the LinkedIn developer portal:
//   https://www.toolsyourway.com/api/social/linkedin/callback
export const LINKEDIN_CALLBACK_PATH = "/api/social/linkedin/callback";

// Freshness window for the OAuth `state` value. LinkedIn round-trips are short;
// 15 minutes is generous and matches the other OAuth flows in this repo.
export const LINKEDIN_STATE_MAX_AGE_MS = 15 * 60 * 1000;

// Escape a user-visible string so it cannot break out of the popup HTML.
// The callback interpolates provider/error text into an HTML document, so any
// unescaped `<`, `"`, etc. from LinkedIn (or a crafted query string) could
// otherwise inject markup. Total: never throws.
export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Build the canonical LinkedIn redirect URI from the app base URL. Callers pass
// getBaseUrl(req), which prefers BASE_URL in production and falls back to the
// request origin in dev. Trailing slashes on baseUrl are normalized away so the
// URI is byte-identical to the value registered in the LinkedIn portal.
export function linkedinRedirectUri(baseUrl: string): string {
  const normalized = String(baseUrl || "").replace(/\/+$/, "");
  return `${normalized}${LINKEDIN_CALLBACK_PATH}`;
}

// Parse the LinkedIn OAuth `state`. State is base64(`<userId>:<ts>:<nonce>`),
// encoding the initiating userId so the popup callback can attach the resulting
// connection to the right account even if the session cookie did not survive
// the popup navigation.
//
// Contract (requirement: state handling must never throw):
//   - malformed / missing / non-string  -> null
//   - userId not a positive integer      -> null
//   - timestamp present but older than
//     LINKEDIN_STATE_MAX_AGE_MS (expired) -> null
//   - legacy form with no timestamp       -> accepted (userId only)
// A null result is a clean "could not derive user from state" signal; the
// caller then falls back to the session or fails the OAuth cleanly.
export function parseLinkedInState(
  state: unknown,
): { userId: number; ts?: number } | null {
  if (typeof state !== "string" || state.length === 0) return null;
  try {
    const decoded = Buffer.from(state, "base64").toString("utf-8");
    const parts = decoded.split(":");
    const userId = parseInt(parts[0], 10);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    if (parts.length > 1) {
      const ts = parseInt(parts[1], 10);
      if (Number.isFinite(ts)) {
        if (Date.now() - ts > LINKEDIN_STATE_MAX_AGE_MS) return null; // expired
        return { userId, ts };
      }
    }
    return { userId };
  } catch {
    return null;
  }
}

// Render the popup result page. The message is HTML-escaped; `success` is
// coerced to a literal boolean so the postMessage payload is always valid JS.
// Total: never throws.
export function linkedinPopupHtml(success: boolean, message: string): string {
  const ok = success === true;
  const safeMsg = escapeHtml(message);
  return `<!doctype html><html><head><meta charset="utf-8"><title>LinkedIn</title>
<style>body{font-family:-apple-system,Inter,sans-serif;background:#FDFCF8;color:#1E1650;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px}
.card{max-width:400px;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08)}
.icon{width:56px;height:56px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px}
.ok{background:#D1FAE5;color:#065F46}
.err{background:#FEE2E2;color:#991B1B}
h1{font-size:18px;margin:0 0 8px}
p{color:#666;font-size:14px;margin:0}
</style></head><body><div class="card">
<div class="icon ${ok ? "ok" : "err"}">${ok ? "✓" : "✗"}</div>
<h1>${ok ? "LinkedIn Connected" : "Connection Failed"}</h1><p>${safeMsg}</p><p style="margin-top:16px;font-size:12px">You can close this window.</p>
</div><script>setTimeout(function(){try{if(window.opener){window.opener.postMessage({type:"linkedin-oauth",success:${ok ? "true" : "false"}},"*");}}catch(e){}try{window.close();}catch(e){}},1500);</script></body></html>`;
}

// Compact, secret-free error string for structured logs. Never throws and
// never returns tokens/codes (callers pass Error objects, not raw responses).
export function safeErrorMessage(err: unknown): string {
  try {
    if (err instanceof Error) return (err.message || err.name || "Error").slice(0, 200);
    return String(err).slice(0, 200);
  } catch {
    return "unknown error";
  }
}

// Read a fetch Response body as text without ever throwing (network aborts /
// already-consumed bodies become a placeholder instead of a rejection).
export async function safeResponseText(res: { text: () => Promise<string> }): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<unreadable response body>";
  }
}
