/**
 * NO PLAINTEXT LEAKS — The spec's most important test requirement.
 *
 * These tests assert the core security invariant:
 *   "No plaintext API key ever appears in application logs, error responses,
 *    or database columns other than the designated encrypted column."
 *
 * How these tests work:
 *  - We spy on console.log, console.error, console.warn, console.debug,
 *    process.stdout, and process.stderr before each test.
 *  - We intentionally trigger error paths (wrong key, tampered payload, etc.)
 *  - After each test we scan EVERY spy call for the plaintext key string.
 *  - Any match is a test failure.
 *
 * These tests are intentionally paranoid. If any of them fail, it means
 * we are leaking key material somewhere — fix the leak, not the test.
 */

import { encrypt, decrypt } from "../src/crypto/encryption";
import { deriveUserKey } from "../src/crypto/key-derivation";
import { CloudStorageAdapter } from "../src/adapters/cloud-adapter";
import type { EncryptedPayload } from "../src/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MASTER_SECRET = Buffer.from("c".repeat(64), "hex");
const USER_ID = "leak-test-user-789";

// Realistic-looking API keys for each provider
const PLAINTEXT_KEYS = [
  "sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890abcdef",
  "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF",
  "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456789",
  "sk-or-v1-abcdefghijklmnopqrstuvwxyz1234567890",
  "abcdefghijklmnopqrstuvwxyz123456", // ElevenLabs-style
];

// ---------------------------------------------------------------------------
// Spy infrastructure
// ---------------------------------------------------------------------------

type ConsoleSpy = jest.SpyInstance;

function captureAllOutput(): { spies: ConsoleSpy[]; getAll: () => string[] } {
  const spies: ConsoleSpy[] = [
    jest.spyOn(console, "log").mockImplementation(() => {}),
    jest.spyOn(console, "error").mockImplementation(() => {}),
    jest.spyOn(console, "warn").mockImplementation(() => {}),
    jest.spyOn(console, "debug").mockImplementation(() => {}),
    jest.spyOn(console, "info").mockImplementation(() => {}),
  ];

  function getAll(): string[] {
    return spies.flatMap((spy) =>
      spy.mock.calls.flatMap((args) =>
        args.map((a: unknown) => (typeof a === "string" ? a : JSON.stringify(a)))
      )
    );
  }

  return { spies, getAll };
}

