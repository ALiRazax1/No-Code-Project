import { NextRequest, NextResponse } from "next/server";
import { listKeysByUser } from "@/lib/db/connectedKeys";
import { getProvider } from "@keybridge/validation";

// ---------------------------------------------------------------------------
// Auth helper (mock)
// ---------------------------------------------------------------------------
// Replace with your real session check once auth is wired in.
async function getAuthenticatedUserId(
  _req: NextRequest
): Promise<string | null> {
  // MOCK: always returns a fixed user ID during development
  return "usr_mock";
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await listKeysByUser(userId);

    const enriched = rows.map((key) => {
      const provider = getProvider(key.provider_id);
      return {
        ...key,
        provider: provider
          ? { name: provider.name, key_page_url: provider.key_page_url }
          : { name: key.provider_id, key_page_url: "#" },
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    const code = err instanceof Error ? err.constructor.name : "UnknownError";
    console.error(`[GET /api/keys] ${code}`);
    return NextResponse.json(
      { error: "Failed to fetch keys. Please try again." },
      { status: 500 }
    );
  }
}