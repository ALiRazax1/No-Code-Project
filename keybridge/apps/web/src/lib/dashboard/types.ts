/**
 * Track 4 — Security Dashboard types
 *
 * These types mirror the `connected_keys` table schema from the spec (section 5)
 * and the provider registry shape from Track 2 (`@keybridge/validation`).
 *
 * When Track 1 (@keybridge/security) is wired in, ConnectedKey should be
 * imported from that package rather than redefined here.
 */

export type StorageMode = "cloud" | "local";
export type KeyStatus = "active" | "revoked" | "invalid";

/** Matches the connected_keys row shape returned by Track 1's storage adapters */
export interface ConnectedKey {
  id: string;
  user_id: string;
  provider_id: string; // e.g. "openai", "anthropic"
  storage_mode: StorageMode;
  encrypted_key: string | null; // null when storage_mode === 'local'
  last_validated_at: string | null; // ISO 8601
  last_used_at: string | null; // ISO 8601
  status: KeyStatus;
  created_at: string; // ISO 8601
}

/** Subset of the provider registry entry from Track 2's providers.json */
export interface ProviderMeta {
  name: string;
  key_page_url: string;
}

/** ConnectedKey enriched with display-ready provider metadata */
export interface EnrichedKey extends ConnectedKey {
  provider: ProviderMeta;
}
