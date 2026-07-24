import "dotenv/config";

const isProductionEnv = (process.env.NODE_ENV ?? "development") === "production";

// The exact dev-fallback values used below, PLUS the placeholder text
// shipped in .env.example. Both are realistic ways a real secret never
// actually gets set: the former if an env var is simply missing, the
// latter if someone copies .env.example to .env and forgets to edit it.
// A production deployment must never end up running on any of these.
const KNOWN_INSECURE_SECRET_VALUES = new Set([
  "dev-only-access-secret-change-me",
  "dev-only-refresh-secret-change-me",
  "dev-only-csrf-secret-change-me",
  "replace-with-a-long-random-access-secret",
  "replace-with-a-long-random-refresh-secret",
  "replace-with-a-long-random-csrf-secret",
]);

// A length floor, not a real entropy check — this can't tell a properly
// random 32-character value from 32 repeated characters. It exists to
// catch the obvious cases (short, guessable, or copy-pasted-and-forgotten
// values) cheaply at startup, not to replace generating secrets correctly
// in the first place (`openssl rand -hex 64`, as .env.example suggests).
const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * In development and test, behaves exactly like the old `required()` did:
 * use the env var if set, otherwise fall back to a known dev value. Zero
 * behavior change there.
 *
 * In production, the fallback is never used — a missing, placeholder, or
 * too-short value throws immediately at startup, before the server ever
 * accepts a request, with a message that says exactly what's wrong rather
 * than failing confusingly later (e.g. every JWT silently signed with
 * "dev-only-access-secret-change-me").
 */
function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];

  if (!isProductionEnv) {
    return value ?? devFallback;
  }

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. This must be set to ` +
        `a strong, unique value in production — see .env.example.`
    );
  }

  if (KNOWN_INSECURE_SECRET_VALUES.has(value)) {
    throw new Error(
      `${name} is still set to a placeholder or dev-only value. Generate a ` +
        `real secret (e.g. \`openssl rand -hex 64\`) before deploying to ` +
        `production.`
    );
  }

  if (value.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(
      `${name} is too short for production (${value.length} characters, ` +
        `minimum ${MIN_PRODUCTION_SECRET_LENGTH}). This is a length check, ` +
        `not a true randomness check — use a properly generated secret ` +
        `(e.g. \`openssl rand -hex 64\`), not just any string that happens ` +
        `to be long enough.`
    );
  }

  return value;
}

/**
 * Separate from requireSecret's per-value checks: this catches the case
 * where every individual secret looks fine on its own, but two or more of
 * them were set to the *same* value. That defeats the entire point of
 * having separate secrets — see the comment on `csrf.secret` below for why
 * independent rotation matters, which only works if they were distinct to
 * begin with. Runs regardless of environment, since the reasoning holds in
 * dev too, even though the dev fallbacks are always distinct by construction.
 */
function assertSecretsAreDistinct(secrets: Record<string, string>): void {
  const entries = Object.entries(secrets);
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const [nameA, valueA] = entries[i];
      const [nameB, valueB] = entries[j];
      if (valueA === valueB) {
        throw new Error(
          `${nameA} and ${nameB} must not be set to the same value — ` +
            `reusing one secret across multiple roles means a leak of one ` +
            `compromises all of them.`
        );
      }
    }
  }
}

const accessSecret = requireSecret(
  "ACCESS_TOKEN_SECRET",
  "dev-only-access-secret-change-me"
);
const refreshSecret = requireSecret(
  "REFRESH_TOKEN_SECRET",
  "dev-only-refresh-secret-change-me"
);
const csrfSecret = requireSecret("CSRF_SECRET", "dev-only-csrf-secret-change-me");

assertSecretsAreDistinct({
  ACCESS_TOKEN_SECRET: accessSecret,
  REFRESH_TOKEN_SECRET: refreshSecret,
  CSRF_SECRET: csrfSecret,
});

const dbProvider = (process.env.DB_PROVIDER ?? "memory") as "memory" | "mongodb";
const mongoUri = process.env.MONGODB_URI;

if (dbProvider === "mongodb" && !mongoUri) {
  throw new Error(
    "DB_PROVIDER=mongodb requires MONGODB_URI to be set (see .env.example)."
  );
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: isProductionEnv,

  jwt: {
    accessSecret,
    refreshSecret,
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
    refreshTtl: process.env.REFRESH_TOKEN_TTL ?? "7d",
  },

  // Used to derive the per-session CSRF token (see utils/csrf.ts). Separate
  // from the JWT secrets on purpose — rotating this independently
  // invalidates every outstanding CSRF token without touching sessions or
  // forcing anyone to sign in again (refresh still works; the next refresh
  // response just hands back a token derived from the new secret). This
  // only works because it's guaranteed distinct from the JWT secrets —
  // see assertSecretsAreDistinct above.
  csrf: {
    secret: csrfSecret,
  },

  cookie: {
    // Holds ONLY the refresh token (HttpOnly, scoped to /api/auth). The
    // access token is never stored in a cookie — it's returned in API
    // response bodies and kept in memory on the client.
    name: process.env.SESSION_COOKIE_NAME ?? "__miniclerk_session",
    // 7 days in ms, mirrors the default refresh token TTL.
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
  },

  db: {
    // "memory" (default — zero setup, resets on restart) or "mongodb".
    // See src/db/index.ts for how this selects an adapter, and
    // src/db/adapters/ for the adapters themselves.
    provider: dbProvider,
    mongoUri: mongoUri,
  },

  mailer: {
    // "console" (default — logs to the terminal, never sends anything
    // real) or "resend". See src/mailer/index.ts for how this selects an
    // implementation. Same reasoning as db.mongoUri above: only validated
    // as required inside the factory that actually needs it, not here,
    // so running with the console mailer never demands a Resend API key.
    provider: (process.env.MAILER_PROVIDER ?? "console") as "console" | "resend",
    resendApiKey: process.env.RESEND_API_KEY,
    // Must be a verified sending identity in your Resend account once
    // you're past their `onboarding@resend.dev` test address — see
    // .env.example for the full explanation.
    fromAddress: process.env.MAIL_FROM_ADDRESS ?? "MiniClerk <onboarding@resend.dev>",
  },

  logging: {
    // pino level names: fatal, error, warn, info, debug, trace, silent.
    // Defaults to "info" in dev (see every request while developing) and
    // "warn" in production (request-level noise off by default; auth
    // security events — failed sign-in, session reuse, CSRF failures — are
    // all logged at "warn" or above regardless, so they're never silenced
    // by this default). Override with LOG_LEVEL for either environment.
    level: process.env.LOG_LEVEL ?? (isProductionEnv ? "warn" : "info"),
  },

  // The frontend's URL — used to build the links inside verification and
  // password-reset emails (e.g. `${appUrl}/verify-email?token=...`). This
  // is deliberately separate from `clientOrigin` (which is about CORS):
  // they're usually the same value locally, but in production `appUrl`
  // might be a marketing-site-facing domain while `clientOrigin` is an
  // app subdomain, or vice versa.
  appUrl: process.env.APP_URL ?? "http://localhost:5173",

  verificationTokens: {
    emailVerificationTtlMs: Number(
      process.env.EMAIL_VERIFICATION_TOKEN_TTL_MS ?? 24 * 60 * 60 * 1000 // 24h
    ),
    passwordResetTtlMs: Number(
      process.env.PASSWORD_RESET_TOKEN_TTL_MS ?? 60 * 60 * 1000 // 1h
    ),
  },
};
