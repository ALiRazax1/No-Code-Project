import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BrandMark } from "./BrandMark";

interface ForgotPasswordCardProps {
  /** Called when the person wants to go back to signing in instead. */
  onBackToSignIn?: () => void;
}

/**
 * <ForgotPasswordCard />
 * ---------------------------------------------------------------------------
 * Collects an email and requests a password-reset link. Always shows the
 * same success message regardless of whether an account exists for that
 * email — the backend deliberately returns an identical response either
 * way (see authController.forgotPassword), and the UI shouldn't undo that
 * by reacting differently to the two cases.
 */
export function ForgotPasswordCard({ onBackToSignIn }: ForgotPasswordCardProps) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      await forgotPassword(email);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="relative flex w-full max-w-sm items-center justify-center font-body">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-gradient-to-br from-mc-violet/30 via-mc-teal/10 to-transparent blur-3xl"
      />

      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark />
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-mc-text">
              Reset your password
            </h1>
            <p className="mt-1 text-sm text-mc-muted">
              Enter your email and we'll send you a reset link
            </p>
          </div>
        </div>

        {status === "sent" ? (
          <div className="animate-mc-fade-in rounded-lg border border-mc-teal/20 bg-mc-teal/10 px-4 py-3 text-sm text-mc-text">
            If an account exists for <span className="font-medium">{email}</span>, a reset
            link is on its way. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-mc-muted">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                maxLength={254}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-mc-text placeholder:text-mc-muted/50 outline-none transition-all duration-150 focus:border-mc-violet/60 focus:bg-black/30 focus:ring-2 focus:ring-mc-violet/20"
              />
            </label>

            {status === "error" && (
              <p className="animate-mc-fade-in rounded-lg border border-mc-error/20 bg-mc-error/10 px-3 py-2 text-sm text-mc-error-dim">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-2 flex items-center justify-center rounded-lg bg-gradient-to-r from-mc-violet to-mc-violet-dim py-2.5 text-sm font-semibold text-white shadow-lg shadow-mc-violet/20 transition-all duration-200 hover:shadow-mc-violet/40 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "loading" ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        {onBackToSignIn && (
          <button
            type="button"
            onClick={onBackToSignIn}
            className="mt-6 w-full text-center text-xs font-medium text-mc-teal transition-colors hover:text-mc-teal/80"
          >
            ← Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
