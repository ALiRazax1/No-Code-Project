/**
 * retrieveKey.ts
 *
 * Business logic for the injection API. This function is the only place
 * in the entire codebase where a decrypted API key is produced at
 * runtime. It is called exclusively from the internal API route —
 * never directly from any client-facing code.
 *
 * Invariants this module enforces:
 *   1. Only 'active' keys can be retrieved. Revoked or invalid keys
 *      are rejected before decryption is even attempted.
 *   2. 'local' mode keys cannot be retrieved server-side. They were
 *      never stored on the server, so we return a typed error rather
 *      than silently returning null.
 *   3. The decrypted key is never logged. If you add logging here, log
 *      the key ID or provider ID only — never the key value.
 *   4. last_used_at is always updated on a successful retrieval, so the
 *      Security Dashboard stays accurate.
 *
 * @keybridge/security interface assumed (Track 1 contract):
 *
 *   deriveUserKey(userId: string, masterSecret: string): Promise<Buffer>
 *     — derives a per-user encryption key via HKDF-SHA256
 *
 *   decrypt(ciphertext: string, userKey: Buffer): Promise<string>
 *     — decrypts an AES-256-GCM ciphertext and returns the plaintext
 */

import { deriveUserKey, decrypt } from "@keybridge/security";
import { findKeyByOwner, touchLastUsed } from "../db/connectedKeys";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type RetrieveKeyResult =
  | { success: true; key: string }
  | {
      success: false;
      code:
        | "not_found"        // no matching key for this user + provider
        | "local_only"       // key was stored locally; server cannot return it
        | "key_inactive"     // key is revoked or marked invalid
        | "decrypt_failed"   // decryption threw — encrypted_key is corrupt
        | "misconfigured";   // MASTER_ENCRYPTION_SECRET is not set
    };

// ---------------------------------------------------------------------------
// Public function
// ---------------------------------------------------------------------------

/**
 * Retrieves and decrypts a user's stored API key for the given provider.
 *
 * @param userId     — the authenticated user's id (from the caller's session)
 * @param providerId — provider identifier, e.g. "openai", "anthropic"
 */
export async function retrieveKey(
  userId: string,
  providerId: string
): Promise<RetrieveKeyResult> {
  // 1. Guard: MASTER_ENCRYPTION_SECRET must be set before anything else.
  //    This is the root secret used to derive per-user keys via HKDF.
  const masterSecret = process.env.MASTER_ENCRYPTION_SECRET;
  if (!masterSecret) {
    console.error(
      "[injection] MASTER_ENCRYPTION_SECRET is not set. " +
        "Add it to .env.local — it must match the value used when keys were stored."
    );
    return { success: false, code: "misconfigured" };
  }

  // 2. Fetch the key row, scoped to this user + provider.
  //    findKeyByOwner enforces ownership at the DB level.
  const row = await findKeyByOwner(userId, providerId);

  if (!row) {
    // Not found OR belongs to a different user. Indistinguishable on purpose.
    return { success: false, code: "not_found" };
  }

  // 3. Reject inactive keys before any decryption work.
  if (row.status !== "active") {
    // Log provider + status (not the key) for ops visibility.
    console.warn(
      `[injection] Key retrieval rejected: provider=${providerId} ` +
        `status=${row.status} keyId=${row.id}`
    );
    return { success: false, code: "key_inactive" };
  }

  // 4. Local-only keys were never transmitted to the server.
  //    encrypted_key is null for them, and we cannot reconstruct it.
  if (row.storage_mode === "local" || row.encrypted_key === null) {
    return { success: false, code: "local_only" };
  }

  // 5. Derive the per-user encryption key and decrypt.
  //    We never log the derived key or the plaintext.
  let plaintextKey: string;
  try {
    const userKey = await deriveUserKey(userId, masterSecret);
    plaintextKey = await decrypt(row.encrypted_key, userKey);
  } catch (err) {
    // Decryption failure means the ciphertext is corrupt or the
    // master secret has changed since the key was stored.
    // Log the key ID (safe) but never the ciphertext or plaintext.
    // Log the error constructor name only — never the message, which could
    // theoretically echo ciphertext or key material from a misbehaving
    // crypto library or a badly-written test stub.
    const errType = err instanceof Error ? err.constructor.name : typeof err;
    console.error(
      `[injection] Decryption failed for keyId=${row.id} ` +
        `provider=${providerId} errorType=${errType}. ` +
        `Possible cause: MASTER_ENCRYPTION_SECRET rotation without re-encryption.`
    );
    return { success: false, code: "decrypt_failed" };
  }

  // 6. Stamp last_used_at. This is best-effort — a failure here should
  //    not prevent the caller from receiving the key they're entitled to.
  try {
    await touchLastUsed(row.id, userId);
  } catch (err) {
    console.warn(
      `[injection] Failed to update last_used_at for keyId=${row.id}:`,
      err instanceof Error ? err.message : String(err)
    );
    // Intentionally not returning an error — the retrieval itself succeeded.
  }

  return { success: true, key: plaintextKey };
}
