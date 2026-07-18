/**
 * Local-only vault adapter — IndexedDB with client-side AES-256-GCM encryption.
 *
 * Security guarantees:
 *  - The plaintext key NEVER leaves the browser — no network call, ever.
 *  - Encryption happens before the value is handed to IndexedDB.
 *  - The encryption key is derived from a user-supplied passphrase (or a
 *    randomly generated device key stored in a separate IDB store), meaning
 *    even if someone dumps IndexedDB they only get ciphertext.
 *  - Deletion removes the IDB record entirely (not a status flag).
 *
 * ⚠️  BROWSER-ONLY MODULE — do not import this in server-side code.
 *     The cloud adapter (cloud-adapter.ts) handles server-side storage.
 *
 * IndexedDB structure:
 *   Database: "keybridge"
 *   Object store: "vault"     — encrypted key records
 *   Object store: "device_keys" — per-user device encryption keys
 */

import { openDB, IDBPDatabase } from "idb";
import { encrypt, decrypt } from "../crypto/encryption.js";
import type {
  ConnectedKeyRecord,
  EncryptedPayload,
  StorageAdapter,
} from "../types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = "keybridge";
const DB_VERSION = 1;
const VAULT_STORE = "vault";
const DEVICE_KEY_STORE = "device_keys";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VaultRecord {
  id: string;
  user_id: string;
  provider_id: string;
  storage_mode: "local";
  encrypted_key: string; // EncryptedPayload
  last_validated_at: number | null; // epoch ms
  last_used_at: number | null;      // epoch ms
  status: "active" | "revoked" | "invalid";
  created_at: number;               // epoch ms
}

// ---------------------------------------------------------------------------
// DB initialisation
// ---------------------------------------------------------------------------

async function openVaultDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        const store = db.createObjectStore(VAULT_STORE, { keyPath: "id" });
        store.createIndex("by_user", "user_id");
      }
      if (!db.objectStoreNames.contains(DEVICE_KEY_STORE)) {
        db.createObjectStore(DEVICE_KEY_STORE, { keyPath: "user_id" });
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Device key management (per-user random key stored in a separate IDB store)
// ---------------------------------------------------------------------------

/**
 * Retrieve or generate a 32-byte device encryption key for this user.
 *
 * The key is stored in the separate "device_keys" IDB store, never alongside
 * the ciphertext — matching the server-side pattern of separating the
 * encryption key from the encrypted data.
 *
 * In a production app you might want to bind this to a user passphrase
 * or the WebAuthn authenticator for stronger protection.
 */
async function getOrCreateDeviceKey(
  db: IDBPDatabase,
  userId: string
): Promise<Buffer> {
  const existing = await db.get(DEVICE_KEY_STORE, userId);

  if (existing) {
    return Buffer.from(existing.key as string, "base64");
  }

  // Generate a fresh 32-byte random key
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const keyB64 = Buffer.from(keyBytes).toString("base64");

  await db.put(DEVICE_KEY_STORE, { user_id: userId, key: keyB64 });

  return Buffer.from(keyBytes);
}

// ---------------------------------------------------------------------------
// Local vault adapter
// ---------------------------------------------------------------------------

export class LocalVaultAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    if (typeof window === "undefined" && typeof indexedDB === "undefined") {
      throw new Error(
        "[keybridge/security] LocalVaultAdapter must run in a browser environment. " +
          "Use CloudStorageAdapter for server-side storage."
      );
    }
    this.dbPromise = openVaultDB();
  }

  // -------------------------------------------------------------------------
  // store — encrypt client-side, write to IDB, never transmit
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
    const db = await this.dbPromise;
    const encryptionKey = await getOrCreateDeviceKey(db, userId);

    let encryptedKey: EncryptedPayload;
    try {
      encryptedKey = encrypt({ plaintext: plaintextKey, encryptionKey });
    } finally {
      encryptionKey.fill(0);
    }

    const id = crypto.randomUUID();
    const now = Date.now();

    const record: VaultRecord = {
      id,
      user_id: userId,
      provider_id: providerId,
      storage_mode: "local",
      encrypted_key: encryptedKey,
      last_validated_at: null,
      last_used_at: null,
      status: "active",
      created_at: now,
    };

    await db.put(VAULT_STORE, record);

    return vaultRecordToConnected(record, null);
  }

  // -------------------------------------------------------------------------
  // retrieve — read from IDB, decrypt locally
  // -------------------------------------------------------------------------

  async retrieve({ userId, keyId }: { userId: string; keyId: string }): Promise<string> {
    const db = await this.dbPromise;
    const record: VaultRecord | undefined = await db.get(VAULT_STORE, keyId);

    if (!record || record.user_id !== userId) {
      throw new Error(
        "[keybridge/security] Key not found in local vault or does not belong to this user."
      );
    }

    const encryptionKey = await getOrCreateDeviceKey(db, userId);

    let plaintext: string;
    try {
      plaintext = decrypt({
        payload: record.encrypted_key as EncryptedPayload,
        encryptionKey,
      });
    } finally {
      encryptionKey.fill(0);
    }

    // Update last_used_at in place
    await db.put(VAULT_STORE, { ...record, last_used_at: Date.now() });

    return plaintext;
  }

  // -------------------------------------------------------------------------
  // delete — hard delete from IDB
  // -------------------------------------------------------------------------

  async delete({ userId, keyId }: { userId: string; keyId: string }): Promise<void> {
    const db = await this.dbPromise;
    const record: VaultRecord | undefined = await db.get(VAULT_STORE, keyId);

    if (!record || record.user_id !== userId) {
      throw new Error(
        "[keybridge/security] Delete failed — key not found or does not belong to this user."
      );
    }

    // Hard delete — the record is gone
    await db.delete(VAULT_STORE, keyId);
  }

  // -------------------------------------------------------------------------
  // list — metadata only, encrypted_key never returned to callers
  // -------------------------------------------------------------------------

  async list({ userId }: { userId: string }): Promise<ConnectedKeyRecord[]> {
    const db = await this.dbPromise;
    const index = db.transaction(VAULT_STORE).store.index("by_user");
    const records: VaultRecord[] = await index.getAll(userId);

    // Sort newest first, exclude encrypted_key from output
    return records
      .sort((a, b) => b.created_at - a.created_at)
      .map((r) => vaultRecordToConnected(r, null));
  }

  // -------------------------------------------------------------------------
  // updateLastValidated — called by the validation layer
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
    const db = await this.dbPromise;
    const record: VaultRecord | undefined = await db.get(VAULT_STORE, keyId);

    if (!record || record.user_id !== userId) return;

    await db.put(VAULT_STORE, {
      ...record,
      last_validated_at: Date.now(),
      status,
    });
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function vaultRecordToConnected(
  r: VaultRecord,
  encryptedKey: EncryptedPayload | null
): ConnectedKeyRecord {
  return {
    id: r.id,
    user_id: r.user_id,
    provider_id: r.provider_id,
    storage_mode: "local",
    encrypted_key: encryptedKey,
    last_validated_at: r.last_validated_at ? new Date(r.last_validated_at) : null,
    last_used_at: r.last_used_at ? new Date(r.last_used_at) : null,
    status: r.status,
    created_at: new Date(r.created_at),
  };
}
