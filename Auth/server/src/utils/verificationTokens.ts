import crypto from "crypto";

/**
 * Generates a random, high-entropy token plus its SHA-256 hash.
 *
 * The raw `token` is what goes into the email link — it's never stored
 * anywhere. Only `tokenHash` is persisted, so a database leak can't hand
 * out usable verification/reset links, the same principle as password
 * hashing. Unlike passwords, these tokens are random (not user-chosen) and
 * high-entropy (256 bits), so a fast hash (SHA-256) is sufficient — there's
 * no need for bcrypt's deliberate slowness, since brute-forcing a random
 * 256-bit value isn't a realistic threat the way guessing a human-chosen
 * password is.
 */
export function generateVerificationToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashVerificationToken(token) };
}

export function hashVerificationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
