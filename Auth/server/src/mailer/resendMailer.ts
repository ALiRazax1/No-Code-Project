import { Resend } from "resend";
import { config } from "../config";
import type { Mailer } from "./types";

/**
 * Sends real email via Resend (https://resend.com). This is the first
 * non-dev implementation of the `Mailer` interface — satisfies the exact
 * same shape as `consoleMailer`, so `authController.ts` never changes
 * regardless of which one is active (see mailer/index.ts for the switch).
 *
 * The client is built lazily (see `getClient()` below), NOT at module
 * load time. This matters more than it looks: `mailer/index.ts` imports
 * this file statically (`import { resendMailer } from "./resendMailer"`),
 * which means this module's top-level code runs on every single server
 * start — including when `MAILER_PROVIDER=console` and no
 * `RESEND_API_KEY` is set at all. The Resend SDK's constructor throws
 * immediately if it doesn't get a key (`"Missing API key..."`), so if the
 * client were constructed here at the top level, that throw would happen
 * unconditionally, before `mailer/index.ts`'s switch statement ever got a
 * chance to decide whether Resend was even the active provider. Building
 * it lazily means the constructor only ever runs if something actually
 * tries to send an email through this file — which only happens if
 * `mailer/index.ts` selected it in the first place.
 */
let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    client = new Resend(config.mailer.resendApiKey);
  }
  return client;
}

export const resendMailer: Mailer = {
  async sendVerificationEmail({ to, name, verifyUrl }) {
    await send({
      to,
      subject: "Verify your email",
      html: verificationEmailHtml({ name, verifyUrl }),
      text: `Hi ${name},\n\nVerify your email by visiting:\n${verifyUrl}\n\nIf you didn't create an account, you can ignore this email.`,
    });
  },

  async sendPasswordResetEmail({ to, name, resetUrl }) {
    await send({
      to,
      subject: "Reset your password",
      html: passwordResetEmailHtml({ name, resetUrl }),
      text: `Hi ${name},\n\nReset your password by visiting:\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email — your password won't change.`,
    });
  },
};

/**
 * The Resend SDK returns `{ data, error }` rather than throwing on a
 * failed send — this is what turns that into a thrown error instead, so
 * the *caller's* existing try/catch keeps working exactly as it did with
 * consoleMailer (which never fails at all). Both call sites in
 * authController.ts — `issueEmailVerification` and `forgotPassword` —
 * already catch and log this rather than failing the sign-up/resend/
 * forgot-password request itself; that decision doesn't change here, it
 * just now has a real failure mode (an expired key, a rate limit, an
 * unverified sending domain) to actually catch.
 */
async function send(input: { to: string; subject: string; html: string; text: string }) {
  const { error } = await getClient().emails.send({
    from: config.mailer.fromAddress,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

/**
 * Deliberately plain, inline HTML — no template engine or React Email
 * dependency. Both emails are short and don't justify pulling in a
 * templating layer yet; if the design needs grow (a real logo, multiple
 * transactional emails with a shared header/footer), that's a reasonable
 * point to introduce one without touching the `Mailer` interface at all.
 */
function verificationEmailHtml({ name, verifyUrl }: { name: string; verifyUrl: string }): string {
  const escapedUrl = escapeHtml(verifyUrl);
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">Verify your email</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Confirm your email address to finish setting up your account:</p>
      <p style="margin: 24px 0;">
        <a href="${escapedUrl}" style="background: #7C6CFF; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Verify email
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        Or paste this link into your browser:<br />
        <a href="${escapedUrl}">${escapedUrl}</a>
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">
        If you didn't create an account, you can ignore this email.
      </p>
    </div>
  `.trim();
}

function passwordResetEmailHtml({ name, resetUrl }: { name: string; resetUrl: string }): string {
  const escapedUrl = escapeHtml(resetUrl);
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">Reset your password</h2>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Click below to choose a new password:</p>
      <p style="margin: 24px 0;">
        <a href="${escapedUrl}" style="background: #7C6CFF; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        Or paste this link into your browser:<br />
        <a href="${escapedUrl}">${escapedUrl}</a>
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 32px;">
        If you didn't request this, you can safely ignore this email — your
        password won't change.
      </p>
    </div>
  `.trim();
}

/**
 * `name` is user-supplied (see authController.signUp's `name.trim()`) and
 * ends up interpolated directly into HTML here — this is the one place in
 * the mailer that touches untrusted input, so it gets escaped even though
 * the plain-text version above doesn't need it.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
