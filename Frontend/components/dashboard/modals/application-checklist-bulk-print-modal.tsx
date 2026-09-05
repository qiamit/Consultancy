"use client";

import { useMemo, useState } from "react";
import {
  APPLICATION_CHECKLIST_PRINT_DOCS,
  buildSelectedChecklistPrintHtml,
  checklistPrintDocHasContent,
  downloadChecklistCombinedPdf,
  openChecklistCombinedPrint,
  type ChecklistBulkPrintContext,
  type ChecklistPrintDocId,
} from "@/lib/application-checklist-bulk-print";

export function ApplicationChecklistBulkPrintModal({
  ctx,
  onClose,
}: {
  ctx: ChecklistBulkPrintContext;
  onClose: () => void;
}) {
  const docs = useMemo(
    () =>
      APPLICATION_CHECKLIST_PRINT_DOCS.map((doc) => ({
        ...doc,
        hasContent: checklistPrintDocHasContent(doc.id, ctx),
      })),
    [ctx],
  );

  const printableIds = useMemo(
    () => docs.filter((d) => d.hasContent).map((d) => d.id),
    [docs],
  );

  const [selected, setSelected] = useState<Set<ChecklistPrintDocId>>(
    () => new Set(printableIds),
  );
  const [busy, setBusy] = useState<"print" | "pdf" | null>(null);

  const selectedCount = selected.size;
  const allPrintableSelected =
    printableIds.length > 0 && printableIds.every((id) => selected.has(id));

  function toggle(id: ChecklistPrintDocId, enabled: boolean) {
    if (!enabled) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPrintable() {
    setSelected(new Set(printableIds));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function runAction(kind: "print" | "pdf") {
    if (busy || selectedCount === 0) return;
    setBusy(kind);
    try {
      const ids = APPLICATION_CHECKLIST_PRINT_DOCS.map((d) => d.id).filter((id) =>
        selected.has(id),
      );
      const html = await buildSelectedChecklistPrintHtml(ids, ctx);
      if (kind === "print") {
        openChecklistCombinedPrint(html);
      } else {
        await downloadChecklistCombinedPdf({
          html,
          companyName: ctx.letterData.companyName,
        });
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to prepare documents.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-black/60 backdrop-blur-sm lg:left-64">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checklist-bulk-print-title"
        className="flex h-dvh w-full flex-col overflow-hidden bg-zinc-950 shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id="checklist-bulk-print-title" className="text-sm font-semibold text-white">
              Print / Download Checklist Documents
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Select documents, then Print or download a single PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy !== null}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2 sm:px-5">
          <p className="text-[11px] text-zinc-400">
            {selectedCount} selected
            {printableIds.length > 0 ? ` · ${printableIds.length} with data` : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllPrintable}
              disabled={printableIds.length === 0 || allPrintableSelected}
              className="rounded px-2 py-1 text-[11px] font-medium text-sky-400 hover:bg-zinc-800 disabled:opacity-40"
            >
              Select all with data
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedCount === 0}
              className="rounded px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
            {docs.map((doc, index) => {
              const checked = selected.has(doc.id);
              return (
                <li key={doc.id}>
                  <label
                    className={`flex h-full cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 ${
                      doc.hasContent
                        ? "hover:border-zinc-700 hover:bg-zinc-900"
                        : "cursor-not-allowed opacity-45"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-zinc-600 bg-zinc-900 text-sky-600 focus:ring-sky-500"
                      checked={checked}
                      disabled={!doc.hasContent}
                      onChange={() => toggle(doc.id, doc.hasContent)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-zinc-100">
                        <span className="mr-1.5 tabular-nums text-zinc-500">{index + 1}.</span>
                        {doc.label}
                      </span>
                      {!doc.hasContent && (
                        <span className="mt-0.5 block text-[10px] text-zinc-500">
                          No saved data yet
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-900 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy !== null}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void runAction("print")}
            disabled={busy !== null || selectedCount === 0}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {busy === "print" ? "Preparing…" : "Print"}
          </button>
          <button
            type="button"
            onClick={() => void runAction("pdf")}
            disabled={busy !== null || selectedCount === 0}
            className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy === "pdf" ? "Downloading…" : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
