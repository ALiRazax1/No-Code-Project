/**
 * Client-safe dashboard actions.
 * These use fetch() only — no direct database imports.
 */

export async function deleteKey(id: string): Promise<void> {
  const response = await fetch(`/api/keys/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("DeleteKeyError");
  }
}