"use client";

import { useMemo, useState } from "react";
import {
  FTR_REMARK_DEFAULT,
  FTR_REMARK_NOT_CONFIRM,
  ftrTestRowKey,
  normalizeFtrRemark,
  sortFtrTestRowsByClause,
  type FtrTestRowStored,
} from "@backend/modules/bis/factory-test-report";
import {
  buildFtrFormulaTestValues,
  evaluateFtrObservedFormula,
  formatFtrObservedValue,
  ftrFormulaTestNames,
  FTR_OBSERVED_DECIMAL_MAX,
  FTR_OBSERVED_DECIMAL_MIN,
  isFtrObservedFormula,
  reformatFtrObservedNumeric,
  resolveObservedDecimals,
} from "@backend/modules/bis/ftr-observed-formula";

const decBtn =
  "flex h-4 w-4 items-center justify-center rounded border border-zinc-600 bg-zinc-800 text-[10px] font-bold leading-none text-zinc-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40";

const inp =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";

const FTR_REMARK_OPTIONS = [FTR_REMARK_DEFAULT, FTR_REMARK_NOT_CONFIRM] as const;

function remarkSelectValue(remark: string): (typeof FTR_REMARK_OPTIONS)[number] {
  return normalizeFtrRemark(remark) as (typeof FTR_REMARK_OPTIONS)[number];
}

function ObservedValueInput({
  value,
  decimalPlaces,
  onPatch,
  testValues,
  testNames,
  listId,
}: {
  value: string;
  decimalPlaces: number;
  onPatch: (patch: { observed_value?: string; observed_decimals?: number }) => void;
  testValues: Map<string, number>;
  testNames: string[];
  listId: string;
}) {
  const [draft, setDraft] = useState(value);
  const formulaMode = isFtrObservedFormula(draft);
  const dp = resolveObservedDecimals(decimalPlaces);
  const [appliedValueKey, setAppliedValueKey] = useState(`${value}\0${decimalPlaces}`);

  if (`${value}\0${decimalPlaces}` !== appliedValueKey) {
    setAppliedValueKey(`${value}\0${decimalPlaces}`);
    setDraft(value);
  }

  function commit(next: string) {
    if (isFtrObservedFormula(next)) {
      const result = evaluateFtrObservedFormula(next, testValues, dp);
      if (!result.ok) {
        window.alert(`Formula error: ${result.error}`);
        return;
      }
      onPatch({ observed_value: result.value });
      setDraft(result.value);
      return;
    }
    const formatted = formatFtrObservedValue(next, dp);
    onPatch({ observed_value: formatted });
    setDraft(formatted);
  }

  function adjustDecimals(delta: number) {
    const nextDp = Math.min(
      FTR_OBSERVED_DECIMAL_MAX,
      Math.max(FTR_OBSERVED_DECIMAL_MIN, dp + delta),
    );
    if (nextDp === dp) return;

    const reformatted = reformatFtrObservedNumeric(draft, nextDp);
    const patch: { observed_decimals: number; observed_value?: string } = {
      observed_decimals: nextDp,
    };
    if (reformatted != null) {
      patch.observed_value = reformatted;
      setDraft(reformatted);
    }
    onPatch(patch);
  }

  function handleDecimalButtonMouseDown(e: React.MouseEvent) {
    e.preventDefault();
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onMouseDown={handleDecimalButtonMouseDown}
          onClick={() => adjustDecimals(-1)}
          disabled={dp <= FTR_OBSERVED_DECIMAL_MIN}
          className={decBtn}
          aria-label="Decrease decimal places"
          title="Fewer decimal places"
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-[9px] tabular-nums text-zinc-500">{dp} dp</span>
        <button
          type="button"
          onMouseDown={handleDecimalButtonMouseDown}
          onClick={() => adjustDecimals(1)}
          disabled={dp >= FTR_OBSERVED_DECIMAL_MAX}
          className={decBtn}
          aria-label="Increase decimal places"
          title="More decimal places"
        >
          +
        </button>
      </div>
      <div className="relative min-w-0">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            (e.target as HTMLInputElement).blur();
          }
        }}
        list={formulaMode ? listId : undefined}
        className={`${inp} text-center ${formulaMode ? "pr-7 font-mono text-sky-200" : ""}`}
      />
      {formulaMode ? (
        <>
          <datalist id={listId}>
            {testNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <span
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sky-400"
            title="Formula mode"
            aria-hidden
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </span>
        </>
        ) : null}
      </div>
    </div>
  );
}

