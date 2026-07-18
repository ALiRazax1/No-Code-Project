import { encrypt, decrypt, isEncryptedPayload } from "../src/crypto/encryption";
import type { EncryptedPayload } from "../src/types";

// 32-byte key for tests
const KEY = Buffer.alloc(32, 0xab);

// A realistic-looking API key to use as plaintext
const PLAINTEXT_KEY = "sk-ant-api03-testApiKeyValue1234567890abcdef";

describe("encrypt", () => {
  it("returns a string with three dot-separated parts", () => {
    const payload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    const parts = payload.split(".");
    expect(parts).toHaveLength(3);
  });

  it("each part is non-empty base64url", () => {
    const payload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    const b64url = /^[A-Za-z0-9_-]+$/;
    payload.split(".").forEach((part) => {
      expect(part.length).toBeGreaterThan(0);
      expect(b64url.test(part)).toBe(true);
    });
  });

  it("produces a different ciphertext every call (random IV)", () => {
    const a = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    const b = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    expect(a).not.toBe(b);
  });

  it("does NOT include the plaintext in the output", () => {
    const payload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    expect(payload).not.toContain(PLAINTEXT_KEY);
    // Also ensure individual segments don't contain the key
    payload.split(".").forEach((part) => {
      const decoded = Buffer.from(part, "base64url").toString("utf8");
      expect(decoded).not.toContain(PLAINTEXT_KEY);
    });
  });

  it("throws if key is not 32 bytes", () => {
    const shortKey = Buffer.alloc(16, 0xab);
    expect(() =>
      encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: shortKey })
    ).toThrow(/32-byte key/);
  });

  it("encrypts empty string without error", () => {
    expect(() => encrypt({ plaintext: "", encryptionKey: KEY })).not.toThrow();
  });

  it("encrypts unicode without error", () => {
    expect(() =>
      encrypt({ plaintext: "🔑 unicode key: café", encryptionKey: KEY })
    ).not.toThrow();
  });
});

describe("decrypt", () => {
  it("round-trips correctly", () => {
    const payload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    const result = decrypt({ payload, encryptionKey: KEY });
    expect(result).toBe(PLAINTEXT_KEY);
  });

  it("round-trips empty string", () => {
    const payload = encrypt({ plaintext: "", encryptionKey: KEY });
    expect(decrypt({ payload, encryptionKey: KEY })).toBe("");
  });

  it("round-trips unicode", () => {
    const text = "🔑 unicode key: café";
    const payload = encrypt({ plaintext: text, encryptionKey: KEY });
    expect(decrypt({ payload, encryptionKey: KEY })).toBe(text);
  });

  it("throws if key is wrong (auth tag mismatch)", () => {
    const payload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    const wrongKey = Buffer.alloc(32, 0xcd);
    expect(() => decrypt({ payload, encryptionKey: wrongKey })).toThrow(
      /authentication failed/
    );
  });

  it("throws if payload is tampered (ciphertext modified)", () => {
    const payload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    // Flip a character in the ciphertext part (index 2)
    const parts = payload.split(".");
    parts[2] = parts[2].split("").reverse().join(""); // reverse ciphertext bytes
    const tampered = parts.join(".") as EncryptedPayload;
    expect(() => decrypt({ payload: tampered, encryptionKey: KEY })).toThrow();
  });

  it("throws on malformed payload (wrong number of parts)", () => {
    expect(() =>
      decrypt({ payload: "onlyone" as EncryptedPayload, encryptionKey: KEY })
    ).toThrow(/malformed payload/);
  });

  it("throws if key is not 32 bytes", () => {
    const payload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    const shortKey = Buffer.alloc(16, 0xab);
    expect(() => decrypt({ payload, encryptionKey: shortKey })).toThrow(/32-byte key/);
  });

  it("error message does not contain the payload string", () => {
    const payload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    const wrongKey = Buffer.alloc(32, 0xcd);
    let errorMessage = "";
    try {
      decrypt({ payload, encryptionKey: wrongKey });
    } catch (e) {
      errorMessage = (e as Error).message;
    }
    // The error must not leak the encrypted payload
    expect(errorMessage).not.toContain(payload);
    // And definitely not the plaintext
    expect(errorMessage).not.toContain(PLAINTEXT_KEY);
  });
});

describe("isEncryptedPayload", () => {
  it("returns true for a valid payload", () => {
    const payload = encrypt({ plaintext: PLAINTEXT_KEY, encryptionKey: KEY });
    expect(isEncryptedPayload(payload)).toBe(true);
  });

  it("returns false for a plain string", () => {
    expect(isEncryptedPayload("sk-ant-not-encrypted")).toBe(false);
  });

  it("returns false for non-strings", () => {
    expect(isEncryptedPayload(null)).toBe(false);
    expect(isEncryptedPayload(42)).toBe(false);
    expect(isEncryptedPayload({})).toBe(false);
  });

  it("returns false for a two-part string", () => {
    expect(isEncryptedPayload("abc.def")).toBe(false);
  });

  it("returns false if any part contains non-base64url chars", () => {
    expect(isEncryptedPayload("ab+c.def.ghi")).toBe(false);
  });
});
