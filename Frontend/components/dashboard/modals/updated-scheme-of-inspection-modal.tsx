"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { UpdatedSitTableEditor } from "@/components/dashboard/updated-sit-table-editor";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";

import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildUpdatedSchemeOfInspectionHtml,
  defaultUpdatedSchemeOfInspectionPrintSettings,
  iframeSizeForUpdatedSchemeOfInspectionPrintSettings,
  type UpdatedSchemeOfInspectionLetterData,
  type UpdatedSchemeOfInspectionPrintAssets,
} from "@backend/modules/print/updated-scheme-of-inspection";
import {
  downloadUpdatedSchemeOfInspectionExcel,
  downloadUpdatedSchemeOfInspectionWord,
} from "@backend/modules/print/updated-scheme-of-inspection-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  mergeUpdatedSchemeOfInspectionWithDefaults,
  resolveUpdatedSchemeOfInspectionDocument,
  type UpdatedSchemeOfInspectionStored,
} from "@backend/modules/bis/updated-scheme-of-inspection";

const labelClass =
  "block text-[10px] font-semibold uppercase tracking-wide text-zinc-400";
const textareaClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";

export function UpdatedSchemeOfInspectionModal({
  letterData,
  revisionYear,
  storedDocument,
  onSave,
  onClose,
}: {
  letterData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >;
  revisionYear: number | null;
  storedDocument: UpdatedSchemeOfInspectionStored;
  onSave: (document: UpdatedSchemeOfInspectionStored) => void;
  onClose: () => void;
}) {
  const resolvedDefaults = useMemo(
    () =>
      resolveUpdatedSchemeOfInspectionDocument({
        isNumber: letterData.isNumber,
        isTitle: letterData.isTitle ?? null,
        revisionYear: revisionYear != null ? String(revisionYear) : null,
      }),
    [letterData.isNumber, letterData.isTitle, revisionYear],
  );

  const [document, setDocument] = useState<UpdatedSchemeOfInspectionStored>(() =>
    mergeUpdatedSchemeOfInspectionWithDefaults(storedDocument, resolvedDefaults),
  );
  const [showAnnexText, setShowAnnexText] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultUpdatedSchemeOfInspectionPrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<UpdatedSchemeOfInspectionPrintAssets>({});
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setDocument(mergeUpdatedSchemeOfInspectionWithDefaults(storedDocument, resolvedDefaults));
  }, [storedDocument, resolvedDefaults]);

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
        orientation: _orientation,
        ...companySettings
      } = fromDb;
      const defaults = defaultUpdatedSchemeOfInspectionPrintSettings();
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
        letterhead_show_gst: companySettings.letterhead_show_gst ?? prev.letterhead_show_gst,
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

  // Keep Updated SIT margin defaults in sync (matches Top Management / Plant & Machinery).
  useEffect(() => {
    const defaults = defaultUpdatedSchemeOfInspectionPrintSettings();
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

  const previewData = useMemo((): UpdatedSchemeOfInspectionLetterData => {
    return {
      ...letterData,
      document,
    };
  }, [letterData, document]);

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildUpdatedSchemeOfInspectionHtml(previewData, printSettings, printAssets);
    doc.open();
    doc.write(html);
    doc.close();
    requestAnimationFrame(() => syncPrintPreviewIframe(iframe));
  }, [previewData, printSettings, printAssets]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const iframeSize = iframeSizeForUpdatedSchemeOfInspectionPrintSettings(printSettings);

  function patchDocument(patch: Partial<UpdatedSchemeOfInspectionStored>) {
    setDocument((prev) => ({ ...prev, ...patch }));
  }

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({
      ...prev,
      ...patch,
      // Keep letterhead logo-free even if Print Settings changes layout.
      letterhead_layout: "logo-na",
    }));
  }

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
    void downloadUpdatedSchemeOfInspectionWord(previewData, printSettings, printAssets).catch(
      () => window.alert("Unable to download Word file."),
    );
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildUpdatedSchemeOfInspectionHtml(previewData, printSettings, printAssets);
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Updated_Scheme_Of_Inspection_${safePdfFilenamePart(letterData.companyName)}.pdf`,
        settings: printSettings,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to download PDF.");
    } finally {
      setPdfDownloading(false);
    }
  }

  function handleDownloadExcel() {
    void downloadUpdatedSchemeOfInspectionExcel(previewData).catch(() =>
      window.alert("Unable to download Excel file."),
    );
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="min-w-0 shrink-0 flex-1 basis-48">
          <h2 className="truncate text-sm font-semibold text-white">
            Updated Scheme of Inspection &amp; Testing
          </h2>
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
            onClick={handleDownloadExcel}
            className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
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

      <div className="shrink-0 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1">
            <span className={labelClass}>PM Reference</span>
            <input
              value={document.pm_reference}
              onChange={(e) => patchDocument({ pm_reference: e.target.value })}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500"
            />
          </label>
          <button
            type="button"
            onClick={() => setShowAnnexText((prev) => !prev)}
            className="rounded-lg border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
          >
            {showAnnexText ? "Hide Annex Text" : "Edit Annex Text"}
          </button>
        </div>

        {showAnnexText && (
          <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(
              [
                ["laboratory_text", "Laboratory"],
                ["test_records_text", "Test Records"],
                ["labelling_marking_text", "Labelling & Marking"],
                ["control_unit_text", "Control Unit"],
                ["levels_of_control_text", "Levels of Control"],
                ["standard_mark_text", "Standard Mark"],
                ["rejections_text", "Rejections"],
                ["note_1", "Note 1"],
                ["note_2", "Note 2"],
                ["note_3", "Note 3"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span className={labelClass}>{label}</span>
                <textarea
                  value={document[key]}
                  onChange={(e) => patchDocument({ [key]: e.target.value })}
                  className={textareaClass}
                  rows={3}
                />
              </label>
            ))}
          </div>
        )}

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Table 1 — Test Details
        </p>
        <UpdatedSitTableEditor
          rows={document.test_rows}
          onChange={(test_rows) => patchDocument({ test_rows })}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-x-auto">
        <div
          className={`flex min-w-0 flex-1 flex-col bg-zinc-600 ${
            settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
          }`}
        >
          <div className="border-b border-zinc-700/80 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-200">
              Form Preview — Updated Scheme of Inspection &amp; Testing
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <iframe
              ref={iframeRef}
              title="Updated Scheme of Inspection and Testing preview"
              className="mx-auto max-w-full border-0 bg-white shadow-2xl"
              scrolling="no"
              style={printPreviewIframeStyle(iframeSize.widthMm, iframeSize.heightMm)}
            />
          </div>
        </div>

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
  );
}
