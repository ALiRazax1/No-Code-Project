import providersRaw from "./providers.json";
import { translateError } from "./error-translation";
import type {
  ProviderId,
  ProviderRegistry,
  ValidationResult,
  ValidationErrorCode,
} from "./types";

const providers = providersRaw as ProviderRegistry;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Checks whether a key matches the expected format regex for a given provider.
 * This runs before any network call, so bad-format keys fail instantly and
 * cheaply — we never waste a network round-trip on obviously wrong input.
 */
function matchesKeyFormat(key: string, regexString: string): boolean {
  try {
    const regex = new RegExp(regexString);
    return regex.test(key);
  } catch {
    // If the regex itself is malformed (config bug), fail open and let the
    // network call decide — don't silently block a potentially valid key.
    return true;
  }
}

/**
 * Builds the Authorization header value for a given provider.
 * Each provider has a slightly different auth scheme.
 */
function buildAuthHeader(
  providerId: ProviderId,
  key: string
): Record<string, string> {
  switch (providerId) {
    case "anthropic":
      // Anthropic uses x-api-key header, not Authorization Bearer
      return {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      };

    case "google_gemini":
      // Gemini uses a query param, not a header — handled in buildTestUrl()
      return {};

    case "openai":
    case "elevenlabs":
    case "openrouter":
    default:
      return { Authorization: `Bearer ${key}` };
  }
}

/**
 * Builds the full test URL for a provider. Most providers use headers for auth,
 * but Google Gemini uses a `?key=` query param.
 */
function buildTestUrl(
  providerId: ProviderId,
  testEndpoint: string,
  key: string
): string {
  if (providerId === "google_gemini") {
    // key goes in query param — never logged because we never log the URL
    return `${testEndpoint}?key=${key}`;
  }
  return testEndpoint;
}

/**
 * Attempts to parse a 429 response body to distinguish "out of credits"
 * from "rate limited". Returns the more specific error code.
 *
 * This matters because the user-facing messages are different:
 * - INSUFFICIENT_QUOTA → "out of credits, add funds"
 * - RATE_LIMITED       → "wait a minute and try again"
 *
 * We look for known quota-exhaustion signals across all supported providers.
 * If we can't tell, we default to RATE_LIMITED (the safer, more actionable choice).
 */
async function classify429(response: Response): Promise<ValidationErrorCode> {
  try {
    const body = await response.clone().text();
    const lower = body.toLowerCase();

    // Signals used by OpenAI, Anthropic, Google, ElevenLabs, OpenRouter
    const quotaKeywords = [
      "insufficient_quota",
      "quota_exceeded",
      "billing_hard_limit",
      "credit_balance_too_low",
      "out of credits",
      "exceeded your current quota",
      "no credits",
      "credits exhausted",
    ];

    if (quotaKeywords.some((kw) => lower.includes(kw))) {
      return "INSUFFICIENT_QUOTA";
    }
  } catch {
    // Body read failed — fall through to default
  }

  return "RATE_LIMITED";
}

/**
 * Sanitizes debug info for our own logs.
 * RULE: this function must never include the API key or the raw response body.
 * Only HTTP status codes and high-level error type strings are safe to log.
 */
function buildDebugInfo(
  providerId: string,
  httpStatus: number | null,
  errorType: string
): string {
  const status = httpStatus !== null ? `HTTP ${httpStatus}` : "no-response";
  return `[keybridge-validation] provider=${providerId} status=${status} error=${errorType}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates an API key for a given provider by making exactly one test call
 * to that provider's cheapest read-only endpoint.
 *
 * Rules enforced by this function:
 * - Validates format with regex before hitting the network.
 * - Makes exactly ONE outbound request, to the provider only.
 * - Never logs the plaintext key — not even on error.
 * - Returns a normalized ValidationResult; the caller decides what to render.
 *
 * @param key        - The raw API key string the user pasted.
 * @param providerId - Must be a key in providers.json.
 * @param timeoutMs  - Abort the request after this many milliseconds. Default: 8000.
 */
export async function validateKey(
  key: string,
  providerId: string,
  timeoutMs = 8_000
): Promise<ValidationResult> {
  // ── 1. Look up provider config ──────────────────────────────────────────
  if (!(providerId in providers)) {
    return {
      success: false,
      errorCode: "UNKNOWN_PROVIDER",
      userMessage: translateError("UNKNOWN_PROVIDER"),
      debugInfo: buildDebugInfo(providerId, null, "UNKNOWN_PROVIDER"),
    };
  }

  const provider = providers[providerId as ProviderId];
  const typedProviderId = providerId as ProviderId;

  // ── 2. Pre-flight: format check (no network call needed) ─────────────────
  if (!matchesKeyFormat(key, provider.key_format_regex)) {
    return {
      success: false,
      errorCode: "BAD_FORMAT",
      userMessage: translateError("BAD_FORMAT"),
      debugInfo: buildDebugInfo(typedProviderId, null, "BAD_FORMAT"),
    };
  }

  // ── 3. Make the one validation test call ─────────────────────────────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    const url = buildTestUrl(typedProviderId, provider.test_endpoint, key);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...buildAuthHeader(typedProviderId, key),
    };

    response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    // fetch() only throws on network-level failures (DNS, timeout, connection refused).
    // We never log err.message directly as it might echo back parts of the URL
    // which for Google Gemini includes the key as a query param.
    const isAbort =
      err instanceof Error && err.name === "AbortError";

    return {
      success: false,
      errorCode: "NETWORK_ERROR",
      userMessage: translateError("NETWORK_ERROR"),
      debugInfo: buildDebugInfo(
        typedProviderId,
        null,
        isAbort ? "TIMEOUT" : "NETWORK_ERROR"
      ),
    };
  } finally {
    clearTimeout(timeoutId);
  }

  // ── 4. Interpret the HTTP response ───────────────────────────────────────

  if (response.ok) {
    // 2xx → key is valid
    return {
      success: true,
      providerId: typedProviderId,
      providerName: provider.name,
    };
  }

  // Map HTTP status → normalized error code
  let errorCode: ValidationErrorCode;

  switch (response.status) {
    case 401:
      errorCode = "INVALID_KEY";
      break;

    case 403:
      errorCode = "PERMISSION_DENIED";
      break;

    case 429:
      // Requires async body inspection to distinguish quota vs rate limit
      errorCode = await classify429(response);
      break;

    default:
      errorCode = "UNKNOWN_ERROR";
  }

  const userMessage =
    errorCode === "INSUFFICIENT_QUOTA"
      ? translateError(errorCode, provider.billing_url)
      : translateError(errorCode);

  return {
    success: false,
    errorCode,
    userMessage,
    debugInfo: buildDebugInfo(typedProviderId, response.status, errorCode),
  };
}

/**
 * Returns the ProviderConfig for a given provider ID, or null if not found.
 * Useful for UI layers that need to display provider metadata (name, URLs, etc.)
 * without depending on the providers.json file directly.
 */
export function getProvider(providerId: string) {
  if (!(providerId in providers)) return null;
  return providers[providerId as ProviderId];
}

/**
 * Returns all provider IDs that support a given intent.
 * Used by the Intent screen (Track 3) to map user choices to providers.
 */
export function getProvidersForIntent(intent: string): ProviderId[] {
  return (Object.entries(providers) as [ProviderId, (typeof providers)[ProviderId]][])
    .filter(([, config]) =>
      config.supported_intents.includes(intent as never)
    )
    .map(([id]) => id);
}
