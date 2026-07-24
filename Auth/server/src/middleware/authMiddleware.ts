import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/tokens";

/**
 * The access token now travels as a Bearer token in the Authorization
 * header, not as a cookie. It lives in memory on the client (see
 * MiniClerkContext) and is short-lived (15m) by design — if it's stolen via
 * something like an XSS bug, the exposure window is small. The cookie is
 * reserved entirely for the refresh token, which is HttpOnly and can only
 * ever be used against `/api/auth/refresh`.
 */
function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

/**
 * requireAuth
 * ---------------------------------------------------------------------------
 * Reads the access token from the Authorization header, verifies the JWT
 * signature + expiry, and attaches the decoded payload to `req.auth`.
 *
 * On failure it responds 401 with a machine-readable `code` so the frontend
 * SDK can distinguish "no session" from "expired session" from "tampered
 * token" without parsing error strings — `SESSION_EXPIRED` specifically is
 * what tells the client it's worth attempting a silent `/refresh` before
 * giving up and showing a sign-in screen.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Not authenticated",
      code: "NO_SESSION",
    });
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    return next();
  } catch (err) {
    if (err instanceof Error && err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Session expired",
        code: "SESSION_EXPIRED",
      });
    }
    // Deliberately NOT logged for TokenExpiredError above — that happens
    // routinely, roughly every 15 minutes, for every signed-in user, as
    // part of normal operation (see MiniClerkContext's silent-refresh
    // interval). Logging it would bury the case that's actually worth
    // seeing: a token that fails verification for any OTHER reason — bad
    // signature, malformed payload — which is a much stronger signal of
    // someone probing with a forged or corrupted token rather than just
    // using the app normally.
    req.log.warn(
      { err: err instanceof Error ? err.message : err },
      "Access token failed verification (not expiry)"
    );
    return res.status(401).json({
      error: "Invalid session",
      code: "INVALID_SESSION",
    });
  }
}

/**
 * optionalAuth
 * ---------------------------------------------------------------------------
 * Same as requireAuth but never rejects the request — useful for routes
 * that behave differently for signed-in vs anonymous users without hard
 * requiring a session.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    req.auth = verifyAccessToken(token);
  } catch {
    // Silently ignore — treat as anonymous.
  }
  return next();
}
