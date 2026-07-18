import type { ValidationErrorCode } from "./types";

/**
 * Translates a normalized internal error code into the exact plain-English string
 * shown to the user. These strings are defined in spec section 7 and must not
 * be paraphrased or changed without updating the spec.
 *
 * This is a pure function with no side effects — it never touches the network,
 * never reads config, and never logs anything. The UI layer calls this and
 * decides how to render the result (e.g. appending the billing link separately).
 *
 * @param errorCode - A normalized ValidationErrorCode
 * @param billingUrl - Required only for INSUFFICIENT_QUOTA; the provider-specific
 *                     billing page URL that will be appended to the message.
 * @returns The exact user-facing message string.
 */
export function translateError(
  errorCode: ValidationErrorCode,
  billingUrl?: string
): string {
  switch (errorCode) {
    case "BAD_FORMAT":
    case "INVALID_KEY":
      return "This key doesn't look right — check you copied the whole thing.";

    case "INSUFFICIENT_QUOTA": {
      // Spec: "This account is out of credits. Here's the direct link to add funds."
      // The billing URL is appended by the caller (UI layer) as a rendered link.
      // We embed a placeholder so the UI knows where to inject it.
      const base =
        "This account is out of credits. Here's the direct link to add funds.";
      // If a billing URL was provided, embed it so plain-text callers can use it too.
      return billingUrl ? `${base} ${billingUrl}` : base;
    }

    case "RATE_LIMITED":
      return "Too many requests too fast — wait a minute and try again.";

    case "PERMISSION_DENIED":
      return "This key doesn't have access to that feature yet — check your provider account settings.";

    case "NETWORK_ERROR":
      return "We couldn't reach the provider — check your internet connection and try again.";

    case "UNKNOWN_PROVIDER":
      // Should never surface to users in a working app, but kept as a safe fallback.
      return "Something went wrong validating this key. You can try again or remove it and start over.";

    case "UNKNOWN_ERROR":
    default:
      return "Something went wrong validating this key. You can try again or remove it and start over.";
  }
}
