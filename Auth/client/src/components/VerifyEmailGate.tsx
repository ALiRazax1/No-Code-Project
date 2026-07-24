import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BrandMark } from "./BrandMark";

/**
 * <VerifyEmailGate />
 * ---------------------------------------------------------------------------
 * Rendered INSTEAD OF the app's real content whenever someone is signed in
 * but `user.emailVerified` is false — covers both "just signed up" and
 * "signed in to an old unverified account". This is a deliberate design
 * choice: the backend still lets an unverified user sign in and hold a
 * valid session (many real products work this way), and the frontend is
 * what decides how strict to be about it. Blocking here, rather than at
 * sign-in itself, means an app using this SDK can change that policy
 * without touching the server.
 *
 * The `focus` listener is what handles the common real-world case of
 * verifying in a different tab (or on your phone) and coming back to this
 * one — without it, this tab would keep showing the gate until the next
 * silent refresh (up to ~13 minutes later) even though the account is
 * already verified.
 */
export function VerifyEmailGate() {
  const { user, resendVerification, signOut, refresh } = useAuth();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    function handleFocus() {
      refresh();
    }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);

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
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="relative flex w-full max-w-sm items-center justify-center font-body">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-gradient-to-br from-mc-violet/30 via-mc-teal/10 to-transparent blur-3xl"
        />

        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <div className="mx-auto mb-4">
            <BrandMark />
          </div>

          <h1 className="font-display text-xl font-semibold tracking-tight text-mc-text">
            Verify your email
          </h1>
          <p className="mt-2 text-sm text-mc-muted">
            We sent a link to{" "}
            <span className="font-medium text-mc-text">{user?.email}</span>. Open it to
            continue — coming back to this tab afterward will pick it up automatically.
          </p>

          {status === "sent" ? (
            <p className="mt-6 text-xs font-medium text-mc-teal">
              Verification email sent again ✓
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={status === "sending"}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-mc-violet to-mc-violet-dim py-2.5 text-sm font-semibold text-white shadow-lg shadow-mc-violet/20 transition-all duration-200 hover:shadow-mc-violet/40 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "sending"
                ? "Sending…"
                : status === "error"
                ? "Try again"
                : "Resend verification email"}
            </button>
          )}

          <button
            type="button"
            onClick={signOut}
            className="mt-4 text-xs font-medium text-mc-muted transition-colors hover:text-mc-text"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
