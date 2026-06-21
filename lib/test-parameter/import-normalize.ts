export type ExtractedTestParameterRow = {
  test_name: string;
  clause_no: string;
  test_method: string;
  unit: string;
  specified_value: string;
};

const GROUPED_TEST_NAME_BLOCKLIST = new Set(
  [
    "chemical composition",
    "mechanical properties",
    "physical properties",
    "dimensions",
    "general requirements",
    "other requirements",
  ].map((s) => s.toLowerCase()),
);

/** Single clause only — no "6.1, 6.2" or dual references. */
export function normalizeClauseNo(raw: string): string {
  let s = raw.trim().replace(/^clause\s*/i, "");
  if (!s) return "";

  const first = s.split(/[,;/]|(?:\s+and\s+)|(?:\s*&\s*)/i)[0]?.trim() ?? "";
  const tableMatch = /^table\s+(\d+[a-z]?)/i.exec(first);
  if (tableMatch) return `Table ${tableMatch[1]}`;

  const clauseMatch = /^(\d+(?:\.\d+)*[a-z]?)/i.exec(first);
  if (clauseMatch) return clauseMatch[1]!;

  return first.slice(0, 40);
}

/** Keep one requirement when multiple are joined in one cell. */
export function pickSingleSpecifiedValue(raw: string): string {
  const s = raw.trim();
  if (!s) return "";

  const parts = s.split(/\s*(?:;|\|)\s*|\s+(?:or|and\/or)\s+/i);
  if (parts.length > 1) {
    const preferred =
      parts.find((p) => /[≤≥<>]|max|min|shall|percent|%|mm|mpa|n\/mm/i.test(p)) ??
      parts[0];
    return preferred?.trim() ?? s;
  }

  return s;
}

export function normalizeTestName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^\d+[\).\s]+/, "");
}

export function isBlockedGroupedTestName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  if (GROUPED_TEST_NAME_BLOCKLIST.has(lower)) return true;
  if (/^chemical composition\b/i.test(lower)) return true;
  return false;
}

/** Deduplicate by test name per IS; first row wins (single specified value). */
export function dedupeExtractedParameters(
  rows: ExtractedTestParameterRow[],
): ExtractedTestParameterRow[] {
  const seen = new Map<string, ExtractedTestParameterRow>();

  for (const row of rows) {
    const testName = normalizeTestName(row.test_name);
    if (!testName || isBlockedGroupedTestName(testName)) continue;

    const key = testName.toLowerCase();
    if (seen.has(key)) continue;

    seen.set(key, {
      test_name: testName,
      clause_no: normalizeClauseNo(row.clause_no),
      test_method: row.test_method.trim(),
      unit: row.unit.trim(),
      specified_value: pickSingleSpecifiedValue(row.specified_value),
    });
  }

  return [...seen.values()];
}

export function normalizeIsNumberForMatch(value: string): string {
  return value
    .trim()
    .replace(/^is\s*[:\-]?\s*/i, "")
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .replace(/\//g, "-")
    .toUpperCase();
}

/** Parse test-method IS strings including Part variants. */
export function parseTestMethodIsReference(
  text: string,
): { isNumber: string; revisionYear?: number } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const partWithYear =
    /\bIS\s*[:\-]?\s*(\d+)\s*(?:\(Part\s*(\d+)\)|Part\s*(\d+))?\s*[:\(]\s*(\d{4})\s*\)?/i.exec(
      trimmed,
    );
  if (partWithYear) {
    const base = partWithYear[1]!;
    const part = partWithYear[2] ?? partWithYear[3];
    const isNumber = part ? `${base} (Part ${part})` : base;
    return { isNumber, revisionYear: Number(partWithYear[4]) };
  }

  const partOnly =
    /\bIS\s*[:\-]?\s*(\d+)\s*(?:\(Part\s*(\d+)\)|Part\s*(\d+))/i.exec(trimmed);
  if (partOnly) {
    const part = partOnly[2] ?? partOnly[3];
    return { isNumber: `${partOnly[1]!} (Part ${part})` };
  }

  const plain = /\bIS\s*[:\-]?\s*(\d+(?:\s*[\-\/]\s*\d+)?)\s*[:\(]?\s*(\d{4})?\s*\)?/i.exec(
    trimmed,
  );
  if (plain) {
    return {
      isNumber: plain[1]!.replace(/\s+/g, " ").trim(),
      revisionYear: plain[2] ? Number(plain[2]) : undefined,
    };
  }

  return null;
}
