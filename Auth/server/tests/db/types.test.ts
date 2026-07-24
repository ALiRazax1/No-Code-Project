import { isSessionExpired, isVerificationTokenExpired, toPublicUser } from "../../src/db/types";
import type { Session, User, VerificationToken } from "../../src/types";

describe("toPublicUser", () => {
  it("strips the password hash and keeps everything else", () => {
    const user: User = {
      id: "u1",
      email: "a@example.com",
      passwordHash: "super-secret-hash",
      name: "A",
      avatar: "https://example.com/a.png",
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };

    const publicUser = toPublicUser(user);

    expect(publicUser).not.toHaveProperty("passwordHash");
    expect(publicUser).toEqual({
      id: "u1",
      email: "a@example.com",
      name: "A",
      avatar: "https://example.com/a.png",
      emailVerified: false,
      createdAt: user.createdAt,
    });
  });
});

describe("isSessionExpired", () => {
  const baseSession: Session = {
    id: "s1",
    userId: "u1",
    refreshToken: "rt",
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
  };

  it("returns true for a session whose expiresAt is in the past", () => {
    const session = { ...baseSession, expiresAt: new Date(Date.now() - 1000).toISOString() };
    expect(isSessionExpired(session)).toBe(true);
  });

  it("returns false for a session whose expiresAt is in the future", () => {
    const session = { ...baseSession, expiresAt: new Date(Date.now() + 60_000).toISOString() };
    expect(isSessionExpired(session)).toBe(false);
  });
});

describe("isVerificationTokenExpired", () => {
  const baseToken: VerificationToken = {
    id: "vt1",
    userId: "u1",
    tokenHash: "hash",
    purpose: "email_verification",
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
  };

  it("returns true for a token whose expiresAt is in the past", () => {
    const token = { ...baseToken, expiresAt: new Date(Date.now() - 1000).toISOString() };
    expect(isVerificationTokenExpired(token)).toBe(true);
  });

  it("returns false for a token whose expiresAt is in the future", () => {
    const token = { ...baseToken, expiresAt: new Date(Date.now() + 60_000).toISOString() };
    expect(isVerificationTokenExpired(token)).toBe(false);
  });
});
