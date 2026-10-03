"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";
import {
  rowHasContent,
  type TechnicalStaffRow,
} from "@backend/modules/bis/technical-staff";

const themes = {
  light: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700",
    thead: "bg-zinc-100 dark:bg-zinc-800",
    thLeft:
      "border border-zinc-200 px-2 py-2 text-left align-middle text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
    thCenter:
      "border border-zinc-200 px-2 py-2 text-center align-middle text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
    thSub:
      "mt-0.5 block text-[9px] font-normal normal-case tracking-normal text-zinc-500",
    tdLeft:
      "border border-zinc-200 px-2 py-2.5 align-middle text-left text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300",
    tdCenter:
      "border border-zinc-200 px-2 py-2.5 align-middle text-center text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300",
    selectCell:
      "border border-zinc-200 bg-zinc-50 px-2 py-2.5 text-center align-middle dark:border-zinc-700 dark:bg-zinc-800/60",
    cellStack: "mx-auto flex max-w-full flex-col items-center justify-center gap-0.5",
    cellMuted: "text-[10px] text-zinc-500 dark:text-zinc-400",
    docRow: "flex items-center justify-center gap-1.5",
    docLabel:
      "shrink-0 text-[9px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500",
    empty: "px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400",
    editBtn:
      "rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
    copyBtn:
      "rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-sky-600 dark:hover:bg-zinc-800 dark:hover:text-sky-300",
    delBtn:
      "rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400",
    muted: "text-zinc-400 dark:text-zinc-500",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600/50 bg-teal-950/40 px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-950/70",
    viewLink:
      "inline-flex items-center justify-center gap-0.5 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300",
    chk: "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-sky-500",
  },
  dark: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-600 bg-zinc-900",
    thead: "bg-zinc-800",
    thLeft:
      "border border-zinc-600 px-2 py-2.5 text-left align-middle text-[10px] font-semibold uppercase tracking-wide text-zinc-100",
    thCenter:
      "border border-zinc-600 px-2 py-2.5 text-center align-middle text-[10px] font-semibold uppercase tracking-wide text-zinc-100",
    thSub:
      "mt-0.5 block text-[9px] font-normal normal-case tracking-normal text-zinc-300",
    tdLeft:
      "border border-zinc-700 px-2 py-2.5 align-middle text-left text-xs font-medium text-zinc-50",
    tdCenter:
      "border border-zinc-700 px-2 py-2.5 align-middle text-center text-xs font-medium text-zinc-50",
    selectCell:
      "border border-zinc-700 bg-zinc-800/80 px-2 py-2.5 text-center align-middle",
    cellStack: "mx-auto flex max-w-full flex-col items-center justify-center gap-0.5",
    cellMuted: "text-[10px] text-zinc-300",
    docRow: "flex items-center justify-center gap-1.5",
    docLabel:
      "shrink-0 text-[9px] font-semibold uppercase tracking-wide text-zinc-300",
    empty: "px-4 py-10 text-center text-sm text-zinc-300",
    editBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/70 bg-amber-500/25 text-amber-50 hover:bg-amber-500/40",
    copyBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/70 bg-sky-500/25 text-sky-50 hover:bg-sky-500/40",
    delBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-400/70 bg-rose-500/25 text-rose-50 hover:bg-rose-500/40",
    muted: "text-zinc-400",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-400/70 bg-teal-600/30 px-2.5 py-1.5 text-xs font-semibold text-teal-50 hover:bg-teal-600/45",
    viewLink:
      "inline-flex items-center justify-center gap-0.5 rounded-md border border-sky-400/70 bg-sky-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-sky-50 hover:bg-sky-500/40",
    chk: "h-4 w-4 rounded border-zinc-500 bg-zinc-900 accent-sky-500",
  },
} as const;

function FileLink({ theme, url }: { theme: keyof typeof themes; url: string }) {
  const t = themes[theme];
  if (!url.trim()) return <span className={t.muted}>—</span>;
  return <StorageDocumentLink value={url} className={t.viewLink} />;
}

function cellText(value: string, mutedClass: string) {
  const v = value.trim();
  if (!v) return <span className={mutedClass}>—</span>;
  return <span className="block max-w-full break-words">{v}</span>;
}

