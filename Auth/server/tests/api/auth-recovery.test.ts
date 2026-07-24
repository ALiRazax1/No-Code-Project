import request from "supertest";
import { createApp } from "../../src/app";
import { __resetMemoryStoreForTests } from "../../src/db/adapters/memory";
import { mailer } from "../../src/mailer";

const app = createApp();

function extractCookie(res: request.Response): string {
  const setCookie = res.headers["set-cookie"];
  if (!setCookie || setCookie.length === 0) {
    throw new Error("Expected a Set-Cookie header in the response.");
  }
  return setCookie[0].split(";")[0];
}

/** Pulls the `token` query param out of a URL the mailer was called with —
 *  this is the only place the raw token exists. It's never persisted
 *  anywhere (only its SHA-256 hash is), by design, so spying on the mailer
 *  is the only way a test can get hold of it — the same way a real user
 *  would only ever see it by opening the actual email. */
function extractTokenFromUrl(url: string): string {
  const token = new URL(url).searchParams.get("token");
  if (!token) throw new Error(`Expected a token query param in ${url}`);
  return token;
}

beforeEach(() => {
  __resetMemoryStoreForTests();
  jest.restoreAllMocks();
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

describe("email verification", () => {
  it("sends a verification email on sign-up, and the link marks the user verified", async () => {
    const sendSpy = jest.spyOn(mailer, "sendVerificationEmail").mockResolvedValue();

    const signUpRes = await signUp({ email: "verify@example.com" });
    expect(signUpRes.body.user.emailVerified).toBe(false);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const token = extractTokenFromUrl(sendSpy.mock.calls[0][0].verifyUrl);
    const verifyRes = await request(app).post("/api/auth/verify-email").send({ token });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.user.emailVerified).toBe(true);
  });

  it("rejects an unknown token", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "not-a-real-token" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });

  it("a verification token can only be used once", async () => {
    const sendSpy = jest.spyOn(mailer, "sendVerificationEmail").mockResolvedValue();
    await signUp({ email: "onceonly@example.com" });
    const token = extractTokenFromUrl(sendSpy.mock.calls[0][0].verifyUrl);

    const first = await request(app).post("/api/auth/verify-email").send({ token });
    expect(first.status).toBe(200);

    const second = await request(app).post("/api/auth/verify-email").send({ token });
    expect(second.status).toBe(400);
    expect(second.body.code).toBe("INVALID_TOKEN");
  });

  it("resend-verification issues a new token and invalidates the old one", async () => {
    const sendSpy = jest.spyOn(mailer, "sendVerificationEmail").mockResolvedValue();
    const signUpRes = await signUp({ email: "resend@example.com" });
    const firstToken = extractTokenFromUrl(sendSpy.mock.calls[0][0].verifyUrl);

    const resendRes = await request(app)
      .post("/api/auth/resend-verification")
      .set("Authorization", `Bearer ${signUpRes.body.accessToken}`);

    expect(resendRes.status).toBe(200);
    expect(resendRes.body.alreadyVerified).toBe(false);
    expect(sendSpy).toHaveBeenCalledTimes(2);

    const secondToken = extractTokenFromUrl(sendSpy.mock.calls[1][0].verifyUrl);
    expect(secondToken).not.toBe(firstToken);

    const oldAttempt = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: firstToken });
    expect(oldAttempt.status).toBe(400);

    const newAttempt = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: secondToken });
    expect(newAttempt.status).toBe(200);
  });

  it("resend-verification is a no-op (and sends nothing) if already verified", async () => {
    const sendSpy = jest.spyOn(mailer, "sendVerificationEmail").mockResolvedValue();
    const signUpRes = await signUp({ email: "already@example.com" });
    const token = extractTokenFromUrl(sendSpy.mock.calls[0][0].verifyUrl);
    await request(app).post("/api/auth/verify-email").send({ token });

    const resendRes = await request(app)
      .post("/api/auth/resend-verification")
      .set("Authorization", `Bearer ${signUpRes.body.accessToken}`);

    expect(resendRes.status).toBe(200);
    expect(resendRes.body.alreadyVerified).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1); // no second email sent
  });

  it("rejects resend-verification with no Authorization header", async () => {
    const res = await request(app).post("/api/auth/resend-verification");
    expect(res.status).toBe(401);
  });
});

describe("password reset", () => {
  it("resets the password and revokes every existing session", async () => {
    jest.spyOn(mailer, "sendVerificationEmail").mockResolvedValue();
    const resetSpy = jest.spyOn(mailer, "sendPasswordResetEmail").mockResolvedValue();

    const signUpRes = await signUp({ email: "reset@example.com", password: "old-password1" });
    const cookie = extractCookie(signUpRes);

    const forgotRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "reset@example.com" });
    expect(forgotRes.status).toBe(200);
    expect(resetSpy).toHaveBeenCalledTimes(1);

    const token = extractTokenFromUrl(resetSpy.mock.calls[0][0].resetUrl);
    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "new-password1" });
    expect(resetRes.status).toBe(200);

    // The session that existed before the reset should be dead now —
    // resetting a password revokes every session, not just the current one.
    const refreshAfterReset = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(refreshAfterReset.status).toBe(401);

    const oldPwSignIn = await request(app)
      .post("/api/auth/sign-in")
      .send({ email: "reset@example.com", password: "old-password1" });
    expect(oldPwSignIn.status).toBe(401);

    const newPwSignIn = await request(app)
      .post("/api/auth/sign-in")
      .send({ email: "reset@example.com", password: "new-password1" });
    expect(newPwSignIn.status).toBe(200);
  });

  it("returns an identical response whether or not the email has an account (no enumeration)", async () => {
    jest.spyOn(mailer, "sendVerificationEmail").mockResolvedValue();
    jest.spyOn(mailer, "sendPasswordResetEmail").mockResolvedValue();
    await signUp({ email: "real@example.com" });

    const realRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "real@example.com" });
    const fakeRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ghost@example.com" });

    expect(realRes.status).toBe(200);
    expect(fakeRes.status).toBe(200);
    expect(realRes.body.message).toBe(fakeRes.body.message);
  });

  it("rejects an invalid reset token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "not-a-real-token", newPassword: "whatever123" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });

  it("rejects a new password shorter than 8 characters", async () => {
    jest.spyOn(mailer, "sendVerificationEmail").mockResolvedValue();
    const resetSpy = jest.spyOn(mailer, "sendPasswordResetEmail").mockResolvedValue();
    await signUp({ email: "shortpw@example.com" });
    await request(app).post("/api/auth/forgot-password").send({ email: "shortpw@example.com" });
    const token = extractTokenFromUrl(resetSpy.mock.calls[0][0].resetUrl);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "short" });
    expect(res.status).toBe(400);
  });

  it("a reset token can only be used once", async () => {
    jest.spyOn(mailer, "sendVerificationEmail").mockResolvedValue();
    const resetSpy = jest.spyOn(mailer, "sendPasswordResetEmail").mockResolvedValue();
    await signUp({ email: "onceonlyreset@example.com" });
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "onceonlyreset@example.com" });
    const token = extractTokenFromUrl(resetSpy.mock.calls[0][0].resetUrl);

    const first = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "brand-new-pass1" });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "another-pass1" });
    expect(second.status).toBe(400);
  });
});
