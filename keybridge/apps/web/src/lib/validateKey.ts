import { ProviderId, ValidationResult, ValidationErrorCode } from './types';
// import providersJson from './providers.json';
import { getProvider } from '@keybridge/validation';

// type ProvidersMap = Record<string, { key_format_regex: string }>;
// const providers = providersJson as ProvidersMap;

/**
 * Validates a key FORMAT client-side before making any network call.
 * This is a purely local regex check — no request is made here.
 * The server repeats this check independently (defence-in-depth).
 */
export function checkKeyFormat(key: string, providerId: ProviderId): boolean {
  const provider = getProvider(providerId);
  console.log(provider);
  
  if (!provider) return false;
  const regex = new RegExp(provider.key_format_regex); 
  console.log(provider.key_format_regex);
  console.log(key);
  console.log(regex);
  
  console.log(typeof regex);
  console.log(regex.test(key.trim()));
  
  return regex.test(key.trim());
}

/**
 * Validates a key by calling the server-side API route at /api/validate-key.
 *
 * The route makes exactly one test call to the provider's endpoint and
 * returns a normalised ValidationResult. The key is transmitted to our
 * own server (over HTTPS) solely for that purpose and is never stored
 * or logged there. (spec §2)
 *
 * EXTENSION POINT (Track 2):
 *   This function's signature is the public contract for validation.
 *   If Track 2 provides a client-callable validation helper directly,
 *   this function body can be swapped out without touching any component.
 *
 *   Contract:
 *     Input:  key (string), providerId (ProviderId)
 *     Output: Promise<ValidationResult>
 *       success: true  → key is valid and the test call succeeded
 *       success: false → errorCode describes what went wrong (see ValidationErrorCode)
 */
export async function validateKey(
  key: string,
  providerId: ProviderId
): Promise<ValidationResult> {
  // Client-side format check — fast rejection before any network round-trip
  if (!checkKeyFormat(key, providerId)) {
    return { success: false, errorCode: 'invalid_key' as ValidationErrorCode };
    
  }

  try {
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // SECURITY: key is sent over HTTPS to our own server only.
      // The server never logs it, stores it, or forwards it anywhere
      // other than the one provider test call it makes. (spec §2)
      body: JSON.stringify({ key, providerId }),
    });

    // The route always returns JSON, even for 4xx/5xx responses.
    // We read the body regardless of status — the success flag is authoritative.
    const result: ValidationResult = await response.json();
    return result;

  } catch {
    // Network failure between browser and our own server (not the provider).
    // We do not log anything here — there is nothing sensitive to sanitise,
    // but we keep logging consistent: errors are the route's responsibility.
    return { success: false, errorCode: 'network_error' as ValidationErrorCode };
  }
}
