import type { TestParameterMasterRow } from "@backend/shared/types/test-parameter-master";

export const TP_FIELD_LABEL_CLASS =
  "text-[4mm] font-medium leading-tight text-zinc-600 dark:text-zinc-400";

export function formatIsCodeRevisionLabel(
  isNumber: string,
  revisionYear: number | null | undefined,
): string {
  if (revisionYear != null && Number.isFinite(Number(revisionYear))) {
    return `${isNumber}: ${revisionYear}`;
  }
  return isNumber;
}

export function isCodeLabelFromRow(
  r: TestParameterMasterRow,
): string {
  if (r.is_codes) {
    return formatIsCodeRevisionLabel(
      r.is_codes.is_number,
      r.is_codes.revision_year,
    );
  }
  return "—";
}

export function emptyForm(): Record<string, string> {
  return {
    id: "",
    is_code_id: "",
    test_name: "",
    clause_no: "",
    test_method: "",
    unit: "",
    specified_value: "",
  };
}

export function rowToForm(r: TestParameterMasterRow): Record<string, string> {
  return {
    id: r.id,
    is_code_id: r.is_code_id ?? "",
    test_name: r.test_name ?? "",
    clause_no: r.clause_no ?? "",
    test_method: r.test_method ?? "",
    unit: r.unit ?? "",
    specified_value: r.specified_value ?? "",
  };
}
