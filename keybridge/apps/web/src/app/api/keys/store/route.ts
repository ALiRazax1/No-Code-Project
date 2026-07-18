import { NextRequest, NextResponse } from "next/server";
import { CloudStorageAdapter } from "@keybridge/security";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Auth helper (mock)
// ---------------------------------------------------------------------------
async function getAuthenticatedUserId(
  _req: NextRequest
): Promise<string | null> {
  return "usr_mock";
}

// ---------------------------------------------------------------------------
// Pool (module-level, reused across requests)
// ---------------------------------------------------------------------------
let _pool: InstanceType<typeof Pool> | null = null;
function getPool() {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("[store] DATABASE_URL is not set.");
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { key: unknown; providerId: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { key, providerId } = body;

  if (typeof key !== "string" || typeof providerId !== "string") {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const adapter = new CloudStorageAdapter({
      db: getPool(),
      masterSecret: Buffer.from(process.env.KEYBRIDGE_MASTER_SECRET!, "hex"),
    });

    const record = await adapter.store({
      userId,
      providerId,
      plaintextKey: key,
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err) {
    const code = err instanceof Error ? err.constructor.name : "UnknownError";
    console.error(`[POST /api/keys/store] ${code}`);
    return NextResponse.json(
      { error: "Failed to store key. Please try again." },
      { status: 500 }
    );
  }
}