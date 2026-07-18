/**
 * @keybridge/security — Public API
 *
 * Everything a consumer needs is exported from this single entry point.
 * Internal helpers (e.g. randomBytes wrappers) are NOT exported — they
 * are implementation details.
 */

// Core types
export type {
  EncryptedPayload,
  StorageMode,
  KeyStatus,
  ConnectedKeyRecord,
  StorageAdapter,
  DeriveKeyParams,
  EncryptParams,
  DecryptParams,
} from "./types.js";

// Encryption primitives (for advanced consumers; most should use adapters)
export { encrypt, decrypt, isEncryptedPayload } from "./crypto/encryption.js";

// Key derivation
export { deriveUserKey, masterSecretFromEnv } from "./crypto/key-derivation.js";

// Cloud adapter (server-side)
export { CloudStorageAdapter, runMigrations } from "./adapters/cloud-adapter.js";
export type { CloudAdapterConfig } from "./adapters/cloud-adapter.js";

// Local adapter (browser-side only — do not import on the server)
// Consumers should dynamically import this: import("@keybridge/security/local")
// to avoid bundling IndexedDB polyfills on the server.
export { LocalVaultAdapter } from "./adapters/local-adapter.js";
