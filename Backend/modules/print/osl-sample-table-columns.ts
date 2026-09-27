import {
  parseSampleFor,
  resolveGradeAndDescription,
  sampleForLabel,
  type OslSampleRequirementStored,
} from "@backend/modules/bis/osl-sample-requirements";
import { formatDisplayDate } from "@backend/shared/format-date";

export type OslSampleTableColumnKey =
  | "sr_no"
  | "sample_for"
  | "grade_type_variety"
  | "sample_description"
  | "declared_value"
  | "batch_no"
  | "dom"
  | "sample_quantity"
  | "batch_quantity"
  | "sample_code"
  | "qr_code"
  | "sample_type"
  | "priority"
  | "laboratory"
  | "destination_lab"
  | "shelf_life"
  | "mode_of_disposal"
  | "test_required"
  | "serial_number"
  | "additional_information"
  | "testing_charges"
  | "payment_ref"
  | "payment_date"
  | "payment_mode";

export const OSL_SAMPLE_TABLE_COLUMN_ORDER: OslSampleTableColumnKey[] = [
  "sr_no",
  "sample_for",
  "grade_type_variety",
  "sample_description",
  "declared_value",
  "batch_no",
  "dom",
  "sample_quantity",
  "batch_quantity",
  "sample_code",
  "qr_code",
  "sample_type",
  "priority",
  "laboratory",
  "destination_lab",
  "shelf_life",
  "mode_of_disposal",
  "test_required",
  "serial_number",
  "additional_information",
  "testing_charges",
  "payment_ref",
  "payment_date",
  "payment_mode",
];

export const DEFAULT_OSL_SAMPLE_TABLE_COLUMNS: OslSampleTableColumnKey[] = [
  "sr_no",
  "grade_type_variety",
  "declared_value",
  "batch_no",
  "dom",
  "batch_quantity",
];

export const OSL_SAMPLE_TABLE_COLUMN_OPTIONS: {
  key: OslSampleTableColumnKey;
  label: string;
  headerHtml: string;
  wide?: boolean;
  stackHeader?: boolean;
  headerCenter?: boolean;
  cellCenter?: boolean;
}[] = [
  { key: "sr_no", label: "Sr. No.", headerHtml: "Sr<br/>No", stackHeader: true, headerCenter: true },
  {
    key: "sample_for",
    label: "Sample For",
    headerHtml: "Sample<br/>For",
    stackHeader: true,
    headerCenter: true,
    cellCenter: true,
  },
  {
    key: "grade_type_variety",
    label: "Grade / Type / Variety",
    headerHtml: "Grade / Type / Variety",
    wide: true,
    headerCenter: true,
  },
  {
    key: "sample_description",
    label: "Sample Description",
    headerHtml: "Sample Description",
    wide: true,
    headerCenter: true,
  },
  {
    key: "declared_value",
    label: "Declared Value",
    headerHtml: "Declared Value",
    wide: true,
    headerCenter: true,
    cellCenter: true,
  },
  { key: "batch_no", label: "Batch No.", headerHtml: "Batch No", headerCenter: true, cellCenter: true },
  { key: "dom", label: "Date of Manufacturing", headerHtml: "DOM", headerCenter: true, cellCenter: true },
  {
    key: "sample_quantity",
    label: "Sample Quantity",
    headerHtml: "Sample<br/>QTY",
    stackHeader: true,
    headerCenter: true,
  },
  {
    key: "batch_quantity",
    label: "Batch Quantity",
    headerHtml: "Batch<br/>QTY",
    stackHeader: true,
    headerCenter: true,
    cellCenter: true,
  },
  { key: "sample_code", label: "Sample Code", headerHtml: "Sample Code", headerCenter: true },
  { key: "qr_code", label: "QR Code", headerHtml: "QR Code", headerCenter: true },
  { key: "sample_type", label: "Sample Type", headerHtml: "Sample Type", headerCenter: true },
  { key: "priority", label: "Priority", headerHtml: "Priority", headerCenter: true },
  { key: "laboratory", label: "Name of the Laboratory", headerHtml: "Laboratory", headerCenter: true },
  {
    key: "destination_lab",
    label: "Destination Lab",
    headerHtml: "Destination<br/>Lab",
    stackHeader: true,
    headerCenter: true,
  },
  {
    key: "shelf_life",
    label: "Shelf Life",
    headerHtml: "Shelf<br/>Life",
    stackHeader: true,
    headerCenter: true,
    cellCenter: true,
  },
  {
    key: "mode_of_disposal",
    label: "Mode Of Disposal",
    headerHtml: "Mode Of<br/>Disposal",
    stackHeader: true,
    headerCenter: true,
    cellCenter: true,
  },
  {
    key: "test_required",
    label: "Test Required",
    headerHtml: "Test<br/>Required",
    stackHeader: true,
    headerCenter: true,
    wide: true,
  },
  {
    key: "serial_number",
    label: "Serial Number",
    headerHtml: "Serial<br/>No",
    stackHeader: true,
    headerCenter: true,
  },
  {
    key: "additional_information",
    label: "Additional Information",
    headerHtml: "Additional Information",
    wide: true,
  },
  {
    key: "testing_charges",
    label: "Testing Charges",
    headerHtml: "Testing<br/>Charges",
    stackHeader: true,
    headerCenter: true,
    cellCenter: true,
  },
  {
    key: "payment_ref",
    label: "UTR / UPI / Cheque No.",
    headerHtml: "Payment<br/>Ref",
    stackHeader: true,
    headerCenter: true,
  },
  {
    key: "payment_date",
    label: "Date of Transaction",
    headerHtml: "Payment<br/>Date",
    stackHeader: true,
    headerCenter: true,
    cellCenter: true,
  },
  {
    key: "payment_mode",
    label: "Mode of Payment",
    headerHtml: "Payment<br/>Mode",
    stackHeader: true,
    headerCenter: true,
  },
];

