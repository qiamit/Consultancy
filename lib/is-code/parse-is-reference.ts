export type ParsedIsReference = {
  isNumber: string;
  revisionYear?: number;
};

export function normalizeIsNumber(value: string): string {
  return value
    .trim()
    .replace(/^is\s*[:\-]?\s*/i, "")
    .replace(/\s+/g, "")
    .replace(/\//g, "-")
    .toUpperCase();
}

/** Parse IS number + optional revision year from free text (e.g. "IS 3025:2022"). */
export function parseIsReferenceFromText(text: string): ParsedIsReference | null {
  const withYear =
    /\bIS\s*[:\-]?\s*(\d+(?:\s*[\-\/]\s*\d+)?)\s*[:\(]\s*(\d{4})\s*\)?/i.exec(text);
  if (withYear) {
    return {
      isNumber: normalizeIsNumber(withYear[1]!),
      revisionYear: Number(withYear[2]),
    };
  }

  const plain = /\bIS\s*[:\-]?\s*(\d+(?:\s*[\-\/]\s*\d+)?)\b/i.exec(text);
  if (plain) {
    return { isNumber: normalizeIsNumber(plain[1]!) };
  }

  return null;
}

export function isTestParameterImportCommand(message: string): boolean {
  const lower = message.toLowerCase();
  const hasIs = /\bis\s*\d+/i.test(message);
  if (!hasIs) return false;

  return (
    /(add|import|create|extract|load|fill|insert|save).*(test\s*parameter|parameters|tests)/i.test(
      lower,
    ) ||
    /(test\s*parameter|parameters|tests).*(add|import|from|extract|create)/i.test(lower) ||
    /add\s+all\s+tests/i.test(lower)
  );
}
