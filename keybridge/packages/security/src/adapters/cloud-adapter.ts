/**
 * Cloud storage adapter — Postgres (Supabase / Neon / any pg-compatible DB).
 *
 * Security guarantees:
 *  - Only the EncryptedPayload is ever written to the DB.
 *  - The plaintext key is encrypted BEFORE this adapter does anything.
 *  - Deletion is a hard DELETE — not a status-flag update.
 *  - retrieve() is intentionally explicit: callers must ask for decryption;
 *    list() never returns the encrypted_key column.
 *  - The adapter never logs the plaintext key or any value that could contain it.
 */

import { Pool, PoolConfig } from "pg";
import { encrypt, decrypt } from "../crypto/encryption.js";
import { deriveUserKey, masterSecretFromEnv } from "../crypto/key-derivation.js";
import type {
  ConnectedKeyRecord,
  EncryptedPayload,
  StorageAdapter,
} from "../types.js";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Duck-typed pool interface so tests can inject mock pools without instanceof checks. */
export interface PoolLike {
  query(text: string, values?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
  end(): Promise<void>;
}

export interface CloudAdapterConfig {
  /**
   * A node-postgres Pool instance, a PoolConfig to create one internally,
   * or any object satisfying PoolLike (useful for testing with mock pools).
   */
  db: PoolLike | PoolConfig;

  /**
   * The application master secret used for key derivation.
   * Pass Buffer directly, or omit to auto-read KEYBRIDGE_MASTER_SECRET from env.
   */
  masterSecret?: Buffer;
}

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

export class CloudStorageAdapter implements StorageAdapter {
  private readonly pool: PoolLike;
  private readonly masterSecret: Buffer;

  constructor(config: CloudAdapterConfig) {
    // Duck-type check: if the passed object has a `query` method, treat it as a pool.
    // Otherwise treat it as a PoolConfig and create a Pool from it.
    // This allows test code to inject mock pools without needing a real Postgres connection.
    this.pool =
      typeof (config.db as PoolLike).query === "function"
        ? (config.db as PoolLike)
        : new Pool(config.db as PoolConfig);
    this.masterSecret =
      config.masterSecret ?? masterSecretFromEnv(process.env.KEYBRIDGE_MASTER_SECRET);
  }

  // -------------------------------------------------------------------------
  // store — encrypt then insert
  // -------------------------------------------------------------------------

