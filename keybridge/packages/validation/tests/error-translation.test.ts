import { translateError } from "../src/error-translation";
import type { ValidationErrorCode } from "../src/types";

describe("translateError", () => {
  describe("INVALID_KEY", () => {
    it("returns the spec-mandated message", () => {
      expect(translateError("INVALID_KEY")).toBe(
        "This key doesn't look right — check you copied the whole thing."
      );
    });
  });

  describe("BAD_FORMAT", () => {
    it("returns the same message as INVALID_KEY (both are key-wrong signals)", () => {
      expect(translateError("BAD_FORMAT")).toBe(
        "This key doesn't look right — check you copied the whole thing."
      );
    });
  });

  describe("INSUFFICIENT_QUOTA", () => {
    it("contains the out-of-credits message", () => {
      const msg = translateError("INSUFFICIENT_QUOTA");
      expect(msg).toContain("out of credits");
    });

    it("includes the billing URL when provided", () => {
      const billingUrl = "https://platform.openai.com/settings/organization/billing";
      const msg = translateError("INSUFFICIENT_QUOTA", billingUrl);
      expect(msg).toContain(billingUrl);
    });

    it("does not throw when billing URL is omitted", () => {
      expect(() => translateError("INSUFFICIENT_QUOTA")).not.toThrow();
    });

    it("includes the direct link copy from the spec", () => {
      const msg = translateError("INSUFFICIENT_QUOTA");
      expect(msg).toContain("direct link to add funds");
    });
  });

  describe("RATE_LIMITED", () => {
    it("returns the spec-mandated message", () => {
      expect(translateError("RATE_LIMITED")).toBe(
        "Too many requests too fast — wait a minute and try again."
      );
    });
  });

  describe("PERMISSION_DENIED", () => {
    it("returns the spec-mandated message", () => {
      expect(translateError("PERMISSION_DENIED")).toBe(
        "This key doesn't have access to that feature yet — check your provider account settings."
      );
    });
  });

  describe("NETWORK_ERROR", () => {
    it("returns the spec-mandated message", () => {
      expect(translateError("NETWORK_ERROR")).toBe(
        "We couldn't reach the provider — check your internet connection and try again."
      );
    });
  });

  describe("UNKNOWN_ERROR", () => {
    it("returns the generic fallback message", () => {
      expect(translateError("UNKNOWN_ERROR")).toBe(
        "Something went wrong validating this key. You can try again or remove it and start over."
      );
    });
  });

  describe("UNKNOWN_PROVIDER", () => {
    it("returns the generic fallback message", () => {
      expect(translateError("UNKNOWN_PROVIDER")).toBe(
        "Something went wrong validating this key. You can try again or remove it and start over."
      );
    });
  });

  describe("exhaustiveness — all error codes produce a non-empty string", () => {
    const allCodes: ValidationErrorCode[] = [
      "INVALID_KEY",
      "INSUFFICIENT_QUOTA",
      "RATE_LIMITED",
      "PERMISSION_DENIED",
      "NETWORK_ERROR",
      "BAD_FORMAT",
      "UNKNOWN_PROVIDER",
      "UNKNOWN_ERROR",
    ];

    allCodes.forEach((code) => {
      it(`produces a non-empty string for ${code}`, () => {
        const msg = translateError(code);
        expect(typeof msg).toBe("string");
        expect(msg.length).toBeGreaterThan(0);
      });
    });
  });

  describe("security — messages never contain raw provider error terms", () => {
    const sensitiveTerms = ["401", "403", "429", "HTTP", "fetch", "Error:", "undefined", "null"];
    const allCodes: ValidationErrorCode[] = [
      "INVALID_KEY",
      "INSUFFICIENT_QUOTA",
      "RATE_LIMITED",
      "PERMISSION_DENIED",
      "NETWORK_ERROR",
      "BAD_FORMAT",
      "UNKNOWN_PROVIDER",
      "UNKNOWN_ERROR",
    ];

    allCodes.forEach((code) => {
      sensitiveTerms.forEach((term) => {
        it(`"${code}" message does not expose "${term}"`, () => {
          const msg = translateError(code);
          expect(msg).not.toContain(term);
        });
      });
    });
  });
});
