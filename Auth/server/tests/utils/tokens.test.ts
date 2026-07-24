import jwt from "jsonwebtoken";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../src/utils/tokens";
import type { User } from "../../src/types";

const testUser: User = {
  id: "user-123",
  email: "test@example.com",
  passwordHash: "hash",
  name: "Test User",
  avatar: "https://example.com/a.png",
  emailVerified: false,
  createdAt: new Date().toISOString(),
};

describe("access tokens", () => {
  it("signs a token that verifies back to the same user id and email", () => {
    const token = signAccessToken(testUser);
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe(testUser.id);
    expect(payload.email).toBe(testUser.email);
    expect(payload.type).toBe("access");
  });

  it("produces a different token even when signed twice in immediate succession", () => {
    // Regression test: JWT signing is deterministic (same payload + same
    // `iat` second + same secret = the same string), so two tokens for the
    // same user issued within the same wall-clock second used to collide.
    // The `jti` claim exists specifically to prevent this — without it,
    // this test fails intermittently depending on how fast the machine is.
    const first = signAccessToken(testUser);
    const second = signAccessToken(testUser);
    expect(first).not.toBe(second);
  });

  it("throws when verifying a token signed with a different secret", () => {
    const badToken = jwt.sign(
      { sub: testUser.id, email: testUser.email, type: "access" },
      "some-other-secret"
    );
    expect(() => verifyAccessToken(badToken)).toThrow();
  });

  it("throws when the token has already expired", () => {
    const expired = jwt.sign(
      { sub: testUser.id, email: testUser.email, type: "access" },
      process.env.ACCESS_TOKEN_SECRET as string,
      { expiresIn: -10 } // already in the past
    );
    expect(() => verifyAccessToken(expired)).toThrow(/jwt expired/i);
  });
});

describe("refresh tokens", () => {
  it("signs a token that verifies back to the same user id and session id", () => {
    const token = signRefreshToken(testUser.id, "session-abc");
    const payload = verifyRefreshToken(token);

    expect(payload.sub).toBe(testUser.id);
    expect(payload.sessionId).toBe("session-abc");
    expect(payload.type).toBe("refresh");
  });

  it("produces a different token even when rotated twice in immediate succession for the same session", () => {
    // This is the exact scenario that broke refresh-token rotation before
    // the `jti` fix: two refresh tokens for the *same session* signed
    // within the same second were indistinguishable, which meant a stale,
    // already-rotated token could be replayed and mistaken for the current
    // one instead of triggering reuse detection.
    const first = signRefreshToken(testUser.id, "session-abc");
    const second = signRefreshToken(testUser.id, "session-abc");
    expect(first).not.toBe(second);
  });

  it("rejects a token with the wrong `type` claim, even if correctly signed", () => {
    const wrongType = jwt.sign(
      { sub: testUser.id, sessionId: "s1", type: "access" },
      process.env.REFRESH_TOKEN_SECRET as string
    );
    expect(() => verifyRefreshToken(wrongType)).toThrow();
  });

  it("rejects an access token presented as a refresh token", () => {
    const accessToken = signAccessToken(testUser);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });
});
