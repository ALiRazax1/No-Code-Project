import React from "react";
import { brand } from "../config/brand";

/**
 * <BrandMark />
 * ---------------------------------------------------------------------------
 * The single source of truth for the logo glyph shown at the top of every
 * auth card. Previously this markup was copy-pasted independently into
 * SignInCard, ForgotPasswordCard, ResetPasswordCard, and VerifyEmailGate —
 * reskinning the logo meant editing four files. Now it's one component,
 * reading its letter from `brand.ts` and its colors from the `mc-*`
 * Tailwind tokens, so a per-client reskin touches neither this file nor
 * the four cards that use it.
 */
export function BrandMark() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-mc-violet to-mc-teal shadow-lg shadow-mc-violet/30">
      <span className="font-display text-lg font-bold text-mc-bg">
        {brand.logoLetter}
      </span>
    </div>
  );
}
