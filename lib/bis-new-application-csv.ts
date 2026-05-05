import { bisIsCodeDisplayLabel } from "@/lib/bis-project-is-code-label";
import type { BisNewApplicationMasterRow } from "@/lib/types/bis-new-application-master";
import {
  computeLicenseDisplayStatus,
  formatCmDisplay,
} from "@/lib/bis-project-license-status";

/** Export / import column names (CSV header row). Matches BIS project form + DB fields. */
export const BIS_PROJECT_CSV_HEADERS = [
  "id",
  "project_kind",
  "status",
  "title",
  "client_id",
  "client_name",
  "is_code_id",
  "is_number",
  "cm_l_digits",
  "cm_display",
  "license_validity_date",
  "license_status",
  "license_number",
  "start_date",
  "target_date",
  "case_handled_by",
  "case_referred_by",
  "billing_amount",
  "billing_frequency",
  "portal_user_id",
  "portal_password",
  "notes",
] as const;

export type BisProjectCsvHeader = (typeof BIS_PROJECT_CSV_HEADERS)[number];

/** Minimum columns so older export files still import; new exports include every field above. */
const BIS_PROJECT_IMPORT_REQUIRED_HEADERS: readonly BisProjectCsvHeader[] = [
  "project_kind",
  "client_name",
  "is_number",
  "cm_display",
  "billing_amount",
  "billing_frequency",
  "status",
  "license_validity_date",
];

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

function esc(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function clientLabel(r: BisNewApplicationMasterRow): string {
  const c = r.clients;
  if (!c) return "";
  const company = (c.company_name ?? "").trim();
  if (company) return company;
  return (c.name ?? "").trim();
}

function isLabel(r: BisNewApplicationMasterRow): string {
  const i = r.is_codes;
  if (!i) return "";
  return bisIsCodeDisplayLabel(i);
}

function rowToCsvCells(r: BisNewApplicationMasterRow): Record<BisProjectCsvHeader, string> {
  const license_status = computeLicenseDisplayStatus(
    r.project_kind,
    r.license_validity_date,
  );
  return {
    id: r.id,
    project_kind: r.project_kind,
    status: r.status,
    title: r.title ?? "",
    client_id: r.client_id ?? "",
    client_name: clientLabel(r),
    is_code_id: r.is_code_id ?? "",
    is_number: isLabel(r),
    cm_l_digits: r.cm_l_digits ?? "",
    cm_display: formatCmDisplay(r.project_kind, r.cm_l_digits),
    license_validity_date: r.license_validity_date ?? "",
    license_status,
    license_number: r.license_number ?? "",
    start_date: r.start_date ?? "",
    target_date: r.target_date ?? "",
    case_handled_by: r.case_handled_by ?? "",
    case_referred_by: r.case_referred_by ?? "",
    billing_amount: String(r.billing_amount ?? ""),
    billing_frequency: r.billing_frequency ?? "",
    portal_user_id: r.portal_user_id ?? "",
    portal_password: r.portal_password ?? "",
    notes: r.notes ?? "",
  };
}

export function buildBisNewApplicationExportCsv(rows: BisNewApplicationMasterRow[]): string {
  const header = BIS_PROJECT_CSV_HEADERS.join(",");
  const lines = rows.map((r) => {
    const cells = rowToCsvCells(r);
    return BIS_PROJECT_CSV_HEADERS.map((h) => esc(cells[h])).join(",");
  });
  return [header, ...lines].join("\r\n");
}

export function parseBisNewApplicationImportCsv(text: string):
  | { ok: true; rows: Record<string, string>[] }
  | { ok: false; error: string } {
  const rawLines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (rawLines.length < 2) {
    return {
      ok: false,
      error: "CSV must include a header row and at least one data row.",
    };
  }

  const headerCells = parseCsvLine(rawLines[0]!).map((c) => c.trim().toLowerCase());
  const idx = (name: string) => headerCells.indexOf(name.toLowerCase());
  const missing = BIS_PROJECT_IMPORT_REQUIRED_HEADERS.filter((h) => idx(h) < 0);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing column(s): ${missing.join(", ")}. Use Export as a template.`,
    };
  }

  const colIndex = Object.fromEntries(
    BIS_PROJECT_CSV_HEADERS.map((h) => [h, idx(h)]),
  ) as Record<BisProjectCsvHeader, number>;

  const rows: Record<string, string>[] = [];
  for (let li = 1; li < rawLines.length; li++) {
    const cells = parseCsvLine(rawLines[li]!);
    const row: Record<string, string> = {};
    for (const h of BIS_PROJECT_CSV_HEADERS) {
      const i = colIndex[h];
      row[h] =
        i !== undefined && i >= 0 && i < cells.length ? cells[i]!.trim() : "";
    }
    const empty = BIS_PROJECT_CSV_HEADERS.every((h) => !row[h]);
    if (empty) continue;
    rows.push(row);
  }

  if (rows.length === 0) {
    return { ok: false, error: "No data rows found after the header." };
  }
  return { ok: true, rows };
}
