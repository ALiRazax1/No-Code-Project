import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * <UserButton />
 * ---------------------------------------------------------------------------
 * A minimalist circular avatar. Clicking it opens a small popup with the
 * signed-in user's name, email, and a sign-out action. The soft teal ring
 * that breathes around the avatar is Auth's "live session" signature —
 * a quiet, ambient cue that the session is active, not just a static badge.
 */
export function UserButton() {
  const { user, signOut, signOutAllDevices, isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);
  // A destructive action reaching every device deserves a confirm step —
  // this just requires a second click on the same button rather than a
  // separate modal, to stay consistent with the rest of this component's
  // lightweight interaction style. Reset whenever the menu closes (below)
  // so it never lingers into the next time someone opens it.
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Menu just closed — clear the confirm step so reopening it always
  // starts fresh, rather than sitting one click away from signing out
  // everywhere because of how the menu was left last time.
  useEffect(() => {
    if (!open) setConfirmSignOutAll(false);
  }, [open]);

  if (!isSignedIn || !user) return null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  }

  async function handleSignOutAllDevices() {
    if (!confirmSignOutAll) {
      setConfirmSignOutAll(true);
      return;
    }
    setSigningOutAll(true);
    try {
      await signOutAllDevices();
    } finally {
      setSigningOutAll(false);
      setConfirmSignOutAll(false);
      setOpen(false);
    }
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div ref={containerRef} className="relative inline-block font-body">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group relative flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-mc-teal/40 ring-offset-2 ring-offset-mc-bg transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        {/* Breathing "live session" ring — the signature micro-interaction */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full animate-mc-pulse-ring"
        />
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-mc-violet to-mc-teal text-xs font-semibold text-mc-bg">
            {initials || "?"}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-mc-fade-in absolute right-0 z-50 mt-3 w-64 origin-top-right rounded-xl border border-white/10 bg-mc-surface/95 p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          {/* Identity header */}
          <div className="flex items-center gap-3 rounded-lg px-3 py-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-mc-violet to-mc-teal text-sm font-semibold text-mc-bg">
                {initials || "?"}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-mc-text">
                {user.name}
              </p>
              <p className="truncate text-xs text-mc-muted">{user.email}</p>
            </div>
          </div>

          <div className="my-1 h-px bg-white/10" />

          <button
            type="button"
            onClick={handleSignOutAllDevices}
            disabled={signingOutAll}
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-mc-error-dim transition-colors duration-150 hover:bg-mc-error/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SignOutAllIcon />
            {signingOutAll
              ? "Signing out everywhere…"
              : confirmSignOutAll
              ? "Click again to confirm"
              : "Sign out of all devices"}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-mc-error-dim transition-colors duration-150 hover:bg-mc-error/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <SignOutIcon />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

function SignOutIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SignOutAllIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <path d="M14 8l4 4-4 4" />
      <line x1="18" y1="12" x2="10.5" y2="12" />
    </svg>
  );
}
