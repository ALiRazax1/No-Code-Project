#!/usr/bin/env ts-node
/**
 * verify-endpoints.ts
 *
 * Build-time script that pings each provider's test_endpoint WITHOUT an API key
 * and confirms the endpoint is alive and responding.
 *
 * We expect a 401 (Unauthorized) or 403 (Forbidden) — that proves the endpoint
 * exists and is rejecting unauthenticated requests correctly. A 404 or a network
 * error means the endpoint URL has changed and the registry needs to be updated.
 *
 * Usage:
 *   npx ts-node scripts/verify-endpoints.ts
 *
 * Run this:
 *   - Before every release
 *   - Whenever a provider announces an API change
 *   - As a scheduled CI check (weekly)
 */

import providers from "../src/providers.json";

interface EndpointResult {
  providerId: string;
  providerName: string;
  endpoint: string;
  status: number | "NETWORK_ERROR";
  alive: boolean;
  note: string;
}

/**
 * A 401 or 403 response means the endpoint exists and is correctly rejecting
 * our unauthenticated request. This is the expected "healthy" response.
 *
 * Google Gemini returns 400 (Bad Request) for missing API key rather than 401.
 */
const HEALTHY_STATUSES = new Set([400, 401, 403]);

async function checkEndpoint(
  providerId: string,
  providerName: string,
  endpoint: string
): Promise<EndpointResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const alive = HEALTHY_STATUSES.has(response.status) || response.ok;

    return {
      providerId,
      providerName,
      endpoint,
      status: response.status,
      alive,
      note: alive
        ? response.ok
          ? "✅ Responded 2xx without auth (unusual but fine)"
          : `✅ Rejected unauthenticated request with ${response.status} (expected)`
        : `❌ Unexpected status ${response.status} — endpoint may have moved`,
    };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      providerId,
      providerName,
      endpoint,
      status: "NETWORK_ERROR",
      alive: false,
      note: isTimeout
        ? "❌ Request timed out after 10s — check connectivity or endpoint URL"
        : `❌ Network error — ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

async function main() {
  console.log("KeyBridge — Provider Endpoint Verification");
  console.log("===========================================");
  console.log(`Checking ${Object.keys(providers).length} providers...\n`);

  const results: EndpointResult[] = await Promise.all(
    Object.entries(providers).map(([id, config]) =>
      checkEndpoint(id, config.name, config.test_endpoint)
    )
  );

  let allHealthy = true;

  for (const result of results) {
    console.log(`Provider: ${result.providerName} (${result.providerId})`);
    console.log(`Endpoint: ${result.endpoint}`);
    console.log(`Status:   ${result.status}`);
    console.log(`Result:   ${result.note}`);
    console.log();

    if (!result.alive) allHealthy = false;
  }

  console.log("===========================================");

  if (allHealthy) {
    console.log("✅ All endpoints healthy. Safe to ship.");
    process.exit(0);
  } else {
    const dead = results.filter((r) => !r.alive).map((r) => r.providerId);
    console.error(`❌ ${dead.length} endpoint(s) need attention: ${dead.join(", ")}`);
    console.error("Update providers.json before releasing.");
    process.exit(1);
  }
}

main();
