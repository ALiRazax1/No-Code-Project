import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * <EmailVerificationBanner />
 * ---------------------------------------------------------------------------
 * A slim, dismissible-feeling (but not actually dismissible — it comes back
 * on reload until the email really is verified) banner prompting an
 * unverified user to check their inbox, with a one-click resend. Renders
 * nothing at all once the user is verified or signed out, so it's safe to
 * drop at the top of any layout unconditionally.
 */
export function EmailVerificationBanner() {
  const { user, resendVerification } = useAuth();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!user || user.emailVerified) return null;

  async function handleResend() {
    setStatus("sending");
    try {
      await resendVerification();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-mc-violet/10 px-4 py-2.5 font-body text-sm">
      <span className="text-mc-text">
        Verify your email address to finish setting up your account.
      </span>

      {status === "sent" ? (
        <span className="whitespace-nowrap text-xs font-medium text-mc-teal">
          Verification email sent ✓
        </span>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={status === "sending"}
          className="whitespace-nowrap rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-mc-text transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : status === "error" ? "Try again" : "Resend email"}
        </button>
      )}
    </div>
  );
}