  async store({
    userId,
    providerId,
    plaintextKey,
  }: {
    userId: string;
    providerId: string;
    plaintextKey: string;
  }): Promise<ConnectedKeyRecord> {
    // 1. Derive user-scoped encryption key (never stored)
    const encryptionKey = deriveUserKey({ masterSecret: this.masterSecret, userId });

    // 2. Encrypt — the plaintext key is not used after this line
    const encryptedKey = encrypt({ plaintext: plaintextKey, encryptionKey });

    // 3. Zero the derived key buffer (best-effort)
    encryptionKey.fill(0);

    // 4. Write only ciphertext to the database
    const id = randomUUID();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO connected_keys
         (id, user_id, provider_id, storage_mode, encrypted_key,
          last_validated_at, last_used_at, status, created_at)
       VALUES ($1, $2, $3, 'cloud', $4, NULL, NULL, 'active', $5)
       RETURNING id, user_id, provider_id, storage_mode,
                 last_validated_at, last_used_at, status, created_at`,
      [id, userId, providerId, encryptedKey, now]
    );

    // NOTE: encrypted_key is intentionally excluded from the RETURNING clause
    // so it never appears in application memory beyond what's needed.
    return rowToRecord(result.rows[0] as DbRow, null);
  }

  // -------------------------------------------------------------------------
  // retrieve — fetch encrypted_key, decrypt, return plaintext
  // -------------------------------------------------------------------------

  async retrieve({ userId, keyId }: { userId: string; keyId: string }): Promise<string> {
    // Scope to the authenticated user — a user can ONLY retrieve their own key
    const result = await this.pool.query(
      `SELECT encrypted_key
         FROM connected_keys
        WHERE id = $1
          AND user_id = $2
          AND storage_mode = 'cloud'
          AND status = 'active'`,
      [keyId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error(
        "[keybridge/security] Key not found or does not belong to this user."
      );
    }

    const encryptionKey = deriveUserKey({ masterSecret: this.masterSecret, userId });

    let plaintext: string;
    try {
      plaintext = decrypt({
        payload: (result.rows[0] as { encrypted_key: string }).encrypted_key as EncryptedPayload,
        encryptionKey,
      });
    } finally {
      encryptionKey.fill(0);
    }

    return plaintext;
  }

  // -------------------------------------------------------------------------
  // delete — hard DELETE, not a status flag
  // -------------------------------------------------------------------------

  async delete({ userId, keyId }: { userId: string; keyId: string }): Promise<void> {
    // Scope to user — prevents deleting someone else's key
    const result = await this.pool.query(
      `DELETE FROM connected_keys
        WHERE id = $1
          AND user_id = $2`,
      [keyId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error(
        "[keybridge/security] Delete failed — key not found or does not belong to this user."
      );
    }

    // rowCount > 0 means it's gone. No soft-delete, no status update.
  }

  // -------------------------------------------------------------------------
  // list — metadata only, encrypted_key column never selected
  // -------------------------------------------------------------------------

  async list({ userId }: { userId: string }): Promise<ConnectedKeyRecord[]> {
    const result = await this.pool.query(
      `SELECT id, user_id, provider_id, storage_mode,
              last_validated_at, last_used_at, status, created_at
         FROM connected_keys
        WHERE user_id = $1
        ORDER BY created_at DESC`,
      [userId]
    );

    // encrypted_key is NOT selected — it never touches application memory here
    return result.rows.map((row) => rowToRecord(row as DbRow, null));
  }

  // -------------------------------------------------------------------------
  // updateLastUsed — called by the injection API after successful retrieval
  // -------------------------------------------------------------------------

  async updateLastUsed({ userId, keyId }: { userId: string; keyId: string }): Promise<void> {
    await this.pool.query(
      `UPDATE connected_keys
          SET last_used_at = NOW()
        WHERE id = $1
          AND user_id = $2`,
      [keyId, userId]
    );
  }

  // -------------------------------------------------------------------------
  // updateLastValidated — called by the validation service
  // -------------------------------------------------------------------------

  async updateLastValidated({
    userId,
    keyId,
    status,
  }: {
    userId: string;
    keyId: string;
    status: "active" | "invalid";
  }): Promise<void> {
    await this.pool.query(
      `UPDATE connected_keys
          SET last_validated_at = NOW(), status = $3
        WHERE id = $1
          AND user_id = $2`,
      [keyId, userId, status]
    );
  }

  // -------------------------------------------------------------------------
  // close — release the pool (useful in tests / lambda teardown)
  // -------------------------------------------------------------------------

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// ---------------------------------------------------------------------------
// Re-export Pool for consumers who need to create one
// ---------------------------------------------------------------------------
export { Pool };

// ---------------------------------------------------------------------------
// Migration helper — exported so consuming apps can run it at startup
// ---------------------------------------------------------------------------

/**
 * Creates the required tables if they do not already exist.
 * Safe to call on every startup (idempotent).
 */
export async function runMigrations(pool: PoolLike): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       TEXT UNIQUE NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS connected_keys (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id        TEXT NOT NULL,
      storage_mode       TEXT NOT NULL CHECK (storage_mode IN ('cloud', 'local')),
      encrypted_key      TEXT,        -- NULL when storage_mode = 'local'
      last_validated_at  TIMESTAMPTZ,
      last_used_at       TIMESTAMPTZ,
      status             TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'revoked', 'invalid')),
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      -- A user can have at most one active cloud key per provider
      CONSTRAINT uq_user_provider UNIQUE (user_id, provider_id, status)
    );

    -- Index for fast user-scoped lookups
    CREATE INDEX IF NOT EXISTS idx_connected_keys_user_id
      ON connected_keys (user_id);
  `);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface DbRow {
  id: string;
  user_id: string;
  provider_id: string;
  storage_mode: string;
  last_validated_at: Date | null;
  last_used_at: Date | null;
  status: string;
  created_at: Date;
}

function rowToRecord(row: DbRow, encryptedKey: EncryptedPayload | null): ConnectedKeyRecord {
  return {
    id: row.id,
    user_id: row.user_id,
    provider_id: row.provider_id,
    storage_mode: row.storage_mode as "cloud" | "local",
    encrypted_key: encryptedKey,
    last_validated_at: row.last_validated_at,
    last_used_at: row.last_used_at,
    status: row.status as "active" | "revoked" | "invalid",
    created_at: row.created_at,
  };
}
