"use client";

import {
  FINANCE_LINES_ACTIONS_COL_WIDTH,
  FINANCE_LINES_TOGGLE_COL_WIDTH,
  financeLinesItemColWidth,
  type FinanceLinesColumnKey,
} from "./finance-lines-table-columns";

export function FinanceLinesColgroup({
  visibleColumns,
  isVisible,
  withGst = false,
}: {
  visibleColumns: readonly FinanceLinesColumnKey[];
  isVisible: (column: FinanceLinesColumnKey) => boolean;
  withGst?: boolean;
}) {
  const itemWidth = financeLinesItemColWidth(visibleColumns, withGst);

  return (
    <colgroup>
      <col style={{ width: itemWidth }} />
      {isVisible("unit") ? (
        <col style={{ width: FINANCE_LINES_TOGGLE_COL_WIDTH }} />
      ) : null}
      {isVisible("qty") ? (
        <col style={{ width: FINANCE_LINES_TOGGLE_COL_WIDTH }} />
      ) : null}
      {isVisible("rate") ? (
        <col style={{ width: FINANCE_LINES_TOGGLE_COL_WIDTH }} />
      ) : null}
      {isVisible("discount") ? (
        <col style={{ width: FINANCE_LINES_TOGGLE_COL_WIDTH }} />
      ) : null}
      {withGst && isVisible("gst_amount") ? (
        <col style={{ width: FINANCE_LINES_TOGGLE_COL_WIDTH }} />
      ) : null}
      {isVisible("total") ? (
        <col style={{ width: FINANCE_LINES_TOGGLE_COL_WIDTH }} />
      ) : null}
      <col style={{ width: FINANCE_LINES_ACTIONS_COL_WIDTH }} />
    </colgroup>
  );
}

export const FINANCE_LINES_TABLE_CLASS = "w-full table-fixed text-sm";

export const FINANCE_LINES_INPUT_CELL_CLASS =
  "block w-full min-w-0 max-w-full";

export const FINANCE_LINE_DESC_EDIT_BTN_CLASS =
  "shrink-0 rounded border border-sky-300 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-950";
