import crypto from "crypto";
import { config } from "../config";

/**
 * ---------------------------------------------------------------------------
 * CSRF token derivation
 * ---------------------------------------------------------------------------
 * A session-bound synchronizer token, not a double-submit cookie. The token
 * is `HMAC-SHA256(sessionId, CSRF_SECRET)` — deterministic, so it never
 * needs its own cookie or storage, and it has no bootstrap race: it's
 * simply included in the JSON body of sign-up/sign-in/refresh alongside
 * `accessToken`, and the client echoes it back as an `X-CSRF-Token` header
 * on `/refresh` and `/sign-out`.
 *
 * Why this is safe even though `sessionId` itself isn't secret (it's a
 * plain UUID, visible in the decoded refresh-token JWT payload): producing
 * a *valid* token additionally requires `CSRF_SECRET`, which only the
 * server holds. An attacker who can't read the refresh cookie (it's
 * HttpOnly — invisible to JavaScript on any origin, including the
 * attacker's own page) and doesn't know the secret can't compute a
 * matching value, so simply guessing or replaying a session id gets them
 * nowhere.
 *
 * Deliberately stable across refresh-token rotation: `rotate()` changes
 * the refresh token's *value* but never its session id, so a signed-in
 * user's CSRF token stays valid across every silent refresh — it only
 * changes when a new session begins (sign-in/sign-up).
 * ---------------------------------------------------------------------------
 */

export function deriveCsrfToken(sessionId: string): string {
  return crypto.createHmac("sha256", config.csrf.secret).update(sessionId).digest("hex");
}

/**
 * Constant-time comparison — never use `===` for secrets, even
 * HMAC-derived ones, to avoid leaking information via response-timing
 * differences.
 */
export function isValidCsrfToken(sessionId: string, candidate: string | undefined): boolean {
  if (!candidate) return false;

  const expected = deriveCsrfToken(sessionId);
  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);

  return (
    expectedBuffer.length === candidateBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, candidateBuffer)
  );
}
