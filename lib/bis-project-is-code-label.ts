import type { BisProjectMasterRow } from "@/lib/types/bis-project-master";

/** BIS UI: prefer `IS 1234: 2020`; fall back to legacy `IS 1234 — title` if year missing. */
export function bisIsCodeDisplayLabel(
  i: NonNullable<BisProjectMasterRow["is_codes"]>,
): string {
  const y = i.revision_year;
  if (y != null && Number.isFinite(Number(y))) {
    return `${i.is_number}: ${y}`;
  }
  return `${i.is_number} — ${i.is_code_title}`;
}
