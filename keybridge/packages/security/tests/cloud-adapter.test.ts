/**
 * Cloud adapter tests using a mock pg Pool.
 *
 * We don't spin up a real Postgres DB here — that belongs in integration tests.
 * Instead we mock Pool.query to capture what SQL and parameters the adapter
 * actually sends, and verify:
 *  1. The encrypted_key column never receives a plaintext key.
 *  2. RETURNING clauses never select encrypted_key.
 *  3. Delete uses DELETE, not UPDATE status.
 *  4. List never selects encrypted_key.
 *  5. retrieve() returns the correct plaintext after encrypt→store→retrieve cycle.
 */

import { CloudStorageAdapter } from "../src/adapters/cloud-adapter";
import { encrypt } from "../src/crypto/encryption";
import { deriveUserKey } from "../src/crypto/key-derivation";
import type { EncryptedPayload } from "../src/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MASTER_SECRET = Buffer.from("a".repeat(64), "hex"); // 32 bytes
const USER_ID = "user-test-123";
const PROVIDER_ID = "anthropic";
const PLAINTEXT_KEY = "sk-ant-api03-realApiKeyValueHere1234567890";

/** Build a mock Pool that records every query call */
function buildMockPool() {
  const calls: Array<{ text: string; values: unknown[] }> = [];

  // We need to return realistic data for SELECT queries
  const encryptionKey = deriveUserKey({ masterSecret: MASTER_SECRET, userId: USER_ID });
  const encryptedPayload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey });

  const mockPool = {
    query: jest.fn(async (text: string, values: unknown[]) => {
      calls.push({ text, values });

      // INSERT → return a row without encrypted_key
      if (text.trim().toUpperCase().startsWith("INSERT")) {
        return {
          rows: [{
            id: "key-id-001",
            user_id: USER_ID,
            provider_id: PROVIDER_ID,
            storage_mode: "cloud",
            last_validated_at: null,
            last_used_at: null,
            status: "active",
            created_at: new Date(),
          }],
          rowCount: 1,
        };
      }

      // SELECT encrypted_key → return the encrypted value
      if (text.includes("encrypted_key") && text.trim().toUpperCase().startsWith("SELECT")) {
        return {
          rows: [{ encrypted_key: encryptedPayload }],
          rowCount: 1,
        };
      }

      // SELECT list (no encrypted_key) → return metadata row
      if (text.trim().toUpperCase().startsWith("SELECT")) {
        return {
          rows: [{
            id: "key-id-001",
            user_id: USER_ID,
            provider_id: PROVIDER_ID,
            storage_mode: "cloud",
            last_validated_at: null,
            last_used_at: null,
            status: "active",
            created_at: new Date(),
          }],
          rowCount: 1,
        };
      }

      // DELETE → return rowCount 1
      if (text.trim().toUpperCase().startsWith("DELETE")) {
        return { rows: [], rowCount: 1 };
      }

      // UPDATE
      if (text.trim().toUpperCase().startsWith("UPDATE")) {
        return { rows: [], rowCount: 1 };
      }

      return { rows: [], rowCount: 0 };
    }),
    end: jest.fn(async () => {}),
    calls,
  };

  return mockPool;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CloudStorageAdapter.store()", () => {
  it("writes ciphertext, not plaintext, to the DB", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    await adapter.store({ userId: USER_ID, providerId: PROVIDER_ID, plaintextKey: PLAINTEXT_KEY });

    const insertCall = pool.calls.find((c: any) =>
      c.text.trim().toUpperCase().startsWith("INSERT")
    );
    expect(insertCall).toBeDefined();

    // The plaintext key must NEVER appear in any query parameter
    for (const value of insertCall.values) {
      expect(String(value)).not.toBe(PLAINTEXT_KEY);
      expect(String(value)).not.toContain(PLAINTEXT_KEY);
    }

    // The 4th parameter ($4) should be the encrypted payload — check it's not plaintext
    const encryptedParam = insertCall.values[3] as string;
    expect(encryptedParam).not.toBe(PLAINTEXT_KEY);
    expect(encryptedParam.split(".")).toHaveLength(3); // iv.authTag.ciphertext
  });

  it("does not include encrypted_key in RETURNING clause", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    await adapter.store({ userId: USER_ID, providerId: PROVIDER_ID, plaintextKey: PLAINTEXT_KEY });

    const insertCall = pool.calls.find((c: any) =>
      c.text.trim().toUpperCase().startsWith("INSERT")
    );
    // The RETURNING clause must not select encrypted_key back
    const returningSection = insertCall.text.toUpperCase().split("RETURNING")[1] ?? "";
    expect(returningSection).not.toContain("ENCRYPTED_KEY");
  });

  it("returns a record with null encrypted_key (never exposed to caller)", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    const record = await adapter.store({
      userId: USER_ID,
      providerId: PROVIDER_ID,
      plaintextKey: PLAINTEXT_KEY,
    });

    expect(record.encrypted_key).toBeNull();
    expect(record.storage_mode).toBe("cloud");
    expect(record.status).toBe("active");
  });
});

