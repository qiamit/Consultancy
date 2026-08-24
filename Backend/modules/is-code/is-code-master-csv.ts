import { DEFAULT_AMENDMENT_NUMBER } from "@backend/shared/constants/is-code-master";
import type { IsCodeMasterRow } from "@backend/shared/types/is-code-master";

export const IS_CODE_CSV_HEADERS = [
  "is_number",
  "revision_year",
  "reaffirmation_year",
  "amendment_number",
  "aspect_of_is",
  "product_manual_number",
  "is_code_title",
  "testing_charges",
  "unit_of_is",
  "mmf_large_scale",
  "mmf_medium_scale",
  "mmf_small_scale",
  "mmf_micro_scale",
  "slab_1_quantity",
  "slab_1_rate",
  "slab_2_quantity",
  "slab_2_rate",
  "slab_3_quantity",
  "slab_3_rate",
] as const;

export type IsCodeCsvHeader = (typeof IS_CODE_CSV_HEADERS)[number];

export function csvEscapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function numStr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return String(n);
}

export function isCodeRowToCsvRecord(c: IsCodeMasterRow): Record<string, string> {
  return {
    is_number: c.is_number ?? "",
    revision_year: numStr(c.revision_year),
    reaffirmation_year:
      c.reaffirmation_year != null ? String(c.reaffirmation_year) : "",
    amendment_number:
      (c.amendment_number ?? "").trim() || DEFAULT_AMENDMENT_NUMBER,
    aspect_of_is: c.aspect_of_is ?? "",
    product_manual_number: c.product_manual_number ?? "",
    is_code_title: c.is_code_title ?? "",
    testing_charges: numStr(c.testing_charges),
    unit_of_is: c.unit_of_is ?? "",
    mmf_large_scale: numStr(c.mmf_large_scale),
    mmf_medium_scale: numStr(c.mmf_medium_scale),
    mmf_small_scale: numStr(c.mmf_small_scale),
    mmf_micro_scale: numStr(c.mmf_micro_scale),
    slab_1_quantity: c.slab_1_quantity ?? "",
    slab_1_rate: numStr(c.slab_1_rate),
    slab_2_quantity: c.slab_2_quantity ?? "",
    slab_2_rate: numStr(c.slab_2_rate),
    slab_3_quantity: c.slab_3_quantity ?? "",
    slab_3_rate: numStr(c.slab_3_rate),
  };
}

export function buildIsCodeExportCsv(rows: IsCodeMasterRow[]): string {
  const header = IS_CODE_CSV_HEADERS.join(",");
  const lines = rows.map((c) => {
    const rec = isCodeRowToCsvRecord(c);
    return IS_CODE_CSV_HEADERS.map((h) =>
      csvEscapeField(rec[h] ?? ""),
    ).join(",");
  });
  return [header, ...lines].join("\r\n");
}

export function parseIsCodeImportCsv(text: string): {
  ok: true;
  rows: Record<string, string>[];
} | { ok: false; error: string } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "CSV must include a header row and at least one data row." };
  }
  const headerCells = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx: Record<string, number> = {};
  for (let i = 0; i < headerCells.length; i++) {
    idx[headerCells[i]] = i;
  }
  for (const required of ["is_number", "revision_year", "is_code_title"] as const) {
    if (idx[required] === undefined) {
      return {
        ok: false,
        error: `Missing required column: ${required}`,
      };
    }
  }
  const rows: Record<string, string>[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    const row: Record<string, string> = {};
    for (const h of IS_CODE_CSV_HEADERS) {
      const i = idx[h.toLowerCase()];
      row[h] = i !== undefined ? String(cells[i] ?? "").trim() : "";
    }
    rows.push(row);
  }
  return { ok: true, rows };
}
