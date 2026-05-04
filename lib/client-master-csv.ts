import type { ClientMasterRow } from "@/lib/types/client-master";

/** Column order for export and import (header row). */
export const CLIENT_CSV_HEADERS = [
  "company_name",
  "gst_number",
  "company_type",
  "company_scale",
  "company_status",
  "contact_person_name",
  "phone",
  "phone_country_code",
  "email",
  "address",
  "pin_code",
  "city",
  "state",
  "country",
  "opening_balance",
  "balance_type",
  "payment_term",
  "notes",
] as const;

export type ClientCsvHeader = (typeof CLIENT_CSV_HEADERS)[number];

/** RFC-style CSV field (quote if needed). */
export function csvEscapeField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Parse one CSV line with optional quoted fields. */
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

export function clientRowToCsvRecord(c: ClientMasterRow): Record<string, string> {
  return {
    company_name: c.company_name ?? "",
    gst_number: c.gst_number ?? "",
    company_type: c.company_type ?? "",
    company_scale: c.company_scale ?? "",
    company_status: c.company_status ?? "",
    contact_person_name: c.contact_person_name ?? "",
    phone: c.phone ?? "",
    phone_country_code: c.phone_country_code ?? "+91",
    email: c.email ?? "",
    address: c.address ?? "",
    pin_code: c.pin_code ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    country: c.country ?? "",
    opening_balance:
      c.opening_balance != null ? String(c.opening_balance) : "",
    balance_type: c.balance_type ?? "",
    payment_term: c.payment_term ?? "",
    notes: c.notes ?? "",
  };
}

export function buildClientExportCsv(rows: ClientMasterRow[]): string {
  const headerLine = CLIENT_CSV_HEADERS.join(",");
  const dataLines = rows.map((c) => {
    const rec = clientRowToCsvRecord(c);
    return CLIENT_CSV_HEADERS.map((h) =>
      csvEscapeField(rec[h] ?? ""),
    ).join(",");
  });
  return [headerLine, ...dataLines].join("\r\n");
}

export function parseClientImportCsv(text: string):
  | { ok: true; rows: Record<string, string>[] }
  | { ok: false; error: string } {
  const rawLines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (rawLines.length < 2) {
    return {
      ok: false,
      error: "CSV must include a header row and at least one data row.",
    };
  }

  const headerCells = parseCsvLine(rawLines[0]).map((c) => c.trim());
  const headerSet = new Set(CLIENT_CSV_HEADERS);
  const indexByKey = new Map<string, number>();
  for (let i = 0; i < headerCells.length; i++) {
    const key = headerCells[i];
    if (headerSet.has(key as ClientCsvHeader)) {
      indexByKey.set(key, i);
    }
  }
  if (!indexByKey.has("company_name")) {
    return {
      ok: false,
      error:
        "CSV must include a company_name column (use Export as a template).",
    };
  }

  const rows: Record<string, string>[] = [];
  for (let li = 1; li < rawLines.length; li++) {
    const cells = parseCsvLine(rawLines[li]);
    const row: Record<string, string> = {};
    for (const h of CLIENT_CSV_HEADERS) {
      const idx = indexByKey.get(h);
      row[h] =
        idx !== undefined && idx < cells.length ? cells[idx].trim() : "";
    }
    const empty = CLIENT_CSV_HEADERS.every((h) => !row[h]);
    if (empty) continue;
    rows.push(row);
  }

  if (rows.length === 0) {
    return { ok: false, error: "No data rows found after the header." };
  }
  return { ok: true, rows };
}
