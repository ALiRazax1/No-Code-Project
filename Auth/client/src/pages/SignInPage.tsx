import React from "react";
import { Link } from "react-router-dom";
import { SignInCard } from "../components/SignInCard";

export function SignInPage() {
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