function SpecifiedRequirementsCell({
  row,
  onSave,
}: {
  row: FtrTestRowStored;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.specified_requirements);

  function startEdit() {
    setDraft(row.specified_requirements);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(row.specified_requirements);
    setEditing(false);
  }

  function saveEdit() {
    onSave(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className={`${inp} resize-y`}
          placeholder="Specified requirements…"
        />
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={saveEdit}
            className="rounded-md bg-sky-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-sky-500"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-md border border-zinc-600 px-2 py-1 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-end gap-1.5">
      <span className="min-w-0 flex-1 text-center text-zinc-400">
        {row.specified_requirements || "—"}
      </span>
      <button
        type="button"
        onClick={startEdit}
        aria-label="Edit specified requirements"
        title="Edit"
        className="shrink-0 rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
      >
        ✏️
      </button>
    </div>
  );
}

export function FtrTestRowsTableEditor({
  rows,
  searchQuery = "",
  selectedKeys,
  onSelectedKeysChange,
  onChange,
}: {
  rows: FtrTestRowStored[];
  searchQuery?: string;
  selectedKeys: Set<string>;
  onSelectedKeysChange: (keys: Set<string>) => void;
  onChange: (rows: FtrTestRowStored[]) => void;
}) {
  const testRows = useMemo(() => sortFtrTestRowsByClause(rows), [rows]);

  const formulaTestValues = useMemo(() => buildFtrFormulaTestValues(rows), [rows]);
  const formulaTestNames = useMemo(() => ftrFormulaTestNames(rows), [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return testRows;
    return testRows.filter((row) => {
      const haystack = [
        row.test_name,
        row.clause_no,
        row.test_method ?? "",
        row.specified_requirements,
        row.observed_value,
        normalizeFtrRemark(row.remark),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [testRows, searchQuery]);

  function updateRow(target: FtrTestRowStored, patch: Partial<FtrTestRowStored>) {
    onChange(
      rows.map((r) =>
        r.row_type === "test" &&
        r.test_name === target.test_name &&
        r.clause_no === target.clause_no
          ? { ...r, ...patch }
          : r,
      ),
    );
  }

  function toggleRow(key: string) {
    onSelectedKeysChange(
      new Set(
        selectedKeys.has(key)
          ? [...selectedKeys].filter((k) => k !== key)
          : [...selectedKeys, key],
      ),
    );
  }

  function toggleAllVisible() {
    const visibleKeys = filteredRows.map((r) => ftrTestRowKey(r));
    const allSelected =
      visibleKeys.length > 0 && visibleKeys.every((k) => selectedKeys.has(k));
    if (allSelected) {
      onSelectedKeysChange(new Set([...selectedKeys].filter((k) => !visibleKeys.includes(k))));
      return;
    }
    onSelectedKeysChange(new Set([...selectedKeys, ...visibleKeys]));
  }

  const pageAllSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) => selectedKeys.has(ftrTestRowKey(row)));

  if (testRows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        No test parameters added yet. Click{" "}
        <span className="text-zinc-300">Add Test Parameter</span> to add rows.
      </p>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">No matches for your search.</p>
    );
  }

  return (
    <div className="min-h-0 overflow-auto rounded-lg border border-zinc-800">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-[1] bg-zinc-800">
          <tr>
            <th className="w-10 border-b border-zinc-700 px-3 py-2">
              <input
                type="checkbox"
                checked={pageAllSelected}
                onChange={toggleAllVisible}
                className="h-4 w-4 rounded accent-sky-600"
                aria-label="Select all visible test parameters"
              />
            </th>
            <th className="border-b border-zinc-700 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
              Test Name
            </th>
            <th className="border-b border-zinc-700 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
              Specified Requirements
            </th>
            <th className="border-b border-zinc-700 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
              Observed Value
            </th>
            <th className="border-b border-zinc-700 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
              Remark
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {filteredRows.map((row) => {
            const key = ftrTestRowKey(row);
            return (
            <tr key={key} className="hover:bg-zinc-800/40">
              <td className="px-3 py-2 text-center align-top">
                <input
                  type="checkbox"
                  checked={selectedKeys.has(key)}
                  onChange={() => toggleRow(key)}
                  className="h-4 w-4 rounded accent-sky-600"
                  aria-label={`Select ${row.test_name}`}
                />
              </td>
              <td className="px-3 py-2 align-top text-zinc-200">
                <div className="space-y-0.5">
                  <div className="font-medium leading-snug">{row.test_name || "—"}</div>
                  {((row.clause_no ?? "").trim() || (row.test_method ?? "").trim()) && (
                    <div className="text-[10px] leading-snug text-zinc-400">
                      {[(row.clause_no ?? "").trim(), (row.test_method ?? "").trim()]
                        .filter(Boolean)
                        .join(" | ")}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 align-top">
                <SpecifiedRequirementsCell
                  row={row}
                  onSave={(value) => updateRow(row, { specified_requirements: value })}
                />
              </td>
              <td className="px-3 py-2 align-top">
                <ObservedValueInput
                  value={row.observed_value}
                  decimalPlaces={resolveObservedDecimals(row.observed_decimals)}
                  onPatch={(patch) => updateRow(row, patch)}
                  testValues={formulaTestValues}
                  testNames={formulaTestNames}
                  listId={`ftr-formula-tests-${ftrTestRowKey(row)}`}
                />
              </td>
              <td className="px-3 py-2 align-top">
                <select
                  value={remarkSelectValue(row.remark)}
                  onChange={(e) => updateRow(row, { remark: e.target.value })}
                  className={inp}
                >
                  {FTR_REMARK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
