import mongoose, { Schema } from "mongoose";
import type { HydratedDocument } from "mongoose";
import { v4 as uuid } from "uuid";
import type { Session, User, VerificationPurpose, VerificationToken } from "../../types";
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
 * MongoDB adapter (Mongoose)
 * ---------------------------------------------------------------------------
 * Mirrors the domain types in `types/index.ts`, but stores the id as Mongo's
 * `_id` (a string UUID, not the default ObjectId) so the rest of the app —
 * JWT payloads, React state, everything — never has to know Mongo is
 * involved at all. Every function here returns the same plain `User`/
 * `Session`/`VerificationToken` shape the memory adapter returns.
 * ---------------------------------------------------------------------------
 */

interface UserDocument extends Omit<User, "id"> {
  _id: string;
}

interface SessionDocument {
  _id: string;
  userId: string;
  refreshToken: string;
  previousRefreshToken?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
}

interface VerificationTokenDocument {
  _id: string;
  userId: string;
  tokenHash: string;
  purpose: string;
  createdAt: Date;
  expiresAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    _id: { type: String, default: () => uuid() },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    emailVerified: { type: Boolean, required: true, default: false },
    emailVerifiedAt: { type: String },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const sessionSchema = new Schema<SessionDocument>(
  {
    _id: { type: String, default: () => uuid() },
    userId: { type: String, required: true, index: true },
    refreshToken: { type: String, required: true, index: true },
    previousRefreshToken: { type: String, index: true },
    userAgent: { type: String },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { versionKey: false }
);

const verificationTokenSchema = new Schema<VerificationTokenDocument>(
  {
    _id: { type: String, default: () => uuid() },
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    purpose: { type: String, required: true, enum: ["email_verification", "password_reset"] },
    createdAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { versionKey: false }
);

// `mongoose.models.X ||` guards against "Cannot overwrite model" errors when
// this module gets re-evaluated by ts-node/nodemon's watch-and-restart.
const UserModel =
  (mongoose.models.MiniClerkUser as mongoose.Model<UserDocument>) ||
  mongoose.model<UserDocument>("MiniClerkUser", userSchema);

const SessionModel =
  (mongoose.models.MiniClerkSession as mongoose.Model<SessionDocument>) ||
  mongoose.model<SessionDocument>("MiniClerkSession", sessionSchema);

const VerificationTokenModel =
  (mongoose.models.MiniClerkVerificationToken as mongoose.Model<VerificationTokenDocument>) ||
  mongoose.model<VerificationTokenDocument>("MiniClerkVerificationToken", verificationTokenSchema);

function toUser(doc: HydratedDocument<UserDocument>): User {
  return {
    id: doc._id,
    email: doc.email,
    passwordHash: doc.passwordHash,
    name: doc.name,
    avatar: doc.avatar,
    emailVerified: doc.emailVerified,
    emailVerifiedAt: doc.emailVerifiedAt,
    createdAt: doc.createdAt,
  };
}

function toSession(doc: HydratedDocument<SessionDocument>): Session {
  return {
    id: doc._id,
    userId: doc.userId,
    refreshToken: doc.refreshToken,
    previousRefreshToken: doc.previousRefreshToken,
    userAgent: doc.userAgent,
    createdAt: doc.createdAt.toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
  };
}

function toVerificationToken(doc: HydratedDocument<VerificationTokenDocument>): VerificationToken {
  return {
    id: doc._id,
    userId: doc.userId,
    tokenHash: doc.tokenHash,
    purpose: doc.purpose as VerificationPurpose,
    createdAt: doc.createdAt.toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
  };
}

export const mongoUserRepository: UserRepository = {
  async findByEmail(email) {
    const doc = await UserModel.findOne({ email: email.toLowerCase() });
    return doc ? toUser(doc) : null;
  },

  async findById(id) {
    const doc = await UserModel.findById(id);
    return doc ? toUser(doc) : null;
  },

  async create(input: NewUserInput) {
    const doc = await UserModel.create({
      _id: uuid(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      name: input.name,
      avatar: `https://api.dicebear.com/8.x/notionists/svg?seed=${encodeURIComponent(
        input.email
      )}`,
      emailVerified: false,
      createdAt: new Date().toISOString(),
    });
    return toUser(doc);
  },

  async updatePasswordHash(userId, passwordHash) {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      { passwordHash },
      { new: true }
    );
    return doc ? toUser(doc) : null;
  },

  async markEmailVerified(userId) {
    const doc = await UserModel.findByIdAndUpdate(
      userId,
      {
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
      },
      { new: true }
    );
    return doc ? toUser(doc) : null;
  },
};

export const mongoSessionRepository: SessionRepository = {
  async create(input: NewSessionInput) {
    const doc = await SessionModel.create({
      _id: input.id,
      userId: input.userId,
      refreshToken: input.refreshToken,
      userAgent: input.userAgent,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + input.ttlMs),
    });
    return toSession(doc);
  },

  async findByRefreshToken(refreshToken) {
    const doc = await SessionModel.findOne({ refreshToken });
    return doc ? toSession(doc) : null;
  },

  async findByPreviousRefreshToken(refreshToken) {
    const doc = await SessionModel.findOne({ previousRefreshToken: refreshToken });
    return doc ? toSession(doc) : null;
  },

  async rotate(sessionId, newRefreshToken, ttlMs) {
    const doc = await SessionModel.findById(sessionId);
    if (!doc) return null;
    doc.previousRefreshToken = doc.refreshToken;
    doc.refreshToken = newRefreshToken;
    doc.expiresAt = new Date(Date.now() + ttlMs);
    await doc.save();
    return toSession(doc);
  },

  async revoke(sessionId) {
    await SessionModel.deleteOne({ _id: sessionId });
  },

  async revokeAllForUser(userId) {
    await SessionModel.deleteMany({ userId });
  },
};

export const mongoVerificationTokenRepository: VerificationTokenRepository = {
  async create(input: NewVerificationTokenInput) {
    const doc = await VerificationTokenModel.create({
      _id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      purpose: input.purpose,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + input.ttlMs),
    });
    return toVerificationToken(doc);
  },

  async findByTokenHash(tokenHash, purpose) {
    const doc = await VerificationTokenModel.findOne({ tokenHash, purpose });
    return doc ? toVerificationToken(doc) : null;
  },

  async revoke(id) {
    await VerificationTokenModel.deleteOne({ _id: id });
  },

  async revokeAllForUser(userId, purpose) {
    await VerificationTokenModel.deleteMany({ userId, purpose });
  },
};

/** Opens the MongoDB connection. Call once at startup, before the server
 *  starts accepting requests — see db/index.ts and server.ts. */
export async function connectMongo(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}
