import React from "react";
import { useAuth } from "../context/AuthContext";

export function WelcomePage() {
  const { user } = useAuth();
  // RequireVerifiedAuth guarantees `user` is non-null and verified by the
  // time this renders — this null check is just defensive, not a real
  // code path under normal routing.
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
