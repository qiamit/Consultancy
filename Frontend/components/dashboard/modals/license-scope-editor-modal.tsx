"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";
import { LicenseScopeQeAssistantModal } from "@/components/dashboard/modals/license-scope-qe-assistant-modal";
import {
  LicenseScopeTableEditor,
} from "@/components/modules/bis-projects/license-scope-table-editor";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";

import {
  splitModalSettingsPaneClass,
} from "@/components/dashboard/modals/split-modal-layout";
import type { LicenseScopeFormat } from "@backend/modules/bis/application-checklist-notes";
import {
  defaultLicenseScopeRows,
  editorRowsToStored,
  serializeLicenseScopeText,
  storedRowsToEditorRows,
  type LicenseScopeRow,
} from "@backend/modules/bis/license-scope-format";
import {
  buildManufacturingScopeDeclarationHtml,
  defaultManufacturingScopePrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
  type ManufacturingScopePrintAssets,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  downloadManufacturingScopeDeclarationWord,
} from "@backend/modules/print/manufacturing-scope-declaration-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import { applyLicenseScopeUpdate } from "@backend/modules/bis/license-scope-assistant";
import {
  resolvePrimaryTopManagementPerson,
  withDocumentSignatureImage,
  type TopManagementStored,
} from "@backend/modules/bis/top-management";

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
  topManagement,
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
  topManagement: TopManagementStored[];
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
    defaultManufacturingScopePrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<ManufacturingScopePrintAssets>({});
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [showIsCodeView, setShowIsCodeView] = useState(false);
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
      const defaults = defaultManufacturingScopePrintSettings();
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

  // Keep Manufacturing Scope margin defaults in sync (matches Top Management).
  useEffect(() => {
    const defaults = defaultManufacturingScopePrintSettings();
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

  const scopeKey = `${licenseScopeFormat}:${JSON.stringify(licenseScopeRows)}:${licenseScope}`;
  const [appliedScopeKey, setAppliedScopeKey] = useState(scopeKey);

  if (scopeKey !== appliedScopeKey) {
    setAppliedScopeKey(scopeKey);
    setDraftScope(licenseScopeFormat === "plain" ? licenseScope : "");
    setTableRows(initialTableRows(licenseScopeFormat, licenseScopeRows));
  }

  const isFullNumber =
    isNumber && revisionYear != null
      ? `${isNumber}: ${revisionYear}`
      : declarationData.isNumber || isNumber || "—";

  const effectiveScopeText = useMemo(
    () => serializeLicenseScopeText(licenseScopeFormat, draftScope, tableRows),
    [licenseScopeFormat, draftScope, tableRows],
  );

  const { signatoryName, signatoryDesignation } = useMemo(() => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return {
      signatoryName: primary.person_name || declarationData.contactPerson?.trim() || "",
      signatoryDesignation: primary.designation,
    };
  }, [topManagement, declarationData.contactPerson]);

  const previewData = useMemo(
    (): ManufacturingScopeDeclarationData =>
      withDocumentSignatureImage(
        {
          ...declarationData,
          signatoryName,
          signatoryDesignation,
          licenseScope: effectiveScopeText,
          licenseScopeFormat,
          licenseScopeRows:
            licenseScopeFormat === "table" ? editorRowsToStored(tableRows) : undefined,
        },
        topManagement,
      ),
    [
      declarationData,
      signatoryName,
      signatoryDesignation,
      effectiveScopeText,
      licenseScopeFormat,
      tableRows,
      topManagement,
    ],
  );

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildManufacturingScopeDeclarationHtml(previewData, printSettings, printAssets);
    doc.open();
    doc.write(html);
    doc.close();
    requestAnimationFrame(() => syncPrintPreviewIframe(iframe));
  }, [previewData, printSettings, printAssets]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForPrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({
      ...prev,
      ...patch,
      // Keep letterhead logo-free even if Print Settings changes layout.
      letterhead_layout: "logo-na",
    }));
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
    if (showPrintPreview && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
      return;
    }
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(
      buildManufacturingScopeDeclarationHtml(previewData, printSettings, printAssets),
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handleDownloadWord() {
    void downloadManufacturingScopeDeclarationWord(previewData, printSettings, printAssets).catch(
      () => window.alert("Unable to download Word file."),
    );
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildManufacturingScopeDeclarationHtml(previewData, printSettings, printAssets);
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Manufacturing_Scope_Declaration_${safePdfFilenamePart(declarationData.companyName)}.pdf`,
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

  const handleQeApplyUpdate = useCallback(
    (update: Parameters<typeof applyLicenseScopeUpdate>[0]) => {
      applyLicenseScopeUpdate(update, licenseScopeFormat, setDraftScope, setTableRows);
    },
    [licenseScopeFormat],
  );

  const storedTableRows = useMemo(
    () => editorRowsToStored(tableRows),
    [tableRows],
  );

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
            onClick={() => setShowPrintPreview((prev) => !prev)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-x-auto">
          {!showPrintPreview && (
            <div
              className={`flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-900 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
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
          )}

          {showPrintPreview && (
            <div
              className={`flex min-w-0 flex-1 flex-col bg-zinc-600 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
              }`}
            >
              <div className="border-b border-zinc-700/80 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  Print Preview
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Declaration print preview"
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
        <LicenseScopeQeAssistantModal
          isCodeId={isCodeId}
          isReference={isFullNumber}
          isTitle={declarationData.isTitle}
          companyName={declarationData.companyName}
          licenseScopeFormat={licenseScopeFormat}
          plainScope={draftScope}
          tableRows={storedTableRows}
          onApplyUpdate={handleQeApplyUpdate}
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