describe("CloudStorageAdapter.retrieve()", () => {
  it("decrypts and returns the correct plaintext key", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    const result = await adapter.retrieve({ userId: USER_ID, keyId: "key-id-001" });
    expect(result).toBe(PLAINTEXT_KEY);
  });

  it("scopes the SELECT to the authenticated user (user_id in WHERE)", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    await adapter.retrieve({ userId: USER_ID, keyId: "key-id-001" });

    const selectCall = pool.calls.find(
      (c: any) => c.text.includes("encrypted_key") && c.text.toUpperCase().startsWith("SELECT")
    );
    expect(selectCall).toBeDefined();
    // userId must be a bound parameter, not interpolated
    expect(selectCall.values).toContain(USER_ID);
    // The query must have user_id in the WHERE clause
    expect(selectCall.text.toLowerCase()).toContain("user_id");
  });
});

describe("CloudStorageAdapter.delete()", () => {
  it("issues a DELETE statement, not an UPDATE", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    await adapter.delete({ userId: USER_ID, keyId: "key-id-001" });

    const deleteCall = pool.calls.find((c: any) =>
      c.text.trim().toUpperCase().startsWith("DELETE")
    );
    expect(deleteCall).toBeDefined();

    // There must NOT be an UPDATE call for status
    const updateCall = pool.calls.find((c: any) =>
      c.text.trim().toUpperCase().startsWith("UPDATE") &&
      c.text.toLowerCase().includes("status")
    );
    expect(updateCall).toBeUndefined();
  });

  it("scopes the DELETE to the authenticated user", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    await adapter.delete({ userId: USER_ID, keyId: "key-id-001" });

    const deleteCall = pool.calls.find((c: any) =>
      c.text.trim().toUpperCase().startsWith("DELETE")
    );
    expect(deleteCall.values).toContain(USER_ID);
    expect(deleteCall.text.toLowerCase()).toContain("user_id");
  });

  it("throws when the pool returns rowCount 0 (key not found)", async () => {
    const pool = buildMockPool() as any;
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    await expect(
      adapter.delete({ userId: USER_ID, keyId: "nonexistent" })
    ).rejects.toThrow(/Delete failed/);
  });
});

describe("CloudStorageAdapter.list()", () => {
  it("never selects encrypted_key column", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    await adapter.list({ userId: USER_ID });

    const listCall = pool.calls.find(
      (c: any) =>
        c.text.trim().toUpperCase().startsWith("SELECT") &&
        !c.text.includes("encrypted_key")
    );
    expect(listCall).toBeDefined();

    // Double-check: none of the SELECT calls should include encrypted_key
    const allSelects = pool.calls.filter((c: any) =>
      c.text.trim().toUpperCase().startsWith("SELECT")
    );
    for (const sel of allSelects) {
      // Only the retrieve() path should ever touch encrypted_key
      // list() must never include it
      if (!sel.text.includes("WHERE id =")) {
        expect(sel.text).not.toContain("encrypted_key");
      }
    }
  });

  it("returns records with null encrypted_key", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    const records = await adapter.list({ userId: USER_ID });
    for (const record of records) {
      expect(record.encrypted_key).toBeNull();
    }
  });

  it("scopes to the authenticated user", async () => {
    const pool = buildMockPool() as any;
    const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

    await adapter.list({ userId: USER_ID });

    const selectCall = pool.calls.find((c: any) =>
      c.text.trim().toUpperCase().startsWith("SELECT")
    );
    expect(selectCall.values).toContain(USER_ID);
  });
});
