import {
  createCmpf306EquipmentRow,
  defaultCmpf306EquipmentEntry,
  type Cmpf306EquipmentRow,
  type Cmpf306EquipmentStored,
} from "@/lib/cmpf-306";
import type { Cmpf306ScopeSuggestedEquipment } from "@/lib/actions/cmpf-306-assistant";

export type Cmpf306EquipmentFormEntry = {
  testName: string;
  clauseNo: string;
  testMethod: string;
  equipmentName: string;
  make: string;
  leastCount: string;
  range: string;
  calibrationRequired: boolean;
  quantity: string;
};

export type Cmpf306SelectedTestParameter = {
  id?: string;
  testName: string;
  clauseNo: string;
  testMethod: string;
};

export type Cmpf306AddEquipmentFormValues = {
  testName: string;
  clauseNo: string;
  testMethod: string;
  equipmentEntries: Cmpf306EquipmentFormEntry[];
};

export function defaultCmpf306EquipmentFormEntry(): Cmpf306EquipmentFormEntry {
  return {
    testName: "",
    clauseNo: "",
    testMethod: "",
    equipmentName: "",
    make: "",
    leastCount: "",
    range: "",
    calibrationRequired: true,
    quantity: "1 Nos",
  };
}

export function defaultCmpf306AddEquipmentFormValues(): Cmpf306AddEquipmentFormValues {
  return {
    testName: "",
    clauseNo: "",
    testMethod: "",
    equipmentEntries: [defaultCmpf306EquipmentFormEntry()],
  };
}

function entryHasContent(entry: Cmpf306EquipmentFormEntry): boolean {
  return (
    entry.testName.trim().length > 0 ||
    entry.clauseNo.trim().length > 0 ||
    entry.testMethod.trim().length > 0 ||
    entry.equipmentName.trim().length > 0 ||
    entry.make.trim().length > 0 ||
    entry.leastCount.trim().length > 0 ||
    entry.range.trim().length > 0 ||
    entry.quantity.trim().length > 0
  );
}

function rowFromEntry(entry: Cmpf306EquipmentFormEntry): Cmpf306EquipmentStored {
  return {
    ...defaultCmpf306EquipmentEntry(),
    equipment_name: entry.equipmentName.trim(),
    make: entry.make.trim(),
    clause_number: entry.clauseNo.trim(),
    test_method: entry.testMethod.trim(),
    least_count: entry.leastCount.trim(),
    range: entry.range.trim(),
    calibration_details: entry.calibrationRequired ? "Yes" : "No",
    quantity: entry.quantity.trim() || "1 Nos",
    remarks: entry.testName.trim(),
  };
}

export function storedRowsFromAddEquipmentForm(
  values: Cmpf306AddEquipmentFormValues,
): Cmpf306EquipmentStored[] {
  return values.equipmentEntries.filter(entryHasContent).map((entry) => rowFromEntry(entry));
}

export function formEntryFromEditorRow(row: Cmpf306EquipmentRow): Cmpf306EquipmentFormEntry {
  const calibration = row.calibration_details.trim().toLowerCase();
  return {
    testName: row.remarks,
    clauseNo: row.clause_number,
    testMethod: row.test_method,
    equipmentName: row.equipment_name,
    make: row.make,
    leastCount: row.least_count,
    range: row.range,
    calibrationRequired: calibration !== "no" && calibration !== "n",
    quantity: row.quantity.trim() || "1 Nos",
  };
}

export function formEntriesFromEditorRows(rows: Cmpf306EquipmentRow[]): Cmpf306EquipmentFormEntry[] {
  const entries = rows.filter((row) => equipmentRowHasContent(row)).map(formEntryFromEditorRow);
  return entries.length > 0 ? entries : [defaultCmpf306EquipmentFormEntry()];
}

function equipmentRowHasContent(row: Cmpf306EquipmentStored): boolean {
  return (
    row.equipment_name.trim().length > 0 ||
    row.make.trim().length > 0 ||
    row.least_count.trim().length > 0 ||
    row.range.trim().length > 0 ||
    row.calibration_details.trim().length > 0 ||
    row.clause_number.trim().length > 0 ||
    row.test_method.trim().length > 0 ||
    row.remarks.trim().length > 0 ||
    row.quantity.trim().length > 0
  );
}

