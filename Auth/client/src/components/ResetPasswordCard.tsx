import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BrandMark } from "./BrandMark";

interface ResetPasswordCardProps {
  /** The raw token from the email link — read it from wherever your
   *  router exposes the `?token=` query param on the `/reset-password`
   *  page and pass it straight through. */
  token: string;
  /** Called after a successful reset. The user is NOT automatically signed
   *  in (the server revokes every session on reset), so this is typically
   *  a redirect to your sign-in page. */
  onSuccess?: () => void;
}

/**
 * <ResetPasswordCard />
 * ---------------------------------------------------------------------------
 * The other half of the forgot-password flow: takes the token from the
 * email link plus a new password, and submits them. A successful reset
 * revokes every existing session server-side, so this deliberately does
 * not sign the person back in — they confirm their new password by
 * actually using it to sign in again.
 */
export function ResetPasswordCard({ token, onSuccess }: ResetPasswordCardProps) {
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords don't match.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      await resetPassword(token, password);
      setStatus("done");
      onSuccess?.();
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
              Choose a new password
            </h1>
            <p className="mt-1 text-sm text-mc-muted">
              You'll need to sign in again afterward
            </p>
          </div>
        </div>

        {status === "done" ? (
          <div className="animate-mc-fade-in rounded-lg border border-mc-teal/20 bg-mc-teal/10 px-4 py-3 text-sm text-mc-text">
            Your password has been reset. Every existing session has been signed out — head
            back to sign in with your new password.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-mc-muted">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-mc-text placeholder:text-mc-muted/50 outline-none transition-all duration-150 focus:border-mc-violet/60 focus:bg-black/30 focus:ring-2 focus:ring-mc-violet/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-mc-muted">Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
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
              {status === "loading" ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
