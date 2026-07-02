export type OslSampleTableColumnKey =
  | "sr_no"
  | "sample_description"
  | "declared_value"
  | "batch_no"
  | "dom"
  | "sample_quantity"
  | "sample_code"
  | "qr_code"
  | "batch_quantity"
  | "sample_type"
  | "priority"
  | "laboratory";

export const OSL_SAMPLE_TABLE_COLUMN_ORDER: OslSampleTableColumnKey[] = [
  "sr_no",
  "sample_description",
  "declared_value",
  "batch_no",
  "dom",
  "sample_quantity",
  "sample_code",
  "qr_code",
  "batch_quantity",
  "sample_type",
  "priority",
  "laboratory",
];

export const DEFAULT_OSL_SAMPLE_TABLE_COLUMNS: OslSampleTableColumnKey[] = [
  "sr_no",
  "sample_description",
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
  { key: "sample_code", label: "Sample Code", headerHtml: "Sample Code", headerCenter: true },
  { key: "qr_code", label: "QR Code", headerHtml: "QR Code", headerCenter: true },
  {
    key: "batch_quantity",
    label: "Batch QTY",
    headerHtml: "Batch<br/>QTY",
    stackHeader: true,
    headerCenter: true,
    cellCenter: true,
  },
  { key: "sample_type", label: "Sample Type", headerHtml: "Sample Type", headerCenter: true },
  { key: "priority", label: "Priority", headerHtml: "Priority", headerCenter: true },
  { key: "laboratory", label: "Laboratory", headerHtml: "Laboratory", headerCenter: true },
];

export function normalizeOslSampleTableColumns(
  columns: OslSampleTableColumnKey[] | undefined,
): OslSampleTableColumnKey[] {
  if (!columns?.length) return [...DEFAULT_OSL_SAMPLE_TABLE_COLUMNS];
  const allowed = new Set(OSL_SAMPLE_TABLE_COLUMN_ORDER);
  const picked = columns.filter((key) => allowed.has(key));
  if (picked.length === 0) return [...DEFAULT_OSL_SAMPLE_TABLE_COLUMNS];
  return OSL_SAMPLE_TABLE_COLUMN_ORDER.filter((key) => picked.includes(key));
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
