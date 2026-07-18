/**
 * /api/internal/retrieve-key/route.ts
 *
 * Protected server-to-server endpoint. Returns a decrypted API key to
 * a trusted internal caller. This route must NEVER be called from a
 * browser — it is guarded by a shared secret (X-Internal-Token header)
 * that only server-side callers know.
 *
 * Request:
 *   POST /api/internal/retrieve-key
 *   Headers:
 *     x-internal-token: <INTERNAL_API_SECRET>
 *     content-type: application/json
 *   Body:
 *     { "userId": "...", "providerId": "openai" }
 *
 * Success response (200):
 *   { "key": "<decrypted plaintext key>" }
 *
 * Error responses:
 *   401 — missing or invalid token, or misconfigured secret
 *   400 — malformed request body
 *   404 — no active cloud key found for this user + provider
 *   422 — key exists but is local-only (server cannot return it)
 *   500 — decryption failure or unexpected error
 *
 * What this route deliberately does NOT do:
 *   - It does not accept GET requests (keys must never appear in URLs
 *     or server access logs as query parameters).
 *   - It does not return the key in any error response path.
 *   - It does not log the key at any point.
 *   - It does not accept a request that names a key belonging to a
 *     different user than the one in the body — ownership is enforced
 *     in retrieveKey() at the DB query level.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateInternalToken } from "@/lib/injection/tokenAuth";
import { retrieveKey } from "@/lib/injection/retrieveKey";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a sanitized error response. The `detail` field is safe for
 * logging and returning to the caller — it never contains key material.
 */
function errorResponse(
  status: number,
  code: string,
  detail: string
): NextResponse {
  return NextResponse.json({ error: { code, detail } }, { status });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Token authentication ─────────────────────────────────────────────
  // This is the outer perimeter. A wrong or missing token ends the request
  // immediately — no body is parsed, no DB is touched.
  const authResult = validateInternalToken(req.headers);

  if (!authResult.ok) {
    // We log the reason internally but return a generic 401 to the caller
    // so we don't leak whether the secret is misconfigured vs. just wrong.
    console.warn(
      `[injection] Auth rejected: reason=${authResult.reason} ` +
        `ip=${req.headers.get("x-forwarded-for") ?? "unknown"}`
    );
    return errorResponse(
      401,
      "unauthorized",
      "Missing or invalid internal token."
    );
  }

  // ── 2. Parse and validate request body ──────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "bad_request", "Request body must be valid JSON.");
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).userId !== "string" ||
    typeof (body as Record<string, unknown>).providerId !== "string"
  ) {
    return errorResponse(
      400,
      "bad_request",
      'Body must be { "userId": string, "providerId": string }.'
    );
  }

  const { userId, providerId } = body as { userId: string; providerId: string };

  // Basic sanity — empty strings should be caught before they hit the DB.
  if (!userId.trim() || !providerId.trim()) {
    return errorResponse(
      400,
      "bad_request",
      "userId and providerId must be non-empty strings."
    );
  }

  // ── 3. Retrieve and decrypt ──────────────────────────────────────────────
  let result: Awaited<ReturnType<typeof retrieveKey>>;
  try {
    result = await retrieveKey(userId, providerId);
  } catch (err) {
    // Unexpected throw — should not happen in normal operation.
    // Log safely (no key material present at this point).
    console.error(
      `[injection] Unexpected error during key retrieval: ` +
        `userId=${userId} providerId=${providerId}`,
      err instanceof Error ? err.message : String(err)
    );
    return errorResponse(
      500,
      "internal_error",
      "An unexpected error occurred. Check server logs."
    );
  }

  // ── 4. Map result to HTTP response ──────────────────────────────────────
  if (!result.success) {
    switch (result.code) {
      case "not_found":
        return errorResponse(
          404,
          "not_found",
          `No active cloud key found for provider="${providerId}".`
        );

      case "local_only":
        // The key exists but was stored locally. The server legitimately
        // cannot return it — this is the correct behaviour, not a bug.
        return errorResponse(
          422,
          "local_only",
          `The key for provider="${providerId}" is stored locally on the user's ` +
            "device and cannot be retrieved server-side. " +
            "The user must re-enter it in this context."
        );

      case "key_inactive":
        return errorResponse(
          404,
          "not_found",
          // Deliberately same code as not_found — we don't tell callers
          // whether a key is revoked vs. simply absent.
          `No active cloud key found for provider="${providerId}".`
        );

      case "decrypt_failed":
        return errorResponse(
          500,
          "decrypt_failed",
          "Key decryption failed. The stored key may be corrupt or the " +
            "encryption secret may have changed. Check server logs."
        );

      case "misconfigured":
        return errorResponse(
          500,
          "misconfigured",
          "Server is misconfigured. Check MASTER_ENCRYPTION_SECRET in env."
        );

      default:
        // Exhaustive check — TypeScript will warn if a new code is added
        // to RetrieveKeyResult without a case here.
        return errorResponse(500, "internal_error", "Unknown error code.");
    }
  }

  // ── 5. Return the key ───────────────────────────────────────────────────
  // This is the one place in the entire system where a decrypted key
  // appears in a response. It is returned only over HTTPS (enforced at
  // the infrastructure level) to a trusted server-side caller.
  //
  // The key must NOT be cached by Next.js, CDN, or any intermediate proxy.
  return NextResponse.json(
    { key: result.key },
    {
      status: 200,
      headers: {
        // Prevent any layer from caching a response that contains a key.
        "Cache-Control": "no-store",
        "Surrogate-Control": "no-store",
      },
    }
  );
}

// Explicitly reject all other HTTP methods.
export async function GET(): Promise<NextResponse> {
  // Keys must never appear in URLs — GET is not supported.
  return errorResponse(
    405,
    "method_not_allowed",
    "Use POST. Keys must never be passed as URL parameters."
  );
}
