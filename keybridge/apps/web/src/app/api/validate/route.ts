import { NextRequest, NextResponse } from 'next/server';
import type { ValidationErrorCode } from '@/lib/types';
import providersJson from '@/lib/providers.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProvidersMap = Record<
  string,
  {
    name: string;
    key_format_regex: string;
    test_endpoint: string;
    key_page_url: string;
  }
>;

interface RequestBody {
  key: unknown;
  providerId: unknown;
}

interface SuccessResponse {
  success: true;
}

interface ErrorResponse {
  success: false;
  errorCode: ValidationErrorCode;
}

type RouteResponse = SuccessResponse | ErrorResponse;

// ─── Constants ────────────────────────────────────────────────────────────────

const providers = providersJson as ProvidersMap;

/**
 * How long to wait for the provider's test endpoint before giving up.
 * 8 seconds is generous — most providers respond in < 2 s on a valid key.
 * We need a cap so users are not left waiting indefinitely on a network problem.
 */
const PROVIDER_TIMEOUT_MS = 8_000;

// ─── Auth header builder ──────────────────────────────────────────────────────

/**
 * Each provider expects the key in a different request header or query param.
 * This map covers all five v1 providers.
 *
 * EXTENSION POINT (Track 2):
 *   When Track 2 builds a richer validation service, this mapping can move
 *   into @keybridge/validation. The route will then call that service instead
 *   of building headers itself. The contract stays the same:
 *     input:  key (string), providerId (string)
 *     output: Promise<ValidationResult>
 */
function buildProviderRequest(
  key: string,
  providerId: string,
  testEndpoint: string
): { url: string; init: RequestInit } {
  switch (providerId) {
    case 'openai':
      // OpenAI: Bearer token in Authorization header
      return {
        url: testEndpoint,
        init: {
          method: 'GET',
          headers: { Authorization: `Bearer ${key}` },
        },
      };

    case 'anthropic':
      // Anthropic: key in x-api-key header, required anthropic-version header
      return {
        url: testEndpoint,
        init: {
          method: 'GET',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
        },
      };

    case 'google_gemini':
      // Google Gemini: key as a query parameter (their v1 API pattern)
      return {
        url: `${testEndpoint}?key=${key}`,
        init: { method: 'GET' },
      };

    case 'elevenlabs':
      // ElevenLabs: key in xi-api-key header
      return {
        url: testEndpoint,
        init: {
          method: 'GET',
          headers: { 'xi-api-key': key },
        },
      };

    case 'openrouter':
      // OpenRouter: Bearer token in Authorization header (same shape as OpenAI)
      return {
        url: testEndpoint,
        init: {
          method: 'GET',
          headers: { Authorization: `Bearer ${key}` },
        },
      };

    default:
      // Fallback: try Bearer — this branch should never be reached for v1
      // providers since we validate providerId above, but keeps the type system
      // happy and handles future providers gracefully until their entry is added.
      return {
        url: testEndpoint,
        init: {
          method: 'GET',
          headers: { Authorization: `Bearer ${key}` },
        },
      };
  }
}

// ─── HTTP status → ValidationErrorCode ───────────────────────────────────────

/**
 * Maps a raw HTTP response from a provider's test endpoint to our
 * internal ValidationErrorCode. This is the authoritative implementation
 * of spec §7's error-translation table on the server side.
 *
 * We read the response body only when we need to distinguish between
 * two different causes behind the same HTTP status (e.g. the two 429
 * variants: rate-limited vs out-of-credits). We never forward the raw
 * body or any fragment of it to the client.
 *
 * SECURITY: we log only the HTTP status code and provider id for debugging.
 * We never log the key, the raw error message, or any fragment that could
 * contain key material. (spec §2, §7)
 */
