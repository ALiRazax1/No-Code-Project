/* eslint-disable @typescript-eslint/no-var-requires */
import type { Express } from "express";

/**
 * middleware/rateLimiter.ts reads its thresholds from environment variables
 * at the moment each limiter is *created* (see createSignInLimiter, etc.),
 * and that happens once, when routes/authRoutes.ts is first imported.
 * tests/setupEnv.ts already set very high limits globally so the rest of
 * the suite isn't throttled — changing process.env after that point has no
 * effect on an already-created limiter.
 *
 * So to actually test the limiter with small, predictable numbers, each
 * test here forces a completely fresh module registry (`jest.resetModules`)
 * and re-requires the app *after* setting its own overrides. This is the
 * one file in the suite that needs this — every other test file just uses
 * the loosened global defaults and never has to think about it.
 */
function freshAppWithLimits(overrides: Record<string, string>): {
  app: Express;
  resetStore: () => void;
} {
  jest.resetModules();
  Object.assign(process.env, overrides);

  const { createApp } = require("../../src/app");
  const { __resetMemoryStoreForTests } = require("../../src/db/adapters/memory");

  return { app: createApp(), resetStore: __resetMemoryStoreForTests };
}

describe("rate limiting", () => {
  it("blocks sign-in after too many failed attempts within the window", async () => {
    const request = require("supertest");
    const { app, resetStore } = freshAppWithLimits({
      SIGNIN_RATE_LIMIT_MAX: "3",
      SIGNIN_RATE_LIMIT_WINDOW_MS: "60000",
    });
    resetStore();

    for (let i = 0; i < 3; i += 1) {
      const res = await request(app)
        .post("/api/auth/sign-in")
        .send({ email: "nobody@example.com", password: "wrong-password" });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app)
      .post("/api/auth/sign-in")
      .send({ email: "nobody@example.com", password: "wrong-password" });

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
  });

  it("does not count successful sign-ins against the sign-in limiter", async () => {
    const request = require("supertest");
    const { app, resetStore } = freshAppWithLimits({
      SIGNIN_RATE_LIMIT_MAX: "2",
      SIGNIN_RATE_LIMIT_WINDOW_MS: "60000",
    });
    resetStore();

    await request(app)
      .post("/api/auth/sign-up")
      .send({ email: "real@example.com", password: "password123", name: "Real User" });

    // Sign in successfully more times than the limit — a legitimate,
    // repeatedly-successful user should never trip this limiter.
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post("/api/auth/sign-in")
        .send({ email: "real@example.com", password: "password123" });
      expect(res.status).toBe(200);
    }
  });

  it("blocks sign-up after too many accounts from the same IP", async () => {
    const request = require("supertest");
    const { app, resetStore } = freshAppWithLimits({
      SIGNUP_RATE_LIMIT_MAX: "2",
      SIGNUP_RATE_LIMIT_WINDOW_MS: "60000",
    });
    resetStore();

    for (let i = 0; i < 2; i += 1) {
      const res = await request(app)
        .post("/api/auth/sign-up")
        .send({ email: `user${i}@example.com`, password: "password123", name: "Test" });
      expect(res.status).toBe(201);
    }

    const blocked = await request(app)
      .post("/api/auth/sign-up")
      .send({ email: "one-too-many@example.com", password: "password123", name: "Test" });

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
  });

  it("blocks forgot-password requests after too many from the same IP", async () => {
    // forgot-password intentionally returns 200 whether or not the email
    // exists (see auth-recovery.test.ts for the enumeration-prevention
    // test) — that's unrelated to rate limiting, so the limiter still
    // counts these 200s toward the cap regardless of the outcome.
    const request = require("supertest");
    const { app, resetStore } = freshAppWithLimits({
      FORGOT_PASSWORD_RATE_LIMIT_MAX: "2",
      FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS: "60000",
    });
    resetStore();

    for (let i = 0; i < 2; i += 1) {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "someone@example.com" });
      expect(res.status).toBe(200);
    }

    const blocked = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "someone@example.com" });

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
  });
});
