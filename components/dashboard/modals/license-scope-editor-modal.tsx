"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";
import {
  LicenseScopeTableEditor,
} from "@/components/modules/bis-projects/license-scope-table-editor";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import type { LicenseScopeFormat } from "@/lib/application-checklist-notes";
import {
  defaultLicenseScopeRows,
  editorRowsToStored,
  serializeLicenseScopeText,
  storedRowsToEditorRows,
  type LicenseScopeRow,
} from "@/lib/license-scope-format";
import {
  buildManufacturingScopeDeclarationHtml,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import {
  downloadManufacturingScopeDeclarationExcel,
  downloadManufacturingScopeDeclarationWord,
} from "@/lib/print/manufacturing-scope-declaration-export";
import type { PrintSettings } from "@/lib/print/types";

const LICENSE_SCOPE_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help draft and refine License Scope text for BIS Declaration Regarding Manufacturing Scope documents.
Help with:
- Clear manufacturing scope wording for BIS license applications
- Product descriptions under Indian Standards (IS codes)
- Compliance language for BIS declarations

Be concise, practical, and use Indian BIS/ISI certification context.`;

const LICENSE_SCOPE_STARTERS = [
  "Help me write license scope for steel products under IS 1786",
  "What should manufacturing scope include for BIS application?",
  "Review my license scope wording for BIS compliance",
];

export type LicenseScopeSavePayload = {
  licenseScope: string;
  format: LicenseScopeFormat;
  rows: { component: string; value: string }[];
};

function initialTableRows(
  format: LicenseScopeFormat,
  rows: { component: string; value: string }[],
): LicenseScopeRow[] {
  if (format === "table" && rows.length > 0) {
    return storedRowsToEditorRows(rows);
  }
  return defaultLicenseScopeRows();
}

export function LicenseScopeEditorModal({
  declarationData,
  licenseScope,
  licenseScopeFormat,
  licenseScopeRows,
  isCodeId,
  isNumber,
  revisionYear,
  onSave,
  onClose,
}: {
  declarationData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >;
  licenseScope: string;
  licenseScopeFormat: LicenseScopeFormat;
  licenseScopeRows: { component: string; value: string }[];
  isCodeId: string | null;
  isNumber: string | null;
  revisionYear: number | null;
  onSave: (payload: LicenseScopeSavePayload) => void;
  onClose: () => void;
}) {
  const [draftScope, setDraftScope] = useState(
    licenseScopeFormat === "plain" ? licenseScope : "",
  );
  const [tableRows, setTableRows] = useState<LicenseScopeRow[]>(() =>
    initialTableRows(licenseScopeFormat, licenseScopeRows),
  );
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultDeclarationPrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [showIsCodeView, setShowIsCodeView] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const scopeKey = `${licenseScopeFormat}:${JSON.stringify(licenseScopeRows)}:${licenseScope}`;

  useEffect(() => {
    setDraftScope(licenseScopeFormat === "plain" ? licenseScope : "");
    setTableRows(initialTableRows(licenseScopeFormat, licenseScopeRows));
  }, [scopeKey]);

  const isFullNumber =
    isNumber && revisionYear != null
      ? `${isNumber}: ${revisionYear}`
      : declarationData.isNumber || isNumber || "—";

  const effectiveScopeText = useMemo(
    () => serializeLicenseScopeText(licenseScopeFormat, draftScope, tableRows),
    [licenseScopeFormat, draftScope, tableRows],
  );

  const previewData = useMemo(
    (): ManufacturingScopeDeclarationData => ({
      ...declarationData,
      licenseScope: effectiveScopeText,
      licenseScopeFormat,
      licenseScopeRows:
        licenseScopeFormat === "table" ? editorRowsToStored(tableRows) : undefined,
    }),
    [declarationData, effectiveScopeText, licenseScopeFormat, tableRows],
  );

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildManufacturingScopeDeclarationHtml(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const iframeSize = iframeSizeForPrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    startSave(async () => {
      const storedRows = editorRowsToStored(tableRows);
      onSave({
        licenseScope: serializeLicenseScopeText(licenseScopeFormat, draftScope, tableRows),
        format: licenseScopeFormat,
        rows: licenseScopeFormat === "table" ? storedRows : [],
      });
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  }

  function handleDownloadWord() {
    void downloadManufacturingScopeDeclarationWord(previewData, printSettings).catch(
      () => window.alert("Unable to download Word file."),
    );
  }

  function handleDownloadExcel() {
    try {
      downloadManufacturingScopeDeclarationExcel(previewData);
    } catch {
      window.alert("Unable to download Excel file.");
    }
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <>
      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">
              Declaration Regarding Manufacturing Scope
            </h2>
            <p className="truncate text-xs text-zinc-400">{declarationData.companyName}</p>
          </div>
          {savedFlash && (
            <span className="text-xs font-semibold text-emerald-400">Saved ✓</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadWord}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Download Word File
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Download Excel File
          </button>
          <button
            type="button"
            onClick={() => toggleSettingsPanel("print")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              settingsPanel === "print"
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            }`}
          >
            Print Settings
          </button>
          <button
            type="button"
            onClick={() => toggleSettingsPanel("page")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              settingsPanel === "page"
                ? "border-indigo-500 bg-indigo-600 text-white"
                : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            }`}
          >
            Page Settings
          </button>
          <button
            type="button"
            onClick={() => setShowQeAssistant(true)}
            className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-950/70"
          >
            QE Assistant
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-x-auto">
          <div
            className={`flex min-w-0 flex-col border-r border-zinc-800 bg-zinc-900 ${
              settingsPanel ? "w-[calc((100%-18rem)/2)]" : "w-1/2"
            }`}
          >
            <div className="space-y-3 border-b border-zinc-800 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200">License Scope</p>
                  <p className="mt-0.5 text-xs font-semibold text-indigo-300">{isFullNumber}</p>
                  {declarationData.isTitle ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{declarationData.isTitle}</p>
                  ) : null}
                </div>
                {isCodeId ? (
                  <button
                    type="button"
                    onClick={() => setShowIsCodeView(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-600/50 bg-indigo-950/40 px-2.5 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-950/70"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    View IS Files
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              {licenseScopeFormat === "plain" ? (
                <textarea
                  id="license_scope_editor"
                  value={draftScope}
                  onChange={(e) => setDraftScope(e.target.value)}
                  placeholder="Enter manufacturing / license scope…"
                  className="min-h-0 flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40"
                />
              ) : (
                <LicenseScopeTableEditor
                  key={scopeKey}
                  theme="dark"
                  rows={tableRows}
                  onChange={setTableRows}
                />
              )}
            </div>
          </div>

          <div
            className={`flex min-w-0 flex-col bg-zinc-600 ${
              settingsPanel ? "w-[calc((100%-18rem)/2)]" : "w-1/2"
            }`}
          >
            <div className="flex-1 overflow-y-auto p-6">
              <iframe
                ref={iframeRef}
                title="Declaration print preview"
                className="mx-auto border-0 bg-white shadow-2xl"
                style={{
                  width: `${iframeSize.widthMm}mm`,
                  minHeight: `${iframeSize.heightMm}mm`,
                }}
              />
            </div>
          </div>

          {settingsPanel && (
            <div className="w-72 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-4">
              <DocumentPrintSettingsPanel
                mode={settingsPanel}
                settings={printSettings}
                onChange={patchPrintSettings}
              />
            </div>
          )}
        </div>
      </div>

      {showIsCodeView && isCodeId && (
        <IsCodeViewModal
          isCodeId={isCodeId}
          isNumber={isNumber}
          revisionYear={revisionYear}
          overlayZIndexClass="z-[450]"
          onClose={() => setShowIsCodeView(false)}
        />
      )}

      {showQeAssistant && (
        <AiChatModal
          title="QE Assistant"
          subtitle="License Scope & BIS Declaration help"
          systemPrompt={LICENSE_SCOPE_QE_PROMPT}
          starterQuestions={LICENSE_SCOPE_STARTERS}
          accentColor="violet"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
