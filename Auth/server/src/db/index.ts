import { config } from "../config";
import { logger } from "../utils/logger";
import {
  memorySessionRepository,
  memoryUserRepository,
  memoryVerificationTokenRepository,
} from "./adapters/memory";
import {
  isSessionExpired,
  isVerificationTokenExpired,
  toPublicUser,
} from "./types";
import type {
  SessionRepository,
  UserRepository,
  VerificationTokenRepository,
} from "./types";

/**
 * ---------------------------------------------------------------------------
 * The database factory
 * ---------------------------------------------------------------------------
 * This is the ONLY file that decides which adapter is active. Everything
 * else in the app — controllers, middleware — imports `userStore`,
 * `sessionStore`, and `verificationTokenStore` from here and has no idea
 * whether requests are hitting plain arrays or a MongoDB cluster.
 *
 * To add a new database later (Postgres, Supabase, whatever), write a new
 * adapter in `./adapters` that satisfies the repository interfaces from
 * `./types`, then add one branch to `initDatabase()` below. Nothing in
 * `controllers/` or `middleware/` needs to change.
 * ---------------------------------------------------------------------------
 */

let userRepository: UserRepository = memoryUserRepository;
let sessionRepository: SessionRepository = memorySessionRepository;
let verificationTokenRepository: VerificationTokenRepository =
  memoryVerificationTokenRepository;

/**
 * Selects and connects the configured adapter. Must be awaited once at
 * startup, before the Express server starts accepting requests (see
 * server.ts) — connecting to Mongo is asynchronous, and requests that land
 * before the connection is ready would fail confusingly.
 */
export async function initDatabase(): Promise<void> {
  switch (config.db.provider) {
    case "mongodb": {
      // Dynamically imported so the `mongoose` module — and the cost of
      // loading it — is only paid when MongoDB is actually the configured
      // provider. Running with DB_PROVIDER=memory never touches this file.
      const {
        connectMongo,
        mongoUserRepository,
        mongoSessionRepository,
        mongoVerificationTokenRepository,
      } = await import("./adapters/mongo.js");
      await connectMongo(config.db.mongoUri!);
      userRepository = mongoUserRepository;
      sessionRepository = mongoSessionRepository;
      verificationTokenRepository = mongoVerificationTokenRepository;
      logger.info("🍃 MiniClerk connected to MongoDB");
      break;
    }

    case "memory":
    default: {
      logger.info(
        "🧠 MiniClerk is using the in-memory store — data resets on restart. Set DB_PROVIDER=mongodb to persist it.",
      );
      break;
    }
  }
}

export async function closeDatabase(): Promise<void> {
  if (config.db.provider === "mongodb") {
    const mongoose = await import("mongoose");
    await mongoose.disconnect();
    logger.info("🍃 MongoDB connection closed");
  }
}

export const userStore = {
  findByEmail: (email: string) => userRepository.findByEmail(email),
  findById: (id: string) => userRepository.findById(id),
  create: (input: Parameters<UserRepository["create"]>[0]) =>
    userRepository.create(input),
  updatePasswordHash: (userId: string, passwordHash: string) =>
    userRepository.updatePasswordHash(userId, passwordHash),
  markEmailVerified: (userId: string) =>
    userRepository.markEmailVerified(userId),
  toPublic: toPublicUser,
};

export const sessionStore = {
  create: (input: Parameters<SessionRepository["create"]>[0]) =>
    sessionRepository.create(input),
  findByRefreshToken: (token: string) =>
    sessionRepository.findByRefreshToken(token),
  findByPreviousRefreshToken: (token: string) =>
    sessionRepository.findByPreviousRefreshToken(token),
  rotate: (sessionId: string, newRefreshToken: string, ttlMs: number) =>
    sessionRepository.rotate(sessionId, newRefreshToken, ttlMs),
  revoke: (sessionId: string) => sessionRepository.revoke(sessionId),
  revokeAllForUser: (userId: string) =>
    sessionRepository.revokeAllForUser(userId),
  isExpired: isSessionExpired,
};

export const verificationTokenStore = {
  create: (input: Parameters<VerificationTokenRepository["create"]>[0]) =>
    verificationTokenRepository.create(input),
  findByTokenHash: (
    ...args: Parameters<VerificationTokenRepository["findByTokenHash"]>
  ) => verificationTokenRepository.findByTokenHash(...args),
  revoke: (id: string) => verificationTokenRepository.revoke(id),
  revokeAllForUser: (
    ...args: Parameters<VerificationTokenRepository["revokeAllForUser"]>
  ) => verificationTokenRepository.revokeAllForUser(...args),
  isExpired: isVerificationTokenExpired,
};
