import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { verifyEmail, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  // Verification tokens are single-use by design, so this effect must run
  // AT MOST once per token, ever — not just "once per mount". In dev,
  // React.StrictMode intentionally mounts every component twice (mount →
  // cleanup → mount) to surface unsafe effects, and without this guard that
  // second mount would call verifyEmail(token) again with an
  // already-consumed token, showing a false "invalid or already used" error
  // even though the first call genuinely succeeded. This ref persists
  // across that remount within the same component instance, so the real
  // network call only ever fires once.
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Wait for AuthProvider's own mount-time session-restore to
    // settle first. Without this, two independent async calls race on
    // mount — this page's verifyEmail(token) and the provider's own
    // background refresh() — and whichever resolves last wins, since both
    // ultimately call setUser(). If the (stale, pre-verification) restore
    // happened to resolve after verifyEmail's (fresh, verified) result,
    // it would silently overwrite the correct state back to unverified —
    // which is exactly the "stuck on verifying, never redirects" bug this
    // guards against. Gating on `isLoaded` guarantees the restore always
    // finishes first, so verifyEmail's result is always the last word.
    if (!isLoaded) return;

    if (!token) {
      setStatus("error");
      setErrorMessage("This link is missing a verification token.");
      return;
    }
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        await verifyEmail(token);
        if (!cancelled) setStatus("success");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately keyed off token + isLoaded only — this should run
    // exactly once per link visited (after the initial restore settles),
    // not re-fire if `verifyEmail` is recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isLoaded]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-center font-body shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mc-violet to-mc-teal shadow-lg shadow-mc-violet/30">
          <span className="font-display text-lg font-bold text-mc-bg">M</span>
        </div>

        {status === "verifying" && (
          <p className="text-sm text-mc-muted">Verifying your email…</p>
        )}

        {status === "success" && (
          <>
            <h1 className="font-display text-xl font-semibold text-mc-text">
              Email verified 🎉
            </h1>
            <p className="mt-2 text-sm text-mc-muted">You're all set.</p>
            <button
              type="button"
              onClick={() => navigate("/welcome")}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-mc-violet to-mc-violet-dim py-2.5 text-sm font-semibold text-white shadow-lg shadow-mc-violet/20 transition-all duration-200 hover:shadow-mc-violet/40 hover:brightness-110 active:scale-[0.98]"
            >
              Continue
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="font-display text-xl font-semibold text-mc-text">
              This link didn't work
            </h1>
            <p className="mt-2 text-sm text-mc-muted">{errorMessage}</p>
            <Link
              to="/"
              className="mt-6 inline-block text-xs font-medium text-mc-teal transition-colors hover:text-mc-teal/80"
            >
              ← Back to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
