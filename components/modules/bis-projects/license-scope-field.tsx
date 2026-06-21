"use client";

import { useState } from "react";
import type { LicenseScopeFormat } from "@/lib/application-checklist-notes";
import { editorRowsToStored } from "@/lib/license-scope-format";
import { BIS_FIELD_LABEL_CLASS } from "./constants";
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
}: {
  scopeType: LicenseScopeFormat;
  plainText: string;
  rowsJson: string;
  onPlainTextChange: (v: string) => void;
  onRowsJsonChange: (v: string) => void;
}) {
  const [tableRows, setTableRows] = useState(() => rowsFromScopeJson(rowsJson));

  const rowsJsonForSubmit = JSON.stringify(editorRowsToStored(tableRows));

  function handleTableChange(next: typeof tableRows) {
    setTableRows(next);
    onRowsJsonChange(JSON.stringify(editorRowsToStored(next)));
  }

  return (
    <div className="min-w-0 sm:col-span-2 lg:col-span-4">
      <label htmlFor="bis_license_scope" className={BIS_FIELD_LABEL_CLASS}>
        Licence Scope
      </label>

      <input type="hidden" name="license_scope_format" value={scopeType} />
      <input
        type="hidden"
        name="license_scope_rows"
        value={scopeType === "table" ? rowsJsonForSubmit : "[]"}
      />

      {scopeType === "plain" ? (
        <textarea
          id="bis_license_scope"
          name="license_scope_plain"
          rows={3}
          value={plainText}
          onChange={(e) => onPlainTextChange(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder="Enter licence / manufacturing scope…"
        />
      ) : (
        <>
          <input type="hidden" name="license_scope_plain" value="" />
          <div className="mt-1">
            <LicenseScopeTableEditor
              theme="light"
              rows={tableRows}
              onChange={handleTableChange}
            />
          </div>
        </>
      )}
    </div>
  );
}

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

export function ScopeTypeSelect({
  value,
  onChange,
  hideLabel,
}: {
  value: LicenseScopeFormat;
  onChange: (v: LicenseScopeFormat) => void;
  hideLabel?: boolean;
}) {
  const select = (
    <select
      id="scope_type_bis_field"
      value={value}
      onChange={(e) => onChange(e.target.value as LicenseScopeFormat)}
      className={hideLabel ? inp : `mt-1 ${inp}`}
    >
      <option value="plain">Plain Text</option>
      <option value="table">2 Column</option>
    </select>
  );

  if (hideLabel) return select;

  return (
    <div className="space-y-1">
      <label htmlFor="scope_type_bis_field" className={BIS_FIELD_LABEL_CLASS}>
        Scope Type
      </label>
      {select}
    </div>
  );
}
