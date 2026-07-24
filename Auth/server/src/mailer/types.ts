/**
 * Same pattern as the storage layer: one interface, swappable
 * implementations. Controllers only ever call the `mailer` exported from
 * `./index.ts` — never a specific implementation — so plugging in a real
 * provider (Resend, Postmark, SES, SendGrid...) later means writing one new
 * file that satisfies this interface, not touching authController.ts.
 */
export interface Mailer {
  sendVerificationEmail(input: { to: string; name: string; verifyUrl: string }): Promise<void>;
  sendPasswordResetEmail(input: { to: string; name: string; resetUrl: string }): Promise<void>;
}
