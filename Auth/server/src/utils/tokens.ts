import jwt, { type SignOptions } from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { config } from "../config";
import type { AccessTokenPayload, RefreshTokenPayload, User } from "../types";

// Newer @types/jsonwebtoken versions type `expiresIn` as `number | StringValue`,
// a branded string type from the `ms` package, rather than plain `string`.
// Our TTLs come from environment variables (always plain strings at runtime,
// e.g. "15m" / "7d"), so we cast at the boundary instead of threading the
// branded type through config.ts.
const accessTokenOptions: SignOptions = {
  expiresIn: config.jwt.accessTtl as SignOptions["expiresIn"],
};
const refreshTokenOptions: SignOptions = {
  expiresIn: config.jwt.refreshTtl as SignOptions["expiresIn"],
};

export function signAccessToken(user: User): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    type: "access",
    // Without this, two tokens for the same user issued in the same
    // wall-clock second are byte-identical (JWT signing is deterministic;
    // `iat` only has 1-second resolution). A random jti guarantees every
    // token is unique regardless of timing.
    jti: uuid(),
  };
  return jwt.sign(payload, config.jwt.accessSecret, accessTokenOptions);
}

export function signRefreshToken(userId: string, sessionId: string): string {
  const payload: RefreshTokenPayload = {
    sub: userId,
    sessionId,
    type: "refresh",
    jti: uuid(),
  };
  return jwt.sign(payload, config.jwt.refreshSecret, refreshTokenOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.jwt.accessSecret);
  if (typeof decoded === "string" || decoded.type !== "access") {
    throw new Error("Invalid access token");
  }
  return decoded as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, config.jwt.refreshSecret);
  if (typeof decoded === "string" || decoded.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }
  return decoded as RefreshTokenPayload;
}
