"use client";

import { useEffect, useMemo } from "react";
import { formatDisplayDate } from "@backend/shared/format-date";
import {
  isSampleIncludedInPrint,
  parseSampleFor,
  rowHasContent,
  sampleForLabel,
  type OslSampleFor,
  type OslSampleRequirementRow,
} from "@backend/modules/bis/osl-sample-requirements";

const themes = {
  light: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700",
    empty: "px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400",
    editBtn:
      "rounded-lg p-1.5 text-zinc-500 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-300",
    copyBtn:
      "rounded-lg p-1.5 text-zinc-500 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-300",
    delBtn:
      "rounded-lg p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400",
    muted: "text-zinc-400 dark:text-zinc-500",
    highlight: "ring-2 ring-sky-500/80",
    card: "rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 shadow-sm dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950",
    panel: "rounded-xl border border-zinc-200/80 bg-zinc-50/90 p-3 dark:border-zinc-800 dark:bg-zinc-950/60",
    cardLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    cardValue: "mt-0.5 text-xs leading-snug text-zinc-800 dark:text-zinc-100",
    heroLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    heroValue: "mt-1 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600/50 bg-teal-950/40 px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-950/70",
    metaRow: "flex gap-2 border-b border-zinc-200/70 py-1.5 last:border-b-0 dark:border-zinc-800/80",
  },
  dark: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800",
    empty: "px-4 py-10 text-center text-sm text-zinc-500",
    editBtn:
      "rounded-lg p-1.5 text-zinc-400 hover:bg-amber-950/50 hover:text-amber-300",
    copyBtn:
      "rounded-lg p-1.5 text-zinc-400 hover:bg-sky-950/50 hover:text-sky-300",
    delBtn:
      "rounded-lg p-1.5 text-zinc-400 hover:bg-red-950/50 hover:text-red-400",
    muted: "text-zinc-500",
    highlight: "ring-2 ring-sky-500/80",
    card: "rounded-2xl border border-zinc-700/90 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
    panel: "rounded-xl border border-zinc-800 bg-zinc-950/80 p-3",
    cardLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    cardValue: "mt-0.5 text-xs leading-snug text-zinc-100",
    heroLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    heroValue: "mt-1 text-sm font-semibold leading-snug text-zinc-50",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600/50 bg-teal-950/40 px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-950/70",
    metaRow: "flex gap-2 border-b border-zinc-800/90 py-1.5 last:border-b-0",
  },
} as const;

function fieldOrDash(value: string) {
  const v = value.trim();
  return v || "—";
}

function sampleForBadgeClass(kind: OslSampleFor): string {
  if (kind === "ft") {
    return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  }
  if (kind === "it") {
    return "border-violet-500/40 bg-violet-500/15 text-violet-200";
  }
  return "border-teal-500/40 bg-teal-500/15 text-teal-200";
}

function MetaItem({
  label,
  value,
  labelClass,
  valueClass,
  mono = false,
  rowClass,
}: {
  label: string;
  value: string;
  labelClass: string;
  valueClass: string;
  mono?: boolean;
  rowClass: string;
}) {
  return (
    <div className={rowClass}>
      <dt className={`w-[38%] shrink-0 ${labelClass}`}>{label}</dt>
      <dd
        className={`min-w-0 flex-1 text-xs leading-snug ${valueClass} ${
          mono ? "font-mono break-all" : "break-words"
        }`}
      >
        {fieldOrDash(value)}
      </dd>
    </div>
  );
}

function IconEdit() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75A1.125 1.125 0 013.75 20.625V10.5A1.125 1.125 0 014.875 9.375H8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25H18a1.125 1.125 0 001.125-1.125V5.625A1.125 1.125 0 0018 4.5h-9.75A1.125 1.125 0 007.125 5.625V8.25" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0V4.306c0-.682-.448-1.28-1.087-1.487A48.23 48.23 0 0012 2.25c-.875 0-1.73.066-2.563.192A1.875 1.875 0 008.25 4.306V5.79" />
    </svg>
  );
}

function InLetterToggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      title={
        on
          ? "Included in letter table (print / Word / PDF). Click to exclude."
          : "Excluded from letter table. Click to include."
      }
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
        on
          ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
          : "border-zinc-600/70 bg-zinc-800/50 text-zinc-500"
      }`}
    >
      <span
        className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${
          on ? "bg-sky-500" : "bg-zinc-600"
        }`}
        aria-hidden
      >
        <span
          className={`absolute h-2.5 w-2.5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-3" : "translate-x-0.5"
          }`}
        />
      </span>
      In Letter
    </button>
  );
}

