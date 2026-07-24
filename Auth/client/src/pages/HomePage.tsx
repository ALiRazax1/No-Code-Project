import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SignInCard } from "../components/SignInCard";
import { VerifyEmailGate } from "../components/VerifyEmailGate";

function WelcomeDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold text-mc-text">
          Welcome, {user.name.split(" ")[0]} 👋
        </h2>
        <p className="mt-2 text-sm text-mc-muted">You're signed in as {user.email}</p>
      </div>
    </main>
  );
}

export function HomePage() {
  const { isSignedIn, isLoaded, user } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-mc-muted">
        Loading session…
      </div>
    );
  }

  if (isSignedIn && user) {
    // Signed in doesn't automatically mean "let them into the app" — see
    // VerifyEmailGate for why this check lives here, at the frontend
    // layer, rather than being enforced by the backend at sign-in time.
    if (!user.emailVerified) {
      return <VerifyEmailGate />;
    }
    return <WelcomeDashboard />;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <SignInCard />
      <Link
        to="/forgot-password"
        className="text-xs font-medium text-mc-muted transition-colors hover:text-mc-teal"
      >
        Forgot your password?
      </Link>
    </main>
  );
}
