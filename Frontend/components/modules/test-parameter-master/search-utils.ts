import type { TestParameterMasterRow } from "@backend/shared/types/test-parameter-master";
import { isCodeLabelFromRow } from "./constants";

function searchHaystack(r: TestParameterMasterRow): string {
  const parts = [
    isCodeLabelFromRow(r),
    r.test_name,
    r.clause_no,
    r.test_method,
    r.unit,
    r.specified_value,
  ];
  return parts.map((p) => (p == null ? "" : String(p))).join(" ").toLowerCase();
}

export function filterTestParametersBySearch(
  rows: TestParameterMasterRow[],
  rawQuery: string,
): TestParameterMasterRow[] {
  const q = rawQuery.trim();
  if (!q) return rows;
  const ql = q.toLowerCase();
  return rows.filter((r) => searchHaystack(r).includes(ql));
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
