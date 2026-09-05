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

/** Local editable table row (saved or draft blank). */
export type TestParameterEditorRow = {
  key: string;
  id: string | null;
  is_code_id: string;
  test_name: string;
  clause_no: string;
  test_method: string;
  unit: string;
  specified_value: string;
  dirty: boolean;
};

/** Stable key for the default trailing blank row (SSR/client hydration-safe). */
export const DRAFT_BLANK_KEY = "draft-blank";

let draftExtraSeq = 0;

export function createBlankEditorRow(
  isCodeId: string,
  key: string = DRAFT_BLANK_KEY,
  defaultTestMethod = "",
): TestParameterEditorRow {
  return {
    key,
    id: null,
    is_code_id: isCodeId,
    test_name: "",
    clause_no: "",
    test_method: defaultTestMethod,
    unit: "",
    specified_value: "",
    dirty: false,
  };
}

/** Extra blank rows from "+" — client-only, unique keys after hydration. */
export function createExtraBlankEditorRow(
  isCodeId: string,
  defaultTestMethod = "",
): TestParameterEditorRow {
  draftExtraSeq += 1;
  return createBlankEditorRow(
    isCodeId,
    `draft-extra-${draftExtraSeq}`,
    defaultTestMethod,
  );
}

export function masterRowToEditorRow(
  r: TestParameterMasterRow,
): TestParameterEditorRow {
  return {
    key: r.id,
    id: r.id,
    is_code_id: r.is_code_id,
    test_name: r.test_name ?? "",
    clause_no: r.clause_no ?? "",
    test_method: r.test_method ?? "",
    unit: r.unit ?? "",
    specified_value: r.specified_value ?? "",
    dirty: false,
  };
}

export function buildEditorRowsFromMaster(
  rows: TestParameterMasterRow[],
  isCodeId: string,
  defaultTestMethod = "",
): TestParameterEditorRow[] {
  const saved = rows.map(masterRowToEditorRow);
  return [...saved, createBlankEditorRow(isCodeId, DRAFT_BLANK_KEY, defaultTestMethod)];
}

/** True when row has no user-entered data (default IS test method counts as empty). */
export function isEditorRowBlank(
  r: TestParameterEditorRow,
  defaultTestMethod = "",
): boolean {
  const method = r.test_method.trim();
  const defaultMethod = defaultTestMethod.trim();
  const methodNumberOnly = (() => {
    const colon = method.indexOf(":");
    return (colon === -1 ? method : method.slice(0, colon)).trim();
  })();
  const methodEmpty =
    method === "" ||
    (defaultMethod !== "" &&
      (method === defaultMethod || methodNumberOnly === defaultMethod));
  return (
    !r.test_name.trim() &&
    !r.clause_no.trim() &&
    methodEmpty &&
    !r.unit.trim() &&
    !r.specified_value.trim()
  );
}
