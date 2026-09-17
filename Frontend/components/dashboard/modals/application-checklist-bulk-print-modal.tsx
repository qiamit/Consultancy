"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  APPLICATION_CHECKLIST_PRINT_DOCS,
  buildChecklistBulkListRows,
  buildChecklistBulkPackItems,
  buildCombinedHtmlFromPackItems,
  buildFactoryTestReportSampleHtml,
  buildSelectedChecklistPrintDocs,
  downloadChecklistAttachmentPdf,
  downloadChecklistCombinedPdf,
  downloadChecklistCombinedWord,
  openChecklistAttachmentPrint,
  openChecklistAttachmentView,
  openChecklistCombinedPrint,
  printChecklistCombinedPdf,
  type ChecklistBulkListRow,
  type ChecklistBulkPrintContext,
  type ChecklistPrintDocId,
} from "@/lib/application-checklist-bulk-print";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

type BusyState =
  | { scope: "bulk"; kind: "print" | "pdf" | "word" }
  | { scope: "doc"; id: string; kind: "view" | "print" | "pdf" }
  | null;

type DocPreview = {
  id: string;
  label: string;
  html: string;
};

export function ApplicationChecklistBulkPrintModal({
  ctx,
  onClose,
  onEditDoc,
  selectionResetKey = 0,
}: {
  ctx: ChecklistBulkPrintContext;
  onClose: () => void;
  /** Open the matching checklist module editor (closes this bulk-print dialog). */
  onEditDoc?: (preparationDocKey: string) => void;
  /** Bumps on each open so selection always starts empty. */
  selectionResetKey?: number;
}) {
  const rows = useMemo(() => buildChecklistBulkListRows(ctx), [ctx]);

  const printableWithDataCount = useMemo(
    () => rows.filter((r) => r.hasContent).length,
    [rows],
  );

  const allKeys = useMemo(() => rows.map((r) => r.rowKey), [rows]);

  // Always start with zero selection (never pre-check rows).
  const [checkedRowKeys, setCheckedRowKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState<BusyState>(null);
  const [preview, setPreview] = useState<DocPreview | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  useLayoutEffect(() => {
    setCheckedRowKeys([]);
  }, [selectionResetKey]);

  useEffect(() => {
    const allowed = new Set(allKeys);
    setCheckedRowKeys((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((key) => allowed.has(key));
      return next.length === prev.length ? prev : next;
    });
  }, [allKeys]);

  const selectedCount = checkedRowKeys.length;
  const allSelected = allKeys.length > 0 && allKeys.every((id) => checkedRowKeys.includes(id));
  const anyBusy = busy !== null;

  const refreshPreviewIframe = useCallback(() => {
    const iframe = previewIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc || !preview) return;
    doc.open();
    doc.write(preview.html);
    doc.close();
    requestAnimationFrame(() => syncPrintPreviewIframe(iframe, { minHeightMm: 297 }));
  }, [preview]);

  useEffect(() => {
    if (preview) refreshPreviewIframe();
  }, [preview, refreshPreviewIframe]);

  function isChecked(rowKey: string): boolean {
    return checkedRowKeys.includes(rowKey);
  }

  function toggle(rowKey: string) {
    setCheckedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((k) => k !== rowKey) : [...prev, rowKey],
    );
  }

  function selectAll() {
    setCheckedRowKeys([...allKeys]);
  }

  function clearSelection() {
    setCheckedRowKeys([]);
  }

  async function buildDocHtml(id: ChecklistPrintDocId): Promise<{
    html: string;
    docs: { id: ChecklistPrintDocId; html: string }[];
    label: string;
  }> {
    const built = await buildSelectedChecklistPrintDocs([id], ctx);
    const html = built[0]?.html?.trim();
    if (!html) throw new Error("Document preview HTML is empty.");
    const label =
      APPLICATION_CHECKLIST_PRINT_DOCS.find((d) => d.id === id)?.label ?? id;
    return { html, docs: built, label };
  }

  async function runBulkAction(kind: "print" | "pdf" | "word") {
    if (anyBusy || selectedCount === 0) return;
    setBusy({ scope: "bulk", kind });
    try {
      const selectedRows = rows.filter(
        (r) => checkedRowKeys.includes(r.rowKey) && r.hasContent,
      );
      if (selectedRows.length === 0) {
        throw new Error("None of the selected items have content to export.");
      }

      if (kind === "word") {
        const wordRows = selectedRows.filter(
          (r) => r.kind === "print" || r.kind === "ftr_sample",
        );
        if (wordRows.length === 0) {
          throw new Error(
            "Select at least one checklist document with data to export as Word. Attachments are not included in the Word file.",
          );
        }
        const items = await buildChecklistBulkPackItems(wordRows, ctx);
        const htmlDocs = items.filter(
          (item): item is Extract<typeof item, { kind: "html" }> => item.kind === "html",
        );
        if (htmlDocs.length === 0) {
          throw new Error("None of the selected checklist documents have content to export.");
        }
        downloadChecklistCombinedWord({
          html: buildCombinedHtmlFromPackItems(htmlDocs),
          companyName: ctx.letterData.companyName,
        });
        return;
      }

      const items = await buildChecklistBulkPackItems(selectedRows, ctx);
      if (kind === "print") {
        await printChecklistCombinedPdf({
          items,
          companyName: ctx.letterData.companyName,
        });
      } else {
        await downloadChecklistCombinedPdf({
          items,
          companyName: ctx.letterData.companyName,
        });
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to prepare documents.");
    } finally {
      setBusy(null);
    }
  }

  async function runRowAction(
    row: ChecklistBulkListRow,
    kind: "view" | "print" | "pdf",
  ) {
    if (anyBusy || !row.hasContent) return;
    setBusy({ scope: "doc", id: row.rowKey, kind });
    try {
      if (row.kind === "attachment") {
        if (kind === "view") await openChecklistAttachmentView(row.documentRef);
        else if (kind === "print") await openChecklistAttachmentPrint(row.documentRef);
        else await downloadChecklistAttachmentPdf(row.documentRef, row.label);
        return;
      }

      if (row.kind === "ftr_sample") {
        const html = await buildFactoryTestReportSampleHtml(ctx, row.reportIndex);
        if (kind === "view") {
          setPreview({ id: row.id, label: row.label, html });
        } else if (kind === "print") {
          openChecklistCombinedPrint(html);
        } else {
          await downloadChecklistCombinedPdf({
            items: [{ kind: "html", id: row.id, html }],
            companyName: ctx.letterData.companyName,
          });
        }
        return;
      }

      const { html, docs: built, label } = await buildDocHtml(row.id);
      if (kind === "view") {
        setPreview({ id: row.id, label, html });
      } else if (kind === "print") {
        openChecklistCombinedPrint(html);
      } else {
        await downloadChecklistCombinedPdf({
          docs: built,
          companyName: ctx.letterData.companyName,
        });
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to prepare document.");
    } finally {
      setBusy(null);
    }
  }

  async function printFromPreview() {
    if (!preview || anyBusy) return;
    openChecklistCombinedPrint(preview.html);
  }

  async function pdfFromPreview() {
    if (!preview || anyBusy) return;
    setBusy({ scope: "doc", id: preview.id, kind: "pdf" });
    try {
      await downloadChecklistCombinedPdf({
        items: [{ kind: "html", id: preview.id, html: preview.html }],
        companyName: ctx.letterData.companyName,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to download PDF.");
    } finally {
      setBusy(null);
    }
  }

  function isRowBusy(rowKey: string, kind: "view" | "print" | "pdf") {
    return busy?.scope === "doc" && busy.id === rowKey && busy.kind === kind;
  }

  if (preview) {
    return (
      <div className="absolute inset-0 z-[500] flex flex-col bg-black/60 backdrop-blur-sm">
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-zinc-950 shadow-2xl">
          <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold text-white">
                Print Preview — {preview.label}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Same format as document Print Preview / Print / PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreview(null)}
              disabled={anyBusy}
              className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void printFromPreview()}
              disabled={anyBusy}
              className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            >
              🖨️ Print
            </button>
            <button
              type="button"
              onClick={() => void pdfFromPreview()}
              disabled={anyBusy}
              className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {busy?.scope === "doc" && busy.kind === "pdf" ? "Downloading…" : "📄 PDF"}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-600 p-3 sm:p-6">
            <iframe
              ref={previewIframeRef}
              title={`Print preview — ${preview.label}`}
              className="mx-auto max-w-full border-0 bg-white shadow-2xl"
              scrolling="no"
              style={printPreviewIframeStyle(210, 297)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-[500] flex flex-col bg-black/60 backdrop-blur-sm">
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
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={anyBusy}
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
            {printableWithDataCount > 0 ? ` · ${printableWithDataCount} with data` : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={allKeys.length === 0 || allSelected || anyBusy}
              className="rounded px-2 py-1 text-[11px] font-medium text-sky-400 hover:bg-zinc-800 disabled:opacity-40"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedCount === 0 || anyBusy}
              className="rounded px-2 py-1 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5">
          <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-zinc-700 bg-zinc-700 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
              const checked = isChecked(row.rowKey);
              const actionsDisabled = anyBusy || !row.hasContent;
              return (
                <li key={row.rowKey} className="bg-zinc-950">
                  <div
                    className={`flex h-full min-h-[3.25rem] items-center gap-2 px-3 py-2.5 transition-colors ${
                      checked
                        ? "bg-sky-950/50 hover:bg-sky-950/70"
                        : "hover:bg-zinc-900"
                    }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                          checked
                            ? "border-sky-500 bg-sky-600/25"
                            : "border-zinc-600 bg-zinc-900"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-zinc-500 bg-zinc-900 text-sky-600 focus:ring-sky-500 focus:ring-offset-0"
                          checked={checked}
                          onChange={() => toggle(row.rowKey)}
                          disabled={anyBusy}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-medium leading-snug text-zinc-100">
                          {row.label}
                        </span>
                        {!row.hasContent && (
                          <span className="mt-0.5 block text-[10px] text-zinc-500">
                            No saved data yet
                          </span>
                        )}
                        {row.kind === "attachment" && row.hasContent && (
                          <span className="mt-0.5 block text-[10px] text-zinc-500">
                            Attachment
                          </span>
                        )}
                      </span>
                    </label>

                    <div className="flex shrink-0 items-center gap-0.5 border-l border-zinc-800 pl-2">
                      <button
                        type="button"
                        title="Edit"
                        aria-label={`Edit ${row.label}`}
                        disabled={anyBusy || !onEditDoc}
                        onClick={() => onEditDoc?.(row.editKey)}
                        className="rounded-md px-1.5 py-1 text-base leading-none hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        title={row.kind === "attachment" ? "View file" : "Print Preview"}
                        aria-label={`View ${row.label}`}
                        disabled={actionsDisabled}
                        onClick={() => void runRowAction(row, "view")}
                        className="rounded-md px-1.5 py-1 text-base leading-none hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {isRowBusy(row.rowKey, "view") ? "…" : "👁️"}
                      </button>
                      <button
                        type="button"
                        title="Print"
                        aria-label={`Print ${row.label}`}
                        disabled={actionsDisabled}
                        onClick={() => void runRowAction(row, "print")}
                        className="rounded-md px-1.5 py-1 text-base leading-none hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {isRowBusy(row.rowKey, "print") ? "…" : "🖨️"}
                      </button>
                      <button
                        type="button"
                        title="PDF / Download"
                        aria-label={`Download ${row.label}`}
                        disabled={actionsDisabled}
                        onClick={() => void runRowAction(row, "pdf")}
                        className="rounded-md px-1.5 py-1 text-base leading-none hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        {isRowBusy(row.rowKey, "pdf") ? "…" : "📄"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-900 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={anyBusy}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void runBulkAction("print")}
            disabled={anyBusy || selectedCount === 0}
            title="Print selected documents"
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {busy?.scope === "bulk" && busy.kind === "print" ? "Preparing…" : "Selected Print"}
          </button>
          <button
            type="button"
            onClick={() => void runBulkAction("word")}
            disabled={anyBusy || selectedCount === 0}
            title="Download selected documents as one Word file"
            className="rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-950/70 disabled:opacity-50"
          >
            {busy?.scope === "bulk" && busy.kind === "word" ? "Preparing…" : "Selected Word"}
          </button>
          <button
            type="button"
            onClick={() => void runBulkAction("pdf")}
            disabled={anyBusy || selectedCount === 0}
            title="Download selected documents as one PDF"
            className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy?.scope === "bulk" && busy.kind === "pdf" ? "Downloading…" : "Selected PDF (Single)"}
          </button>
        </div>
      </div>
    </div>
  );
}