export function OslSampleRequirementsTableEditor({
  rows,
  onEdit,
  onCopy,
  onRemove,
  onUpdate,
  theme = "light",
  focusSampleIndex = null,
}: {
  rows: OslSampleRequirementRow[];
  onEdit: (row: OslSampleRequirementRow) => void;
  onCopy: (row: OslSampleRequirementRow) => void;
  onRemove: (row: OslSampleRequirementRow) => void;
  onUpdate: (row: OslSampleRequirementRow) => void;
  theme?: keyof typeof themes;
  focusSampleIndex?: number | null;
}) {
  const t = themes[theme];
  const visibleRows = useMemo(() => rows.filter(rowHasContent), [rows]);

  useEffect(() => {
    if (focusSampleIndex == null || focusSampleIndex < 0) return;
    const el = document.querySelector(
      `[data-osl-sample-index="${focusSampleIndex}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusSampleIndex, visibleRows.length]);

  function rowActions(row: OslSampleRequirementRow, srNo: string) {
    return (
      <div className="inline-flex items-center gap-0.5 rounded-xl border border-zinc-700/80 bg-zinc-950/40 p-0.5">
        <button
          type="button"
          onClick={() => onEdit(row)}
          className={t.editBtn}
          aria-label={`Edit sample ${srNo}`}
          title="Edit"
        >
          <IconEdit />
        </button>
        <button
          type="button"
          onClick={() => onCopy(row)}
          className={t.copyBtn}
          aria-label={`Copy sample ${srNo}`}
          title="Copy"
        >
          <IconCopy />
        </button>
        <button
          type="button"
          onClick={() => onRemove(row)}
          className={t.delBtn}
          aria-label={`Delete sample ${srNo}`}
          title="Delete"
        >
          <IconTrash />
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
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          <p className={`text-xs ${t.muted}`}>
            {visibleRows.length} sample{visibleRows.length === 1 ? "" : "s"}
            {" · "}
            Toggle <span className="text-zinc-300">In Letter</span> to include or
            exclude a sample from print / Word / PDF.
          </p>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {visibleRows.map((row, index) => {
              const srNo = String(index + 1).padStart(2, "0");
              const highlighted = focusSampleIndex === index;
              const kind = parseSampleFor(row.sample_for);
              const sampleFor = sampleForLabel(kind);
              const inLetter = isSampleIncludedInPrint(row);
              const batchNo = row.batch_number.trim();
              const dom = row.date_of_manufacturing.trim()
                ? formatDisplayDate(row.date_of_manufacturing)
                : "";

              const leftMeta = [
                { label: "Batch No", value: batchNo },
                { label: "Sample Qty", value: row.sample_quantity },
                { label: "Sample Code", value: row.sample_code, mono: true },
                { label: "Mode Of Disposal", value: row.mode_of_disposal },
                { label: "Laboratory", value: row.laboratory_name },
              ] as const;

              const rightMeta = [
                { label: "DOM", value: dom },
                { label: "Batch Qty", value: row.batch_quantity },
                { label: "QR Code", value: row.qr_code, mono: true },
                { label: "Test Required", value: row.test_required },
                { label: "Shelf Life", value: row.shelf_life },
                { label: "Sample Type", value: row.sample_type },
                { label: "Testing Charges", value: row.testing_charges },
              ] as const;

              return (
                <article
                  key={row.id}
                  data-osl-sample-index={index}
                  className={`${t.card} ${highlighted ? t.highlight : ""} ${
                    inLetter ? "" : "opacity-70"
                  }`}
                >
                  <div className="p-3.5">
                    <div className="mb-3 flex items-center gap-2.5">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        <InLetterToggle
                          on={inLetter}
                          onToggle={() =>
                            onUpdate({
                              ...row,
                              include_in_print: !inLetter,
                            })
                          }
                        />
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${sampleForBadgeClass(kind)}`}
                        >
                          {sampleFor}
                        </span>
                        {row.priority.trim() ? (
                          <span className="inline-flex items-center rounded-full border border-zinc-600/70 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                            {row.priority}
                          </span>
                        ) : null}
                      </div>
                      <div className="shrink-0">{rowActions(row, srNo)}</div>
                    </div>

                    <div className="mb-3 grid gap-2.5 sm:grid-cols-2">
                      <div className={t.panel}>
                        <p className={t.heroLabel}>Sample Description</p>
                        <p className={`${t.heroValue} break-words`}>
                          {fieldOrDash(row.sample_description)}
                        </p>
                      </div>
                      <div className={t.panel}>
                        <p className={t.heroLabel}>Declared Value</p>
                        <p className={`${t.heroValue} break-words font-medium`}>
                          {fieldOrDash(row.declared_value)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <dl className={t.panel}>
                        {leftMeta.map((item) => (
                          <MetaItem
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            labelClass={t.cardLabel}
                            valueClass={t.cardValue.replace("mt-0.5 ", "")}
                            mono={"mono" in item ? Boolean(item.mono) : false}
                            rowClass={t.metaRow}
                          />
                        ))}
                      </dl>
                      <dl className={t.panel}>
                        {rightMeta.map((item) => (
                          <MetaItem
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            labelClass={t.cardLabel}
                            valueClass={t.cardValue.replace("mt-0.5 ", "")}
                            mono={"mono" in item ? Boolean(item.mono) : false}
                            rowClass={t.metaRow}
                          />
                        ))}
                      </dl>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
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