async function classifyProviderResponse(
  response: Response,
  providerId: string
): Promise<ValidationErrorCode | null> {
  const status = response.status;

  if (response.ok) {
    // 2xx — key is valid and the provider accepted the request
    return null;
  }

  if (status === 401 || status === 403) {
    // 401: invalid / unrecognised key
    // 403: key exists but lacks permission for this feature
    // Treat both as invalid_key at the format-check level — the nuance
    // between "wrong key" and "key lacks permission" is surfaced by
    // permission_denied only if status is strictly 403.
    if (status === 403) return 'permission_denied';
    return 'invalid_key';
  }

  if (status === 429) {
    // 429 covers two distinct situations per spec §7:
    //   (a) out_of_credits — account has no quota/balance remaining
    //   (b) rate_limited   — too many requests in a short window
    //
    // We must distinguish them. We read the body text here solely to
    // detect quota-exhaustion keywords. We log nothing from the body.
    //
    // Provider-specific signals (safe to read, no key material here):
    //   OpenAI:      error.code === "insufficient_quota"
    //   Anthropic:   error.error.type === "rate_limit_error" (both cases!)
    //                but body may say "credit balance is too low"
    //   ElevenLabs:  status 429 is always rate-limit; quota = 401 + specific body
    //   OpenRouter:  error.error.code === "insufficient_credits"
    //   Gemini:      error.error.status === "RESOURCE_EXHAUSTED" (quota)
    //                         or        === "RATE_LIMIT_EXCEEDED" (rate)
    try {
      const body = await response.text();
      const lower = body.toLowerCase();
      const isQuotaExhausted =
        lower.includes('insufficient_quota') ||
        lower.includes('insufficient_credits') ||
        lower.includes('credit balance') ||
        lower.includes('resource_exhausted') ||
        lower.includes('billing') ||
        lower.includes('quota exceeded');

      return isQuotaExhausted ? 'out_of_credits' : 'rate_limited';
    } catch {
      // If we cannot read the body, assume rate-limited (safer default —
      // it tells the user to retry rather than implying their account is broken).
      console.error(
        `[validate-key] Could not read 429 body for provider=${providerId} status=${status}`
      );
      return 'rate_limited';
    }
  }

  // Any other non-2xx status (500, 503, etc.)
  console.error(
    `[validate-key] Unexpected provider response: provider=${providerId} status=${status}`
  );
  return 'unknown';
}

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/validate-key
 *
 * Accepts: { key: string, providerId: string }
 * Returns: { success: true } | { success: false, errorCode: ValidationErrorCode }
 *
 * This route is the server-side boundary between the browser wizard (Track 3)
 * and Track 2's validation logic. It:
 *   1. Validates the request body shape
 *   2. Re-checks the key format server-side (never trust client-only checks)
 *   3. Fetches the provider's test endpoint with a timeout
 *   4. Translates the raw response into a ValidationErrorCode
 *   5. Returns a typed, sanitised result — never the raw error
 *
 * SECURITY invariants held in this handler:
 *   - The key is NEVER echoed back in any response field
 *   - The key is NEVER written to console.log / console.error
 *   - err.message is NEVER logged (provider errors sometimes include key fragments)
 *   - Only err.constructor.name and HTTP status codes are safe to log
 *   - The route does not store, cache, or forward the key anywhere
 *   - One and exactly one provider fetch per request (spec §2)
 *
 * EXTENSION POINT:
 *   Once Track 2's @keybridge/validation package is ready, replace the inline
 *   fetch logic below with a call to its ValidationService:
 *
 *     import { ValidationService } from '@keybridge/validation';
 *     const result = await ValidationService.validate(key, providerId);
 *     return NextResponse.json(result);
 *
 *   The request/response shape of this route does not change.
 */
export async function POST(request: NextRequest): Promise<NextResponse<RouteResponse>> {
  // ── 1. Parse request body ──────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    // Malformed JSON — do not log the raw body (could contain a key pasted
    // by the user before the request was fully formed).
    return NextResponse.json(
      { success: false, errorCode: 'unknown' as ValidationErrorCode },
      { status: 400 }
    );
  }

  const { key, providerId } = body;

  // ── 2. Input shape validation ─────────────────────────────────────────────
  if (typeof key !== 'string' || typeof providerId !== 'string') {
    return NextResponse.json(
      { success: false, errorCode: 'unknown' as ValidationErrorCode },
      { status: 400 }
    );
  }

  const trimmedKey = key.trim();

  if (trimmedKey.length === 0) {
    return NextResponse.json(
      { success: false, errorCode: 'invalid_key' as ValidationErrorCode },
      { status: 422 }
    );
  }

  // ── 3. Provider lookup ────────────────────────────────────────────────────
  const provider = providers[providerId];
  if (!provider) {
    // Unknown provider — log the id (safe), never the key
    console.error(`[validate-key] Unknown providerId="${providerId}"`);
    return NextResponse.json(
      { success: false, errorCode: 'unknown' as ValidationErrorCode },
      { status: 422 }
    );
  }

  // ── 4. Server-side format check ───────────────────────────────────────────
  // The client already ran this check, but we repeat it here for two reasons:
  //   a) Defence-in-depth: the client check can be bypassed
  //   b) Avoids a pointless provider round-trip on obviously wrong keys
  const formatRegex = new RegExp(provider.key_format_regex);
  if (!formatRegex.test(trimmedKey)) {
    // Log only that format failed, never the key value itself
    console.error(
      `[validate-key] Key failed format check for provider="${providerId}"`
    );
    return NextResponse.json(
      { success: false, errorCode: 'invalid_key' as ValidationErrorCode },
      { status: 422 }
    );
  }

  // ── 5. Provider test call ─────────────────────────────────────────────────
  // This is the ONE and ONLY provider API call we make per spec §2.
  // We use AbortController to enforce a hard timeout so the user is never
  // left waiting indefinitely if the provider is unreachable.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const { url, init } = buildProviderRequest(trimmedKey, providerId, provider.test_endpoint);

    const providerResponse = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // ── 6. Classify the provider response ───────────────────────────────────
    const errorCode = await classifyProviderResponse(providerResponse, providerId);

    if (errorCode === null) {
      // 2xx — key is valid
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, errorCode });

  } catch (err: unknown) {
    clearTimeout(timeoutId);

    // Determine whether this was a timeout or a genuine network failure.
    // We inspect err.constructor.name and specific properties — never err.message,
    // which could theoretically contain fragments of the request (including the key)
    // in some Node.js fetch implementations.
    const isAbort =
      err instanceof Error && (err.name === 'AbortError' || controller.signal.aborted);

    // Log only the error class name and provider, never the key or err.message
    console.error(
      `[validate-key] Fetch failed: provider="${providerId}" errorType="${
        err instanceof Error ? err.constructor.name : 'UnknownError'
      }" timeout=${isAbort}`
    );

    return NextResponse.json(
      { success: false, errorCode: 'network_error' as ValidationErrorCode },
      { status: 502 }
    );
  }
}

// ─── Method guard ─────────────────────────────────────────────────────────────

/**
 * Reject non-POST methods explicitly.
 * Next.js App Router does this automatically for unlisted exports,
 * but being explicit makes the contract clear to Track 2 integrators.
 */
export function GET(): NextResponse {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
