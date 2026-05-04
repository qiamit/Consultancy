import type { IsCodeMasterRow } from "@/lib/types/is-code-master";

function isCodeSearchHaystack(c: IsCodeMasterRow): string {
  const parts: (string | number | null | undefined)[] = [
    c.is_number,
    c.revision_year,
    c.reaffirmation_year,
    c.amendment_number,
    c.aspect_of_is,
    c.product_manual_number,
    c.is_code_title,
    c.testing_charges,
    c.unit_of_is,
    c.mmf_large_scale,
    c.mmf_medium_scale,
    c.mmf_small_scale,
    c.mmf_micro_scale,
    c.slab_1_quantity,
    c.slab_1_rate,
    c.slab_2_quantity,
    c.slab_2_rate,
    c.slab_3_quantity,
    c.slab_3_rate,
  ];
  const fileNames = (c.files ?? [])
    .map((f) => f.file_name ?? "")
    .join(" ");
  return (
    parts.map((p) => (p == null ? "" : String(p))).join(" ") +
    " " +
    fileNames
  )
    .toLowerCase();
}

export function filterIsCodesBySearch(
  rows: IsCodeMasterRow[],
  rawQuery: string,
): IsCodeMasterRow[] {
  const q = rawQuery.trim();
  if (!q) return rows;
  const ql = q.toLowerCase();
  return rows.filter((c) => isCodeSearchHaystack(c).includes(ql));
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
