"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  rowHasContent,
  type TopManagementRow,
} from "@backend/modules/bis/top-management";

const themes = {
  light: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700",
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
      "rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
    copyBtn:
      "rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-sky-600 dark:hover:bg-zinc-800 dark:hover:text-sky-300",
    delBtn:
      "rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800 dark:hover:text-red-400",
    muted: "text-zinc-400 dark:text-zinc-500",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600/50 bg-teal-950/40 px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-950/70",
    chk: "h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-900 dark:text-sky-500",
  },
  dark: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800",
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
      "rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
    copyBtn:
      "rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-800 hover:text-sky-300",
    delBtn:
      "rounded p-0.5 text-sm leading-none text-zinc-400 hover:bg-zinc-800 hover:text-red-400",
    muted: "text-zinc-500",
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

export function TopManagementTableEditor({
  theme = "light",
  rows,
  onEdit,
  onCopy,
  onRemove,
}: {
  theme?: keyof typeof themes;
  rows: TopManagementRow[];
  onEdit: (row: TopManagementRow) => void;
  onCopy: (row: TopManagementRow) => void;
  onRemove: (row: TopManagementRow) => void;
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
            No persons added yet. Use &ldquo;Add Person&rdquo; to enter top management details.
          </p>
        ) : (
          <table className="w-full min-w-[960px] border-collapse text-xs">
            <thead className={`${t.thead} sticky top-0 z-[1]`}>
              <tr>
                <th className={`${t.thCenter} w-12`}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className={t.chk}
                    aria-label="Select all persons"
                  />
                </th>
                <th className={`${t.thCenter} w-14`}>Sr No</th>
                <th className={t.thLeft}>Name of Person</th>
                <th className={t.thCenter}>Designation</th>
                <th className={t.thCenter}>Email ID</th>
                <th className={t.thCenter}>Mobile Number</th>
                <th className={t.thCenter}>
                  Signature
                  <span className="mt-0.5 block text-[9px] font-normal normal-case tracking-normal text-zinc-500">
                    Sr 1 → letter
                  </span>
                </th>
                <th className={t.thCenter}>
                  Apply Signature
                  <span className="mt-0.5 block text-[9px] font-normal normal-case tracking-normal text-zinc-500">
                    All documents
                  </span>
                </th>
                <th className={`${t.thCenter} w-28`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const srNo = String(index + 1).padStart(2, "0");
                const selected = selectedIds.has(row.id);
                const isPrimary = index === 0;
                return (
                  <tr key={row.id}>
                    <td className={t.selectCell}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(row.id)}
                        className={t.chk}
                        aria-label={`Select person ${srNo}`}
                      />
                    </td>
                    <td className={t.tdCenter}>
                      <span className="font-semibold tabular-nums">{srNo}</span>
                    </td>
                    <td className={t.tdLeft}>{cellText(row.person_name, t.muted)}</td>
                    <td className={t.tdCenter}>{cellText(row.designation, t.muted)}</td>
                    <td className={t.tdCenter}>{cellText(row.email, t.muted)}</td>
                    <td className={t.tdCenter}>{cellText(row.mobile, t.muted)}</td>
                    <td className={t.tdCenter}>
                      {isPrimary ? (
                        row.signature_image_url.trim() ? (
                          <img
                            src={row.signature_image_url}
                            alt="Signature"
                            className="mx-auto max-h-10 max-w-[7rem] rounded border border-zinc-700/60 object-contain bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-[length:8px_8px]"
                          />
                        ) : (
                          <span className={t.muted}>—</span>
                        )
                      ) : (
                        <span className={t.muted}>—</span>
                      )}
                    </td>
                    <td className={t.tdCenter}>
                      {isPrimary ? (
                        <span>
                          {row.apply_signature_on_documents ? "Yes" : "No"}
                        </span>
                      ) : (
                        <span className={t.muted}>—</span>
                      )}
                    </td>
                    <td className={t.tdCenter}>
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className={t.editBtn}
                          aria-label={`Edit person ${srNo}`}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => onCopy(row)}
                          className={t.copyBtn}
                          aria-label={`Copy person ${srNo}`}
                          title="Copy"
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(row)}
                          className={t.delBtn}
                          aria-label={`Delete person ${srNo}`}
                          title="Delete"
                        >
                          🗑️
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

export function TopManagementAddPersonButton({
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
      Add Person
    </button>
  );
}
