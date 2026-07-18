/**
 * retrieveKey.test.ts
 *
 * Tests for Track 5 — the Injection API.
 *
 * Test surface covers:
 *   A. tokenAuth          — header validation, timing-safe comparison
 *   B. retrieveKey()      — all result codes, ownership, decrypt path
 *   C. Route handler      — HTTP contract: methods, status codes, body shape
 *   D. Security invariant — plaintext key never appears in logs or errors
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { validateInternalToken } from "../../lib/injection/tokenAuth";
import { retrieveKey } from "../../lib/injection/retrieveKey";

// ---------------------------------------------------------------------------
// Shared test secret (matches min-32-char requirement)
// ---------------------------------------------------------------------------
const TEST_SECRET = "test-secret-that-is-long-enough-32chars";
const TEST_KEY_PLAINTEXT = "sk-realOpenAIkeyValueGoesHere1234";

// ---------------------------------------------------------------------------
// Mock @keybridge/security
// ---------------------------------------------------------------------------
vi.mock("@keybridge/security", () => ({
  deriveUserKey: vi.fn(async () => Buffer.from("fake-derived-key")),
  decrypt: vi.fn(async () => TEST_KEY_PLAINTEXT),
}));

// ---------------------------------------------------------------------------
// Mock DB layer
// ---------------------------------------------------------------------------
vi.mock("../../lib/db/connectedKeys", () => ({
  findKeyByOwner: vi.fn(),
  touchLastUsed: vi.fn(async () => undefined),
}));

import { findKeyByOwner, touchLastUsed } from "../../lib/db/connectedKeys";
import { deriveUserKey, decrypt } from "@keybridge/security";

const mockFindKey = vi.mocked(findKeyByOwner);
const mockTouch = vi.mocked(touchLastUsed);
const mockDecrypt = vi.mocked(decrypt);
const mockDeriveKey = vi.mocked(deriveUserKey);

// Helper: build a realistic connected_keys row
function makeRow(overrides: Partial<Parameters<typeof mockFindKey>[0]> & Record<string, unknown> = {}) {
  return {
    id: "key-uuid-001",
    user_id: "user-uuid-abc",
    provider_id: "openai",
    storage_mode: "cloud" as const,
    encrypted_key: "encrypted::ciphertext::here",
    last_validated_at: new Date(),
    last_used_at: null,
    status: "active" as const,
    created_at: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A. tokenAuth
// ---------------------------------------------------------------------------
describe("A. validateInternalToken", () => {
  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_SECRET;
  });

  it("returns ok=true when the header matches the env secret", () => {
    const headers = new Headers({ "x-internal-token": TEST_SECRET });
    expect(validateInternalToken(headers)).toEqual({ ok: true });
  });

  it("returns missing_token when header is absent", () => {
    const headers = new Headers();
    const result = validateInternalToken(headers);
    expect(result).toEqual({ ok: false, reason: "missing_token" });
  });

  it("returns invalid_token when header value is wrong", () => {
    const headers = new Headers({ "x-internal-token": "wrong-secret" });
    const result = validateInternalToken(headers);
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("returns misconfigured when INTERNAL_API_SECRET is not set", () => {
    delete process.env.INTERNAL_API_SECRET;
    const headers = new Headers({ "x-internal-token": TEST_SECRET });
    const result = validateInternalToken(headers);
    expect(result).toEqual({ ok: false, reason: "misconfigured" });
  });

  it("returns misconfigured when INTERNAL_API_SECRET is shorter than 32 chars", () => {
    process.env.INTERNAL_API_SECRET = "tooshort";
    const headers = new Headers({ "x-internal-token": "tooshort" });
    const result = validateInternalToken(headers);
    expect(result).toEqual({ ok: false, reason: "misconfigured" });
  });

  it("rejects a token that is a prefix of the real secret", () => {
    const headers = new Headers({ "x-internal-token": TEST_SECRET.slice(0, 10) });
    const result = validateInternalToken(headers);
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("rejects a token that is the real secret with extra characters appended", () => {
    const headers = new Headers({ "x-internal-token": TEST_SECRET + "extra" });
    const result = validateInternalToken(headers);
    expect(result).toEqual({ ok: false, reason: "invalid_token" });
  });
});

// ---------------------------------------------------------------------------
// B. retrieveKey()
// ---------------------------------------------------------------------------
describe("B. retrieveKey()", () => {
  beforeEach(() => {
    process.env.MASTER_ENCRYPTION_SECRET = "master-secret-that-is-32-chars-ok";
    mockFindKey.mockReset();
    mockTouch.mockReset();
    mockDecrypt.mockReset();
    mockDeriveKey.mockReset();
    mockDecrypt.mockResolvedValue(TEST_KEY_PLAINTEXT);
    mockDeriveKey.mockResolvedValue(Buffer.from("fake-derived-key"));
    mockTouch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.MASTER_ENCRYPTION_SECRET;
  });

  it("returns success and the decrypted key for a valid active cloud key", async () => {
    mockFindKey.mockResolvedValue(makeRow());

    const result = await retrieveKey("user-uuid-abc", "openai");

    expect(result).toEqual({ success: true, key: TEST_KEY_PLAINTEXT });
  });

  it("calls touchLastUsed after a successful retrieval", async () => {
    mockFindKey.mockResolvedValue(makeRow());

    await retrieveKey("user-uuid-abc", "openai");

    expect(mockTouch).toHaveBeenCalledOnce();
    expect(mockTouch).toHaveBeenCalledWith("key-uuid-001", "user-uuid-abc");
  });

  it("returns not_found when no row exists", async () => {
    mockFindKey.mockResolvedValue(null);

    const result = await retrieveKey("user-uuid-abc", "openai");

    expect(result).toEqual({ success: false, code: "not_found" });
  });

  it("returns local_only for a local-mode key", async () => {
    mockFindKey.mockResolvedValue(
      makeRow({ storage_mode: "local", encrypted_key: null })
    );

    const result = await retrieveKey("user-uuid-abc", "openai");

    expect(result).toEqual({ success: false, code: "local_only" });
  });

  it("returns local_only when encrypted_key is null even if storage_mode is cloud (corrupt row)", async () => {
    // Defensive: treat null encrypted_key as local_only regardless of storage_mode
    mockFindKey.mockResolvedValue(
      makeRow({ storage_mode: "cloud", encrypted_key: null })
    );

    const result = await retrieveKey("user-uuid-abc", "openai");

    expect(result).toEqual({ success: false, code: "local_only" });
  });

  it("returns key_inactive for a revoked key", async () => {
    mockFindKey.mockResolvedValue(makeRow({ status: "revoked" }));

    const result = await retrieveKey("user-uuid-abc", "openai");

    expect(result).toEqual({ success: false, code: "key_inactive" });
  });

  it("returns key_inactive for an invalid key", async () => {
    mockFindKey.mockResolvedValue(makeRow({ status: "invalid" }));

    const result = await retrieveKey("user-uuid-abc", "openai");

    expect(result).toEqual({ success: false, code: "key_inactive" });
  });

  it("returns decrypt_failed when decryption throws", async () => {
    mockFindKey.mockResolvedValue(makeRow());
    mockDecrypt.mockRejectedValue(new Error("bad decrypt"));

    const result = await retrieveKey("user-uuid-abc", "openai");

    expect(result).toEqual({ success: false, code: "decrypt_failed" });
  });

  it("returns misconfigured when MASTER_ENCRYPTION_SECRET is not set", async () => {
    delete process.env.MASTER_ENCRYPTION_SECRET;
    mockFindKey.mockResolvedValue(makeRow());

    const result = await retrieveKey("user-uuid-abc", "openai");

    expect(result).toEqual({ success: false, code: "misconfigured" });
  });

  it("does NOT call touchLastUsed when retrieval fails", async () => {
    mockFindKey.mockResolvedValue(null);

    await retrieveKey("user-uuid-abc", "openai");

    expect(mockTouch).not.toHaveBeenCalled();
  });

  it("still returns success even if touchLastUsed throws (best-effort stamp)", async () => {
    mockFindKey.mockResolvedValue(makeRow());
    mockTouch.mockRejectedValue(new Error("DB write failed"));

    const result = await retrieveKey("user-uuid-abc", "openai");

    // The caller gets the key even if the timestamp update failed
    expect(result).toEqual({ success: true, key: TEST_KEY_PLAINTEXT });
  });

  it("passes the userId to deriveUserKey (not the provider id or key)", async () => {
    mockFindKey.mockResolvedValue(makeRow());

    await retrieveKey("user-uuid-abc", "openai");

    expect(mockDeriveKey).toHaveBeenCalledWith(
      "user-uuid-abc",
      expect.any(String) // master secret — we don't assert its value in tests
    );
    // Ensure the plaintext key was NOT passed into deriveUserKey
    const callArgs = mockDeriveKey.mock.calls[0];
    expect(callArgs[0]).not.toContain("sk-");
  });
});

// ---------------------------------------------------------------------------
// C. Route handler — HTTP contract
// ---------------------------------------------------------------------------
describe("C. Route handler HTTP contract", () => {
  // Import the route handler after mocks are registered
  // (dynamic import keeps module resolution correct)
  async function callRoute(options: {
    method?: string;
    token?: string;
    body?: unknown;
  }) {
    const { POST, GET } = await import(
      "../../app/api/internal/retrieve-key/route"
    );

    const method = options.method ?? "POST";
    const headers = new Headers({ "content-type": "application/json" });

    if (options.token !== undefined) {
      headers.set("x-internal-token", options.token);
    }

    const req = new Request("http://localhost/api/internal/retrieve-key", {
      method,
      headers,
      body:
        method === "POST" && options.body !== undefined
          ? JSON.stringify(options.body)
          : undefined,
    }) as unknown as Parameters<typeof POST>[0];

    if (method === "GET") {
      return GET(req);
    }
    return POST(req);
  }

  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = TEST_SECRET;
    process.env.MASTER_ENCRYPTION_SECRET = "master-secret-that-is-32-chars-ok";
    mockFindKey.mockReset();
    mockDecrypt.mockResolvedValue(TEST_KEY_PLAINTEXT);
    mockDeriveKey.mockResolvedValue(Buffer.from("fake-derived-key"));
    mockTouch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.INTERNAL_API_SECRET;
    delete process.env.MASTER_ENCRYPTION_SECRET;
    vi.resetModules();
  });

  it("returns 200 and { key } on a valid request", async () => {
    mockFindKey.mockResolvedValue(makeRow());

    const res = await callRoute({
      token: TEST_SECRET,
      body: { userId: "user-uuid-abc", providerId: "openai" },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ key: TEST_KEY_PLAINTEXT });
  });

  it("sets Cache-Control: no-store on a 200 response", async () => {
    mockFindKey.mockResolvedValue(makeRow());

    const res = await callRoute({
      token: TEST_SECRET,
      body: { userId: "user-uuid-abc", providerId: "openai" },
    });

    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 401 when token header is missing", async () => {
    const res = await callRoute({
      body: { userId: "user-uuid-abc", providerId: "openai" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is wrong", async () => {
    const res = await callRoute({
      token: "wrong-token",
      body: { userId: "user-uuid-abc", providerId: "openai" },
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is missing userId", async () => {
    const res = await callRoute({
      token: TEST_SECRET,
      body: { providerId: "openai" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is missing providerId", async () => {
    const res = await callRoute({
      token: TEST_SECRET,
      body: { userId: "user-uuid-abc" },
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is not JSON", async () => {
    const { POST } = await import(
      "../../app/api/internal/retrieve-key/route"
    );
    const req = new Request("http://localhost/api/internal/retrieve-key", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "x-internal-token": TEST_SECRET,
      },
      body: "not json at all",
    }) as unknown as Parameters<typeof POST>[0];

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when key is not found", async () => {
    mockFindKey.mockResolvedValue(null);

    const res = await callRoute({
      token: TEST_SECRET,
      body: { userId: "user-uuid-abc", providerId: "openai" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 422 when key is local-only", async () => {
    mockFindKey.mockResolvedValue(
      makeRow({ storage_mode: "local", encrypted_key: null })
    );

    const res = await callRoute({
      token: TEST_SECRET,
      body: { userId: "user-uuid-abc", providerId: "openai" },
    });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe("local_only");
  });

  it("returns 405 for GET requests", async () => {
    const res = await callRoute({ method: "GET", token: TEST_SECRET });
    expect(res.status).toBe(405);
  });
});

// ---------------------------------------------------------------------------
// D. Security invariants — plaintext key never leaks
// ---------------------------------------------------------------------------
describe("D. Security invariants", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.MASTER_ENCRYPTION_SECRET = "master-secret-that-is-32-chars-ok";
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFindKey.mockReset();
    mockDecrypt.mockReset();
    mockDeriveKey.mockResolvedValue(Buffer.from("fake-derived-key"));
    mockTouch.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    delete process.env.MASTER_ENCRYPTION_SECRET;
  });

  it("does not log the plaintext key on a successful retrieval", async () => {
    mockFindKey.mockResolvedValue(makeRow());
    mockDecrypt.mockResolvedValue(TEST_KEY_PLAINTEXT);

    await retrieveKey("user-uuid-abc", "openai");

    const allLoggedStrings = [
      ...consoleSpy.mock.calls.flat(),
      ...consoleWarnSpy.mock.calls.flat(),
    ].map(String);

    for (const logged of allLoggedStrings) {
      expect(logged).not.toContain(TEST_KEY_PLAINTEXT);
    }
  });

  it("does not log the plaintext key when decryption fails", async () => {
    mockFindKey.mockResolvedValue(makeRow());
    // Simulate a decrypt error that might echo the ciphertext in the message
    mockDecrypt.mockRejectedValue(
      new Error(`failed to decrypt: ${TEST_KEY_PLAINTEXT}`)
    );

    await retrieveKey("user-uuid-abc", "openai");

    const allLoggedStrings = consoleSpy.mock.calls.flat().map(String);

    for (const logged of allLoggedStrings) {
      expect(logged).not.toContain(TEST_KEY_PLAINTEXT);
    }
  });

  it("does not include the plaintext key in any error response body", async () => {
    process.env.INTERNAL_API_SECRET = TEST_SECRET;

    mockFindKey.mockResolvedValue(makeRow());
    mockDecrypt.mockRejectedValue(new Error("decryption failure"));

    const { POST } = await import(
      "../../app/api/internal/retrieve-key/route"
    );

    const req = new Request("http://localhost/api/internal/retrieve-key", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": TEST_SECRET,
      },
      body: JSON.stringify({ userId: "user-uuid-abc", providerId: "openai" }),
    }) as unknown as Parameters<typeof POST>[0];

    const res = await POST(req);
    const text = await res.text();

    expect(text).not.toContain(TEST_KEY_PLAINTEXT);
    expect(text).not.toContain("encrypted::ciphertext::here"); // raw ciphertext

    delete process.env.INTERNAL_API_SECRET;
    vi.resetModules();
  });

  it("does not return a key in the 401 response", async () => {
    process.env.INTERNAL_API_SECRET = TEST_SECRET;
    mockFindKey.mockResolvedValue(makeRow());
    mockDecrypt.mockResolvedValue(TEST_KEY_PLAINTEXT);

    const { POST } = await import(
      "../../app/api/internal/retrieve-key/route"
    );

    const req = new Request("http://localhost/api/internal/retrieve-key", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-token": "wrong-token",
      },
      body: JSON.stringify({ userId: "user-uuid-abc", providerId: "openai" }),
    }) as unknown as Parameters<typeof POST>[0];

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(JSON.stringify(json)).not.toContain(TEST_KEY_PLAINTEXT);

    delete process.env.INTERNAL_API_SECRET;
    vi.resetModules();
  });
});
