/**
 * ---------------------------------------------------------------------------
 * Input sanitization
 * ---------------------------------------------------------------------------
 * Deliberately shape/length-focused rather than character-blacklisting.
 * The actual defense against injection is escaping at every OUTPUT
 * context — React already does this automatically when rendering, and
 * `mailer/resendMailer.ts`'s `escapeHtml` does it for email bodies — so
 * this file's job is bounding size and stripping genuinely useless bytes
 * (control characters), not deciding which punctuation a real name is
 * allowed to contain. Restricting names to, say, ASCII letters would
 * break real names (hyphens, apostrophes, accented characters) for no
 * actual security benefit.
 * ---------------------------------------------------------------------------
 */

export const MAX_NAME_LENGTH = 100;

// RFC 5321's practical maximum total email length.
export const MAX_EMAIL_LENGTH = 254;

// bcrypt silently truncates at 72 BYTES and ignores everything past it —
// a password longer than this doesn't error, it just becomes a WEAKER
// effective password than the person thinks they set, with no signal
// that anything was cut off. Enforcing this explicitly turns that silent
// truncation into an honest, visible validation error instead.
export const MAX_PASSWORD_LENGTH = 72;
export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Strips control characters (0x00–0x1F, 0x7F) — these have no legitimate
 * use in a display name, and are exactly the kind of bytes that cause
 * real problems downstream (a raw newline could forge a fake extra line
 * in a log file, for instance). Trims and caps length after that. Does
 * NOT touch HTML-special characters — see the module comment above.
 */
export function sanitizeName(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function isValidName(sanitized: string): boolean {
  return sanitized.length >= 1 && sanitized.length <= MAX_NAME_LENGTH;
}

/**
 * Trims and lowercases before validation, so a trailing space someone
 * didn't notice they typed doesn't turn an otherwise-valid email into a
 * rejected one. Lowercasing here matches what every db adapter already
 * does internally (see db/adapters/memory.ts and mongo.ts) — a lookup and
 * a fresh sign-up normalize identically before either one touches storage.
 */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmailShape(normalized: string): boolean {
  return (
    normalized.length > 0 &&
    normalized.length <= MAX_EMAIL_LENGTH &&
    EMAIL_RE.test(normalized)
  );
}

export function isValidPasswordLength(input: string): boolean {
  return input.length >= MIN_PASSWORD_LENGTH && input.length <= MAX_PASSWORD_LENGTH;
}
