import type {
  SessionRepository,
  UserRepository,
  VerificationTokenRepository,
} from "../../src/db/types";

interface UserRepoTestSetup {
  getRepo: () => UserRepository;
  reset: () => void | Promise<void>;
}

interface SessionRepoTestSetup {
  getRepo: () => SessionRepository;
  reset: () => void | Promise<void>;
}

interface VerificationTokenRepoTestSetup {
  getRepo: () => VerificationTokenRepository;
  reset: () => void | Promise<void>;
}

/**
 * Runs the same behavioral assertions against ANY UserRepository
 * implementation. This is what guarantees the memory adapter and the
 * MongoDB adapter actually behave identically — if a new adapter is added
 * later (Postgres, Supabase, ...), running it through this same function
 * is the fastest way to know whether it's a true drop-in replacement or
 * whether it quietly does something different.
 */
export function testUserRepositoryContract(label: string, setup: UserRepoTestSetup) {
  describe(`${label} — UserRepository`, () => {
    beforeEach(async () => {
      await setup.reset();
    });

    it("creates a user with a lowercased email and no leaked password", async () => {
      const repo = setup.getRepo();
      const user = await repo.create({
        email: "Ada@Example.com",
        passwordHash: "some-hash",
        name: "Ada Lovelace",
      });

      expect(user.id).toEqual(expect.any(String));
      expect(user.email).toBe("ada@example.com");
      expect(user.name).toBe("Ada Lovelace");
      expect(user.avatar).toEqual(expect.any(String));
      expect(user.createdAt).toEqual(expect.any(String));
    });

    it("finds a user by email case-insensitively", async () => {
      const repo = setup.getRepo();
      const created = await repo.create({
        email: "case@example.com",
        passwordHash: "hash",
        name: "Case Test",
      });

      const found = await repo.findByEmail("CASE@EXAMPLE.COM");
      expect(found?.id).toBe(created.id);
    });

    it("returns null when no user matches the email", async () => {
      const repo = setup.getRepo();
      expect(await repo.findByEmail("nobody@example.com")).toBeNull();
    });

    it("finds a user by id", async () => {
      const repo = setup.getRepo();
      const created = await repo.create({
        email: "byid@example.com",
        passwordHash: "hash",
        name: "By Id",
      });

      const found = await repo.findById(created.id);
      expect(found?.email).toBe("byid@example.com");
    });

    it("returns null when no user matches the id", async () => {
      const repo = setup.getRepo();
      expect(await repo.findById("does-not-exist")).toBeNull();
    });

    it("creates a user with emailVerified false by default", async () => {
      const repo = setup.getRepo();
      const user = await repo.create({
        email: "unverified@example.com",
        passwordHash: "hash",
        name: "Unverified",
      });
      expect(user.emailVerified).toBe(false);
    });

    it("updatePasswordHash() replaces the stored hash", async () => {
      const repo = setup.getRepo();
      const created = await repo.create({
        email: "pwchange@example.com",
        passwordHash: "old-hash",
        name: "Pw Change",
      });

      const updated = await repo.updatePasswordHash(created.id, "new-hash");
      expect(updated?.passwordHash).toBe("new-hash");

      const refetched = await repo.findById(created.id);
      expect(refetched?.passwordHash).toBe("new-hash");
    });

    it("updatePasswordHash() returns null for an unknown user id", async () => {
      const repo = setup.getRepo();
      expect(await repo.updatePasswordHash("no-such-user", "hash")).toBeNull();
    });

    it("markEmailVerified() flips emailVerified and sets emailVerifiedAt", async () => {
      const repo = setup.getRepo();
      const created = await repo.create({
        email: "toverify@example.com",
        passwordHash: "hash",
        name: "To Verify",
      });
      expect(created.emailVerified).toBe(false);

      const verified = await repo.markEmailVerified(created.id);
      expect(verified?.emailVerified).toBe(true);
      expect(verified?.emailVerifiedAt).toEqual(expect.any(String));
    });

    it("markEmailVerified() returns null for an unknown user id", async () => {
      const repo = setup.getRepo();
      expect(await repo.markEmailVerified("no-such-user")).toBeNull();
    });
  });
}

