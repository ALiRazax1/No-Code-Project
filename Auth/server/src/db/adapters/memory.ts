import { v4 as uuid } from "uuid";
import type { Session, User, VerificationToken } from "../../types";
import type {
  NewSessionInput,
  NewUserInput,
  NewVerificationTokenInput,
  SessionRepository,
  UserRepository,
  VerificationTokenRepository,
} from "../types";

/**
 * ---------------------------------------------------------------------------
 * In-memory adapter
 * ---------------------------------------------------------------------------
 * Plain arrays, wrapped to satisfy the same async contract every other
 * adapter satisfies. This is the default (`DB_PROVIDER=memory` or unset) —
 * zero setup, but every restart wipes all data and it can't be shared across
 * multiple server processes. Good for local dev and quick demos; not for
 * anything you need to persist.
 * ---------------------------------------------------------------------------
 */

const users: User[] = [];
const sessions: Session[] = [];
const verificationTokens: VerificationToken[] = [];

export const memoryUserRepository: UserRepository = {
  async findByEmail(email) {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },

  async findById(id) {
    return users.find((u) => u.id === id) ?? null;
  },

  async create(input: NewUserInput) {
    const user: User = {
      id: uuid(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name,
      // Deterministic, avatar-as-a-service placeholder — swap for uploads later.
      avatar: `https://api.dicebear.com/8.x/notionists/svg?seed=${encodeURIComponent(
        input.email
      )}`,
      emailVerified: false,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    return user;
  },

  async updatePasswordHash(userId, passwordHash) {
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    user.passwordHash = passwordHash;
    return user;
  },

  async markEmailVerified(userId) {
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    user.emailVerified = true;
    user.emailVerifiedAt = new Date().toISOString();
    return user;
  },
};

export const memorySessionRepository: SessionRepository = {
  async create(input: NewSessionInput) {
    const session: Session = {
      id: input.id,
      userId: input.userId,
      refreshToken: input.refreshToken,
      userAgent: input.userAgent,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + input.ttlMs).toISOString(),
    };
    sessions.push(session);
    return session;
  },

  async findByRefreshToken(refreshToken) {
    return sessions.find((s) => s.refreshToken === refreshToken) ?? null;
  },

  async findByPreviousRefreshToken(refreshToken) {
    return sessions.find((s) => s.previousRefreshToken === refreshToken) ?? null;
  },

  async rotate(sessionId, newRefreshToken, ttlMs) {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    session.previousRefreshToken = session.refreshToken;
    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(Date.now() + ttlMs).toISOString();
    return session;
  },

  async revoke(sessionId) {
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) sessions.splice(index, 1);
  },

  async revokeAllForUser(userId) {
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (sessions[i].userId === userId) sessions.splice(i, 1);
    }
  },
};

export const memoryVerificationTokenRepository: VerificationTokenRepository = {
  async create(input: NewVerificationTokenInput) {
    const token: VerificationToken = {
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      purpose: input.purpose,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + input.ttlMs).toISOString(),
    };
    verificationTokens.push(token);
    return token;
  },

  async findByTokenHash(tokenHash, purpose) {
    return (
      verificationTokens.find((t) => t.tokenHash === tokenHash && t.purpose === purpose) ?? null
    );
  },

  async revoke(id) {
    const index = verificationTokens.findIndex((t) => t.id === id);
    if (index !== -1) verificationTokens.splice(index, 1);
  },

  async revokeAllForUser(userId, purpose) {
    for (let i = verificationTokens.length - 1; i >= 0; i -= 1) {
      if (verificationTokens[i].userId === userId && verificationTokens[i].purpose === purpose) {
        verificationTokens.splice(i, 1);
      }
    }
  },
};

/** Exposed only for local debugging / tests — never import into route logic. */
export const __debugMemoryStore = { users, sessions, verificationTokens };

/** Test-only: wipes all in-memory collections between test cases so state
 *  from one test never leaks into the next. Never import this outside
 *  tests/ — production code has no legitimate reason to call it. */
export function __resetMemoryStoreForTests(): void {
  users.length = 0;
  sessions.length = 0;
  verificationTokens.length = 0;
}
