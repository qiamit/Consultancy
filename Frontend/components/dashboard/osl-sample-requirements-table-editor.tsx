"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDisplayDate } from "@backend/shared/format-date";
import {
  rowHasContent,
  type OslSampleRequirementRow,
} from "@backend/modules/bis/osl-sample-requirements";
const themes = {
  light: {
    wrap: "@container flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700",
    thead: "bg-zinc-100 dark:bg-zinc-800",
    thLeft:
      "border border-zinc-200 px-2 py-2 text-left align-middle text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
    thCenter:
      "border border-zinc-200 px-2 py-2 text-center align-middle text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
    tdLeft:
      "border border-zinc-200 px-2 py-2.5 align-middle text-left text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300",
    tdCenter:
      "border border-zinc-200 px-2 py-2.5 align-middle text-center text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300",
    selectCell:
      "border border-zinc-200 bg-zinc-50 px-2 py-2.5 text-center align-middle dark:border-zinc-700 dark:bg-zinc-800/60",
    empty: "px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400",
    editBtn:
      "rounded p-1.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
    copyBtn:
      "rounded p-1.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-sky-600 dark:hover:bg-zinc-800 dark:hover:text-sky-300",
    delBtn:
      "rounded p-1.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400",
    muted: "text-zinc-400 dark:text-zinc-500",
    highlight: "ring-2 ring-inset ring-sky-500/60 bg-sky-50/80 dark:bg-sky-950/20",
    card: "rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-950/50",
    cardLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    cardValue: "mt-0.5 text-xs text-zinc-800 dark:text-zinc-200",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600/50 bg-teal-950/40 px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-950/70",
    chk: "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-sky-500",
  },
  dark: {
    wrap: "@container flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800",
    thead: "bg-zinc-800",
    thLeft:
      "border border-zinc-700 px-2 py-2 text-left align-middle text-[10px] font-semibold uppercase tracking-wide text-zinc-300",
    thCenter:
      "border border-zinc-700 px-2 py-2 text-center align-middle text-[10px] font-semibold uppercase tracking-wide text-zinc-300",
    tdLeft:
      "border border-zinc-700 px-2 py-2.5 align-middle text-left text-xs text-zinc-300",
    tdCenter:
      "border border-zinc-700 px-2 py-2.5 align-middle text-center text-xs text-zinc-300",
    selectCell:
      "border border-zinc-700 bg-zinc-800/60 px-2 py-2.5 text-center align-middle",
    empty: "px-4 py-10 text-center text-sm text-zinc-500",
    editBtn:
      "rounded p-1.5 text-sm leading-none text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
    copyBtn:
      "rounded p-1.5 text-sm leading-none text-zinc-400 hover:bg-zinc-800 hover:text-sky-300",
    delBtn:
      "rounded p-1.5 text-sm leading-none text-zinc-400 hover:bg-zinc-800 hover:text-red-400",
    muted: "text-zinc-500",
    highlight: "ring-2 ring-inset ring-sky-500/60 bg-sky-950/20",
    card: "rounded-lg border border-zinc-700 bg-zinc-950/60 p-3",
    cardLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    cardValue: "mt-0.5 text-xs text-zinc-200",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600/50 bg-teal-950/40 px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-950/70",
    chk: "h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-sky-500 focus:ring-sky-500/30",
  },
} as const;

function cellText(value: string, mutedClass: string) {
  const v = value.trim();
  if (!v) return <span className={mutedClass}>—</span>;
  return <span className="block max-w-full break-words">{v}</span>;
}

function fieldOrDash(value: string) {
  const v = value.trim();
  return v || "—";
}

