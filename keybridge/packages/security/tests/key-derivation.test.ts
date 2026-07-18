import { deriveUserKey, masterSecretFromEnv } from "../src/crypto/key-derivation";

const VALID_SECRET = Buffer.from("a".repeat(64), "hex"); // 32-byte hex → 32 bytes

describe("deriveUserKey", () => {
  it("returns a 32-byte Buffer", () => {
    const key = deriveUserKey({ masterSecret: VALID_SECRET, userId: "user-1" });
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it("produces the same key for the same (secret, userId) pair", () => {
    const a = deriveUserKey({ masterSecret: VALID_SECRET, userId: "user-abc" });
    const b = deriveUserKey({ masterSecret: VALID_SECRET, userId: "user-abc" });
    expect(a.equals(b)).toBe(true);
  });

  it("produces different keys for different users", () => {
    const a = deriveUserKey({ masterSecret: VALID_SECRET, userId: "user-1" });
    const b = deriveUserKey({ masterSecret: VALID_SECRET, userId: "user-2" });
    expect(a.equals(b)).toBe(false);
  });

  it("produces different keys for different master secrets", () => {
    const secret2 = Buffer.from("b".repeat(64), "hex");
    const a = deriveUserKey({ masterSecret: VALID_SECRET, userId: "user-1" });
    const b = deriveUserKey({ masterSecret: secret2, userId: "user-1" });
    expect(a.equals(b)).toBe(false);
  });

  it("throws if masterSecret is shorter than 16 bytes", () => {
    const shortSecret = Buffer.alloc(8, 0);
    expect(() =>
      deriveUserKey({ masterSecret: shortSecret, userId: "user-1" })
    ).toThrow(/at least 16 bytes/);
  });

  it("throws if userId is empty", () => {
    expect(() =>
      deriveUserKey({ masterSecret: VALID_SECRET, userId: "" })
    ).toThrow(/non-empty/);
  });

  it("throws if userId is only whitespace", () => {
    expect(() =>
      deriveUserKey({ masterSecret: VALID_SECRET, userId: "   " })
    ).toThrow(/non-empty/);
  });
});

describe("masterSecretFromEnv", () => {
  it("parses a valid hex string", () => {
    const buf = masterSecretFromEnv("a".repeat(64));
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBe(32);
  });

  it("throws if env var is undefined", () => {
    expect(() => masterSecretFromEnv(undefined)).toThrow(/not set/);
  });

  it("throws if the hex string is too short", () => {
    expect(() => masterSecretFromEnv("aabb")).toThrow(/fewer than 16 bytes/);
  });
});
