import { EnrichedKey } from "./types";
import { listKeysByUser } from "@/lib/db/connectedKeys";
import { getProvider } from "@keybridge/validation";
/**
 * Fetches all connected keys for the current user from the real API route.
 * Replaces the previous mock implementation.
 */
export async function fetchKeys(): Promise<EnrichedKey[]> {
  const rows = await listKeysByUser("usr_mock");
// @ts-ignore
  return rows.map((key) => {
    const provider = getProvider(key.provider_id);
    return {
      ...key,
      provider: provider
        ? { name: provider.name, key_page_url: provider.key_page_url }
        : { name: key.provider_id, key_page_url: "#" },
    };
  });
}

/**
 * Permanently deletes a key by ID via the real DELETE route.
 * SPEC: immediate, irreversible delete — not a soft flag. (section 2)
 */
export async function deleteKey(id: string): Promise<void> {
  const response = await fetch(`/api/keys/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("DeleteKeyError");
  }
}