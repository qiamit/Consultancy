import type { ClientMasterRow } from "@backend/shared/types/client-master";

/** Concatenates all form-relevant fields for substring search (case-insensitive). */
function clientSearchHaystack(c: ClientMasterRow): string {
  const parts: (string | number | null | undefined)[] = [
    c.name,
    c.company_name,
    c.gst_number,
    c.company_type,
    c.company_scale,
    c.company_status,
    c.contact_person_name,
    c.phone_country_code,
    c.phone,
    c.email,
    c.address,
    c.pin_code,
    c.city,
    c.state,
    c.country,
    c.opening_balance,
    c.balance_type,
    c.payment_term,
    c.notes,
  ];
  return parts
    .map((p) => (p == null ? "" : String(p)))
    .join(" ")
    .toLowerCase();
}

export function clientMatchesSearch(
  c: ClientMasterRow,
  rawQuery: string,
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  return clientSearchHaystack(c).includes(q);
}

export function filterClientsBySearch(
  rows: ClientMasterRow[],
  rawQuery: string,
): ClientMasterRow[] {
  const q = rawQuery.trim();
  if (!q) return rows;
  return rows.filter((c) => clientMatchesSearch(c, q));
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
