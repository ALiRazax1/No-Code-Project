import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserButton } from "./components/UserButton";
import { VerifyEmailGate } from "./components/VerifyEmailGate";
import { SignInPage } from "./pages/SignInPage";
import { WelcomePage } from "./pages/WelcomePage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { RedirectIfAuthed, RequireUnverifiedAuth, RequireVerifiedAuth } from "./routes/guards";

function Navbar() {
  const { isSignedIn, user } = useAuth();
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <span className="font-display text-sm font-semibold tracking-tight text-mc-text">
        Auth <span className="text-mc-muted">/ demo</span>
      </span>
      {isSignedIn && user ? (
        <UserButton />
      ) : (
        <span className="text-xs text-mc-muted">Not signed in</span>
      )}
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex min-h-screen flex-col bg-mc-bg bg-[radial-gradient(ellipse_at_top,_rgba(124,108,255,0.12),_transparent_60%)]">
          <Navbar />
          <Routes>
            {/* Public — redirects away the moment you're already signed in. */}
            <Route
              path="/"
              element={
                <RedirectIfAuthed>
                  <SignInPage />
                </RedirectIfAuthed>
              }
            />

            {/* Only reachable signed-in-but-unverified; everyone else is
                redirected elsewhere by the guard. */}
            <Route
              path="/verify-required"
              element={
                <RequireUnverifiedAuth>
                  <VerifyEmailGate />
                </RequireUnverifiedAuth>
              }
            />

            {/* The protected dashboard — strictly unreachable unless signed
                in AND verified. */}
            <Route
              path="/welcome"
              element={
                <RequireVerifiedAuth>
                  <WelcomePage />
                </RequireVerifiedAuth>
              }
            />

            {/* Public, token-driven — these read `?token=` from the URL
                themselves, no guard needed since a missing/invalid token is
                handled by the page, not by auth state. */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Anything unrecognized falls back to home rather than a blank page. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
