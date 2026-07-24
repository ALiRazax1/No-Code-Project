import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ---------------------------------------------------------------------------
 * Route guards
 * ---------------------------------------------------------------------------
 * There are exactly three states a visitor can be in — signed out, signed
 * in but not yet verified, and fully signed in — and each one maps to
 * exactly one reachable route. These wrappers are what make that strict:
 * landing on the wrong route for your current state doesn't render that
 * route's content, it redirects you to whichever route actually matches.
 *
 * This is deliberately enforced here, at the routing layer, rather than
 * left to each page to check individually — a page guarded by
 * RequireVerifiedAuth can assume `user` is non-null and verified without
 * re-checking, the same way an Express route behind `requireAuth` can
 * assume `req.auth` is populated.
 * ---------------------------------------------------------------------------
 */

function LoadingScreen() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-mc-muted">
      Loading session…
    </div>
  );
}

/** Wraps routes that require a fully signed-in, verified user (e.g.
 *  /welcome). Anyone else — signed out, or signed in but unverified — is
 *  redirected to whichever route matches their actual state instead of
 *  ever seeing this route's content. */
export function RequireVerifiedAuth({ children }: { children: React.ReactElement }) {
  const { isSignedIn, isLoaded, user } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn || !user) return <Navigate to="/" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-required" replace />;
  return children;
}

/** Wraps the "please verify your email" gate — only reachable by someone
 *  signed in but not yet verified. An already-verified user is sent on to
 *  /welcome instead of seeing a stale gate; a signed-out visitor is sent
 *  to sign in. */
export function RequireUnverifiedAuth({ children }: { children: React.ReactElement }) {
  const { isSignedIn, isLoaded, user } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn || !user) return <Navigate to="/" replace />;
  if (user.emailVerified) return <Navigate to="/welcome" replace />;
  return children;
}

/** Wraps the public sign-in/sign-up page — redirects AWAY from it the
 *  moment you're already authenticated, so a signed-in user can't
 *  navigate back to "/" and see the login screen again. */
export function RedirectIfAuthed({ children }: { children: React.ReactElement }) {
  const { isSignedIn, isLoaded, user } = useAuth();

  if (!isLoaded) return <LoadingScreen />;
  if (isSignedIn && user) {
    return <Navigate to={user.emailVerified ? "/welcome" : "/verify-required"} replace />;
  }
  return children;
}