export function editorRowsFromFormEntries(
  entries: Cmpf306EquipmentFormEntry[],
  previousRows: Cmpf306EquipmentRow[] = [],
): Cmpf306EquipmentRow[] {
  return entries
    .filter(entryHasContent)
    .map((entry, index) => ({
      id: previousRows[index]?.id ?? createCmpf306EquipmentRow().id,
      ...rowFromEntry(entry),
    }));
}

export function editorRowsFromAddEquipmentForm(
  values: Cmpf306AddEquipmentFormValues,
  previousRows: Cmpf306EquipmentRow[] = [],
): Cmpf306EquipmentRow[] {
  return editorRowsFromFormEntries(values.equipmentEntries, previousRows);
}

export const CMPF306_DRAFT_ROW_ID_PREFIX = "cmpf306-draft-";

export function isCmpf306DraftRowId(id: string): boolean {
  return id.startsWith(CMPF306_DRAFT_ROW_ID_PREFIX);
}

/** @deprecated Use editorRowsFromFormEntries */
export function draftEditorRowsFromFormEntries(
  entries: Cmpf306EquipmentFormEntry[],
): Cmpf306EquipmentRow[] {
  return editorRowsFromFormEntries(entries);
}

export function uniqueParametersFromEntries(
  entries: Cmpf306EquipmentFormEntry[],
): Cmpf306SelectedTestParameter[] {
  const seen = new Set<string>();
  const params: Cmpf306SelectedTestParameter[] = [];

  for (const entry of entries) {
    const clauseNo = entry.clauseNo.trim();
    const testName = entry.testName.trim();
    const testMethod = entry.testMethod.trim();
    if (!clauseNo && !testName) continue;
    const key = `${testName.toLowerCase()}|${clauseNo.toLowerCase()}|${testMethod.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    params.push({
      testName: testName || `Clause ${clauseNo}`,
      clauseNo,
      testMethod,
    });
  }

  return params;
}

export function validateAddEquipmentForm(values: Cmpf306AddEquipmentFormValues): string | null {
  const hasEquipment = values.equipmentEntries.some(
    (entry) => entry.equipmentName.trim().length > 0,
  );
  if (!hasEquipment) {
    return "Enter at least one test equipment name.";
  }
  return null;
}

export type Cmpf306SuggestedEquipment = {
  equipment_name: string;
  least_count: string;
  range: string;
  calibration_required: boolean;
  quantity: string;
};

export function equipmentEntriesFromScopeSuggestions(
  items: Cmpf306ScopeSuggestedEquipment[],
): Cmpf306EquipmentFormEntry[] {
  const entries = items
    .map((item) => ({
      testName: item.test_name.trim(),
      clauseNo: item.clause_no.trim(),
      testMethod: item.test_method.trim(),
      equipmentName: item.equipment_name.trim(),
      make: "",
      leastCount: item.least_count.trim(),
      range: item.range.trim(),
      calibrationRequired: item.calibration_required,
      quantity: item.quantity.trim() || "1 Nos",
    }))
    .filter((entry) => entry.equipmentName.length > 0);

  return entries.length > 0 ? entries : [defaultCmpf306EquipmentFormEntry()];
}

export function equipmentEntriesFromSuggestions(
  items: Cmpf306SuggestedEquipment[],
  param?: Cmpf306SelectedTestParameter,
): Cmpf306EquipmentFormEntry[] {
  const entries = items
    .map((item) => ({
      testName: param?.testName ?? "",
      clauseNo: param?.clauseNo ?? "",
      testMethod: param?.testMethod ?? "",
      equipmentName: item.equipment_name.trim(),
      make: "",
      leastCount: item.least_count.trim(),
      range: item.range.trim(),
      calibrationRequired: item.calibration_required,
      quantity: item.quantity.trim() || "1 Nos",
    }))
    .filter((entry) => entry.equipmentName.length > 0);

  return entries.length > 0 ? entries : [defaultCmpf306EquipmentFormEntry()];
}
