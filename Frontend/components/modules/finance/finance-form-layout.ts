/** Two-column header grid: 50% left (number/date/client), 50% right (client details). */
export const FINANCE_FORM_HEADER_GRID_CLASS =
  "grid min-w-0 gap-3 lg:grid-cols-2 lg:items-stretch";

export const FINANCE_FORM_HEADER_FIELDS_CLASS =
  "flex min-w-0 flex-col gap-2 lg:col-start-1 lg:row-start-1";

/** Row 1 in left half: number / date / type share full width. */
export const FINANCE_FORM_HEADER_ROW_CLASS =
  "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.7fr)] sm:items-end";

export const FINANCE_FORM_NUMBER_FIELD_CLASS = "min-w-0 space-y-1.5";

export const FINANCE_FORM_DATE_FIELD_CLASS = "min-w-0 space-y-1.5";

export const FINANCE_FORM_TYPE_FIELD_CLASS = "min-w-0 space-y-1.5";

export const FINANCE_FORM_CLIENT_FIELD_CLASS =
  "min-w-0 max-w-full space-y-2 lg:col-start-1 lg:row-start-2";

export const FINANCE_CLIENT_DETAILS_PANEL_CLASS =
  "min-h-full space-y-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 lg:col-start-2 lg:row-start-1 lg:row-span-2";
