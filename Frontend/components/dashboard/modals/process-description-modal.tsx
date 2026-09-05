"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";

import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import { ProcessDescriptionTableEditor } from "@/components/dashboard/process-description-table-editor";
import { ProcessDescriptionQeAssistantModal } from "@/components/dashboard/modals/process-description-qe-assistant-modal";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildProcessDescriptionHtml,
  defaultProcessDescriptionPrintSettings,
  iframeSizeForProcessDescriptionPrintSettings,
  processDescriptionPointTexts,
  type ProcessDescriptionLetterData,
  type ProcessDescriptionPrintAssets,
} from "@backend/modules/print/process-description";
import { downloadProcessDescriptionWord } from "@backend/modules/print/process-description-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  mergeProcessDescriptionWithDefaults,
  resolveProcessDescriptionDocument,
  type ProcessDescriptionStored,
} from "@backend/modules/bis/process-description";
import { withDocumentSignatureImage, type TopManagementStored } from "@backend/modules/bis/top-management";
import type { LicenseScopeFormat, LicenseScopeTableRow } from "@backend/modules/bis/application-checklist-notes";
import type { ProcessFlowChartStored } from "@backend/modules/bis/process-flow-chart";

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
  const [printAssets, setPrintAssets] = useState<ProcessDescriptionPrintAssets>({});
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    void loadCompanyPrintContext().then(({ printSettings: fromDb, assetUrls }) => {
      if (cancelled) return;
      const {
        margin_top: _mt,
        margin_bottom: _mb,
        margin_left: _ml,
        margin_right: _mr,
        letterhead_layout: _layout,
        ...companySettings
      } = fromDb;
      const defaults = defaultProcessDescriptionPrintSettings();
      setPrintSettings((prev) => ({
        ...prev,
        ...companySettings,
        font_family: defaults.font_family,
        show_letterhead: true,
        letterhead_layout: "logo-na",
        margin_top: defaults.margin_top,
        margin_bottom: defaults.margin_bottom,
        margin_left: defaults.margin_left,
        margin_right: defaults.margin_right,
        letterhead_show_address:
          companySettings.letterhead_show_address ?? prev.letterhead_show_address,
        letterhead_show_contact:
          companySettings.letterhead_show_contact ?? prev.letterhead_show_contact,
        letterhead_show_gst:
          companySettings.letterhead_show_gst ?? prev.letterhead_show_gst,
        primary_color: companySettings.primary_color || prev.primary_color,
        show_page_numbers: false,
        show_footer_line: false,
      }));
      setPrintAssets({
        letterhead_upper_url: assetUrls.letterhead_upper_url,
        letterhead_lower_url: assetUrls.letterhead_lower_url,
        seal_sign_url: assetUrls.seal_sign_url,
        logo_url: null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep Process Description margin defaults in sync (matches Top Management).
  useEffect(() => {
    const defaults = defaultProcessDescriptionPrintSettings();
    setPrintSettings((prev) => ({
      ...prev,
      font_family: defaults.font_family,
      show_letterhead: true,
      margin_top: defaults.margin_top,
      margin_bottom: defaults.margin_bottom,
      margin_left: defaults.margin_left,
      margin_right: defaults.margin_right,
      letterhead_layout: "logo-na",
    }));
  }, []);

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
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildProcessDescriptionHtml(previewData, printSettings, printAssets);
    doc.open();
    doc.write(html);
    doc.close();
    requestAnimationFrame(() => syncPrintPreviewIframe(iframe));
  }, [previewData, printSettings, printAssets]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForProcessDescriptionPrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({
      ...prev,
      ...patch,
      // Keep letterhead logo-free even if Print Settings changes layout.
      letterhead_layout: "logo-na",
    }));
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
    if (showPrintPreview && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
      return;
    }
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(
      buildProcessDescriptionHtml(previewData, printSettings, printAssets),
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handleDownloadWord() {
    void downloadProcessDescriptionWord(previewData, printSettings, printAssets).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildProcessDescriptionHtml(previewData, printSettings, printAssets);
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Process_Description_${safePdfFilenamePart(letterData.companyName)}.pdf`,
        settings: printSettings,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to download PDF.");
    } finally {
      setPdfDownloading(false);
    }
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
              onClick={() => void handleDownloadPdf()}
              disabled={pdfDownloading}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            >
              {pdfDownloading ? "Preparing PDF…" : "Download PDF"}
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
                  scrolling="no"
                  style={printPreviewIframeStyle(iframeSize.widthMm, iframeSize.heightMm)}
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
                hideLetterheadLogo
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
