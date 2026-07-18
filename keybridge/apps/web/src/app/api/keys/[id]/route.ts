/**
 * DELETE /api/keys/[id]
 *
 * Server-side endpoint that permanently deletes a connected key.
 *
 * SPEC REQUIREMENTS:
 * - Must be a real, immediate, irreversible delete (section 2).
 * - Must verify the key belongs to the authenticated user before deleting.
 *   A user must never be able to delete another user's key.
 *
 * When Track 1 (@keybridge/security) is wired in:
 *   1. Import { CloudStorageAdapter, LocalVaultAdapter } from "@keybridge/security"
 *   2. Fetch the connected_key row to determine storage_mode
 *   3. Call the appropriate adapter's .delete(keyId) method
 *
 * The mock implementation below simulates the happy path for UI development.
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteKeyByOwner } from "@/lib/db/connectedKeys";
// ---------------------------------------------------------------------------
// Auth helper (mock)
// ---------------------------------------------------------------------------
// Replace with your real session check once auth is wired in.
// Should return the authenticated user's ID, or null if unauthenticated.
async function getAuthenticatedUserId(
  _req: NextRequest
): Promise<string | null> {
  // MOCK: always returns a fixed user ID during development
  // Real implementation: parse the session cookie / JWT
  return "usr_mock";
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: keyId } = await params;

  try {
    // -----------------------------------------------------------------------
    // TODO (Track 1 wiring): replace this mock with the real delete call:
    //
    // const key = await db.query(
    //   "SELECT * FROM connected_keys WHERE id = $1 AND user_id = $2",
    //   [keyId, userId]
    // );
    // if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
    //
    // if (key.storage_mode === "cloud") {
    //   await cloudAdapter.delete(keyId);
    // }
    // // For local-only keys, the row has no encrypted_key column data, but we
    // // still delete the row to remove the metadata record.
    //
    // await db.query(
    //   "DELETE FROM connected_keys WHERE id = $1 AND user_id = $2",
    //   [keyId, userId]
    // );
    //
    // SPEC: DO NOT use UPDATE ... SET status = 'revoked' — that is a soft
    // delete and violates the spec requirement for immediate, irreversible
    // removal.
    // -----------------------------------------------------------------------

    // Simulate processing time
    await deleteKeyByOwner(keyId, userId);
  return new NextResponse(null, { status: 204 });
  } catch (err) {
    // Log the error type/code only — never log the key itself
    const code =
      err instanceof Error ? err.constructor.name : "UnknownError";
    console.error(`[DELETE /api/keys/${keyId}] ${code}`);

    return NextResponse.json(
      { error: "Failed to delete key. Please try again." },
      { status: 500 }
    );
  }
}
