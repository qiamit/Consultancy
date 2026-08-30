export type FinanceLinesColumnKey =
  | "unit"
  | "qty"
  | "rate"
  | "discount"
  | "gst_amount"
  | "total";

export const FINANCE_LINES_COLUMN_LABELS: Record<
  FinanceLinesColumnKey,
  string
> = {
  unit: "Unit",
  qty: "Qty",
  rate: "Rate",
  discount: "Discount",
  gst_amount: "GST Amt",
  total: "Total",
};

export const FINANCE_LINES_STANDARD_COLUMNS: readonly FinanceLinesColumnKey[] = [
  "unit",
  "qty",
  "rate",
  "discount",
  "total",
];

export const FINANCE_LINES_WITH_GST_COLUMNS: readonly FinanceLinesColumnKey[] = [
  "unit",
  "qty",
  "rate",
  "discount",
  "gst_amount",
  "total",
];

/** Default width for Unit / Qty / Rate / Discount / Total (and GST) columns. */
export const FINANCE_LINES_TOGGLE_COL_WIDTH = "10%";

/** Actions (+ / −) column — fixed beside percentage columns. */
export const FINANCE_LINES_ACTIONS_COL_WIDTH = "2.5rem";

export const FINANCE_LINES_ITEM_WIDTH_STANDARD = "50%";
export const FINANCE_LINES_ITEM_WIDTH_WITH_GST = "40%";

export function financeLinesItemColWidth(
  visibleColumns: readonly FinanceLinesColumnKey[],
  withGst: boolean,
): string {
  const allColumns = withGst
    ? FINANCE_LINES_WITH_GST_COLUMNS
    : FINANCE_LINES_STANDARD_COLUMNS;
  const baseNum = withGst ? 40 : 50;
  const hiddenCount = allColumns.length - visibleColumns.length;
  return `${baseNum + hiddenCount * 10}%`;
}

export function loadFinanceLinesVisibleColumns(
  storageKey: string,
  availableColumns: readonly FinanceLinesColumnKey[],
): FinanceLinesColumnKey[] {
  if (typeof window === "undefined") return [...availableColumns];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [...availableColumns];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...availableColumns];
    const allowed = new Set(availableColumns);
    const filtered = parsed.filter(
      (c): c is FinanceLinesColumnKey =>
        typeof c === "string" && allowed.has(c as FinanceLinesColumnKey),
    );
    return filtered.length > 0 ? filtered : [...availableColumns];
  } catch {
    return [...availableColumns];
  }
}

export function saveFinanceLinesVisibleColumns(
  storageKey: string,
  columns: readonly FinanceLinesColumnKey[],
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(columns));
  } catch {
    /* ignore quota / private mode */
  }
}
