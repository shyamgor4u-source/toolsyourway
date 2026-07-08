// ============================================================
// SMOKE TEST — publish destination resolution (NO secrets, NO network)
// ============================================================
// Validates the pure logic that decides WHERE a scheduled post publishes:
//   - buildPlatformDestinations: a connected LinkedIn account yields a
//     publishable profile destination.
//   - resolveDestinations: valid ids resolve, unknown ids error.
//   - the "profile / first available" fallback the worker uses to auto-repair
//     posts that have no destination snapshot.
//
// This never contacts LinkedIn/X/Meta and never publishes anything. Run with:
//   npx tsx script/smoke-publish.ts
import {
  buildPlatformDestinations,
  resolveDestinations,
} from "../server/social-destinations";
import type { SocialConnection } from "../shared/schema";

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}

// A minimal connected LinkedIn connection (no real token needed for pure logic).
const linkedinConn = {
  id: 1,
  userId: 1,
  platform: "linkedin",
  status: "connected",
  accountId: "person-abc",
  accountName: "jane-doe",
  displayName: "Jane Doe",
  accessToken: "not-a-real-token",
  pages: null,
  pageId: null,
  pageName: null,
  accountType: null,
  profilePictureUrl: null,
  expiresAt: null,
  connectedAt: new Date().toISOString(),
} as unknown as SocialConnection;

console.log("buildPlatformDestinations (connected LinkedIn):");
const built = buildPlatformDestinations("linkedin", linkedinConn, []);
assert(built.connected === true, "reports connected");
assert(built.destinations.length >= 1, "yields at least one destination");
const profile = built.destinations.find((d) => d.destinationType === "profile");
assert(!!profile, "includes a profile destination");
assert(profile?.destinationId === "person-abc", "profile destinationId is the accountId");

console.log("resolveDestinations (valid + invalid ids):");
const good = resolveDestinations("linkedin", linkedinConn, ["person-abc"]);
assert(good.errors.length === 0, "valid id has no errors");
assert(good.resolved.length === 1, "valid id resolves to one destination");
assert(good.resolved[0].connectedAtSelection === true, "snapshot records connected state");

const bad = resolveDestinations("linkedin", linkedinConn, ["does-not-exist"]);
assert(bad.errors.length === 1, "unknown id produces an error");
assert(bad.resolved.length === 0, "unknown id resolves nothing");

console.log("disconnected platform:");
const disconnected = { ...linkedinConn, status: "disconnected" } as SocialConnection;
const off = resolveDestinations("linkedin", disconnected, ["person-abc"]);
assert(off.resolved.length === 0, "no destinations resolve when disconnected");
assert(off.errors.length === 1, "disconnected platform reports an error");

console.log("worker fallback (profile chosen when no explicit selection):");
const available = buildPlatformDestinations("linkedin", linkedinConn, []).destinations;
const fallback =
  available.find((d) => d.destinationType === "profile" || d.destinationType === "business_account") ||
  available[0];
assert(!!fallback, "a fallback destination exists for a connected account");
const repaired = resolveDestinations("linkedin", linkedinConn, [fallback.destinationId]);
assert(repaired.resolved.length === 1, "fallback destination resolves for auto-repair");

if (failures > 0) {
  console.error(`\nSMOKE FAILED: ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log("\nSMOKE PASSED: destination resolution logic is sound.");
