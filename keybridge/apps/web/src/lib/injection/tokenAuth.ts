/**
 * tokenAuth.ts
 *
 * Validates the X-Internal-Token header on inbound requests to the
 * /api/internal/* routes. These routes are never meant to be called from
 * a browser — only from trusted server-side callers (other internal
 * services, Next.js server components, cron jobs, etc.).
 *
 * The secret is stored in INTERNAL_API_SECRET (env var). It is never
 * sent to the client, never returned in any response, and never logged.
 *
 * Timing-safe comparison is used deliberately: a simple string equality
 * check leaks information about how many characters match via response
 * timing. crypto.timingSafeEqual eliminates that side-channel.
 */

import { timingSafeEqual, createHash } from "crypto";

const HEADER_NAME = "x-internal-token";

export type TokenAuthResult =
  | { ok: true }
  | { ok: false; reason: "missing_token" | "invalid_token" | "misconfigured" };

/**
 * Validates the internal token from a request header.
 *
 * Returns { ok: true } only when the header is present, the env var is
 * configured, and the values match in constant time.
 */
export function validateInternalToken(headers: Headers): TokenAuthResult {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret || secret.length < 32) {
    // INTERNAL_API_SECRET is not set or is too short to be safe.
    // Fail closed: reject the request rather than silently allow it.
    // This also fires during local dev if the env file is incomplete.
    console.error(
      "[injection] INTERNAL_API_SECRET is missing or too short (min 32 chars). " +
        "Set it in .env.local and ensure it is never committed to source control."
    );
    return { ok: false, reason: "misconfigured" };
  }

  const provided = headers.get(HEADER_NAME);

  if (!provided) {
    return { ok: false, reason: "missing_token" };
  }

  // Hash both values to the same fixed length before comparing.
  // timingSafeEqual requires equal-length Buffers.
  const expectedHash = createHash("sha256").update(secret).digest();
  const providedHash = createHash("sha256").update(provided).digest();

  const match = timingSafeEqual(expectedHash, providedHash);

  if (!match) {
    return { ok: false, reason: "invalid_token" };
  }

  return { ok: true };
}