function formatColumnDate(ymd: string): string {
  const raw = (ymd ?? "").trim();
  if (!raw) return "—";
  return formatDisplayDate(raw, "—");
}

/** Plain-text cell for print / Word. */
export function oslSampleColumnCellText(
  key: OslSampleTableColumnKey,
  row: OslSampleRequirementStored,
  rowIndex: number,
): string {
  const resolved = resolveGradeAndDescription(row);
  switch (key) {
    case "sr_no":
      return String(rowIndex + 1).padStart(2, "0");
    case "sample_for":
      return sampleForLabel(parseSampleFor(row.sample_for));
    case "grade_type_variety":
      return resolved.grade_type_variety || "—";
    case "sample_description":
      return resolved.sample_description || "—";
    case "declared_value":
      return row.declared_value.trim() || "—";
    case "batch_no":
      return row.batch_number.trim() || "—";
    case "dom":
      return formatColumnDate(row.date_of_manufacturing);
    case "sample_quantity":
      return row.sample_quantity.trim() || "—";
    case "sample_code":
      return row.sample_code.trim() || "—";
    case "qr_code":
      return row.qr_code.trim() || "—";
    case "batch_quantity":
      return row.batch_quantity.trim() || "—";
    case "sample_type":
      return row.sample_type.trim() || "—";
    case "priority":
      return row.priority.trim() || "Priority";
    case "laboratory":
      return row.laboratory_name.trim() || "—";
    case "destination_lab":
      return (row.destination_lab ?? "").trim() || "—";
    case "shelf_life":
      return row.shelf_life.trim() || "—";
    case "mode_of_disposal":
      return row.mode_of_disposal.trim() || "—";
    case "testing_charges":
      return row.testing_charges.trim() || "—";
    case "test_required":
      return row.test_required.trim() || "—";
    case "serial_number":
      return (row.serial_number ?? "").trim() || "—";
    case "additional_information":
      return (row.additional_information ?? "").trim() || "—";
    case "payment_ref":
      return (row.payment_ref ?? "").trim() || "—";
    case "payment_date":
      return formatColumnDate(row.payment_date ?? "");
    case "payment_mode":
      return (row.payment_mode ?? "").trim() || "—";
    default:
      return "—";
  }
}

export function oslSampleRowHasPrintableContent(row: OslSampleRequirementStored): boolean {
  const resolved = resolveGradeAndDescription(row);
  return Boolean(
    resolved.grade_type_variety ||
      resolved.sample_description ||
      row.declared_value.trim() ||
      row.batch_number.trim() ||
      row.date_of_manufacturing.trim() ||
      row.sample_quantity.trim() ||
      row.batch_quantity.trim() ||
      row.sample_code.trim() ||
      row.qr_code.trim() ||
      row.sample_type.trim() ||
      row.laboratory_name.trim() ||
      (row.destination_lab ?? "").trim() ||
      row.shelf_life.trim() ||
      row.mode_of_disposal.trim() ||
      row.testing_charges.trim() ||
      row.test_required.trim() ||
      (row.serial_number ?? "").trim() ||
      (row.additional_information ?? "").trim() ||
      (row.payment_ref ?? "").trim() ||
      (row.payment_date ?? "").trim() ||
      (row.payment_mode ?? "").trim(),
  );
}

export function normalizeOslSampleTableColumns(
  columns: OslSampleTableColumnKey[] | undefined,
): OslSampleTableColumnKey[] {
  if (!columns?.length) return [...DEFAULT_OSL_SAMPLE_TABLE_COLUMNS];
  const allowed = new Set(OSL_SAMPLE_TABLE_COLUMN_ORDER);
  const picked = columns.filter((key) => allowed.has(key));
  const unique = OSL_SAMPLE_TABLE_COLUMN_ORDER.filter((key) => picked.includes(key));
  if (unique.length === 0) return [...DEFAULT_OSL_SAMPLE_TABLE_COLUMNS];
  return unique;
}

export function toggleOslSampleTableColumn(
  columns: OslSampleTableColumnKey[],
  key: OslSampleTableColumnKey,
): OslSampleTableColumnKey[] {
  const normalized = normalizeOslSampleTableColumns(columns);
  if (normalized.includes(key)) {
    const next = normalized.filter((k) => k !== key);
    return next.length > 0 ? next : normalized;
  }
  return normalizeOslSampleTableColumns([...normalized, key]);
}

export function oslSampleColumnPickerLabel(key: OslSampleTableColumnKey, label: string): string {
  if (key === "dom") return "DOM (Date of Manufacturing)";
  return label;
}
