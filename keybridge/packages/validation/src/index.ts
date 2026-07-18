/**
 * @keybridge/validation
 *
 * Standalone, independently auditable module that handles:
 *   1. Provider registry — static config for all supported AI providers
 *   2. Key format pre-validation — regex check before any network call
 *   3. Live key validation — one test call per provider, result normalized
 *   4. Error translation — internal error codes → plain-English user messages
 *
 * Nothing in this module logs plaintext keys or sends them anywhere except
 * the provider's own test endpoint during an explicit validation call.
 */

export { validateKey, getProvider, getProvidersForIntent } from "./validate-key";
export { translateError } from "./error-translation";
export type {
  ProviderId,
  Intent,
  ProviderConfig,
  ProviderRegistry,
  ValidationErrorCode,
  ValidationSuccess,
  ValidationFailure,
  ValidationResult,
} from "./types";
