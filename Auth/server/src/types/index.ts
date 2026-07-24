/**
 * Shared domain types for MiniClerk.
 * Kept framework-agnostic so they can be reused if the storage layer
 * is swapped out for MongoDB, Supabase, Postgres, etc.
 */

export interface User {
  id: string;
  email: string;
  /** Never sent to the client — only ever read/written inside the db layer. */
  passwordHash: string;
  name: string;
  avatar: string;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  createdAt: string;
}

/** The shape of a user that is safe to return to the client. */
export type PublicUser = Omit<User, "passwordHash">;

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  /**
   * The refresh token that was replaced by the current one, kept around
   * only so a replay of it can be recognized as reuse. If someone presents
   * this old value, it means either it leaked and the real user already
   * moved past it, or an attacker is racing the legitimate client — either
   * way, the session should be treated as compromised.
   */
  previousRefreshToken?: string;
  userAgent?: string;
  createdAt: string;
  expiresAt: string;
}

/** Covers both email verification and password reset — same shape, same
 *  lifecycle (single-use, expiring, looked up by a hash of a random
 *  token), just a different `purpose`. Kept as one type rather than two
 *  near-identical ones. */
export type VerificationPurpose = "email_verification" | "password_reset";

export interface VerificationToken {
  id: string;
  userId: string;
  /** SHA-256 hash of the actual token — the raw token only ever exists in
   *  the email link itself, never at rest, the same principle as password
   *  hashing (a leaked database shouldn't hand out usable tokens). */
  tokenHash: string;
  purpose: VerificationPurpose;
  createdAt: string;
  expiresAt: string;
}

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  type: "access";
  /** Unique per token, so two tokens issued in the same wall-clock second
   *  for the same user still differ. Without this, JWT signing is fully
   *  deterministic (same payload + same iat second + same secret = the
   *  same token string), which quietly breaks refresh-token rotation if
   *  two refreshes ever land in the same second. */
  jti: string;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  sessionId: string;
  type: "refresh";
  jti: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by `requireAuth` once the access token has been verified. */
      auth?: AccessTokenPayload;
    }
  }
}
