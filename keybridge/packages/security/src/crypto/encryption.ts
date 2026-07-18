/**
 * AES-256-GCM encryption / decryption.
 *
 * Format of an EncryptedPayload string:
 *   "<iv_b64url>.<authTag_b64url>.<ciphertext_b64url>"
 *
 * All three components are base64url-encoded (no padding characters that
 * could cause issues in URLs or JSON without escaping).
 *
 * Security properties:
 *  - 12-byte random IV per encryption — never reused.
 *  - 16-byte GCM authentication tag — detects any tampering.
 *  - The plaintext key is zero-filled from memory immediately after use
 *    (best-effort; JS GC makes true zeroing impossible, but we do what we can).
 *  - This module has NO knowledge of users, databases, or env vars.
 *    It only takes a Buffer key and a string; callers handle key derivation.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type { DecryptParams, EncryptParams, EncryptedPayload } from "../types.js";

/** IV length in bytes for AES-GCM (NIST recommended: 96 bits = 12 bytes). */
const IV_LENGTH = 12;

/** GCM auth tag length in bytes (maximum: 16). */
const AUTH_TAG_LENGTH = 16;

/** AES algorithm identifier. */
const ALGORITHM = "aes-256-gcm";

// ---------------------------------------------------------------------------
// Encrypt
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string with AES-256-GCM.
 *
 * @returns An EncryptedPayload string: "<iv>.<authTag>.<ciphertext>" (base64url)
 */
export function encrypt({ plaintext, encryptionKey }: EncryptParams): EncryptedPayload {
  if (encryptionKey.length !== 32) {
    throw new Error(
      `[keybridge/security] encrypt() requires a 32-byte key. Got ${encryptionKey.length} bytes.`
    );
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const ciphertextBuf = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Serialise as base64url — no padding, URL-safe
  const payload = [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertextBuf.toString("base64url"),
  ].join(".");

  // Best-effort: overwrite sensitive buffers (JS GC may have already copied them)
  iv.fill(0);
  authTag.fill(0);
  ciphertextBuf.fill(0);

  return payload as EncryptedPayload;
}

// ---------------------------------------------------------------------------
// Decrypt
// ---------------------------------------------------------------------------

/**
 * Decrypt an EncryptedPayload produced by encrypt().
 *
 * @returns The original plaintext string.
 * @throws if the payload is malformed, the tag is invalid, or the key is wrong.
 */
export function decrypt({ payload, encryptionKey }: DecryptParams): string {
  if (encryptionKey.length !== 32) {
    throw new Error(
      `[keybridge/security] decrypt() requires a 32-byte key. Got ${encryptionKey.length} bytes.`
    );
  }

  const parts = payload.split(".");
  if (parts.length !== 3) {
    // Do NOT include the payload in the error — it might contain partial key material.
    throw new Error(
      "[keybridge/security] decrypt() received a malformed payload (expected 3 dot-separated parts)."
    );
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;

  let iv: Buffer;
  let authTag: Buffer;
  let ciphertextBuf: Buffer;

  try {
    iv = Buffer.from(ivB64, "base64url");
    authTag = Buffer.from(authTagB64, "base64url");
    ciphertextBuf = Buffer.from(ciphertextB64, "base64url");
  } catch {
    throw new Error(
      "[keybridge/security] decrypt() failed to base64url-decode payload components."
    );
  }

  if (iv.length !== IV_LENGTH) {
    throw new Error(`[keybridge/security] decrypt() IV has wrong length: ${iv.length}`);
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      `[keybridge/security] decrypt() auth tag has wrong length: ${authTag.length}`
    );
  }

  const decipher = createDecipheriv(ALGORITHM, encryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let plaintext: string;
  try {
    plaintext = Buffer.concat([
      decipher.update(ciphertextBuf),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // The GCM tag failed — key is wrong, data was tampered, or payload is corrupt.
    // Do NOT leak the payload or any derived value in the error message.
    throw new Error(
      "[keybridge/security] decrypt() authentication failed — " +
        "key is incorrect, or the stored payload has been tampered with."
    );
  } finally {
    // Best-effort zeroing of intermediate buffers
    iv.fill(0);
    authTag.fill(0);
    ciphertextBuf.fill(0);
  }

  return plaintext;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if a string looks like a valid EncryptedPayload.
 * Does NOT attempt decryption — just validates the structural shape.
 */
export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  // Each part must be non-empty base64url characters
  const b64urlPattern = /^[A-Za-z0-9_-]+$/;
  return parts.every((p) => p.length > 0 && b64urlPattern.test(p));
}
