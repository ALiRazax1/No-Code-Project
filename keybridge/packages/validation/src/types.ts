/**
 * Supported provider IDs. These must match the keys in providers.json exactly.
 */
export type ProviderId =
  | "openai"
  | "anthropic"
  | "google_gemini"
  | "elevenlabs"
  | "openrouter";

/**
 * Supported user-facing intents. These are what the user picks on the Intent screen —
 * they never see provider names directly.
 */
export type Intent = "chat" | "image" | "embeddings" | "speech";

/**
 * The shape of a single provider entry from providers.json.
 */
export interface ProviderConfig {
  name: string;
  signup_url: string;
  key_page_url: string;
  /** Billing page for this provider — used in the "out of credits" error message. */
  billing_url: string;
  /** Regex string (not a RegExp object) to pre-validate key format before hitting the network. */
  key_format_regex: string;
  /** The cheapest, read-only endpoint used for the one validation test call. */
  test_endpoint: string;
  supported_intents: Intent[];
}

/**
 * The full registry shape: a map from provider ID to its config.
 */
export type ProviderRegistry = Record<ProviderId, ProviderConfig>;

// ---------------------------------------------------------------------------
// Normalized error codes
// These are our internal error codes — never shown to the user directly.
// They are translated to plain English by translateError().
// ---------------------------------------------------------------------------

export type ValidationErrorCode =
  | "INVALID_KEY"         // 401 — key is wrong or incomplete
  | "INSUFFICIENT_QUOTA"  // 429 — account has no credits/quota left
  | "RATE_LIMITED"        // 429 — too many requests right now
  | "PERMISSION_DENIED"   // 403 — key lacks required permissions
  | "NETWORK_ERROR"       // fetch failed, timeout, DNS failure, etc.
  | "BAD_FORMAT"          // key doesn't match the provider's regex — caught before network call
  | "UNKNOWN_PROVIDER"    // provider_id not found in registry
  | "UNKNOWN_ERROR";      // anything else

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

export interface ValidationSuccess {
  success: true;
  providerId: ProviderId;
  providerName: string;
}

export interface ValidationFailure {
  success: false;
  errorCode: ValidationErrorCode;
  /** The user-facing plain-English message. Populated by translateError(). */
  userMessage: string;
  /**
   * Sanitized debug info for our own logs.
   * Contains HTTP status + error type only — NEVER contains the key or raw error body.
   */
  debugInfo: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;
