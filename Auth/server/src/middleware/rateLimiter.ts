import rateLimit from "express-rate-limit";

/**
 * Rate limiting is per-IP by default (express-rate-limit's built-in
 * keyGenerator). That's a reasonable default for a small app behind a
 * single load balancer, but if you deploy behind a proxy/CDN, make sure
 * `app.set('trust proxy', ...)` is configured correctly in app.ts —
 * otherwise every request will appear to come from the proxy's IP and
 * you'll rate-limit all your users together.
 *
 * Limits are read from environment variables at the moment each limiter is
 * created, not hardcoded — every value below has the exact same default it
 * always had, so nothing changes in a real deployment unless you explicitly
 * set one of these. What this buys you: the test suite can loosen these
 * globally (see tests/setupEnv.ts) so ordinary flow tests aren't throttled,
 * and re-tighten them to small numbers in the tests that specifically
 * exercise the limiter itself (tests/api/rateLimiting.test.ts).
 */

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * express-rate-limit identifies "who is this request from" via `req.ip` by
 * default. That's correct in production, but it's a source of test
 * flakiness: rapid-fire requests from the same test can occasionally
 * resolve to slightly different IP representations (e.g. `127.0.0.1` vs
 * `::ffff:127.0.0.1`), especially on Windows — which makes the limiter
 * briefly think it's seeing two different clients and lets a request
 * through that a test expected to be blocked.
 *
 * Returning a fixed key ONLY when NODE_ENV=test (set exclusively by
 * tests/setupEnv.ts) sidesteps that entirely without touching real
 * behavior — production keeps using the real per-IP default, since this
 * function returns `undefined` for every other environment.
 */
function testSafeKeyGenerator() {
  if (process.env.NODE_ENV === "test") {
    return () => "test-client";
  }
  return undefined;
}

const rateLimitedResponse = {
  error: "Too many requests. Please try again later.",
  code: "RATE_LIMITED" as const,
};

/** Baseline limiter applied to the whole /api/auth router. Generous, since
 *  it's just a backstop against gross abuse (e.g. scripted hammering of
 *  /refresh), not the primary defense for any one route. */
export function createAuthRouterLimiter() {
  return rateLimit({
    windowMs: envNumber("AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    limit: envNumber("AUTH_RATE_LIMIT_MAX", 100),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: testSafeKeyGenerator(),
    message: rateLimitedResponse,
  });
}

/**
 * Sign-in specifically needs a tighter limit — this is the route a
 * credential-stuffing or brute-force attempt would hit. Only *failed*
 * attempts count against the limit, so a legitimate user who mistypes a
 * password once or twice, then succeeds, is never blocked.
 */
export function createSignInLimiter() {
  return rateLimit({
    windowMs: envNumber("SIGNIN_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    limit: envNumber("SIGNIN_RATE_LIMIT_MAX", 10),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: testSafeKeyGenerator(),
    message: {
      error: "Too many sign-in attempts. Please wait a few minutes and try again.",
      code: "RATE_LIMITED" as const,
    },
  });
}

/** Sign-up abuse looks different from sign-in abuse — it's about volume of
 *  fake accounts, not credential guessing — so it gets its own, stricter
 *  window rather than sharing the sign-in limiter's assumptions. */
export function createSignUpLimiter() {
  return rateLimit({
    windowMs: envNumber("SIGNUP_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
    limit: envNumber("SIGNUP_RATE_LIMIT_MAX", 5),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: testSafeKeyGenerator(),
    message: {
      error: "Too many accounts created from this network. Please try again later.",
      code: "RATE_LIMITED" as const,
    },
  });
}

/**
 * forgot-password and resend-verification both trigger a real outbound
 * email — that's the actual abuse vector here (cost, spam, annoying a
 * stranger whose email got typed in by mistake), not credential guessing.
 * Token brute-forcing isn't a realistic concern for either route (256-bit
 * random tokens), so these limits exist purely to cap email volume.
 */
export function createForgotPasswordLimiter() {
  return rateLimit({
    windowMs: envNumber("FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
    limit: envNumber("FORGOT_PASSWORD_RATE_LIMIT_MAX", 5),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: testSafeKeyGenerator(),
    message: {
      error: "Too many password reset requests. Please try again later.",
      code: "RATE_LIMITED" as const,
    },
  });
}

export function createResendVerificationLimiter() {
  return rateLimit({
    windowMs: envNumber("RESEND_VERIFICATION_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
    limit: envNumber("RESEND_VERIFICATION_RATE_LIMIT_MAX", 3),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: testSafeKeyGenerator(),
    message: {
      error: "Too many verification emails requested. Please try again later.",
      code: "RATE_LIMITED" as const,
    },
  });
}
