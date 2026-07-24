import bcrypt from "bcryptjs";
import type { CookieOptions, Request, Response } from "express";
import type { Logger } from "pino";
import { v4 as uuid } from "uuid";
import { config } from "../config";
import { sessionStore, userStore, verificationTokenStore } from "../db";
import { mailer } from "../mailer";
import type { User } from "../types";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens";
import {
  generateVerificationToken,
  hashVerificationToken,
} from "../utils/verificationTokens";
import { deriveCsrfToken, isValidCsrfToken } from "../utils/csrf";
import {
  isValidEmailShape,
  isValidName,
  isValidPasswordLength,
  normalizeEmail,
  sanitizeName,
} from "../utils/sanitize";

// Bcrypt's cost factor is deliberately slow in production (that's the whole
// point — it resists brute-forcing), but tests don't need that slowness,
// they need correct behavior. Every sign-up/sign-in test pays this cost
// repeatedly, and under Jest's parallel test-file execution, a suite full
// of real bcrypt(12) calls competing for CPU with other heavy test files
// (see tests/db/mongo.test.ts) is a real source of test flakiness, not just
// slowness. tests/setupEnv.ts overrides this down to a much cheaper value.
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.isProduction, // requires HTTPS in production
    sameSite: "lax",
    maxAge: config.cookie.maxAgeMs,
    // Scoped to /api/auth so the refresh token is never sent to unrelated
    // routes, even accidentally — it is only ever needed by this router.
    path: "/api/auth",
  };
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(config.cookie.name, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(config.cookie.name, { ...refreshCookieOptions(), maxAge: 0 });
}

/**
 * Reads the CSRF token the client is expected to echo back on `/sign-out`
 * — the one route that relies purely on the ambient refresh cookie AND
 * has no bootstrapping conflict in doing so (see the comment inside
 * `refresh()` for why that route deliberately does NOT check this,
 * despite also relying on the cookie). See utils/csrf.ts for why this
 * specific header, rather than a second cookie, is the whole design.
 */
function extractCsrfHeader(req: Request): string | undefined {
  const header = req.headers["x-csrf-token"];
  return Array.isArray(header) ? header[0] : header;
}

/**
 * Creates a new session + token pair for a user and sets the refresh-token
 * cookie. The session id is generated here, up front, so the refresh token
 * can be signed with it *before* the session is persisted — meaning every
 * adapter (memory, MongoDB, or anything added later) can write the session
 * in a single `create()` call with the real refresh token already in it,
 * rather than creating a placeholder row and mutating it afterward.
 *
 * The access token is returned to the caller to hold in memory — it is
 * deliberately never written to a cookie, so a stolen cookie alone (e.g.
 * via a CSRF-style attack) can only ever be replayed against
 * `/api/auth/refresh`, not used directly as a bearer credential.
 */
async function issueSession(
  res: Response,
  user: User,
  userAgent?: string
): Promise<{ accessToken: string; csrfToken: string }> {
  const accessToken = signAccessToken(user);
  const sessionId = uuid();
  const refreshToken = signRefreshToken(user.id, sessionId);

  await sessionStore.create({
    id: sessionId,
    userId: user.id,
    refreshToken,
    userAgent,
    ttlMs: REFRESH_TTL_MS,
  });

  setRefreshCookie(res, refreshToken);
  return { accessToken, csrfToken: deriveCsrfToken(sessionId) };
}

/**
 * Issues a fresh email-verification token for a user and emails it.
 * Revokes any previous, still-unused verification tokens first, so a user
 * only ever has one live "verify your email" link at a time — an old,
 * forgotten link shouldn't keep working once a newer one has been sent.
 */
