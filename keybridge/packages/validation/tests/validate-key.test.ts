import { validateKey, getProvider, getProvidersForIntent } from "../src/validate-key";

// ---------------------------------------------------------------------------
// Fetch mock setup
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

/**
 * Builds a minimal Response-like object for the mock.
 */
function makeResponse(
  status: number,
  body: unknown = {},
  ok?: boolean
): Response {
  const isOk = ok !== undefined ? ok : status >= 200 && status < 300;
  return {
    ok: isOk,
    status,
    clone: () => makeResponse(status, body, ok),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// Provider registry tests
// ---------------------------------------------------------------------------

describe("Provider registry", () => {
  it("getProvider returns config for a known provider", () => {
    const cfg = getProvider("openai");
    expect(cfg).not.toBeNull();
    expect(cfg?.name).toBe("OpenAI");
    expect(cfg?.test_endpoint).toBe("https://api.openai.com/v1/models");
  });

  it("getProvider returns null for an unknown provider", () => {
    expect(getProvider("nonexistent")).toBeNull();
  });

  it("all 5 launch providers are present", () => {
    const ids = ["openai", "anthropic", "google_gemini", "elevenlabs", "openrouter"];
    ids.forEach((id) => {
      expect(getProvider(id)).not.toBeNull();
    });
  });

  it("every provider has required fields", () => {
    const ids = ["openai", "anthropic", "google_gemini", "elevenlabs", "openrouter"];
    const requiredFields = [
      "name",
      "signup_url",
      "key_page_url",
      "billing_url",
      "key_format_regex",
      "test_endpoint",
      "supported_intents",
    ] as const;
    ids.forEach((id) => {
      const cfg = getProvider(id) as unknown as Record<string, unknown>;
      requiredFields.forEach((field) => {
        expect(cfg[field]).toBeDefined();
      });
    });
  });
});

describe("getProvidersForIntent", () => {
  it("chat intent includes openai, anthropic, google_gemini, openrouter", () => {
    const result = getProvidersForIntent("chat");
    expect(result).toContain("openai");
    expect(result).toContain("anthropic");
    expect(result).toContain("google_gemini");
    expect(result).toContain("openrouter");
  });

  it("speech intent returns only elevenlabs", () => {
    const result = getProvidersForIntent("speech");
    expect(result).toEqual(["elevenlabs"]);
  });

  it("embeddings intent returns openai and openrouter", () => {
    const result = getProvidersForIntent("embeddings");
    expect(result).toContain("openai");
    expect(result).toContain("openrouter");
    expect(result).not.toContain("anthropic");
    expect(result).not.toContain("elevenlabs");
  });

  it("unknown intent returns an empty array", () => {
    expect(getProvidersForIntent("video_generation")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Format pre-validation tests (no network call)
// ---------------------------------------------------------------------------

describe("Key format pre-validation", () => {
  it("rejects an OpenAI key with the wrong prefix — no fetch called", async () => {
    const result = await validateKey("WRONG-FORMAT-KEY", "openai");
    expect(result.success).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.errorCode).toBe("BAD_FORMAT");
    }
  });

  it("rejects an Anthropic key with the wrong prefix — no fetch called", async () => {
    const result = await validateKey("sk-wrong-key-12345678901234567890", "anthropic");
    expect(result.success).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects an ElevenLabs key that is too short — no fetch called", async () => {
    const result = await validateKey("short", "elevenlabs");
    expect(result.success).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects a Google Gemini key with wrong prefix — no fetch called", async () => {
    const result = await validateKey("sk-wrong-format", "google_gemini");
    expect(result.success).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects an OpenRouter key with wrong prefix — no fetch called", async () => {
    const result = await validateKey("sk-wrong-or-12345678901234567890", "openrouter");
    expect(result.success).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns BAD_FORMAT user message for format failures", async () => {
    const result = await validateKey("bad", "openai");
    if (!result.success) {
      expect(result.userMessage).toBe(
        "This key doesn't look right — check you copied the whole thing."
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Unknown provider
// ---------------------------------------------------------------------------

describe("Unknown provider", () => {
  it("returns UNKNOWN_PROVIDER without making a fetch call", async () => {
    const result = await validateKey("sk-somekey123456789012345", "fakeai");
    expect(result.success).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.errorCode).toBe("UNKNOWN_PROVIDER");
    }
  });
});

// ---------------------------------------------------------------------------
// HTTP response handling (all five status-based paths)
// ---------------------------------------------------------------------------

describe("HTTP 200 — success", () => {
  it("returns success for a valid OpenAI key", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { data: [] }));
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.providerId).toBe("openai");
      expect(result.providerName).toBe("OpenAI");
    }
  });

  it("returns success for a valid Anthropic key", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { models: [] }));
    const result = await validateKey("sk-ant-abcdefghijklmnopqrstu12345", "anthropic");
    expect(result.success).toBe(true);
  });
});

describe("HTTP 401 — invalid key", () => {
  it("returns INVALID_KEY error code", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: { type: "invalid_api_key" } }));
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("INVALID_KEY");
      expect(result.userMessage).toBe(
        "This key doesn't look right — check you copied the whole thing."
      );
    }
  });
});

describe("HTTP 403 — permission denied", () => {
  it("returns PERMISSION_DENIED error code", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(403, { error: { type: "permission_error" } }));
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("PERMISSION_DENIED");
      expect(result.userMessage).toBe(
        "This key doesn't have access to that feature yet — check your provider account settings."
      );
    }
  });
});

