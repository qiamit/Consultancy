/** Base-36 charset used for GSTIN check digit (CBIC / GST portal algorithm). */
const GST_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Valid first two digits of a GSTIN (state / UT / special codes such as 97, 99).
 * Source: GST state code master (01–38, 97, 99).
 */
const GST_STATE_CODES = new Set([
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "97",
  "99",
]);

/** 15-char layout: state(2) + PAN(10) + entity(1) + type letter(1) + check(1). */
const GSTIN_STRUCTURE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$/;

/**
 * Strip separators / invisible chars, keep alphanumerics only, uppercase, max 15 chars.
 * Uses NFKC so full-width digits / compatibility characters from copy-paste normalize correctly.
 */
export function normalizeGstInput(raw: string): string {
  const base =
    typeof raw.normalize === "function" ? raw.normalize("NFKC") : raw;
  return base
    .replace(/[\s\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^0-9A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 15);
}

function gstCheckDigit(first14: string): string | null {
  if (first14.length !== 14) return null;
  let sum = 0;
  let factor = 1;
  for (let i = 0; i < 14; i++) {
    const codePoint = GST_CHARS.indexOf(first14[i]!);
    if (codePoint < 0) return null;
    const prod = codePoint * factor;
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  return GST_CHARS[(36 - (sum % 36)) % 36] ?? null;
}

/** True if `normalized` is empty, or a valid 15-character GSTIN (format, state code, checksum). */
export function isValidGstinOrEmpty(normalized: string): boolean {
  if (normalized.length === 0) return true;
  if (normalized.length !== 15) return false;
  if (!GSTIN_STRUCTURE.test(normalized)) return false;
  if (!GST_STATE_CODES.has(normalized.slice(0, 2))) return false;
  const expected = gstCheckDigit(normalized.slice(0, 14));
  return expected != null && expected === normalized[14];
}
