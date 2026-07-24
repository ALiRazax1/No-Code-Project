import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ResetPasswordCard } from "../components/ResetPasswordCard";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 text-center font-body shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <p className="text-sm text-mc-muted">
            This link is missing its reset token, so there's nothing to act on here.
          </p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block text-xs font-medium text-mc-teal transition-colors hover:text-mc-teal/80"
          >
            Request a new reset link →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ResetPasswordCard token={token} onSuccess={() => navigate("/")} />
    </main>
  );
}