export function TechnicalStaffTableEditor({
  theme = "light",
  rows,
  onEdit,
  onCopy,
  onRemove,
}: {
  theme?: keyof typeof themes;
  rows: TechnicalStaffRow[];
  onEdit: (row: TechnicalStaffRow) => void;
  onCopy: (row: TechnicalStaffRow) => void;
  onRemove: (row: TechnicalStaffRow) => void;
}) {
  const t = themes[theme];
  const visibleRows = useMemo(() => rows.filter(rowHasContent), [rows]);
  const visibleIds = useMemo(() => visibleRows.map((r) => r.id), [visibleRows]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

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
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

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

  return (
    <div className={t.wrap}>
      <div className="min-h-0 flex-1 overflow-auto">
        {visibleRows.length === 0 ? (
          <p className={t.empty}>
            No technical staff added yet. Use &ldquo;Add Technical Staff&rdquo; to add a person.
          </p>
        ) : (
          <table className="w-full min-w-[980px] border-0 bg-transparent text-xs shadow-none">
            <thead className={`${t.thead} sticky top-0 z-[1]`}>
              <tr>
                <th className={`${t.thCenter} w-12`}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className={t.chk}
                    aria-label="Select all technical staff"
                  />
                </th>
                <th className={`${t.thCenter} w-14`}>Sr No</th>
                <th className={t.thLeft}>Name</th>
                <th className={t.thCenter}>Designation</th>
                <th className={t.thCenter}>
                  Qualification
                  <span className={t.thSub}>&amp; Experience</span>
                </th>
                <th className={t.thCenter}>
                  Documents
                  <span className={t.thSub}>Appt., Cert. &amp; Seal</span>
                </th>
                <th className={t.thCenter}>Photo</th>
                <th className={`${t.thCenter} w-28`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const srNo = String(index + 1).padStart(2, "0");
                const selected = selectedIds.has(row.id);
                const exp = row.experience_years.trim();
                const rowBg =
                  theme === "dark"
                    ? selected
                      ? "bg-sky-950/45"
                      : index % 2 === 0
                        ? "bg-zinc-900"
                        : "bg-zinc-950/90"
                    : selected
                      ? "bg-sky-50 dark:bg-sky-950/40"
                      : "";
                return (
                  <tr key={row.id} className={rowBg}>
                    <td className={t.selectCell}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(row.id)}
                        className={t.chk}
                        aria-label={`Select technical staff ${srNo}`}
                      />
                    </td>
                    <td className={t.tdCenter}>
                      <span className="font-semibold tabular-nums text-zinc-100">{srNo}</span>
                    </td>
                    <td className={t.tdLeft}>{cellText(row.person_name, t.muted)}</td>
                    <td className={t.tdCenter}>{cellText(row.designation, t.muted)}</td>
                    <td className={t.tdCenter}>
                      <div className={t.cellStack}>
                        {cellText(row.educational_qualification, t.muted)}
                        {exp ? (
                          <span className={t.cellMuted}>
                            {exp} {exp === "1" ? "Year" : "Years"}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className={t.tdCenter}>
                      <div className={t.cellStack}>
                        <div className={t.docRow}>
                          <span className={t.docLabel}>Appt.</span>
                          <FileLink theme={theme} url={row.appointment_letter} />
                        </div>
                        <div className={t.docRow}>
                          <span className={t.docLabel}>Cert.</span>
                          <FileLink theme={theme} url={row.educational_certificate} />
                        </div>
                        <div className={t.docRow}>
                          <span className={t.docLabel}>Seal</span>
                          <FileLink theme={theme} url={row.seal_sign} />
                        </div>
                      </div>
                    </td>
                    <td className={t.tdCenter}>
                      <FileLink theme={theme} url={row.photo} />
                    </td>
                    <td className={t.tdCenter}>
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className={t.editBtn}
                          aria-label={`Edit technical staff ${srNo}`}
                          title="Edit"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213 3 20.25l1.037-4.5L16.862 3.487z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopy(row)}
                          className={t.copyBtn}
                          aria-label={`Copy technical staff ${srNo}`}
                          title="Copy"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(row)}
                          className={t.delBtn}
                          aria-label={`Delete technical staff ${srNo}`}
                          title="Delete"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function TechnicalStaffAddButton({
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
      Add Technical Staff
    </button>
  );
}
