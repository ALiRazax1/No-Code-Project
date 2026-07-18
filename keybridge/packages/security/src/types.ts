/**
 * Shared types for the @keybridge/security module.
 *
 * These types define the contracts between the encryption layer,
 * storage adapters, and any consumer of this package.
 */

// ---------------------------------------------------------------------------
// Encrypted payload — what gets written to storage
// ---------------------------------------------------------------------------

/**
 * The serialised form of an AES-256-GCM encrypted value.
 * All three fields are base64url-encoded and joined as:
 *   "<iv>.<authTag>.<ciphertext>"
 *
 * This string is the ONLY thing that ever reaches the database or IndexedDB.
 * The plaintext key NEVER appears here.
 */
export type EncryptedPayload = string & { readonly __brand: "EncryptedPayload" };

// ---------------------------------------------------------------------------
// Storage mode
// ---------------------------------------------------------------------------

export type StorageMode = "cloud" | "local";

// ---------------------------------------------------------------------------
// Connected key record — mirrors the DB schema from the spec
// ---------------------------------------------------------------------------

export type KeyStatus = "active" | "revoked" | "invalid";

/** A connected key record as returned from storage (never includes plaintext). */
export interface ConnectedKeyRecord {
  id: string;
  user_id: string;
  provider_id: string;
  storage_mode: StorageMode;
  /** Always null when returned to callers — decryption is explicit via adapter.retrieve() */
  encrypted_key: EncryptedPayload | null;
  last_validated_at: Date | null;
  last_used_at: Date | null;
  status: KeyStatus;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Adapter interface — both cloud and local adapters implement this
// ---------------------------------------------------------------------------

export interface StorageAdapter {
  /**
   * Encrypt `plaintextKey` and persist it.
   * Returns the stored record (without the plaintext key).
   */
  store(params: {
    userId: string;
    providerId: string;
    plaintextKey: string;
  }): Promise<ConnectedKeyRecord>;

  /**
   * Decrypt and return the plaintext key for a given record.
   * Only called server-side (cloud) or locally in the browser (local).
   */
  retrieve(params: {
    userId: string;
    keyId: string;
  }): Promise<string>;

  /**
   * Hard-delete a key record. This is a real, immediate, irreversible delete —
   * NOT a status flag update.
   */
  delete(params: {
    userId: string;
    keyId: string;
  }): Promise<void>;

  /**
   * List all key records for a user (metadata only, never plaintext).
   */
  list(params: {
    userId: string;
  }): Promise<ConnectedKeyRecord[]>;
}

// ---------------------------------------------------------------------------
// Key derivation input
// ---------------------------------------------------------------------------

export interface DeriveKeyParams {
  /** The application-level master secret (from env, 32+ bytes). */
  masterSecret: Buffer;
  /** The user's unique ID — used as HKDF info to make the derived key user-scoped. */
  userId: string;
}

// ---------------------------------------------------------------------------
// Encryption / decryption params
// ---------------------------------------------------------------------------

export interface EncryptParams {
  plaintext: string;
  /** 32-byte AES-256 key (derived per-user, never stored). */
  encryptionKey: Buffer;
}

export interface DecryptParams {
  payload: EncryptedPayload;
  /** 32-byte AES-256 key (derived per-user, never stored). */
  encryptionKey: Buffer;
}
