import type { BisProjectMasterRow } from "@/lib/types/bis-project-master";
import {
  computeLicenseDisplayStatus,
  formatCmDisplay,
} from "@/lib/bis-project-license-status";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function haystack(r: BisProjectMasterRow): string {
  const c = r.clients;
  const clientLabel = c
    ? `${c.name} ${c.company_name ?? ""}`
    : "";
  const i = r.is_codes;
  const isLabel = i
    ? `${i.is_number} ${i.is_code_title} ${i.revision_year ?? ""}`
    : "";
  const lic = computeLicenseDisplayStatus(r.project_kind, r.license_validity_date);
  const cm = formatCmDisplay(r.project_kind, r.cm_l_digits);
  return [
    r.title,
    r.project_kind,
    r.status,
    clientLabel,
    isLabel,
    cm,
    r.license_validity_date,
    lic,
    r.case_handled_by,
    r.case_referred_by,
    r.billing_frequency,
    String(r.billing_amount ?? ""),
    r.portal_user_id,
    r.notes,
    r.license_number,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterBisProjectsBySearch(
  rows: BisProjectMasterRow[],
  query: string,
): BisProjectMasterRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => haystack(r).includes(q));
}