describe("HTTP 429 — disambiguation", () => {
  it("returns RATE_LIMITED for a generic 429", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(429, { error: { type: "rate_limit_error", message: "Too many requests" } })
    );
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("RATE_LIMITED");
      expect(result.userMessage).toBe(
        "Too many requests too fast — wait a minute and try again."
      );
    }
  });

  it("returns INSUFFICIENT_QUOTA when body contains 'insufficient_quota'", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(429, {
        error: {
          code: "insufficient_quota",
          message: "You exceeded your current quota",
        },
      })
    );
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("INSUFFICIENT_QUOTA");
      expect(result.userMessage).toContain("out of credits");
    }
  });

  it("returns INSUFFICIENT_QUOTA when body contains 'exceeded your current quota'", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(429, "You exceeded your current quota, please check your plan and billing details.")
    );
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("INSUFFICIENT_QUOTA");
    }
  });

  it("INSUFFICIENT_QUOTA message includes the billing URL", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(429, { error: { code: "insufficient_quota" } })
    );
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(false);
    if (!result.success) {
      // The billing URL for OpenAI should appear in the user message
      expect(result.userMessage).toContain("platform.openai.com");
    }
  });

  it("returns INSUFFICIENT_QUOTA when body contains 'credit_balance_too_low' (Anthropic)", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(429, {
        error: {
          type: "credit_balance_too_low",
          message: "Your credit balance is too low",
        },
      })
    );
    const result = await validateKey("sk-ant-abcdefghijklmnopqrstu12345", "anthropic");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("INSUFFICIENT_QUOTA");
    }
  });
});

describe("Network error / timeout", () => {
  it("returns NETWORK_ERROR when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("NETWORK_ERROR");
      expect(result.userMessage).toBe(
        "We couldn't reach the provider — check your internet connection and try again."
      );
    }
  });

  it("returns NETWORK_ERROR on AbortError (timeout)", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    mockFetch.mockRejectedValueOnce(abortError);
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("NETWORK_ERROR");
    }
  });
});

describe("Unknown HTTP status", () => {
  it("returns UNKNOWN_ERROR for unexpected status codes like 500", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(500, { error: "Internal Server Error" }));
    const result = await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe("UNKNOWN_ERROR");
    }
  });
});

// ---------------------------------------------------------------------------
// Security invariants — the most important tests in this file
// ---------------------------------------------------------------------------

describe("SECURITY: plaintext key must never appear in any output", () => {
  const REAL_KEY = "sk-THISISASECRETKEYDONOTLEAK1234567890";

  it("does not include the key in a success result", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { data: [] }));
    const result = await validateKey(REAL_KEY, "openai");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(REAL_KEY);
  });

  it("does not include the key in a failure result", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: "invalid_api_key" }));
    const result = await validateKey(REAL_KEY, "openai");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(REAL_KEY);
  });

  it("does not include the key in the debugInfo field", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, {}));
    const result = await validateKey(REAL_KEY, "openai");
    if (!result.success) {
      expect(result.debugInfo).not.toContain(REAL_KEY);
    }
  });

  it("does not include the key in the userMessage field", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, {}));
    const result = await validateKey(REAL_KEY, "openai");
    if (!result.success) {
      expect(result.userMessage).not.toContain(REAL_KEY);
    }
  });

  it("does not include the key when fetch throws (network error path)", async () => {
    mockFetch.mockRejectedValueOnce(new Error(`Cannot connect with key ${REAL_KEY}`));
    const result = await validateKey(REAL_KEY, "openai");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(REAL_KEY);
  });

  it("does not include the key in a BAD_FORMAT result", async () => {
    // This key has the wrong prefix for OpenAI — hits BAD_FORMAT before any network call
    const badFormatKey = "WRONG-PREFIX-SECRETKEYDONOTLEAK1234567890";
    const result = await validateKey(badFormatKey, "openai");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errorCode).toBe("BAD_FORMAT");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(badFormatKey);
  });
});

// ---------------------------------------------------------------------------
// Provider-specific auth header tests
// ---------------------------------------------------------------------------

describe("Provider auth schemes", () => {
  it("sends x-api-key header (not Authorization) for Anthropic", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));
    await validateKey("sk-ant-abcdefghijklmnopqrstu12345", "anthropic");

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers as Record<string, string>;

    expect(headers["x-api-key"]).toBeDefined();
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["anthropic-version"]).toBeDefined();
  });

  it("sends Authorization Bearer header for OpenAI", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));
    await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers as Record<string, string>;

    expect(headers["Authorization"]).toMatch(/^Bearer sk-/);
  });

  it("puts the key in the query string (not headers) for Google Gemini", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));
    const geminiKey = "AIzaabcdefghijklmnopqrstuvwxyz12345";
    await validateKey(geminiKey, "google_gemini");

    const callArgs = mockFetch.mock.calls[0];
    const url = callArgs[0] as string;
    const headers = callArgs[1].headers as Record<string, string>;

    expect(url).toContain("?key=");
    // No auth header should be set for Gemini
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["x-api-key"]).toBeUndefined();
  });

  it("makes exactly one fetch call per validateKey invocation", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));
    await validateKey("sk-abcdefghijklmnopqrstu12345", "openai");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
