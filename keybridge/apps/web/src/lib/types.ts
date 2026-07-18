export type ProviderId = 'openai' | 'anthropic' | 'google_gemini' | 'elevenlabs' | 'openrouter';

export type StorageMode = 'cloud' | 'local';

export type ValidationErrorCode =
  | 'invalid_key'
  | 'out_of_credits'
  | 'rate_limited'
  | 'permission_denied'
  | 'network_error'
  | 'unknown';

export interface ValidationResult {
  success: boolean;
  errorCode?: ValidationErrorCode;
}

export interface Provider {
  name: string;
  signup_url: string;
  key_page_url: string;
  key_format_regex: string;
  test_endpoint: string;
  supported_intents: Intent[];
}

export type Intent = 'chat' | 'image' | 'speech' | 'embeddings';

export interface IntentOption {
  id: Intent;
  label: string;
  description: string;
  icon: string;
}

// Wizard step states
export type WizardStep =
  | 'intent'       // Step 1: pick what you want to do
  | 'guidance'     // Step 2–4: panel + popup + paste
  | 'storage'      // Step 6: cloud vs local choice
  | 'done';        // Step 7: success / go to dashboard

export interface WizardState {
  step: WizardStep;
  intent: Intent | null;
  providerId: ProviderId | null;
  keyValue: string;
  validationResult: ValidationResult | null;
  storageMode: StorageMode;
  isValidating: boolean;
}
