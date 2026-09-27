"use client";

import { useState } from "react";
import type { LicenseScopeFormat } from "@backend/modules/bis/application-checklist-notes";
import {
  LICENSE_SCOPE_DEFAULT_COLUMNS,
  LICENSE_SCOPE_MAX_COLUMNS,
  LICENSE_SCOPE_MIN_COLUMNS,
  clampLicenseScopeColumnCount,
  editorRowsToStored,
  licenseScopeUsesPlain,
  licenseScopeUsesTable,
  parseLicenseScopeFormat,
  parseLicenseScopeColumnHeaders,
} from "@backend/modules/bis/license-scope-format";
import { BIS_FIELD_LABEL_CLASS } from "./constants";
import { IsCodeRelatedFilesPanel } from "@/components/modules/is-code-master/related-files-panel";
import {
  LicenseScopeTableEditor,
  rowsFromScopeJson,
} from "./license-scope-table-editor";

export function LicenseScopeField({
  scopeType,
  plainText,
  rowsJson,
  onPlainTextChange,
  onRowsJsonChange,
  columnCount = LICENSE_SCOPE_DEFAULT_COLUMNS,
  columnHeaders,
  onColumnHeadersChange,
  label = "Licence Scope",
  placeholder = "Enter licence / manufacturing scope…",
  isCodeId,
}: {
  scopeType: LicenseScopeFormat;
  plainText: string;
  rowsJson: string;
  onPlainTextChange: (v: string) => void;
  onRowsJsonChange: (v: string) => void;
  columnCount?: number;
  columnHeaders?: string[];
  onColumnHeadersChange?: (headers: string[]) => void;
  label?: string;
  placeholder?: string;
  isCodeId?: string | null;
}) {
  const [tableRows, setTableRows] = useState(() => rowsFromScopeJson(rowsJson));
  const format = parseLicenseScopeFormat(scopeType);
  const count = clampLicenseScopeColumnCount(columnCount);
  const headers = parseLicenseScopeColumnHeaders(columnHeaders, count);
  const rowsJsonForSubmit = JSON.stringify(editorRowsToStored(tableRows));

  function handleTableChange(next: typeof tableRows) {
    setTableRows(next);
    onRowsJsonChange(JSON.stringify(editorRowsToStored(next)));
  }

  return (
    <div className="min-w-0 sm:col-span-2 lg:col-span-4">
      <label htmlFor="bis_license_scope" className={BIS_FIELD_LABEL_CLASS}>
        {label}
      </label>

      <input type="hidden" name="license_scope_format" value={format} />
      <input type="hidden" name="license_scope_column_count" value={String(count)} />
      <input
        type="hidden"
        name="license_scope_column_headers"
        value={JSON.stringify(headers)}
      />
      <input
        type="hidden"
        name="license_scope_rows"
        value={licenseScopeUsesTable(format) ? rowsJsonForSubmit : "[]"}
      />

      <div className="mt-1 space-y-3">
        {licenseScopeUsesPlain(format) ? (
          <textarea
            id="bis_license_scope"
            name="license_scope_plain"
            rows={3}
            value={plainText}
            onChange={(e) => onPlainTextChange(e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            placeholder={placeholder}
          />
        ) : (
          <input type="hidden" name="license_scope_plain" value="" />
        )}
        {licenseScopeUsesTable(format) ? (
          <LicenseScopeTableEditor
            theme="light"
            rows={tableRows}
            columnCount={count}
            columnHeaders={headers}
            onHeadersChange={onColumnHeadersChange}
            onChange={handleTableChange}
          />
        ) : null}
      </div>
      <IsCodeRelatedFilesPanel isCodeId={isCodeId} />
    </div>
  );
}

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

export function ScopeTypeSelect({
  value,
  onChange,
  columnCount,
  onColumnCountChange,
  hideLabel,
}: {
  value: LicenseScopeFormat;
  onChange: (v: LicenseScopeFormat) => void;
  columnCount?: number;
  onColumnCountChange?: (count: number) => void;
  hideLabel?: boolean;
}) {
  const format = parseLicenseScopeFormat(value);
  const count = clampLicenseScopeColumnCount(columnCount);
  const select = (
    <select
      id="scope_type_bis_field"
      value={format}
      onChange={(e) => onChange(parseLicenseScopeFormat(e.target.value))}
      className={hideLabel ? inp : `mt-1 ${inp}`}
    >
      <option value="plain">Only Plain Text</option>
      <option value="table">Only Column</option>
      <option value="plain_table">Plain Text with Column</option>
    </select>
  );

  const columns = licenseScopeUsesTable(format) && onColumnCountChange ? (
    <div className="min-w-[7.5rem]">
      {!hideLabel ? (
        <label htmlFor="scope_column_count_bis_field" className={BIS_FIELD_LABEL_CLASS}>
          Columns
        </label>
      ) : null}
      <select
        id="scope_column_count_bis_field"
        value={count}
        onChange={(e) => onColumnCountChange(clampLicenseScopeColumnCount(e.target.value))}
        className={hideLabel ? inp : `mt-1 ${inp}`}
        aria-label="Number of columns"
      >
        {Array.from(
          { length: LICENSE_SCOPE_MAX_COLUMNS - LICENSE_SCOPE_MIN_COLUMNS + 1 },
          (_, i) => LICENSE_SCOPE_MIN_COLUMNS + i,
        ).map((n) => (
          <option key={n} value={n}>
            {n} Column{n === 1 ? "" : "s"}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  if (hideLabel) {
    return (
      <div className="flex min-w-0 gap-2">
        <div className="min-w-0 flex-1">{select}</div>
        {columns}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="scope_type_bis_field" className={BIS_FIELD_LABEL_CLASS}>
          Scope Type
        </label>
        {select}
      </div>
      {columns}
    </div>
  );
}
