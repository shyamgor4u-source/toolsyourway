// Centralized config helpers for production-safe URL construction.
//
// In production, BASE_URL must be set to the canonical public origin
// (e.g. https://www.toolsyourway.com). All OAuth callbacks and payment
// redirect/return URLs must be built off this value so they never leak
// http://localhost:5000 into live OAuth dialogs or payment gateways.

import type { Request } from "express";

const DEFAULT_DEV_BASE_URL = "http://localhost:5000";

function normalize(value: string): string {
  return value.replace(/\/+$/, "");
}

// Returns the canonical app base URL with no trailing slash.
// Prefers process.env.BASE_URL. Falls back to a request-derived origin
// when available (useful for unconfigured environments / health checks),
// and finally to localhost for local development.
export function getBaseUrl(req?: Request): string {
  const envUrl = process.env.BASE_URL?.trim();
  if (envUrl) return normalize(envUrl);

  if (req) {
    const host = req.get("host");
    if (host) {
      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
      return normalize(`${proto}://${host}`);
    }
  }

  return DEFAULT_DEV_BASE_URL;
}

// True if BASE_URL has been explicitly configured. Useful for surfacing
// "missing config" errors in production rather than silently using a
// localhost fallback.
export function isBaseUrlConfigured(): boolean {
  return Boolean(process.env.BASE_URL?.trim());
}

// True when Razorpay server-side credentials are present. Frontend code
// should still receive the public key (RAZORPAY_KEY_ID) from the server
// per request and refuse to open the checkout when it is missing.
export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}
