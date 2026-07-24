import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { BrandMark } from "./BrandMark";
import { brand } from "../config/brand";

type Mode = "sign-in" | "sign-up";

interface SignInCardProps {
  /** Called after a successful sign-in or sign-up. */
  onSuccess?: () => void;
  /** Starting tab — defaults to "sign-in". */
  defaultMode?: Mode;
}

/**
 * <SignInCard />
 * ---------------------------------------------------------------------------
 * A drop-in, frosted-glass authentication card. Handles both sign-in and
 * sign-up in one component via a tab toggle, with inline validation-style
 * feedback and a loading state on submit.
 */
export function SignInCard({ onSuccess, defaultMode = "sign-in" }: SignInCardProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isSignUp = mode === "sign-up";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      setStatus("idle");
      onSuccess?.();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="relative flex min-h-[560px] w-full max-w-sm items-center justify-center font-body">
      {/* Ambient gradient glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-16 -z-10 rounded-full bg-gradient-to-br from-mc-violet/30 via-mc-teal/10 to-transparent blur-3xl"
      />

      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        {/* Wordmark */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark />
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-mc-text">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-mc-muted">
              {isSignUp
                ? `Sign up to continue to ${brand.appName}`
                : `Sign in to continue to ${brand.appName}`}
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex rounded-lg border border-white/10 bg-black/20 p-1">
          {(["sign-in", "sign-up"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setStatus("idle");
                setErrorMessage("");
              }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all duration-200 ${
                mode === m
                  ? "bg-white/10 text-mc-text shadow-sm"
                  : "text-mc-muted hover:text-mc-text"
              }`}
            >
              {m === "sign-in" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <Field
              label="Full name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Ada Lovelace"
              autoComplete="name"
              required
              maxLength={100}
            />
          )}

          <Field
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
            required
            maxLength={254}
          />

          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={8}
            maxLength={72}
          />

          {status === "error" && (
            <p className="animate-mc-fade-in rounded-lg border border-mc-error/20 bg-mc-error/10 px-3 py-2 text-sm text-mc-error-dim">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="group relative mt-2 flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-mc-violet to-mc-violet-dim py-2.5 text-sm font-semibold text-white shadow-lg shadow-mc-violet/20 transition-all duration-200 hover:shadow-mc-violet/40 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <Spinner />
                {isSignUp ? "Creating account…" : "Signing in…"}
              </span>
            ) : (
              <span>{isSignUp ? "Create account" : "Sign in"}</span>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-mc-muted">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(isSignUp ? "sign-in" : "sign-up")}
            className="font-medium text-mc-teal transition-colors hover:text-mc-teal/80"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>

        <p className="mt-6 text-center text-[11px] text-mc-muted/70">
          {brand.footerPrefix} <span className="font-medium text-mc-muted">{brand.appName}</span>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  maxLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-mc-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-mc-text placeholder:text-mc-muted/50 outline-none transition-all duration-150 focus:border-mc-violet/60 focus:bg-black/30 focus:ring-2 focus:ring-mc-violet/20"
      />
    </label>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-white"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