/**
 * Same idea as above, for SessionRepository — with extra emphasis on
 * rotation and revocation, since those are what the reuse-detection and
 * "sign out everywhere" security logic in authController.ts depends on.
 */
export function testSessionRepositoryContract(label: string, setup: SessionRepoTestSetup) {
  describe(`${label} — SessionRepository`, () => {
    beforeEach(async () => {
      await setup.reset();
    });

    it("creates a session with the given id and an expiry in the future", async () => {
      const repo = setup.getRepo();
      const before = Date.now();
      const session = await repo.create({
        id: "session-1",
        userId: "user-1",
        refreshToken: "token-1",
        ttlMs: 60_000,
      });

      expect(session.id).toBe("session-1");
      expect(session.userId).toBe("user-1");
      expect(session.refreshToken).toBe("token-1");
      expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(before);
    });

    it("finds a session by its current refresh token", async () => {
      const repo = setup.getRepo();
      await repo.create({ id: "s1", userId: "u1", refreshToken: "rt-1", ttlMs: 60_000 });

      const found = await repo.findByRefreshToken("rt-1");
      expect(found?.id).toBe("s1");
    });

    it("returns null for an unknown refresh token", async () => {
      const repo = setup.getRepo();
      expect(await repo.findByRefreshToken("nope")).toBeNull();
    });

    it("does not find a session by previousRefreshToken before any rotation has happened", async () => {
      const repo = setup.getRepo();
      await repo.create({ id: "s2", userId: "u1", refreshToken: "rt-2", ttlMs: 60_000 });

      expect(await repo.findByPreviousRefreshToken("rt-2")).toBeNull();
    });

    it("rotate() replaces the refresh token and makes the old one findable via findByPreviousRefreshToken", async () => {
      const repo = setup.getRepo();
      await repo.create({ id: "s3", userId: "u1", refreshToken: "rt-old", ttlMs: 60_000 });

      const rotated = await repo.rotate("s3", "rt-new", 60_000);
      expect(rotated?.refreshToken).toBe("rt-new");

      expect(await repo.findByRefreshToken("rt-new")).not.toBeNull();
      expect(await repo.findByRefreshToken("rt-old")).toBeNull();

      const stale = await repo.findByPreviousRefreshToken("rt-old");
      expect(stale?.id).toBe("s3");
    });

    it("rotate() returns null for a session id that doesn't exist", async () => {
      const repo = setup.getRepo();
      expect(await repo.rotate("no-such-session", "rt-new", 60_000)).toBeNull();
    });

    it("revoke() removes the session entirely", async () => {
      const repo = setup.getRepo();
      await repo.create({ id: "s4", userId: "u1", refreshToken: "rt-4", ttlMs: 60_000 });

      await repo.revoke("s4");

      expect(await repo.findByRefreshToken("rt-4")).toBeNull();
    });

    it("revoke() on an unknown session id is a harmless no-op", async () => {
      const repo = setup.getRepo();
      await expect(repo.revoke("never-existed")).resolves.not.toThrow();
    });

    it("revokeAllForUser() removes every session for that user but leaves others alone", async () => {
      const repo = setup.getRepo();
      await repo.create({ id: "a1", userId: "user-a", refreshToken: "rt-a1", ttlMs: 60_000 });
      await repo.create({ id: "a2", userId: "user-a", refreshToken: "rt-a2", ttlMs: 60_000 });
      await repo.create({ id: "b1", userId: "user-b", refreshToken: "rt-b1", ttlMs: 60_000 });

      await repo.revokeAllForUser("user-a");

      expect(await repo.findByRefreshToken("rt-a1")).toBeNull();
      expect(await repo.findByRefreshToken("rt-a2")).toBeNull();
      expect(await repo.findByRefreshToken("rt-b1")).not.toBeNull();
    });
  });
}

