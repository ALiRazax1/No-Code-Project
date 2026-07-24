// Runs once per test file, before the test framework and any test code —
// this is what lets tests control environment-driven config (secrets, rate
// limit thresholds) before the modules that read those variables are
// imported for the first time.

process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = "test-only-access-secret";
process.env.REFRESH_TOKEN_SECRET = "test-only-refresh-secret";
// Pinned for the same reason as the JWT secrets above: without an explicit
// value here, config.ts falls back to "dev-only-csrf-secret-change-me",
// which is in KNOWN_INSECURE_SECRET_VALUES. In test mode the production
// guard is skipped so it still works, but it's inconsistent — every secret
// the test run depends on should be pinned here, not silently deferred to
// a dev fallback that happens to slip through.
process.env.CSRF_SECRET = "test-only-csrf-secret";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

// Rate limiting is real, production-strength, and deliberately strict (see
// middleware/rateLimiter.ts) — far too strict for a test suite that
// exercises the same routes dozens of times per file. Loosen it globally
// here so ordinary flow tests aren't accidentally throttled; the dedicated
// rate-limiting tests (tests/api/rateLimiting.test.ts) override these back
// down to small numbers for the one file that actually needs to trigger
// the limiter on purpose.
process.env.AUTH_RATE_LIMIT_MAX = "1000000";
process.env.SIGNIN_RATE_LIMIT_MAX = "1000000";
process.env.SIGNUP_RATE_LIMIT_MAX = "1000000";

// bcrypt's cost factor is deliberately slow in production. Tests need
// correct behavior, not production-grade slowness — every sign-up/sign-in
// test pays this cost, and a suite full of real bcrypt(12) calls competing
// for CPU with other heavy test files (mongod startup in particular) is a
// real source of test flakiness. 4 is still a real bcrypt hash — just a
// cheap one — so the actual hashing/comparison logic is still exercised.
process.env.BCRYPT_SALT_ROUNDS = "4";

// config.ts falls back to MAILER_PROVIDER="console" when the env var is
// unset — but "unset" only means unset in THIS process's env, and
// dotenv/config (imported at the top of config.ts) loads the developer's
// real .env file first. If that file has MAILER_PROVIDER=resend set (e.g.
// from testing the real mailer integration locally), it would otherwise
// leak straight into the test run — meaning the test suite would make
// real network calls to Resend, burning real quota, depending on network
// availability, on every single test run. Pinned explicitly here so tests
// are hermetic regardless of what's in the developer's actual .env.
process.env.MAILER_PROVIDER = "console";

// config.ts's logging.level only special-cases "production" (→ "warn") vs
// everything else (→ "info") — it has no separate test-environment
// branch, so without this override every request the test suite makes
// (hundreds, across the full run) gets logged at "info" by pino-http,
// burying real failures in noise. "silent" is pino's built-in level that
// disables logging entirely — same principle consoleMailer already
// applies for NODE_ENV=test (see its own `if (process.env.NODE_ENV ===
// "test") return;`), just applied here to the request/auth-event logger
// too.
process.env.LOG_LEVEL = "silent";