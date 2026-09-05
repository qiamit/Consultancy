"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import type { TestParameterEditorRow } from "./constants";
import { TestParameterMasterFooterBar } from "./footer-bar";

const chk =
  "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-900";

const centerHead = "px-3 py-2 text-center";
const centerCell = "px-3 py-2 align-middle text-center text-zinc-900 dark:text-zinc-100";
const leftCell = "px-3 py-2 align-middle text-left text-zinc-900 dark:text-zinc-100";

const cellInp =
  "block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-center text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const cellInpLeft =
  "block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-left text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

const addBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-sky-600/40 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/70";

const delBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400";

const actionLink =
  "text-sm font-medium text-sky-600 hover:underline dark:text-sky-400";

const COL_COUNT = 7;

function dash(v: string): string {
  const t = v.trim();
  return t === "" ? "—" : t;
}

function UnitCellCombobox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: AppDropdownOptionRow[];
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const unitChoices = useMemo(
    () =>
      options
        .map((o) => {
          const value = o.value.trim();
          if (!value) return null;
          const label = (o.label ?? o.value).trim() || value;
          return { value, label };
        })
        .filter((o): o is { value: string; label: string } => o != null),
    [options],
  );

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return unitChoices.slice(0, 80);
    return unitChoices
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [unitChoices, value]);

  function updatePanelPosition() {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 140),
    });
  }

  function pick(choice: { value: string; label: string }) {
    onChange(choice.value);
    setOpen(false);
    inputRef.current?.blur();
  }

  const showList = open && filtered.length > 0 && panelStyle;

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label="Unit"
        placeholder="Unit"
        className={cellInp}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlight(0);
          setOpen(true);
          updatePanelPosition();
        }}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
          updatePanelPosition();
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            setOpen(true);
            updatePanelPosition();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(filtered.length - 1, h + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
          } else if (e.key === "Enter" && open && filtered[highlight]) {
            e.preventDefault();
            pick(filtered[highlight]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList
        ? createPortal(
            <ul
              role="listbox"
              className="fixed z-[200] max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 text-sm shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
              style={{
                top: panelStyle.top,
                left: panelStyle.left,
                width: panelStyle.width,
              }}
              onMouseDown={(ev) => ev.preventDefault()}
            >
              {filtered.map((choice, i) => (
                <li
                  key={choice.value}
                  role="option"
                  aria-selected={i === highlight}
                >
                  <button
                    type="button"
                    className={`block w-full px-3 py-1.5 text-left text-zinc-900 hover:bg-sky-50 dark:text-zinc-100 dark:hover:bg-sky-950/40 ${
                      i === highlight ? "bg-sky-50 dark:bg-sky-950/40" : ""
                    }`}
                    onClick={() => pick(choice)}
                  >
                    {choice.label}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

function PageSelectAllCheckbox({
  pageRowKeys,
  selectedKeys,
  onTogglePage,
}: {
  pageRowKeys: string[];
  selectedKeys: ReadonlySet<string>;
  onTogglePage: () => void;
}) {
  const selectable = pageRowKeys.filter((k) => !k.startsWith("draft-"));
  const allOnPage =
    selectable.length > 0 && selectable.every((k) => selectedKeys.has(k));
  const someOnPage =
    !allOnPage && selectable.some((k) => selectedKeys.has(k));
  return (
    <input
      type="checkbox"
      checked={allOnPage}
      ref={(el) => {
        if (el) el.indeterminate = someOnPage;
      }}
      onChange={onTogglePage}
      className={chk}
      aria-label="Select all rows on this page"
      title="Select all rows on this page"
      disabled={selectable.length === 0}
    />
  );
}

function EditableCells({
  row,
  unitOptions,
  focusNameToken = 0,
  onUpdateRow,
}: {
  row: TestParameterEditorRow;
  unitOptions: AppDropdownOptionRow[];
  focusNameToken?: number;
  onUpdateRow: (
    key: string,
    patch: Partial<
      Pick<
        TestParameterEditorRow,
        | "test_name"
        | "clause_no"
        | "test_method"
        | "unit"
        | "specified_value"
      >
    >,
  ) => void;
}) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusNameToken <= 0) return;
    const id = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [focusNameToken, row.key]);

  return (
    <>
      <td className="px-2 py-1.5 align-middle">
        <input
          ref={nameInputRef}
          type="text"
          value={row.test_name}
          onChange={(e) => onUpdateRow(row.key, { test_name: e.target.value })}
          placeholder="Name of the Test"
          className={cellInpLeft}
          aria-label="Name of the Test"
        />
      </td>
      <td className="px-2 py-1.5 align-middle">
        <input
          type="text"
          value={row.clause_no}
          onChange={(e) => onUpdateRow(row.key, { clause_no: e.target.value })}
          placeholder="Clause No"
          className={cellInp}
          aria-label="Clause No"
        />
      </td>
      <td className="px-2 py-1.5 align-middle">
        <input
          type="text"
          value={row.test_method}
          onChange={(e) =>
            onUpdateRow(row.key, { test_method: e.target.value })
          }
          placeholder="Test Method"
          className={cellInp}
          aria-label="Test Method"
        />
      </td>
      <td className="px-2 py-1.5 align-middle">
        <UnitCellCombobox
          value={row.unit}
          options={unitOptions}
          onChange={(v) => onUpdateRow(row.key, { unit: v })}
        />
      </td>
      <td className="px-2 py-1.5 align-middle">
        <input
          type="text"
          value={row.specified_value}
          onChange={(e) =>
            onUpdateRow(row.key, { specified_value: e.target.value })
          }
          placeholder="Specified Value"
          className={cellInp}
          aria-label="Specified Value"
        />
      </td>
    </>
  );
}

function ReadOnlyCells({ row }: { row: TestParameterEditorRow }) {
  return (
    <>
      <td className={leftCell}>{dash(row.test_name)}</td>
      <td className={centerCell}>{dash(row.clause_no)}</td>
      <td className={centerCell}>{dash(row.test_method)}</td>
      <td className={centerCell}>{dash(row.unit)}</td>
      <td className={centerCell}>{dash(row.specified_value)}</td>
    </>
  );
}

export function TestParameterMasterTable({
  rows,
  unitOptions,
  editingKey,
  nameFocusToken = 0,
  matchedCount,
  grandCount,
  searchActive,
  onExport,
  onPrintList,
  onDelete,
  deleteDisabled,
  onAddRow,
  onDeleteRow,
  onEditRow,
  onDoneEditRow,
  onUpdateRow,
  selectedKeys,
  onToggleRowSelection,
  onToggleSelectPage,
}: {
  rows: TestParameterEditorRow[];
  unitOptions: AppDropdownOptionRow[];
  editingKey: string | null;
  nameFocusToken?: number;
  matchedCount: number;
  grandCount: number;
  searchActive: boolean;
  onExport: () => void;
  onPrintList: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
  onAddRow: () => void;
  onDeleteRow: (row: TestParameterEditorRow) => void;
  onEditRow: (row: TestParameterEditorRow) => void;
  onDoneEditRow: (row: TestParameterEditorRow) => void;
  onUpdateRow: (
    key: string,
    patch: Partial<
      Pick<
        TestParameterEditorRow,
        | "test_name"
        | "clause_no"
        | "test_method"
        | "unit"
        | "specified_value"
      >
    >,
  ) => void;
  selectedKeys: ReadonlySet<string>;
  onToggleRowSelection: (key: string) => void;
  onToggleSelectPage: () => void;
}) {
  const noMatches = grandCount === 0 && searchActive && rows.length === 0;
  const pageRowKeys = rows.map((r) => r.key);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-100 text-left text-xs font-semibold tracking-wide text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400">
          <tr>
            <th className="w-11 px-2 py-2 text-center align-middle">
              <div className="flex justify-center">
                <PageSelectAllCheckbox
                  pageRowKeys={pageRowKeys}
                  selectedKeys={selectedKeys}
                  onTogglePage={onToggleSelectPage}
                />
              </div>
            </th>
            <th className="min-w-[180px] px-3 py-2 text-left">Name of the Test</th>
            <th className={`min-w-[100px] ${centerHead}`}>Clause No</th>
            <th className={`min-w-[140px] ${centerHead}`}>Test Method</th>
            <th className={`min-w-[90px] ${centerHead}`}>Unit</th>
            <th className={`min-w-[140px] ${centerHead}`}>Specified Value</th>
            <th className="min-w-[5.5rem] px-2 py-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950/40">
          {noMatches ? (
            <tr>
              <td
                colSpan={COL_COUNT}
                className="px-4 py-10 text-center text-zinc-500"
              >
                No records match your search. Try different keywords or clear
                the search box.
              </td>
            </tr>
          ) : (
            rows.map((r, index) => {
              const isLastRow = index === rows.length - 1;
              const isEditing = isLastRow || editingKey === r.key;
              const canSelect = !!r.id;
              const rowLabel = r.test_name.trim()
                ? `Select ${r.test_name}`
                : "Select blank test row";
              return (
                <tr
                  key={r.key}
                  className={
                    isEditing && !isLastRow
                      ? "bg-sky-50/60 dark:bg-sky-950/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  }
                >
                  <td className="w-11 px-2 py-2 text-center align-middle">
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={canSelect && selectedKeys.has(r.key)}
                        onChange={() => {
                          if (canSelect) onToggleRowSelection(r.key);
                        }}
                        className={chk}
                        aria-label={rowLabel}
                        title={rowLabel}
                        disabled={!canSelect}
                      />
                    </div>
                  </td>
                  {isEditing ? (
                    <EditableCells
                      row={r}
                      unitOptions={unitOptions}
                      focusNameToken={isLastRow ? nameFocusToken : 0}
                      onUpdateRow={onUpdateRow}
                    />
                  ) : (
                    <ReadOnlyCells row={r} />
                  )}
                  <td className="align-middle px-2 py-1.5 text-center">
                    <div
                      className="flex items-center justify-center gap-1.5"
                      role="group"
                      aria-label="Row actions"
                    >
                      {isLastRow ? (
                        <button
                          type="button"
                          onClick={onAddRow}
                          className={addBtn}
                          title="Add new test row"
                          aria-label="Add new test row"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>
                      ) : editingKey === r.key ? (
                        <button
                          type="button"
                          onClick={() => onDoneEditRow(r)}
                          className={actionLink}
                        >
                          Done
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onEditRow(r)}
                          className={actionLink}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteRow(r)}
                        className={delBtn}
                        title="Delete row"
                        aria-label="Delete row"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        <TestParameterMasterFooterBar
          colSpan={COL_COUNT}
          matchedCount={matchedCount}
          grandCount={grandCount}
          searchActive={searchActive}
          selectedCount={selectedKeys.size}
          onExport={onExport}
          onPrintList={onPrintList}
          onDelete={onDelete}
          deleteDisabled={deleteDisabled}
        />
      </table>
    </div>
  );
}
