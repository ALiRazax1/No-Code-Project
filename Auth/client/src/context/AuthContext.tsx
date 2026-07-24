import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { authApi, type AuthUser } from "../api/authApi";

interface AuthContextValue {
  user: AuthUser | null;
  /** True once the initial session check has finished, regardless of outcome. */
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Revokes every session for the signed-in user — every device,
   *  including this one — and signs this tab out too, the same as
   *  signOut(). Use for a "sign out of all devices" action. */
  signOutAllDevices: () => Promise<void>;
  /** Re-runs the "am I signed in?" check — handy after cross-tab sign-out. */
  refresh: () => Promise<void>;
  /** Consumes a token from a verification email link. Updates `user` in
   *  place on success (so `user.emailVerified` flips without a page
   *  reload) — typically called from whatever page `APP_URL/verify-email`
   *  routes to. */
  verifyEmail: (token: string) => Promise<void>;
  /** Requests a new verification email for the signed-in user. Resolves
   *  with `alreadyVerified: true` as a no-op if they're already verified,
   *  rather than treating that as an error. */
  resendVerification: () => Promise<{ alreadyVerified: boolean }>;
  /** Always resolves, whether or not the email has an account — the
   *  server deliberately returns the same response either way to prevent
   *  using this as a way to discover registered emails. */
  forgotPassword: (email: string) => Promise<{ message: string }>;
  /** Consumes a token from a password-reset email link. On success, every
   *  session for that user (including any others on other devices) is
   *  revoked server-side, so this does not sign the current tab back in —
   *  redirect to sign-in afterward. */
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The access token lives for 15 minutes server-side (see server/src/config.ts).
// Refreshing a couple of minutes early means a user is, in practice, never
// the one who discovers an expired token — the client renews it quietly in
// the background first.
const SILENT_REFRESH_INTERVAL_MS = 13 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSilentRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const startSilentRefresh = useCallback(() => {
    stopSilentRefresh();
    refreshTimerRef.current = setInterval(async () => {
      const result = await authApi.refresh();
      // If the refresh token itself has expired or been revoked (e.g. the
      // user signed out in another tab), fall back to signed-out state.
      if (!result) {
        setUser(null);
        stopSilentRefresh();
        return;
      }
      setUser(result.user);
    }, SILENT_REFRESH_INTERVAL_MS);
  }, [stopSilentRefresh]);

  // Background check on mount: "does this browser already have a valid
  // refresh-token cookie?" This is what makes AuthProvider a true
  // drop-in — consumers never have to manually kick off the initial auth
  // check, and a page refresh doesn't sign anyone out.
  const loadSession = useCallback(async () => {
    const result = await authApi.refresh();
    if (result) {
      setUser(result.user);
      startSilentRefresh();
    } else {
      setUser(null);
      stopSilentRefresh();
    }
    setIsLoaded(true);
  }, [startSilentRefresh, stopSilentRefresh]);

  // `hasLoadedRef` guards against a real, somewhat serious bug: in dev,
  // React.StrictMode intentionally mounts every component twice (mount →
  // cleanup → mount) to surface effects with unsafe side effects. Without
  // this guard, loadSession() — which calls /refresh and ROTATES the
  // refresh token — would fire twice almost simultaneously. If the second
  // call goes out before the first call's response has updated the
  // browser's cookie, it presents an already-rotated (stale) token, which
  // is exactly what the server's reuse-detection is designed to catch —
  // treating it as a stolen token and revoking the ENTIRE session. The
  // practical symptom would be: reload the page while signed in, in dev,
  // and get silently signed out. This ref makes the real network call
  // fire at most once per mount, the same fix applied in
  // pages/VerifyEmailPage.tsx for the same underlying reason.
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadSession();
    }
    return stopSilentRefresh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { user: signedInUser } = await authApi.signIn({ email, password });
      setUser(signedInUser);
      startSilentRefresh();
    },
    [startSilentRefresh]
  );

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { user: newUser } = await authApi.signUp({ email, password, name });
      setUser(newUser);
      startSilentRefresh();
    },
    [startSilentRefresh]
  );

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setUser(null);
    stopSilentRefresh();
  }, [stopSilentRefresh]);

  const signOutAllDevices = useCallback(async () => {
    await authApi.signOutAllDevices();
    setUser(null);
    stopSilentRefresh();
  }, [stopSilentRefresh]);

  const verifyEmail = useCallback(
    async (token: string) => {
      const { user: verifiedUser } = await authApi.verifyEmail(token);
      setUser(verifiedUser);
      // The server now issues a real session on successful verification
      // (see authController.verifyEmail), so this browser needs the same
      // ongoing silent-refresh loop sign-in/sign-up already start — this
      // matters most for a device that was never signed in on its own
      // (e.g. opening the email on your phone), but it's harmless to call
      // even when this browser already had a session running, since
      // startSilentRefresh always clears any existing timer first.
      startSilentRefresh();
    },
    [startSilentRefresh]
  );

  const resendVerification = useCallback(async () => {
    const result = await authApi.resendVerification();
    return { alreadyVerified: result.alreadyVerified };
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const result = await authApi.forgotPassword(email);
    return { message: result.message };
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    // Deliberately does NOT update `user` or start silent refresh — the
    // server revokes every session on a successful reset, so the correct
    // UX is to send the person to sign in again with their new password,
    // not to act as if this tab is still authenticated.
    await authApi.resetPassword(token, newPassword);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoaded,
      isSignedIn: user !== null,
      signIn,
      signUp,
      signOut,
      signOutAllDevices,
      refresh: loadSession,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
    }),
    [
      user,
      isLoaded,
      signIn,
      signUp,
      signOut,
      signOutAllDevices,
      loadSession,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth
 * ---------------------------------------------------------------------------
 * The primary hook consumers reach for. Deliberately small surface area:
 * { user, isSignedIn, isLoaded, signOut() } — mirrors the brief exactly.
 * `signIn` / `signUp` / `refresh` are also available for building custom UI.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() must be used within a <AuthProvider>");
  }
  return ctx;
}
