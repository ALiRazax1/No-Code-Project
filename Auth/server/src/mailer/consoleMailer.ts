import type { Mailer } from "./types";

/**
 * Logs "sent" emails to the console instead of actually sending them.
 *
 * This is the only mailer shipped today, and it's deliberately for local
 * development only — it exists so you can sign up, copy the verification
 * or reset link straight out of your terminal, and test the full flow
 * without configuring a real mail provider first. It is NOT something to
 * leave pointed at in any real deployment: your users won't see their
 * terminal.
 *
 * Swapping in a real provider means writing a new file that satisfies the
 * `Mailer` interface (e.g. `resendMailer.ts` using the Resend API) and
 * pointing `./index.ts` at it — the same adapter pattern as the database
 * layer.
 */
export const consoleMailer: Mailer = {
  async sendVerificationEmail({ to, name, verifyUrl }) {
    logEmail({
      to,
      subject: "Verify your email",
      body: `Hi ${name},\n\nVerify your email by visiting:\n${verifyUrl}\n\nIf you didn't create an account, you can ignore this email.`,
    });
  },

  async sendPasswordResetEmail({ to, name, resetUrl }) {
    logEmail({
      to,
      subject: "Reset your password",
      body: `Hi ${name},\n\nReset your password by visiting:\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password won't change.`,
    });
  },
};

function logEmail(input: { to: string; subject: string; body: string }) {
  // Tests that don't specifically care about email content (most of them —
  // see auth-recovery.test.ts for the ones that do, via jest.spyOn) would
  // otherwise print a full "email" block to the console on every sign-up.
  // NODE_ENV=test is set globally in tests/setupEnv.ts, so this only
  // affects test runs, never real local development.
  if (process.env.NODE_ENV === "test") return;

  console.log("\n📧 ── Email (console mailer — not actually sent) ─────────────");
  console.log(`To:      ${input.to}`);
  console.log(`Subject: ${input.subject}`);
  console.log("");
  console.log(input.body);
  console.log("───────────────────────────────────────────────────────────────\n");
}
