"use client";

import { parseBisProjectLicenseScopeNotes } from "@/lib/bis-project-license-scope-notes";
import { bisIsCodeDisplayLabel } from "@/lib/bis-project-is-code-label";
import type { BisProjectMasterRow } from "@/lib/types/bis-project-master";
import { projectKindLabel } from "./constants";

function clientLabel(r: BisProjectMasterRow): string {
  const c = r.clients;
  if (!c) return "—";
  return (c.company_name ?? "").trim() || (c.name ?? "").trim() || "—";
}

export function LicenseScopeViewModal({
  row,
  onClose,
}: {
  row: BisProjectMasterRow;
  onClose: () => void;
}) {
  const scope = parseBisProjectLicenseScopeNotes(row.notes);
  const isLabel = row.is_codes ? bisIsCodeDisplayLabel(row.is_codes) : "—";
  const hasContent =
    scope.scopeType === "table"
      ? scope.rows.some((r) => r.component.trim() || r.value.trim())
      : scope.plainText.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="license-scope-view-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div className="min-w-0">
            <h2 id="license-scope-view-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Licence Scope
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">{clientLabel(row)}</p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-500">
              {isLabel} · {projectKindLabel(row.project_kind)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!hasContent ? (
            <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-600">
              No licence scope saved for this project.
            </p>
          ) : scope.scopeType === "table" ? (
            <table className="w-full table-auto border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                  <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Scope Component
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Component Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {scope.rows
                  .filter((r) => r.component.trim() || r.value.trim())
                  .map((r, i) => (
                    <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="px-3 py-2 align-top text-zinc-800 dark:text-zinc-200">{r.component || "—"}</td>
                      <td className="px-3 py-2 align-top text-zinc-800 dark:text-zinc-200">{r.value || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <pre className="whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
              {scope.plainText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