async function issueEmailVerification(user: User, log: Logger): Promise<void> {
  await verificationTokenStore.revokeAllForUser(user.id, "email_verification");

  const { token, tokenHash } = generateVerificationToken();
  await verificationTokenStore.create({
    id: uuid(),
    userId: user.id,
    tokenHash,
    purpose: "email_verification",
    ttlMs: config.verificationTokens.emailVerificationTtlMs,
  });

  const verifyUrl = `${config.appUrl}/verify-email?token=${token}`;

  try {
    await mailer.sendVerificationEmail({ to: user.email, name: user.name, verifyUrl });
  } catch (err) {
    // Deliberately don't fail the calling request (sign-up or a resend) if
    // the email fails to send — the user can request another one via
    // resend-verification, and a flaky mail provider shouldn't block
    // account creation.
    log.error({ err, userId: user.id }, "Failed to send verification email");
  }
}

export const authController = {
  async signUp(req: Request, res: Response) {
    const { email, password, name } = req.body ?? {};

    if (typeof email !== "string") {
      return res.status(400).json({ error: "A valid email is required." });
    }
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmailShape(normalizedEmail)) {
      return res.status(400).json({ error: "A valid email is required." });
    }

    if (typeof password !== "string" || !isValidPasswordLength(password)) {
      return res
        .status(400)
        .json({ error: "Password must be between 8 and 72 characters." });
    }

    if (typeof name !== "string") {
      return res.status(400).json({ error: "Name is required." });
    }
    const cleanName = sanitizeName(name);
    if (!isValidName(cleanName)) {
      return res.status(400).json({ error: "Name is required." });
    }

    if (await userStore.findByEmail(normalizedEmail)) {
      return res
        .status(409)
        .json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userStore.create({
      email: normalizedEmail,
      passwordHash,
      name: cleanName,
    });

    const { accessToken, csrfToken } = await issueSession(res, user, req.headers["user-agent"]);

    // Fire-and-forget from the caller's perspective — sign-up succeeds
    // regardless of whether the email send works (see issueEmailVerification).
    await issueEmailVerification(user, req.log);

    req.log.info({ userId: user.id }, "User signed up");

    return res.status(201).json({
      user: userStore.toPublic(user),
      accessToken,
      csrfToken,
    });
  },

  async signIn(req: Request, res: Response) {
    const { email, password } = req.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = normalizeEmail(email);

    // A password outside the valid length range can never match a real
    // hash — bcrypt itself would only ever compare the first 72 bytes
    // anyway (see utils/sanitize.ts). Treated as an ordinary
    // invalid-credentials failure rather than a distinct error, same as
    // every other sign-in failure below: revealing "your input was the
    // right shape but still wrong" vs. "wrong credentials" gives an
    // attacker nothing useful, so there's no reason to distinguish them.
    if (!isValidPasswordLength(password)) {
      req.log.warn({ email: normalizedEmail, reason: "password_length" }, "Sign-in failed");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = await userStore.findByEmail(normalizedEmail);
    if (!user) {
      // Same generic message as a bad password — don't leak which part
      // failed, to the CLIENT. Internally, distinguishing the reason in
      // the log is exactly the kind of signal worth having — e.g.
      // repeated attempts against emails with no account at all looks
      // different from repeated attempts against one real account.
      req.log.warn({ email: normalizedEmail, reason: "no_account" }, "Sign-in failed");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      req.log.warn({ userId: user.id, reason: "bad_password" }, "Sign-in failed");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const { accessToken, csrfToken } = await issueSession(res, user, req.headers["user-agent"]);

    req.log.info({ userId: user.id }, "User signed in");

    return res.status(200).json({
      user: userStore.toPublic(user),
      accessToken,
      csrfToken,
    });
  },

  async getCurrentUser(req: Request, res: Response) {
    // requireAuth has already validated the token and populated req.auth.
    const userId = req.auth?.sub;
    const user = userId ? await userStore.findById(userId) : undefined;

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ user: userStore.toPublic(user) });
  },

  /**
   * POST /api/auth/refresh
   * -------------------------------------------------------------------------
   * Exchanges a valid refresh-token cookie for a brand new access token,
   * without requiring the user to re-enter credentials. This is what keeps
   * a user signed in past the access token's 15-minute lifetime.
   *
   * The refresh token is rotated on every call: the old one is invalidated
   * and a new one is issued. If an already-rotated (i.e. stale) refresh
   * token is ever presented again, that's treated as a sign of theft — the
   * user's entire session set is revoked and they're forced to sign in
   * again everywhere, rather than silently accepting the request.
   */
  async refresh(req: Request, res: Response) {
    const refreshToken = req.cookies?.[config.cookie.name];

    if (!refreshToken) {
      return res.status(401).json({ error: "No session to refresh.", code: "NO_SESSION" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      clearRefreshCookie(res);
      return res
        .status(401)
        .json({ error: "Session is invalid or expired.", code: "INVALID_SESSION" });
    }

    const session = await sessionStore.findByRefreshToken(refreshToken);

    if (!session || session.id !== payload.sessionId) {
      // Not a live session's *current* token. Before treating this as a
      // plain invalid token, check whether it's a stale token that was
      // already rotated out — presenting an old token is the signature of
      // a leaked/replayed credential, not routine expiry.
      const reusedSession = await sessionStore.findByPreviousRefreshToken(refreshToken);
      if (reusedSession) {
        req.log.error(
          { userId: reusedSession.userId, sessionId: reusedSession.id },
          "Refresh token reuse detected — revoking all sessions for this user"
        );
        await sessionStore.revokeAllForUser(reusedSession.userId);
        clearRefreshCookie(res);
        return res.status(401).json({
          error: "Suspicious activity detected — please sign in again.",
          code: "SESSION_REUSE_DETECTED",
        });
      }

      clearRefreshCookie(res);
      return res
        .status(401)
        .json({ error: "Session is invalid or expired.", code: "INVALID_SESSION" });
    }

    if (sessionStore.isExpired(session)) {
      await sessionStore.revoke(session.id);
      clearRefreshCookie(res);
      return res
        .status(401)
        .json({ error: "Session has expired.", code: "SESSION_EXPIRED" });
    }

    const user = await userStore.findById(session.userId);
    if (!user) {
      req.log.warn(
        { userId: session.userId, sessionId: session.id },
        "Valid session found for a user that no longer exists"
      );
      await sessionStore.revoke(session.id);
      clearRefreshCookie(res);
      return res.status(401).json({ error: "User not found.", code: "INVALID_SESSION" });
    }

    // Deliberately NO CSRF check here — see utils/csrf.ts for the full
    // design, but the short version: refresh's entire job is
    // re-establishing trust from ZERO prior client state (a brand-new
    // tab, a hard reload), using only the cookie. A CSRF token can only
    // ever come from a prior successful /refresh or sign-in — requiring
    // one here is circular, and would mean every fresh page load fails
    // this check 100% of the time, since the client has never had a
    // chance to receive a token yet. It also adds no real protection:
    // this cookie is SameSite=Lax and host-only (no `domain` set), so a
    // genuine cross-site forged request can't get a browser to attach it
    // at all — such a request never reaches this far, it fails the
    // `if (!refreshToken)` check at the very top of this handler.
    // `/sign-out` keeps its CSRF check because it has no such conflict:
    // the UI button that calls it only ever renders after a successful
    // sign-in/refresh already handed the client a token.

    // Rotate: the token just used becomes `previousRefreshToken` (kept only
    // for reuse detection above) and a new one takes its place.
    const newRefreshToken = signRefreshToken(user.id, session.id);
    await sessionStore.rotate(session.id, newRefreshToken, REFRESH_TTL_MS);
    setRefreshCookie(res, newRefreshToken);

    const accessToken = signAccessToken(user);

    return res.status(200).json({
      user: userStore.toPublic(user),
      accessToken,
      // Session id never changes across rotation, so in practice this is
      // the same value the client already has — returned every time anyway
      // so the client never has to reason about whether it might have
      // changed (e.g. if the CSRF secret itself were ever rotated).
      csrfToken: deriveCsrfToken(session.id),
    });
  },

  async signOut(req: Request, res: Response) {
    const refreshToken = req.cookies?.[config.cookie.name];
    if (refreshToken) {
      let payload;
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch {
        // If the token is cryptographically invalid or expired, clear cookie and succeed
        clearRefreshCookie(res);
        return res.status(200).json({ ok: true });
      }

      if (!isValidCsrfToken(payload.sessionId, extractCsrfHeader(req))) {
        req.log.warn(
          { userId: payload.sub, sessionId: payload.sessionId },
          "Sign-out rejected: invalid or missing CSRF token"
        );
        return res.status(403).json({
          error: "Invalid or missing CSRF token.",
          code: "CSRF_VALIDATION_FAILED",
        });
      }

      await sessionStore.revoke(payload.sessionId);
    }
    clearRefreshCookie(res);
    return res.status(200).json({ ok: true });
  },

  /**
   * POST /api/auth/sign-out-all
   * -------------------------------------------------------------------------
   * Revokes every session belonging to the signed-in user — every browser,
   * every device, including the one making this request — and clears this
   * device's own refresh cookie so it doesn't keep behaving as signed-in
   * against a session that no longer exists server-side.
   *
   * Sits behind `requireAuth` (Bearer access token), not the refresh
   * cookie, which is why this needs no CSRF check of its own: an attacker
   * can't set an `Authorization` header they don't already know the value
   * of, the same reasoning that already exempts every other
   * `requireAuth`-protected route (`/user`, `/resend-verification`) from
   * CSRF — see utils/csrf.ts for the full design. Of the routes relying on
   * the ambient cookie alone, only `/sign-out` checks a CSRF token —
   * `/refresh` deliberately doesn't, since it has to work with zero prior
   * client state (see the comment inside `refresh()` for why).
   *
   * `sessionStore.revokeAllForUser` already existed — it's the same
   * function reuse-detection and password-reset already call to end every
   * session when something looks wrong. This route is the first thing
   * that lets a user trigger it deliberately, on themselves, on purpose.
   */
  async signOutAllDevices(req: Request, res: Response) {
    const userId = req.auth?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated", code: "NO_SESSION" });
    }

    await sessionStore.revokeAllForUser(userId);
    req.log.info({ userId }, "User signed out of all devices");
    clearRefreshCookie(res);
    return res.status(200).json({ ok: true });
  },

  /**
   * POST /api/auth/verify-email
   * -------------------------------------------------------------------------
   * Consumes the token from the verification email link. Single-use: the
   * token is revoked the moment it's successfully used, whether or not the
   * user ever comes back to that link again.
   *
   * Also signs in whatever browser clicks this link — not just informs it
   * that the account is now verified. This matters specifically for the
   * cross-browser/cross-device case: opening the email on your phone and
   * clicking verify should leave YOUR PHONE signed in too, not just show a
   * confirmation screen with no way to continue without signing in again
   * from scratch. "Verified" is a property of the account; this is what
   * makes the browser that verified it also become signed in, the same way
   * sign-up and sign-in already do.
   *
   * If this browser already had a session (the common case: verifying in a
   * second tab of the SAME browser used to sign up — tabs share one cookie
   * jar), that old session is revoked first. Without this, every ordinary
   * same-browser verification would leave an orphaned, still-valid session
   * sitting in storage indefinitely, on top of the fresh one issued below.
   */
  async verifyEmail(req: Request, res: Response) {
    const { token } = req.body ?? {};

    if (typeof token !== "string" || token.length === 0) {
      return res.status(400).json({ error: "A verification token is required." });
    }

    const tokenHash = hashVerificationToken(token);
    const record = await verificationTokenStore.findByTokenHash(tokenHash, "email_verification");

    if (!record) {
      return res.status(400).json({
        error: "This verification link is invalid or has already been used.",
        code: "INVALID_TOKEN",
      });
    }

    if (verificationTokenStore.isExpired(record)) {
      await verificationTokenStore.revoke(record.id);
      return res.status(400).json({
        error: "This verification link has expired. Request a new one.",
        code: "TOKEN_EXPIRED",
      });
    }

    const existingRefreshToken = req.cookies?.[config.cookie.name];
    if (existingRefreshToken) {
      const existingSession = await sessionStore.findByRefreshToken(existingRefreshToken);
      if (existingSession) {
        await sessionStore.revoke(existingSession.id);
      }
    }

    const user = await userStore.markEmailVerified(record.userId);
    await verificationTokenStore.revoke(record.id);

    if (!user) {
      req.log.warn(
        { userId: record.userId },
        "Verification token valid but user no longer exists"
      );
      return res.status(404).json({ error: "User not found." });
    }

    const { accessToken, csrfToken } = await issueSession(res, user, req.headers["user-agent"]);

    req.log.info({ userId: user.id }, "Email verified");

    return res.status(200).json({
      user: userStore.toPublic(user),
      accessToken,
      csrfToken,
    });
  },

  /**
   * POST /api/auth/resend-verification
   * -------------------------------------------------------------------------
   * Requires the caller to already be signed in — simpler and safer than
   * accepting a bare email address here, since it avoids having to decide
   * separately whether revealing "this email is already verified" to an
   * unauthenticated caller counts as user enumeration.
   */
  async resendVerification(req: Request, res: Response) {
    const userId = req.auth?.sub;
    const user = userId ? await userStore.findById(userId) : undefined;

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.emailVerified) {
      return res.status(200).json({ ok: true, alreadyVerified: true });
    }

    await issueEmailVerification(user, req.log);
    return res.status(200).json({ ok: true, alreadyVerified: false });
  },

  /**
   * POST /api/auth/forgot-password
   * -------------------------------------------------------------------------
   * ALWAYS returns the same 200 response whether or not the email belongs
   * to a real account — this is what prevents an attacker from using this
   * endpoint to discover which emails have accounts (the same principle as
   * sign-in's generic "invalid email or password" message).
   */
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body ?? {};

    if (typeof email !== "string") {
      return res.status(400).json({ error: "A valid email is required." });
    }
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmailShape(normalizedEmail)) {
      return res.status(400).json({ error: "A valid email is required." });
    }

    const user = await userStore.findByEmail(normalizedEmail);

    if (user) {
      await verificationTokenStore.revokeAllForUser(user.id, "password_reset");

      const { token, tokenHash } = generateVerificationToken();
      await verificationTokenStore.create({
        id: uuid(),
        userId: user.id,
        tokenHash,
        purpose: "password_reset",
        ttlMs: config.verificationTokens.passwordResetTtlMs,
      });

      const resetUrl = `${config.appUrl}/reset-password?token=${token}`;

      try {
        await mailer.sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
        req.log.info({ userId: user.id }, "Password reset requested");
      } catch (err) {
        req.log.error({ err, userId: user.id }, "Failed to send password reset email");
      }
    }

    return res.status(200).json({
      ok: true,
      message: "If an account exists for that email, a password reset link has been sent.",
    });
  },

  /**
   * POST /api/auth/reset-password
   * -------------------------------------------------------------------------
   * On success, revokes every session for the user — the standard response
   * to a password change, since the old password (and anyone who might
   * still be signed in using a session established before the reset)
   * should no longer be trusted.
   */
  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body ?? {};

    if (typeof token !== "string" || token.length === 0) {
      return res.status(400).json({ error: "A reset token is required." });
    }
    if (typeof newPassword !== "string" || !isValidPasswordLength(newPassword)) {
      return res
        .status(400)
        .json({ error: "Password must be between 8 and 72 characters." });
    }

    const tokenHash = hashVerificationToken(token);
    const record = await verificationTokenStore.findByTokenHash(tokenHash, "password_reset");

    if (!record) {
      return res.status(400).json({
        error: "This reset link is invalid or has already been used.",
        code: "INVALID_TOKEN",
      });
    }

    if (verificationTokenStore.isExpired(record)) {
      await verificationTokenStore.revoke(record.id);
      return res.status(400).json({
        error: "This reset link has expired. Request a new one.",
        code: "TOKEN_EXPIRED",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const user = await userStore.updatePasswordHash(record.userId, passwordHash);
    await verificationTokenStore.revoke(record.id);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    await sessionStore.revokeAllForUser(user.id);
    req.log.info({ userId: user.id }, "Password reset completed — all sessions revoked");

    return res.status(200).json({ ok: true });
  },
};
