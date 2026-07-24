import request from "supertest";
import { createApp } from "../../src/app";
import { __resetMemoryStoreForTests } from "../../src/db/adapters/memory";

const app = createApp();

/** Pulls just the `name=value` pair out of a Set-Cookie header so it can be
 *  replayed on a later request via `.set("Cookie", ...)` — separate
 *  `request(app)` calls don't share a cookie jar the way a real browser
 *  would, so tests have to pass it along explicitly. */
function extractCookie(res: request.Response): string {
  const setCookie = res.headers["set-cookie"];
  if (!setCookie || setCookie.length === 0) {
    throw new Error("Expected a Set-Cookie header in the response.");
  }
  return setCookie[0].split(";")[0];
}

beforeEach(() => {
  __resetMemoryStoreForTests();
});

async function signUp(
  overrides: Partial<{ email: string; password: string; name: string }> = {}
) {
  return request(app)
    .post("/api/auth/sign-up")
    .send({
      email: overrides.email ?? "ada@example.com",
      password: overrides.password ?? "password123",
      name: overrides.name ?? "Ada Lovelace",
    });
}

describe("POST /api/auth/sign-up", () => {
  it("creates a user, sets a refresh cookie, and returns an access token", async () => {
    const res = await signUp();

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: "ada@example.com",
      name: "Ada Lovelace",
      emailVerified: false,
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(extractCookie(res)).toMatch(/^__miniclerk_session=/);
  });

  it("rejects a second sign-up with the same email", async () => {
    await signUp({ email: "dup@example.com" });
    const res = await signUp({ email: "dup@example.com" });

    expect(res.status).toBe(409);
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await signUp({ password: "short" });
    expect(res.status).toBe(400);
  });

  it("rejects a malformed email", async () => {
    const res = await signUp({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/sign-in", () => {
  it("signs in with correct credentials", async () => {
    await signUp({ email: "signin@example.com", password: "correcthorse1" });

    const res = await request(app)
      .post("/api/auth/sign-in")
      .send({ email: "signin@example.com", password: "correcthorse1" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it("rejects a wrong password with a generic message", async () => {
    await signUp({ email: "wrongpw@example.com", password: "correcthorse1" });

    const res = await request(app)
      .post("/api/auth/sign-in")
      .send({ email: "wrongpw@example.com", password: "totally-wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
  });

  it("rejects an unknown email with the exact same message as a wrong password", async () => {
    // Same message as the wrong-password case above — this is what
    // prevents an attacker from using the response to enumerate which
    // emails have accounts.
    const res = await request(app)
      .post("/api/auth/sign-in")
      .send({ email: "ghost@example.com", password: "whatever123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
  });
});

describe("GET /api/auth/user", () => {
  it("rejects a request with no Authorization header", async () => {
    const res = await request(app).get("/api/auth/user");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("NO_SESSION");
  });

  it("returns the profile for a valid access token", async () => {
    const signUpRes = await signUp({ email: "profile@example.com" });

    const res = await request(app)
      .get("/api/auth/user")
      .set("Authorization", `Bearer ${signUpRes.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("profile@example.com");
  });
});

describe("POST /api/auth/refresh", () => {
  it("returns a new access token and rotates the refresh cookie", async () => {
    const signUpRes = await signUp({ email: "refresh@example.com" });
    const originalCookie = extractCookie(signUpRes);

    const refreshRes = await request(app).post("/api/auth/refresh").set("Cookie", originalCookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toEqual(expect.any(String));
    expect(refreshRes.body.accessToken).not.toBe(signUpRes.body.accessToken);

    const newCookie = extractCookie(refreshRes);
    expect(newCookie).not.toBe(originalCookie);
  });

  it("returns 401 NO_SESSION with no cookie at all", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("NO_SESSION");
  });

  it("detects reuse of an already-rotated refresh token and revokes the whole session", async () => {
    const signUpRes = await signUp({ email: "reuse@example.com" });
    const firstCookie = extractCookie(signUpRes);

    // Use it once — this rotates it and issues a second cookie.
    const secondRefresh = await request(app).post("/api/auth/refresh").set("Cookie", firstCookie);
    expect(secondRefresh.status).toBe(200);
    const secondCookie = extractCookie(secondRefresh);

    // Replay the ORIGINAL (now-stale) cookie — this should be recognized
    // as reuse, not just rejected as "not found".
    const reuseAttempt = await request(app).post("/api/auth/refresh").set("Cookie", firstCookie);
    expect(reuseAttempt.status).toBe(401);
    expect(reuseAttempt.body.code).toBe("SESSION_REUSE_DETECTED");

    // Reuse detection should have revoked the ENTIRE session, so even the
    // most recently issued cookie no longer works.
    const afterReuse = await request(app).post("/api/auth/refresh").set("Cookie", secondCookie);
    expect(afterReuse.status).toBe(401);
    expect(afterReuse.body.code).toBe("INVALID_SESSION");
  });
});

describe("POST /api/auth/sign-out", () => {
  it("revokes the session so the refresh cookie no longer works afterward", async () => {
    const signUpRes = await signUp({ email: "signout@example.com" });
    const cookie = extractCookie(signUpRes);

    // sign-out relies on the ambient refresh cookie alone (no
    // Authorization header), so it's one of the two routes that checks a
    // CSRF token — /refresh deliberately does NOT (see the comment inside
    // refresh() for why), and sign-out-all-devices doesn't need to either,
    // since it's requireAuth/Bearer-protected instead. See utils/csrf.ts
    // for the full design. The token comes back on every
    // sign-up/sign-in/refresh response, exactly like accessToken.
    const signOutRes = await request(app)
      .post("/api/auth/sign-out")
      .set("Cookie", cookie)
      .set("X-CSRF-Token", signUpRes.body.csrfToken);
    expect(signOutRes.status).toBe(200);

    const refreshAfter = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshAfter.status).toBe(401);
  });

  it("rejects sign-out with a missing CSRF token, without revoking the session", async () => {
    const signUpRes = await signUp({ email: "signout-no-csrf@example.com" });
    const cookie = extractCookie(signUpRes);

    const res = await request(app).post("/api/auth/sign-out").set("Cookie", cookie);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CSRF_VALIDATION_FAILED");

    // The session should be completely untouched by the rejected attempt —
    // the same cookie still works afterward.
    const refreshAfter = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshAfter.status).toBe(200);
  });
});