export function OslSampleRequirementsTableEditor({
  rows,
  onEdit,
  onCopy,
  onRemove,
  theme = "light",
  focusSampleIndex = null,
}: {
  rows: OslSampleRequirementRow[];
  onEdit: (row: OslSampleRequirementRow) => void;
  onCopy: (row: OslSampleRequirementRow) => void;
  onRemove: (row: OslSampleRequirementRow) => void;
  theme?: keyof typeof themes;
  focusSampleIndex?: number | null;
}) {
  const t = themes[theme];
  const visibleRows = useMemo(() => rows.filter(rowHasContent), [rows]);
  const visibleIds = useMemo(() => visibleRows.map((r) => r.id), [visibleRows]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectAllCardsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.includes(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allSelected;

  useEffect(() => {
    for (const el of [selectAllRef.current, selectAllCardsRef.current]) {
      if (el) el.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    if (focusSampleIndex == null || focusSampleIndex < 0) return;
    const nodes = document.querySelectorAll(
      `[data-osl-sample-index="${focusSampleIndex}"]`,
    );
    const el =
      Array.from(nodes).find((node) => (node as HTMLElement).offsetParent !== null) ??
      nodes[0];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusSampleIndex, visibleRows.length]);

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (visibleIds.length > 0 && visibleIds.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(visibleIds);
    });
  }

  function rowActions(row: OslSampleRequirementRow, srNo: string) {
    return (
      <div className="inline-flex items-center justify-center gap-0.5">
        <button
          type="button"
          onClick={() => onEdit(row)}
          className={t.editBtn}
          aria-label={`Edit sample ${srNo}`}
          title="Edit"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={() => onCopy(row)}
          className={t.copyBtn}
          aria-label={`Copy sample ${srNo}`}
          title="Copy"
        >
          📋
        </button>
        <button
          type="button"
          onClick={() => onRemove(row)}
          className={t.delBtn}
          aria-label={`Delete sample ${srNo}`}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    );
  }

  return (
    <div className={t.wrap}>
      {visibleRows.length === 0 ? (
        <p className={t.empty}>
          No samples added yet. Use &ldquo;Add Sample&rdquo; to enter sample details.
        </p>
      ) : (
        <>
          {/* PWA / narrow: stacked cards — no horizontal scroll */}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2 @[900px]:hidden">
            <label className="flex items-center gap-2 px-1 text-xs text-zinc-400">
              <input
                ref={selectAllCardsRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className={t.chk}
                aria-label="Select all samples"
              />
              Select all
            </label>
            {visibleRows.map((row, index) => {
              const srNo = String(index + 1).padStart(2, "0");
              const highlighted = focusSampleIndex === index;
              const selected = selectedIds.has(row.id);
              const batchNo = row.batch_number.trim();
              const dom = row.date_of_manufacturing.trim()
                ? formatDisplayDate(row.date_of_manufacturing)
                : "";
              return (
                <div
                  key={row.id}
                  data-osl-sample-index={index}
                  className={`${t.card} ${highlighted ? t.highlight : ""}`}
                >
                  <div className="mb-2 flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRow(row.id)}
                      className={`${t.chk} mt-0.5 shrink-0`}
                      aria-label={`Select sample ${srNo}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={t.cardLabel}>Sample Description</p>
                      <p className={`${t.cardValue} font-medium break-words`}>
                        {fieldOrDash(row.sample_description)}
                      </p>
                    </div>
                    <div className="shrink-0">{rowActions(row, srNo)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="min-w-0 col-span-2">
                      <p className={t.cardLabel}>Declared Value</p>
                      <p className={`${t.cardValue} break-words`}>
                        {fieldOrDash(row.declared_value)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className={t.cardLabel}>Batch No / DOM</p>
                      <p className={`${t.cardValue} break-words`}>
                        {batchNo || dom ? (
                          <>
                            {batchNo || "—"}
                            <span className={`mt-0.5 block text-[10px] ${t.muted}`}>
                              {dom || "—"}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className={t.cardLabel}>Sample Qty</p>
                      <p className={`${t.cardValue} break-words`}>
                        {fieldOrDash(row.sample_quantity)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className={t.cardLabel}>Batch Qty</p>
                      <p className={`${t.cardValue} break-words`}>
                        {fieldOrDash(row.batch_quantity)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className={t.cardLabel}>Sample Code</p>
                      <p className={`${t.cardValue} break-all font-mono`}>
                        {fieldOrDash(row.sample_code)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className={t.cardLabel}>Type</p>
                      <p className={t.cardValue}>{fieldOrDash(row.sample_type)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className={t.cardLabel}>Priority</p>
                      <p className={t.cardValue}>{fieldOrDash(row.priority)}</p>
                    </div>
                    <div className="min-w-0 col-span-2">
                      <p className={t.cardLabel}>Laboratory</p>
                      <p className={`${t.cardValue} break-words`}>
                        {fieldOrDash(row.laboratory_name)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Wide pane: table */}
          <div className="hidden min-h-0 flex-1 overflow-auto @[900px]:block">
            <table className="w-full min-w-[1100px] border-collapse text-xs">
              <thead className={`${t.thead} sticky top-0 z-[1]`}>
                <tr>
                  <th className={`${t.thCenter} w-12`}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className={t.chk}
                      aria-label="Select all samples"
                    />
                  </th>
                  <th className={t.thLeft}>Sample Description</th>
                  <th className={t.thCenter}>Declared Value</th>
                  <th className={t.thCenter}>
                    Batch No
                    <span className="mt-0.5 block text-[9px] font-normal normal-case tracking-normal text-zinc-500">
                      DOM
                    </span>
                  </th>
                  <th className={t.thCenter}>Sample Qty</th>
                  <th className={t.thCenter}>Batch Qty</th>
                  <th className={t.thCenter}>Sample Code</th>
                  <th className={t.thCenter}>Type</th>
                  <th className={`${t.thCenter} whitespace-nowrap`}>Priority</th>
                  <th className={t.thCenter}>Laboratory</th>
                  <th className={`${t.thCenter} w-28`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => {
                  const srNo = String(index + 1).padStart(2, "0");
                  const highlighted = focusSampleIndex === index;
                  const selected = selectedIds.has(row.id);
                  const batchNo = row.batch_number.trim();
                  const dom = row.date_of_manufacturing.trim()
                    ? formatDisplayDate(row.date_of_manufacturing)
                    : "";
                  return (
                    <tr
                      key={row.id}
                      data-osl-sample-index={index}
                      className={highlighted ? t.highlight : undefined}
                    >
                      <td className={t.selectCell}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleRow(row.id)}
                          className={t.chk}
                          aria-label={`Select sample ${srNo}`}
                        />
                      </td>
                      <td className={t.tdLeft}>
                        {cellText(row.sample_description, t.muted)}
                      </td>
                      <td className={t.tdCenter}>
                        {cellText(row.declared_value, t.muted)}
                      </td>
                      <td className={t.tdCenter}>
                        {batchNo || dom ? (
                          <span className="mx-auto flex max-w-full flex-col items-center justify-center gap-0.5">
                            <span className="block max-w-full break-words">
                              {batchNo || "—"}
                            </span>
                            <span className={`block text-[10px] ${t.muted}`}>
                              {dom || "—"}
                            </span>
                          </span>
                        ) : (
                          <span className={t.muted}>—</span>
                        )}
                      </td>
                      <td className={t.tdCenter}>
                        {cellText(row.sample_quantity, t.muted)}
                      </td>
                      <td className={t.tdCenter}>
                        {cellText(row.batch_quantity, t.muted)}
                      </td>
                      <td className={t.tdCenter}>
                        {cellText(row.sample_code, t.muted)}
                      </td>
                      <td className={t.tdCenter}>
                        {cellText(row.sample_type, t.muted)}
                      </td>
                      <td className={t.tdCenter}>
                        {cellText(row.priority, t.muted)}
                      </td>
                      <td className={t.tdCenter}>
                        {cellText(row.laboratory_name, t.muted)}
                      </td>
                      <td className={t.tdCenter}>{rowActions(row, srNo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function OslSampleAddButton({
  theme = "dark",
  onClick,
}: {
  theme?: keyof typeof themes;
  onClick: () => void;
}) {
  const t = themes[theme];
  return (
    <button type="button" onClick={onClick} className={t.addBtn}>
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Add Sample
    </button>
  );
}
