// ============================================================
// SMOKE TEST — LinkedIn OAuth callback safety helpers (NO secrets, NO network)
// ============================================================
// Exercises the crash-prone pieces of the LinkedIn OAuth callback in isolation:
//   - state parsing never throws on missing / malformed / expired input
//   - the popup HTML escapes untrusted messages (no markup injection)
//   - the redirect URI is built canonically off BASE_URL (www domain)
// This never contacts LinkedIn and never publishes anything. Run with:
//   npx tsx script/smoke-linkedin.ts   (or: npm run smoke:linkedin)
import {
  parseLinkedInState,
  linkedinPopupHtml,
  linkedinRedirectUri,
  escapeHtml,
  safeErrorMessage,
  LINKEDIN_STATE_MAX_AGE_MS,
} from "../server/linkedin-oauth";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}

console.log("parseLinkedInState (malformed / missing — must never throw, returns null):");
for (const bad of [undefined, null, "", "!!!not base64!!!", "@@@", 12345, {}, "="] as unknown[]) {
  let threw = false;
  let result: unknown = "unset";
  try {
    result = parseLinkedInState(bad as any);
  } catch {
    threw = true;
  }
  assert(!threw, `does not throw for input ${JSON.stringify(bad)}`);
  assert(result === null, `returns null for input ${JSON.stringify(bad)}`);
}

console.log("parseLinkedInState (valid fresh state):");
const freshState = Buffer.from(`42:${Date.now()}:abc123`).toString("base64");
const fresh = parseLinkedInState(freshState);
assert(fresh?.userId === 42, "extracts userId from a fresh signed-window state");

console.log("parseLinkedInState (expired state -> null):");
const expiredTs = Date.now() - LINKEDIN_STATE_MAX_AGE_MS - 60_000;
const expiredState = Buffer.from(`42:${expiredTs}:abc123`).toString("base64");
assert(parseLinkedInState(expiredState) === null, "rejects a state older than the freshness window");

console.log("parseLinkedInState (legacy no-timestamp form accepted):");
const legacyState = Buffer.from(`7`).toString("base64");
assert(parseLinkedInState(legacyState)?.userId === 7, "accepts legacy userId-only state");

console.log("parseLinkedInState (non-numeric / zero / negative userId -> null):");
assert(parseLinkedInState(Buffer.from(`abc:${Date.now()}:x`).toString("base64")) === null, "rejects non-numeric userId");
assert(parseLinkedInState(Buffer.from(`0:${Date.now()}:x`).toString("base64")) === null, "rejects zero userId");
assert(parseLinkedInState(Buffer.from(`-3:${Date.now()}:x`).toString("base64")) === null, "rejects negative userId");

console.log("escapeHtml (injection is neutralized):");
const evil = `</p><script>alert('xss')</script>`;
const escaped = escapeHtml(evil);
assert(!escaped.includes("<script>"), "escapes < so injected markup cannot execute");
assert(escaped.includes("&lt;script&gt;"), "produces entity-encoded output");

console.log("linkedinPopupHtml (renders, escapes message, well-formed postMessage):");
const okHtml = linkedinPopupHtml(true, "Welcome, Jane");
assert(okHtml.includes("LinkedIn Connected"), "success page shows connected heading");
assert(okHtml.includes('success:true'), "success page posts success:true");
const errHtml = linkedinPopupHtml(false, evil);
assert(!errHtml.includes("<script>alert"), "error message is escaped in the popup body");
assert(errHtml.includes('success:false'), "failure page posts success:false");
// Coercion: any truthy non-boolean must still yield a literal boolean in the JS.
const coerced = linkedinPopupHtml("yes" as unknown as boolean, "x");
assert(coerced.includes('success:false') && !coerced.includes('success:"yes"'), "non-boolean success is coerced to a JS boolean literal");

console.log("linkedinRedirectUri (canonical www callback, no double slash):");
assert(
  linkedinRedirectUri("https://www.toolsyourway.com") === "https://www.toolsyourway.com/api/social/linkedin/callback",
  "builds the exact production redirect URI",
);
assert(
  linkedinRedirectUri("https://www.toolsyourway.com/") === "https://www.toolsyourway.com/api/social/linkedin/callback",
  "strips a trailing slash so the URI matches the portal registration",
);
assert(
  linkedinRedirectUri("http://localhost:5000") === "http://localhost:5000/api/social/linkedin/callback",
  "works for the local dev origin too",
);

console.log("safeErrorMessage (never throws, trims, no secrets by contract):");
assert(safeErrorMessage(new Error("boom")) === "boom", "unwraps Error.message");
assert(typeof safeErrorMessage({ weird: true }) === "string", "stringifies non-Error input without throwing");
assert(safeErrorMessage(new Error("x".repeat(500))).length <= 200, "truncates long messages");

if (failures > 0) {
  console.error(`\nSMOKE FAILED: ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("\nSMOKE PASSED: LinkedIn OAuth callback safety helpers are sound.");
