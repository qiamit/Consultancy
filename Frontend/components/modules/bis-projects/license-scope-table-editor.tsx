"use client";

import { useState } from "react";
import {
  LICENSE_SCOPE_DEFAULT_COLUMNS,
  clampLicenseScopeColumnCount,
  createLicenseScopeRow,
  defaultLicenseScopeRows,
  editorRowsToStored,
  parseLicenseScopeColumnHeaders,
  licenseScopeRowCells,
  setLicenseScopeRowCell,
  type LicenseScopeRow,
} from "@backend/modules/bis/license-scope-format";

export function rowsFromScopeJson(json: string): LicenseScopeRow[] {
  if (!json.trim()) return defaultLicenseScopeRows();
  try {
    const parsed = JSON.parse(json) as {
      component?: string;
      value?: string;
      extra?: string[];
    }[];
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultLicenseScopeRows();
    return parsed.map((r, index) => ({
      id: `scope-row-${index}`,
      component: String(r.component ?? ""),
      value: String(r.value ?? ""),
      extra: Array.isArray(r.extra) ? r.extra.map((cell) => String(cell ?? "")) : undefined,
    }));
  } catch {
    return defaultLicenseScopeRows();
  }
}

const themes = {
  light: {
    inp:
      "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
    wrap: "overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700",
    thead: "bg-zinc-100 dark:bg-zinc-800",
    th: "border-b border-zinc-200 px-2 py-1.5 text-center text-xs font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
    headerInp:
      "w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-center text-xs font-semibold text-zinc-700 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100",
    tr: "border-b border-zinc-100 dark:border-zinc-800",
    td: "px-2 py-1.5",
    footer: "border-t border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/50",
    addBtn:
      "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
    delBtn: "rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800",
    headerLockBtn:
      "inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 bg-white text-sm leading-none hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700",
    headerLockBtnActive:
      "inline-flex h-7 w-7 items-center justify-center rounded-md border border-sky-500 bg-sky-600 text-sm leading-none hover:bg-sky-500",
  },
  dark: {
    inp:
      "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40",
    wrap: "overflow-hidden rounded-lg border border-zinc-800",
    thead: "bg-zinc-800",
    th: "border-b border-zinc-700 px-2 py-1.5 text-center text-xs font-semibold text-zinc-300",
    headerInp:
      "w-full rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-center text-xs font-semibold text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40",
    tr: "border-b border-zinc-800/80",
    td: "px-2 py-1.5",
    footer: "border-t border-zinc-800 bg-zinc-900/50 px-3 py-2",
    addBtn:
      "rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800",
    delBtn: "rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400",
    headerLockBtn:
      "inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-600 bg-zinc-900 text-sm leading-none hover:bg-zinc-800",
    headerLockBtnActive:
      "inline-flex h-7 w-7 items-center justify-center rounded-md border border-sky-500 bg-sky-600 text-sm leading-none hover:bg-sky-500",
  },
} as const;

export function LicenseScopeTableEditor({
  rows,
  onChange,
  columnCount = LICENSE_SCOPE_DEFAULT_COLUMNS,
  columnHeaders,
  onHeadersChange,
  theme = "light",
}: {
  rows: LicenseScopeRow[];
  onChange: (rows: LicenseScopeRow[]) => void;
  columnCount?: number;
  columnHeaders?: string[];
  onHeadersChange?: (headers: string[]) => void;
  theme?: keyof typeof themes;
}) {
  const t = themes[theme];
  const count = clampLicenseScopeColumnCount(columnCount);
  const headers = parseLicenseScopeColumnHeaders(columnHeaders, count);
  const [editingHeaders, setEditingHeaders] = useState(false);

  function updateHeader(index: number, value: string) {
    if (!onHeadersChange) return;
    const next = [...headers];
    next[index] = value;
    onHeadersChange(next);
  }

  function updateCell(id: string, index: number, value: string) {
    onChange(rows.map((r) => (r.id === id ? setLicenseScopeRowCell(r, index, value) : r)));
  }

  function addRow() {
    onChange([...rows, createLicenseScopeRow()]);
  }

  function removeRow(id: string) {
    const next = rows.filter((r) => r.id !== id);
    onChange(next.length > 0 ? next : defaultLicenseScopeRows());
  }

  return (
    <div className={t.wrap}>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead className={t.thead}>
            <tr>
              {headers.map((label, index) => (
                <th key={`header-${index}`} className={t.th}>
                  {onHeadersChange && editingHeaders ? (
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => updateHeader(index, e.target.value)}
                      aria-label={`Column ${index + 1} header`}
                      className={t.headerInp}
                    />
                  ) : (
                    <span className="block truncate px-1 text-center">{label}</span>
                  )}
                </th>
              ))}
              <th className="w-10 border-b border-zinc-700 px-1 py-1.5 text-center">
                {onHeadersChange ? (
                  <button
                    type="button"
                    onClick={() => setEditingHeaders((prev) => !prev)}
                    className={editingHeaders ? t.headerLockBtnActive : t.headerLockBtn}
                    aria-pressed={editingHeaders}
                    title={editingHeaders ? "Done" : "Edit"}
                    aria-label={editingHeaders ? "Lock column names" : "Edit column names"}
                  >
                    {editingHeaders ? "🔒" : "✏️"}
                  </button>
                ) : null}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cells = licenseScopeRowCells(row, count);
              return (
                <tr key={row.id} className={t.tr}>
                  {cells.map((cell, index) => (
                    <td key={`${row.id}-${index}`} className={t.td}>
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => updateCell(row.id, index, e.target.value)}
                        placeholder={`${headers[index] ?? "Value"}…`}
                        className={t.inp}
                      />
                    </td>
                  ))}
                  <td className={`${t.td} text-center`}>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className={t.delBtn}
                      aria-label="Remove row"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={t.footer}>
        <button type="button" onClick={addRow} className={t.addBtn}>
          + Add Row
        </button>
      </div>
    </div>
  );
}

export function storedScopeRowsFromEditor(rows: LicenseScopeRow[]) {
  return editorRowsToStored(rows);
}
