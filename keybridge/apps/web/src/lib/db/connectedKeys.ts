/**
 * connectedKeys.ts
 *
 * Database queries for the connected_keys table, scoped to what the
 * injection API needs. All queries enforce ownership — every lookup
 * includes BOTH the key id/provider AND the user_id, so a user can
 * never accidentally retrieve another user's key even if they know the
 * row id.
 *
 * Schema (from spec section 5):
 *
 *   connected_keys (
 *     id, user_id, provider_id,
 *     storage_mode,    -- 'cloud' | 'local'
 *     encrypted_key,   -- null when storage_mode = 'local'
 *     last_validated_at, last_used_at,
 *     status,          -- 'active' | 'revoked' | 'invalid'
 *     created_at
 *   )
 */

import { Pool } from "pg";

// Module-level pool; Next.js hot-reloads keep this alive between requests
// in development. In production it is created once per process.
let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "[db] DATABASE_URL is not set. Add it to .env.local."
      );
    }
    _pool = new Pool({ connectionString });
  }
  return _pool;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StorageMode = "cloud" | "local";
export type KeyStatus = "active" | "revoked" | "invalid";

export interface ConnectedKeyRow {
  id: string;
  user_id: string;
  provider_id: string;
  storage_mode: StorageMode;
  /**
   * Null when storage_mode = 'local' — the key never left the browser
   * and cannot be retrieved server-side.
   */
  encrypted_key: string | null;
  last_validated_at: Date | null;
  last_used_at: Date | null;
  status: KeyStatus;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches a single connected_key row, scoped to both the user and the
 * provider. Returns null when:
 *   - No row matches (unknown key, wrong user, wrong provider)
 *   - The key exists but belongs to a different user (ownership guard)
 *
 * This is intentionally indistinguishable from "not found" to the caller
 * — we never tell a caller WHY we couldn't find a key they don't own.
 */
export async function findKeyByOwner(
  userId: string,
  providerId: string
): Promise<ConnectedKeyRow | null> {
  const pool = getPool();

  const result = await pool.query<ConnectedKeyRow>(
    `SELECT
       id, user_id, provider_id, storage_mode,
       encrypted_key, last_validated_at, last_used_at,
       status, created_at
     FROM connected_keys
     WHERE user_id = $1
       AND provider_id = $2
     LIMIT 1`,
    [userId, providerId]
  );

  return result.rows[0] ?? null;
}

/**
 * Stamps last_used_at = NOW() on a key row. Called after every
 * successful decryption and key return — this is what populates the
 * "last used" column in the Security Dashboard.
 *
 * The WHERE clause includes user_id as a second ownership check, making
 * it impossible to stamp a row that doesn't belong to the caller's user.
 */
export async function touchLastUsed(
  keyId: string,
  userId: string
): Promise<void> {
  const pool = getPool();

  await pool.query(
    `UPDATE connected_keys
     SET last_used_at = NOW()
     WHERE id = $1
       AND user_id = $2`,
    [keyId, userId]
  );
}

// ------------------------------------
/**
 * Fetches all connected_key rows for a user, for display in the Security
 * Dashboard. Intentionally excludes encrypted_key — the dashboard never
 * needs the ciphertext, and we never select it unless decryption is required.
 */
export async function listKeysByUser(
  userId: string
): Promise<Omit<ConnectedKeyRow, 'encrypted_key'>[]> {
  const pool = getPool();

  const result = await pool.query<Omit<ConnectedKeyRow, 'encrypted_key'>>(
    `SELECT
       id, user_id, provider_id, storage_mode,
       last_validated_at, last_used_at,
       status, created_at
     FROM connected_keys
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}

/**
 * Permanently deletes a key row by ID, scoped to the authenticated user.
 * The WHERE clause includes user_id so a user can never delete another
 * user's key even if they know the row ID.
 *
 * SPEC: this is a hard DELETE — not a status flag update. (section 2)
 */
export async function deleteKeyByOwner(
  keyId: string,
  userId: string
): Promise<void> {
  const pool = getPool();

  await pool.query(
    `DELETE FROM connected_keys
     WHERE id = $1
       AND user_id = $2`,
    [keyId, userId]
  );
}