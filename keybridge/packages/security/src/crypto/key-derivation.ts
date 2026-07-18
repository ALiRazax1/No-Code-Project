/**
 * Per-user encryption key derivation.
 *
 * Design:
 *  - One application-wide master secret lives in env (KEYBRIDGE_MASTER_SECRET).
 *  - For each user we derive a unique 32-byte AES-256 key with HKDF-SHA256,
 *    using the userId as the HKDF "info" parameter.
 *  - The derived key is NEVER stored anywhere — it is recomputed on every
 *    encrypt/decrypt call and discarded immediately after.
 *  - This means the encryption key and the ciphertext never live in the same
 *    database row, table, or process memory simultaneously longer than needed.
 *
 * Why HKDF instead of storing a per-user key?
 *  - No extra table / secret to protect.
 *  - Rotating the master secret (re-encryption job) invalidates ALL derived
 *    keys in one operation.
 *  - Deterministic: given (masterSecret, userId) you always get the same
 *    derived key — so we can decrypt old records without storing anything.
 */

import { createHmac, hkdfSync } from "crypto";
import type { DeriveKeyParams } from "../types.js";

/** Length of derived key in bytes (32 bytes = 256 bits for AES-256). */
const DERIVED_KEY_LENGTH = 32;

/** HKDF info string — changing this value invalidates all existing derived keys. */
const HKDF_INFO = Buffer.from("keybridge-v1-user-encryption-key");

/** Salt is fixed and public; per-user uniqueness comes from the `info` field. */
const HKDF_SALT = Buffer.from("keybridge-v1-salt");

/**
 * Derive a 32-byte AES-256 encryption key for a specific user.
 *
 * The returned Buffer must be used and then discarded — never stored.
 *
 * @throws if masterSecret is shorter than 16 bytes (refuse to operate with weak secrets).
 */
export function deriveUserKey({ masterSecret, userId }: DeriveKeyParams): Buffer {
  if (masterSecret.length < 16) {
    throw new Error(
      "[keybridge/security] KEYBRIDGE_MASTER_SECRET must be at least 16 bytes. " +
        "Generate one with: openssl rand -hex 32"
    );
  }

  if (!userId || userId.trim().length === 0) {
    throw new Error("[keybridge/security] userId must be a non-empty string.");
  }

  // HKDF-SHA256: master secret as IKM, fixed salt, user-scoped info
  const derived = hkdfSync(
    "sha256",
    masterSecret,                    // IKM — the master secret
    HKDF_SALT,                       // salt — fixed, public, not secret
    Buffer.from(`${HKDF_INFO.toString()}-${userId}`), // info — user-scoped
    DERIVED_KEY_LENGTH
  );

  return Buffer.from(derived);
}

/**
 * Parse the master secret from an environment-variable hex string.
 * Call this once at startup; pass the result into deriveUserKey().
 *
 * @throws if the env var is missing or too short.
 */
export function masterSecretFromEnv(envValue: string | undefined): Buffer {
  if (!envValue) {
    throw new Error(
      "[keybridge/security] KEYBRIDGE_MASTER_SECRET env variable is not set. " +
        "Generate one with: openssl rand -hex 32"
    );
  }

  const buf = Buffer.from(envValue, "hex");
  if (buf.length < 16) {
    throw new Error(
      "[keybridge/security] KEYBRIDGE_MASTER_SECRET decoded to fewer than 16 bytes. " +
        "It must be at least a 32-character hex string (16 bytes)."
    );
  }

  return buf;
}
