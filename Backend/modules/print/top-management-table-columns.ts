export type TopManagementTableColumnKey =
  | "sr_no"
  | "person_name"
  | "designation"
  | "email"
  | "mobile";

export const TOP_MANAGEMENT_TABLE_COLUMN_ORDER: TopManagementTableColumnKey[] = [
  "sr_no",
  "person_name",
  "designation",
  "email",
  "mobile",
];

export const DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS: TopManagementTableColumnKey[] = [
  ...TOP_MANAGEMENT_TABLE_COLUMN_ORDER,
];

export const TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS: {
  key: TopManagementTableColumnKey;
  label: string;
  headerHtml: string;
  wide?: boolean;
  stackHeader?: boolean;
  headerCenter?: boolean;
  /** Relative weight for print column width (fits within table area). */
  widthWeight?: number;
}[] = [
  {
    key: "sr_no",
    label: "Sr No",
    headerHtml: "Sr<br/>No",
    stackHeader: true,
    headerCenter: true,
    widthWeight: 6,
  },
  {
    key: "person_name",
    label: "Name of Person",
    headerHtml: "Name of Person",
    wide: true,
    headerCenter: true,
    widthWeight: 24,
  },
  {
    key: "designation",
    label: "Designation",
    headerHtml: "Designation",
    wide: true,
    headerCenter: true,
    widthWeight: 20,
  },
  {
    key: "email",
    label: "Email ID",
    headerHtml: "Email ID",
    wide: true,
    headerCenter: true,
    widthWeight: 28,
  },
  {
    key: "mobile",
    label: "Mobile Number",
    headerHtml: "Mobile<br/>Number",
    stackHeader: true,
    headerCenter: true,
    widthWeight: 16,
  },
];

export function topManagementColumnWidthPct(
  key: TopManagementTableColumnKey,
  visibleKeys: TopManagementTableColumnKey[],
): string {
  const defs = TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS.filter((c) => visibleKeys.includes(c.key));
  const total = defs.reduce((sum, c) => sum + (c.widthWeight ?? 10), 0);
  const def = defs.find((c) => c.key === key);
  const weight = def?.widthWeight ?? 10;
  return `${((weight / total) * 100).toFixed(2)}%`;
}

export function normalizeTopManagementTableColumns(
  columns: TopManagementTableColumnKey[] | undefined,
): TopManagementTableColumnKey[] {
  if (!columns?.length) return [...DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS];
  const allowed = new Set<TopManagementTableColumnKey>(TOP_MANAGEMENT_TABLE_COLUMN_ORDER);
  const normalized = columns.filter((k) => allowed.has(k));
  return normalized.length > 0 ? normalized : [...DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS];
}

export function toggleTopManagementTableColumn(
  current: TopManagementTableColumnKey[],
  key: TopManagementTableColumnKey,
): TopManagementTableColumnKey[] {
  const normalized = normalizeTopManagementTableColumns(current);
  if (normalized.includes(key)) {
    const next = normalized.filter((k) => k !== key);
    return next.length > 0 ? next : [...DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS];
  }
  const order = TOP_MANAGEMENT_TABLE_COLUMN_ORDER;
  const next = [...normalized, key].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return next;
}
