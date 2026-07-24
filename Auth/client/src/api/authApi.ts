export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface ApiError {
  error: string;
  code?:
    | "NO_SESSION"
    | "SESSION_EXPIRED"
    | "INVALID_SESSION"
    | "SESSION_REUSE_DETECTED"
    | "RATE_LIMITED"
    | "INVALID_TOKEN"
    | "TOKEN_EXPIRED"
    | "CSRF_VALIDATION_FAILED";
}

const DEFAULT_BASE_URL = "http://localhost:4000/api";

class AuthApiError extends Error {
  code?: ApiError["code"];
  status: number;
  constructor(message: string, status: number, code?: ApiError["code"]) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Thin fetch wrapper for the Auth backend.
 *
 * Three things make this more than a plain fetch wrapper:
 *  - It holds the access token in memory (a module-level variable) and
 *    attaches it as `Authorization: Bearer <token>` on every request. The
 *    token is never persisted to localStorage/sessionStorage — that would
 *    make it readable by any injected script (XSS). It lives only as long
 *    as the page does.
 *  - `credentials: "include"` on every call is what lets the browser send
 *    and receive the HttpOnly refresh-token cookie, which the frontend
 *    JavaScript can never read directly.
 *  - It holds a CSRF token in memory the same way, handed back by the
 *    server on sign-up/sign-in/refresh, and attaches it as
 *    `X-CSRF-Token`. The server derives its own expected value from the
 *    session id inside the (unreadable) refresh cookie, so this header is
 *    only useful to a client that already went through a real
 *    sign-in/refresh — see server/src/utils/csrf.ts for the full reasoning.
 */
function createApiClient(baseUrl: string = DEFAULT_BASE_URL) {
  let accessToken: string | null = null;
  let csrfToken: string | null = null;

  function setAccessToken(token: string | null) {
    accessToken = token;
  }

  function getAccessToken() {
    return accessToken;
  }

  function setCsrfToken(token: string | null) {
    csrfToken = token;
  }

  async function rawRequest<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      credentials: "include",
      ...options,
      headers,
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = body as ApiError;
      throw new AuthApiError(
        err.error ?? `Request failed with status ${res.status}`,
        res.status,
        err.code
      );
    }

    return body as T;
  }

  /** Calls POST /auth/refresh using the HttpOnly cookie. Never throws for
   *  the "no session" case — callers treat a null return as "signed out". */
  async function refresh(): Promise<{ user: AuthUser } | null> {
    try {
      const result = await rawRequest<{
        user: AuthUser;
        accessToken: string;
        csrfToken: string;
      }>("/auth/refresh", { method: "POST" });
      setAccessToken(result.accessToken);
      setCsrfToken(result.csrfToken);
      return { user: result.user };
    } catch {
      setAccessToken(null);
      setCsrfToken(null);
      return null;
    }
  }

  /**
   * Wraps a request with one automatic retry: if the access token has
   * expired (401 SESSION_EXPIRED), silently refresh it once and replay the
   * original request. This is what makes token expiry invisible to the rest
   * of the app — a component calling `getCurrentUser()` never needs to know
   * the access token is only good for 15 minutes.
   */
  async function requestWithRefresh<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      return await rawRequest<T>(path, options);
    } catch (err) {
      const isExpired =
        err instanceof AuthApiError && err.code === "SESSION_EXPIRED";
      if (!isExpired) throw err;

      const refreshed = await refresh();
      if (!refreshed) throw err;

      return rawRequest<T>(path, options);
    }
  }

  return {
    getAccessToken,

    signUp: async (input: { email: string; password: string; name: string }) => {
      const result = await rawRequest<{
        user: AuthUser;
        accessToken: string;
        csrfToken: string;
      }>("/auth/sign-up", { method: "POST", body: JSON.stringify(input) });
      setAccessToken(result.accessToken);
      setCsrfToken(result.csrfToken);
      return { user: result.user };
    },

    signIn: async (input: { email: string; password: string }) => {
      const result = await rawRequest<{
        user: AuthUser;
        accessToken: string;
        csrfToken: string;
      }>("/auth/sign-in", { method: "POST", body: JSON.stringify(input) });
      setAccessToken(result.accessToken);
      setCsrfToken(result.csrfToken);
      return { user: result.user };
    },

    signOut: async () => {
      try {
        return await rawRequest<{ ok: true }>("/auth/sign-out", { method: "POST" });
      } finally {
        // Always clear both in-memory tokens, even if the network call
        // fails — the user clicked "sign out" and the client should
        // reflect that regardless of what the server did.
        setAccessToken(null);
        setCsrfToken(null);
      }
    },

    /** Revokes every session for the signed-in user — every device,
     *  including this one — and clears this client's own tokens
     *  afterward, the same as signOut. Requires an active session; the
     *  access token is attached automatically by rawRequest, same as
     *  getCurrentUser and resendVerification. */
    signOutAllDevices: async () => {
      try {
        return await requestWithRefresh<{ ok: true }>("/auth/sign-out-all", {
          method: "POST",
        });
      } finally {
        setAccessToken(null);
        setCsrfToken(null);
      }
    },

    refresh,

    getCurrentUser: () =>
      requestWithRefresh<{ user: AuthUser }>("/auth/user", { method: "GET" }),

    /** Also signs this browser in on success — the server now issues a
     *  fresh session when a verification link is used, so a device that
     *  never signed up/in directly (e.g. opening the email on your phone)
     *  ends up authenticated too, not just shown a confirmation screen. */
    verifyEmail: async (token: string) => {
      const result = await rawRequest<{
        user: AuthUser;
        accessToken: string;
        csrfToken: string;
      }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      setAccessToken(result.accessToken);
      setCsrfToken(result.csrfToken);
      return { user: result.user };
    },

    /** Requires an active session — the access token is attached
     *  automatically by rawRequest, same as getCurrentUser. */
    resendVerification: () =>
      requestWithRefresh<{ ok: true; alreadyVerified: boolean }>(
        "/auth/resend-verification",
        { method: "POST" }
      ),

    forgotPassword: (email: string) =>
      rawRequest<{ ok: true; message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, newPassword: string) =>
      rawRequest<{ ok: true }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      }),
  };
}

export const authApi = createApiClient();
export { createApiClient, AuthApiError };