/**
 * Covers both email verification and password reset tokens, since they
 * share the exact same repository — `purpose` is just a field, not a
 * different interface.
 */
export function testVerificationTokenRepositoryContract(
  label: string,
  setup: VerificationTokenRepoTestSetup
) {
  describe(`${label} — VerificationTokenRepository`, () => {
    beforeEach(async () => {
      await setup.reset();
    });

    it("creates a token with the given id and an expiry in the future", async () => {
      const repo = setup.getRepo();
      const before = Date.now();
      const token = await repo.create({
        id: "vt-1",
        userId: "user-1",
        tokenHash: "hash-1",
        purpose: "email_verification",
        ttlMs: 60_000,
      });

      expect(token.id).toBe("vt-1");
      expect(token.userId).toBe("user-1");
      expect(token.purpose).toBe("email_verification");
      expect(new Date(token.expiresAt).getTime()).toBeGreaterThan(before);
    });

    it("finds a token by its hash and purpose", async () => {
      const repo = setup.getRepo();
      await repo.create({
        id: "vt-2",
        userId: "user-1",
        tokenHash: "hash-2",
        purpose: "password_reset",
        ttlMs: 60_000,
      });

      const found = await repo.findByTokenHash("hash-2", "password_reset");
      expect(found?.id).toBe("vt-2");
    });

    it("does not find a token when the purpose doesn't match", async () => {
      // Same hash, wrong purpose — should not match. In practice a hash
      // collision across purposes is astronomically unlikely, but the
      // repository should enforce the boundary regardless.
      const repo = setup.getRepo();
      await repo.create({
        id: "vt-3",
        userId: "user-1",
        tokenHash: "hash-3",
        purpose: "email_verification",
        ttlMs: 60_000,
      });

      expect(await repo.findByTokenHash("hash-3", "password_reset")).toBeNull();
    });

    it("returns null for an unknown token hash", async () => {
      const repo = setup.getRepo();
      expect(await repo.findByTokenHash("no-such-hash", "email_verification")).toBeNull();
    });

    it("revoke() removes the token so it can no longer be found", async () => {
      const repo = setup.getRepo();
      const token = await repo.create({
        id: "vt-4",
        userId: "user-1",
        tokenHash: "hash-4",
        purpose: "email_verification",
        ttlMs: 60_000,
      });

      await repo.revoke(token.id);

      expect(await repo.findByTokenHash("hash-4", "email_verification")).toBeNull();
    });

    it("revoke() on an unknown id is a harmless no-op", async () => {
      const repo = setup.getRepo();
      await expect(repo.revoke("never-existed")).resolves.not.toThrow();
    });

    it("revokeAllForUser() only removes tokens matching both the user and the purpose", async () => {
      const repo = setup.getRepo();
      await repo.create({
        id: "vt-5",
        userId: "user-a",
        tokenHash: "hash-5",
        purpose: "email_verification",
        ttlMs: 60_000,
      });
      await repo.create({
        id: "vt-6",
        userId: "user-a",
        tokenHash: "hash-6",
        purpose: "password_reset",
        ttlMs: 60_000,
      });
      await repo.create({
        id: "vt-7",
        userId: "user-b",
        tokenHash: "hash-7",
        purpose: "email_verification",
        ttlMs: 60_000,
      });

      await repo.revokeAllForUser("user-a", "email_verification");

      // user-a's email_verification token is gone...
      expect(await repo.findByTokenHash("hash-5", "email_verification")).toBeNull();
      // ...but user-a's password_reset token is untouched...
      expect(await repo.findByTokenHash("hash-6", "password_reset")).not.toBeNull();
      // ...and user-b's email_verification token is untouched.
      expect(await repo.findByTokenHash("hash-7", "email_verification")).not.toBeNull();
    });
  });
}