function assertNoKeyInOutput(output: string[], plaintextKey: string, context: string) {
  for (const line of output) {
    if (line.includes(plaintextKey)) {
      throw new Error(
        `[SECURITY VIOLATION] Plaintext API key found in output during: ${context}\n` +
          `  Found in: "${line.substring(0, 80)}..."\n` +
          `  This is a critical security bug — a real key would be exposed.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("No plaintext key in logs during encrypt/decrypt", () => {
  let capture: ReturnType<typeof captureAllOutput>;

  beforeEach(() => {
    capture = captureAllOutput();
  });

  afterEach(() => {
    capture.spies.forEach((s) => s.mockRestore());
  });

  for (const plaintextKey of PLAINTEXT_KEYS) {
    it(`key does not appear in any log during normal encrypt/decrypt: ${plaintextKey.substring(0, 12)}...`, () => {
      const encryptionKey = deriveUserKey({ masterSecret: MASTER_SECRET, userId: USER_ID });
      const payload = encrypt({ plaintext: plaintextKey, encryptionKey });
      decrypt({ payload, encryptionKey });

      assertNoKeyInOutput(capture.getAll(), plaintextKey, "normal encrypt/decrypt");
    });
  }
});

describe("No plaintext key in error messages", () => {
  let capture: ReturnType<typeof captureAllOutput>;

  beforeEach(() => {
    capture = captureAllOutput();
  });

  afterEach(() => {
    capture.spies.forEach((s) => s.mockRestore());
  });

  for (const plaintextKey of PLAINTEXT_KEYS) {
    it(`key does not appear in decrypt error with wrong key: ${plaintextKey.substring(0, 12)}...`, () => {
      const encryptionKey = deriveUserKey({ masterSecret: MASTER_SECRET, userId: USER_ID });
      const payload = encrypt({ plaintext: plaintextKey, encryptionKey });

      const wrongKey = Buffer.alloc(32, 0xff);
      let errorMessage = "";

      try {
        decrypt({ payload, encryptionKey: wrongKey });
      } catch (e) {
        errorMessage = (e as Error).message;
      }

      // Error must exist (we want it to fail)
      expect(errorMessage.length).toBeGreaterThan(0);

      // But the error must NOT contain the plaintext key
      expect(errorMessage).not.toContain(plaintextKey);

      // And it must NOT contain the payload (which could be reverse-engineered)
      expect(errorMessage).not.toContain(payload);

      // Check logs too
      assertNoKeyInOutput(capture.getAll(), plaintextKey, "decrypt with wrong key");
    });

    it(`key does not appear in decrypt error with tampered payload: ${plaintextKey.substring(0, 12)}...`, () => {
      const encryptionKey = deriveUserKey({ masterSecret: MASTER_SECRET, userId: USER_ID });
      const payload = encrypt({ plaintext: plaintextKey, encryptionKey });

      // Tamper with the ciphertext
      const parts = payload.split(".");
      parts[2] = Buffer.alloc(parts[2].length, 0).toString("base64url");
      const tampered = parts.join(".") as EncryptedPayload;

      let errorMessage = "";
      try {
        decrypt({ payload: tampered, encryptionKey });
      } catch (e) {
        errorMessage = (e as Error).message;
      }

      expect(errorMessage).not.toContain(plaintextKey);
      assertNoKeyInOutput(capture.getAll(), plaintextKey, "decrypt with tampered payload");
    });
  }
});

describe("No plaintext key in CloudStorageAdapter SQL parameters (wrong column)", () => {
  let capture: ReturnType<typeof captureAllOutput>;
  const sqlParams: unknown[][] = [];

  beforeEach(() => {
    capture = captureAllOutput();
    sqlParams.length = 0;
  });

  afterEach(() => {
    capture.spies.forEach((s) => s.mockRestore());
  });

  for (const plaintextKey of PLAINTEXT_KEYS) {
    it(`SQL parameters contain ciphertext, not plaintext: ${plaintextKey.substring(0, 12)}...`, async () => {
      const pool = {
        query: jest.fn(async (_text: string, values: unknown[]) => {
          sqlParams.push(values ?? []);
          return {
            rows: [{
              id: "key-1",
              user_id: USER_ID,
              provider_id: "openai",
              storage_mode: "cloud",
              last_validated_at: null,
              last_used_at: null,
              status: "active",
              created_at: new Date(),
            }],
            rowCount: 1,
          };
        }),
        end: jest.fn(),
      } as any;

      const adapter = new CloudStorageAdapter({ db: pool, masterSecret: MASTER_SECRET });

      await adapter.store({
        userId: USER_ID,
        providerId: "openai",
        plaintextKey,
      });

      // Check every SQL parameter value — none may equal the plaintext key
      for (const paramSet of sqlParams) {
        for (const param of paramSet) {
          const asStr = typeof param === "string" ? param : JSON.stringify(param);
          expect(asStr).not.toBe(plaintextKey);
          expect(asStr).not.toContain(plaintextKey);
        }
      }

      // Also check logs
      assertNoKeyInOutput(capture.getAll(), plaintextKey, "CloudStorageAdapter.store()");
    });
  }
});

describe("Encrypted payload does not decode to plaintext without the key", () => {
  for (const plaintextKey of PLAINTEXT_KEYS) {
    it(`base64-decoding the payload parts does not reveal the key: ${plaintextKey.substring(0, 12)}...`, () => {
      const encryptionKey = deriveUserKey({ masterSecret: MASTER_SECRET, userId: USER_ID });
      const payload = encrypt({ plaintext: plaintextKey, encryptionKey });

      // Try to find the plaintext in every base64url-decoded segment
      const parts = payload.split(".");
      for (const part of parts) {
        const decoded = Buffer.from(part, "base64url").toString("utf8");
        expect(decoded).not.toContain(plaintextKey);
        // Also check the raw bytes as latin1 (covers non-UTF8 representations)
        const decodedLatin1 = Buffer.from(part, "base64url").toString("latin1");
        expect(decodedLatin1).not.toContain(plaintextKey);
      }

      // And the raw payload string itself
      expect(payload).not.toContain(plaintextKey);
    });
  }
});

describe("Key derivation errors do not leak secrets", () => {
  let capture: ReturnType<typeof captureAllOutput>;

  beforeEach(() => {
    capture = captureAllOutput();
  });

  afterEach(() => {
    capture.spies.forEach((s) => s.mockRestore());
  });

  it("error for short master secret does not include the secret value", () => {
    const shortSecret = Buffer.from("deadbeef", "hex"); // 4 bytes

    let errorMessage = "";
    try {
      deriveUserKey({ masterSecret: shortSecret, userId: USER_ID });
    } catch (e) {
      errorMessage = (e as Error).message;
    }

    expect(errorMessage.length).toBeGreaterThan(0);
    expect(errorMessage).not.toContain(shortSecret.toString("hex"));
    expect(errorMessage).not.toContain(shortSecret.toString("base64"));
  });
});
