import React from "react";
import { useNavigate } from "react-router-dom";
import { ForgotPasswordCard } from "../components/ForgotPasswordCard";

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ForgotPasswordCard onBackToSignIn={() => navigate("/")} />
    </main>
  );
}
