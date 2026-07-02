"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import { ProcessDescriptionTableEditor } from "@/components/dashboard/process-description-table-editor";
import { ProcessDescriptionQeAssistantModal } from "@/components/dashboard/modals/process-description-qe-assistant-modal";
import type { ManufacturingScopeDeclarationData } from "@/lib/print/manufacturing-scope-declaration";
import {
  buildProcessDescriptionHtml,
  defaultProcessDescriptionPrintSettings,
  iframeSizeForProcessDescriptionPrintSettings,
  processDescriptionPointTexts,
  type ProcessDescriptionLetterData,
} from "@/lib/print/process-description";
import { downloadProcessDescriptionWord } from "@/lib/print/process-description-export";
import type { PrintSettings } from "@/lib/print/types";
import {
  mergeProcessDescriptionWithDefaults,
  resolveProcessDescriptionDocument,
  type ProcessDescriptionStored,
} from "@/lib/process-description";
import { withDocumentSignatureImage, type TopManagementStored } from "@/lib/top-management";
import type { LicenseScopeFormat, LicenseScopeTableRow } from "@/lib/application-checklist-notes";
import type { ProcessFlowChartStored } from "@/lib/process-flow-chart";

export function ProcessDescriptionModal({
  letterData,
  applicationNumber,
  dateOfApplication,
  topManagement,
  isCodeId,
  licenseScope,
  licenseScopeFormat,
  licenseScopeRows,
  processFlowChart,
  storedDocument,
  onSave,
  onClose,
}: {
  letterData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >;
  applicationNumber: string;
  dateOfApplication: string;
  topManagement: TopManagementStored[];
  isCodeId: string | null;
  licenseScope: string;
  licenseScopeFormat: LicenseScopeFormat;
  licenseScopeRows: LicenseScopeTableRow[];
  processFlowChart: ProcessFlowChartStored;
  storedDocument: ProcessDescriptionStored;
  onSave: (document: ProcessDescriptionStored) => void;
  onClose: () => void;
}) {
  const resolvedDefaults = useMemo(
    () =>
      resolveProcessDescriptionDocument({
        contactPerson: letterData.contactPerson,
        topManagement,
        defaultPoints: processDescriptionPointTexts({
          ...letterData,
          applicationNumber,
          dateOfApplication,
          document: {
            signatory_name: "",
            signatory_designation: "",
            description_points: [],
          },
        }),
      }),
    [letterData, applicationNumber, dateOfApplication, topManagement],
  );

  const [document, setDocument] = useState<ProcessDescriptionStored>(() =>
    mergeProcessDescriptionWithDefaults(storedDocument, resolvedDefaults),
  );

  useEffect(() => {
    setDocument(mergeProcessDescriptionWithDefaults(storedDocument, resolvedDefaults));
  }, [storedDocument, resolvedDefaults]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultProcessDescriptionPrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isFullNumber = letterData.isNumber?.trim() || "—";

  const previewData = useMemo((): ProcessDescriptionLetterData  => {
    return withDocumentSignatureImage({
      ...letterData,
      applicationNumber,
      dateOfApplication,
      document,
    }, topManagement);
  }, [letterData, applicationNumber, dateOfApplication, document, topManagement]);

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildProcessDescriptionHtml(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForProcessDescriptionPrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function handleDescriptionPointsChange(points: string[]) {
    setDocument((prev) => ({ ...prev, description_points: points }));
  }

  const handleQeApplyUpdate = useCallback((nextDocument: ProcessDescriptionStored) => {
    setDocument(nextDocument);
  }, []);

  function handleSave() {
    startSave(() => {
      onSave(document);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  }

  function handleDownloadWord() {
    void downloadProcessDescriptionWord(previewData, printSettings).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <>
      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 shrink-0 flex-1 basis-48">
            <h2 className="truncate text-sm font-semibold text-white">Process Description</h2>
            <p className="truncate text-xs text-zinc-400">
              {letterData.companyName}
              {isFullNumber !== "—" ? ` · ${isFullNumber}` : ""}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {savedFlash && <span className="text-xs font-semibold text-emerald-400">Saved ✓</span>}
            {saving && <span className="text-xs text-zinc-400">Saving…</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="shrink-0 whitespace-nowrap rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowPrintPreview((prev) => !prev)}
              className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                showPrintPreview
                  ? "border-sky-500 bg-sky-600 text-white"
                  : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              }`}
            >
              Print Preview
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Print
            </button>
            <button
              type="button"
              onClick={handleDownloadWord}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Download Word File
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
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-x-auto">
          {!showPrintPreview && (
            <div
              className={`flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-900 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
              }`}
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <ProcessDescriptionTableEditor
                  rows={document.description_points}
                  onChange={handleDescriptionPointsChange}
                />
              </div>
            </div>
          )}

          {showPrintPreview && (
            <div
              className={`flex min-w-0 flex-1 flex-col bg-zinc-600 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
              }`}
            >
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Process Description form preview"
                  className="mx-auto max-w-full border-0 bg-white shadow-2xl"
                  style={{
                    width: `min(100%, ${iframeSize.widthMm}mm)`,
                    minHeight: `${iframeSize.heightMm}mm`,
                  }}
                />
              </div>
            </div>
          )}

          {settingsPanel && (
            <div className={splitModalSettingsPaneClass()}>
              <DocumentPrintSettingsPanel
                mode={settingsPanel}
                settings={printSettings}
                onChange={patchPrintSettings}
              />
            </div>
          )}
        </div>
      </div>

      {showQeAssistant && (
        <ProcessDescriptionQeAssistantModal
          isCodeId={isCodeId}
          isReference={letterData.isNumber?.trim() || "—"}
          isTitle={letterData.isTitle?.trim() || ""}
          companyName={letterData.companyName}
          applicationNumber={applicationNumber}
          licenseScopeFormat={licenseScopeFormat}
          plainScope={licenseScope}
          tableRows={licenseScopeRows}
          processFlowChart={processFlowChart}
          document={document}
          onApplyUpdate={handleQeApplyUpdate}
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
