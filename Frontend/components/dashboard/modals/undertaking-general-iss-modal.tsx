"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";

import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import { UndertakingGeneralIssTableEditor } from "@/components/dashboard/undertaking-general-iss-table-editor";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildUndertakingGeneralIssHtml,
  defaultUndertakingGeneralIssPrintSettings,
  iframeSizeForUndertakingGeneralIssPrintSettings,
  undertakingGeneralIssPointTexts,
  type UndertakingGeneralIssLetterData,
  type UndertakingGeneralIssPrintAssets,
} from "@backend/modules/print/undertaking-general-iss";
import { downloadUndertakingGeneralIssWord } from "@backend/modules/print/undertaking-general-iss-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  mergeUndertakingGeneralIssWithDefaults,
  resolveUndertakingGeneralIssDocument,
  type UndertakingGeneralIssStored,
} from "@backend/modules/bis/undertaking-general-iss";
import { withDocumentSignatureImage, type TopManagementStored } from "@backend/modules/bis/top-management";

const UNDERTAKING_GENERAL_ISS_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with the Undertaking for General & ISS submitted with BIS licence applications:
- Standard undertaking points (machinery, testing, marking, packaging, weekly off, QC person, etc.)
- Marking clause and packaging clause references for the applicable Indian Standard
- Weekly holiday declaration wording
- Signatory and letter format for BIS submission

Be concise, practical, and use Indian BIS/ISI certification context.`;

const UNDERTAKING_GENERAL_ISS_QE_STARTERS = [
  "Review our General & ISS undertaking for BIS submission",
  "What marking and packaging clause should we cite?",
  "How should weekly off be declared in this undertaking?",
];

export function UndertakingGeneralIssModal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  markingClause,
  packagingClause,
  weeklyOff,
  topManagement,
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
  dateOfInspection: string;
  markingClause: string;
  packagingClause: string;
  weeklyOff: string[];
  topManagement: TopManagementStored[];
  storedDocument: UndertakingGeneralIssStored;
  onSave: (document: UndertakingGeneralIssStored) => void;
  onClose: () => void;
}) {
  const resolvedDefaults = useMemo(
    () =>
      resolveUndertakingGeneralIssDocument({
        contactPerson: letterData.contactPerson,
        topManagement,
        defaultPoints: undertakingGeneralIssPointTexts({
          ...letterData,
          applicationNumber,
          dateOfApplication,
          dateOfInspection,
          markingClause,
          packagingClause,
          weeklyOff,
          document: {
            signatory_name: "",
            signatory_designation: "",
            undertaking_points: [],
          },
        }),
      }),
    [
      letterData,
      applicationNumber,
      dateOfApplication,
      dateOfInspection,
      markingClause,
      packagingClause,
      weeklyOff,
      topManagement,
    ],
  );

  const [document, setDocument] = useState<UndertakingGeneralIssStored>(() =>
    mergeUndertakingGeneralIssWithDefaults(storedDocument, resolvedDefaults),
  );

  useEffect(() => {
    setDocument(mergeUndertakingGeneralIssWithDefaults(storedDocument, resolvedDefaults));
  }, [storedDocument, resolvedDefaults]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultUndertakingGeneralIssPrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<UndertakingGeneralIssPrintAssets>({});
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
      const defaults = defaultUndertakingGeneralIssPrintSettings();
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

  // Keep Undertaking General & ISS margin defaults in sync (matches Top Management / Plant & Machinery).
  useEffect(() => {
    const defaults = defaultUndertakingGeneralIssPrintSettings();
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

  const previewData = useMemo((): UndertakingGeneralIssLetterData => {
    return withDocumentSignatureImage(
      {
        ...letterData,
        applicationNumber,
        dateOfApplication,
        dateOfInspection,
        markingClause,
        packagingClause,
        weeklyOff,
        document,
      },
      topManagement,
    );
  }, [
    letterData,
    applicationNumber,
    dateOfApplication,
    dateOfInspection,
    markingClause,
    packagingClause,
    weeklyOff,
    document,
    topManagement,
  ]);

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildUndertakingGeneralIssHtml(previewData, printSettings, printAssets);
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

  const iframeSize = iframeSizeForUndertakingGeneralIssPrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({
      ...prev,
      ...patch,
      // Keep letterhead logo-free even if Print Settings changes layout.
      letterhead_layout: "logo-na",
    }));
  }

  function handleUndertakingPointsChange(points: string[]) {
    setDocument((prev) => ({ ...prev, undertaking_points: points }));
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
    void downloadUndertakingGeneralIssWord(previewData, printSettings, printAssets).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildUndertakingGeneralIssHtml(previewData, printSettings, printAssets);
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Undertaking_General_ISS_${safePdfFilenamePart(letterData.companyName)}.pdf`,
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
          <h2 className="truncate text-sm font-semibold text-white">
            Undertaking for General ISS
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
              <UndertakingGeneralIssTableEditor
                rows={document.undertaking_points}
                onChange={handleUndertakingPointsChange}
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
                title="Undertaking for General ISS form preview"
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
      <AiChatModal
        title="QE Assistant"
        subtitle="Undertaking for General & ISS · BIS Application"
        systemPrompt={UNDERTAKING_GENERAL_ISS_QE_PROMPT}
        starterQuestions={UNDERTAKING_GENERAL_ISS_QE_STARTERS}
        accentColor="amber"
        overlayZIndexClass="z-[500]"
        onClose={() => setShowQeAssistant(false)}
      />
    )}
    </>
  );
}
