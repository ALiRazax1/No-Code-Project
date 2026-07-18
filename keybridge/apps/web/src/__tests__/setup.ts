/**
 * setup.ts
 *
 * Global test setup. Mocks Next.js server primitives so route handlers
 * can be imported and tested in a plain Node/Vitest environment without
 * spinning up a full Next.js server.
 *
 * NextRequest and NextResponse are shimmed with the native Request /
 * Response globals that Node 18+ provides, which are API-compatible for
 * our test scenarios.
 */

import { vi } from "vitest";

// ── next/server shim ────────────────────────────────────────────────────────
// The real next/server package ties itself to Next.js internals at import
// time. We replace it with a lightweight shim that exposes the same
// surface our route handlers use: NextRequest (= Request) and NextResponse
// with a static .json() factory.

vi.mock("next/server", () => {
  class NextResponseShim extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponseShim {
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      return new NextResponseShim(JSON.stringify(body), {
        ...init,
        headers,
      });
    }
  }

  return {
    NextRequest: Request,
    NextResponse: NextResponseShim,
  };
});
