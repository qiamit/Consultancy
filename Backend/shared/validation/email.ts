/** RFC 5321 total length limit for email addresses. */
const MAX_EMAIL_LENGTH = 254;

/**
 * Practical single-`@` address check (ASCII-focused, typical business email).
 * Allows common local-part characters per RFC 5322 subset used on the web.
 */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Trim, remove internal whitespace, lowercase for stable storage and comparison. */
export function normalizeEmailInput(raw: string): string {
  return raw.trim().replace(/\s/g, "").toLowerCase();
}

/** True if empty after normalize, or a plausible email address (length + pattern). */
export function isValidEmailOrEmpty(normalized: string): boolean {
  if (normalized.length === 0) return true;
  if (normalized.length > MAX_EMAIL_LENGTH) return false;
  if (normalized.includes("..")) return false;
  return EMAIL_RE.test(normalized);
}
