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
import type { LicenseScopeTableRow } from "@backend/modules/bis/application-checklist-notes";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildUndertakingMinimumMarkingFeeHtml,
  defaultUndertakingMinimumMarkingFeePrintSettings,
  iframeSizeForUndertakingMinimumMarkingFeePrintSettings,
  type UndertakingMinimumMarkingFeeLetterData,
  type UndertakingMinimumMarkingFeePrintAssets,
} from "@backend/modules/print/undertaking-minimum-marking-fee";
import { downloadUndertakingMinimumMarkingFeeWord } from "@backend/modules/print/undertaking-minimum-marking-fee-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import type { IsCodeMarkingFeeSource } from "@backend/modules/bis/cmpf-310";
import {
  mergeUndertakingMinimumMarkingFeeWithDefaults,
  resolveUndertakingMinimumMarkingFeeDocument,
  type UndertakingMinimumMarkingFeeStored,
} from "@backend/modules/bis/undertaking-minimum-marking-fee";
import {resolvePrimaryTopManagementPerson,
  type TopManagementStored,
  withDocumentSignatureImage,
} from "@backend/modules/bis/top-management";

const MMF_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with the Undertaking for Minimum Marking Fee submitted with BIS licence applications:
- Unit of sale, annual production capacity, and production/cost figures for MMF determination
- Scheme-I of Schedule-II under BIS (Conformity Assessment) Regulations, 2018
- How minimum marking fee is calculated from production and market cost data
- Reference values from the applicable Indian Standard and licence scope

Be concise, practical, and use Indian BIS/ISI certification context. When asked to refine wording, use formal, professional language suitable for a BIS undertaking letter.`;

const MMF_QE_STARTERS = [
  "Explain the minimum marking fee undertaking for BIS",
  "What production and cost details should we declare?",
  "How is annual production capacity determined for MMF?",
];

const FIELD_ROWS: {
  key: keyof UndertakingMinimumMarkingFeeStored;
  label: string;
  hint?: string;
}[] = [
  { key: "unit_of_sale", label: "Unit of Sale" },
  {
    key: "annual_production_capacity",
    label: "Annual Production Capacity",
    hint: "e.g. 1000.00 Tonne / Year (As Provided in Application)",
  },
  {
    key: "value_of_production_per_unit",
    label: "Value of Production (Per Unit)",
    hint: "e.g. ₹ 7,55,000.00 (As Provided in Application)",
  },
  {
    key: "cost_of_production_per_unit",
    label: "Cost of Production (Per Unit)",
    hint: "e.g. ₹ 7,30,000.00 / Tonne",
  },
  {
    key: "market_cost_most_common_variety",
    label: "Cost (Market Cost) of Most Common Variety",
    hint: "e.g. ₹ 7,55,000.00 / Tonne",
  },
];

function fieldInputClass(): string {
  return "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";
}

export function UndertakingMinimumMarkingFeeModal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  isCode,
  licenseScopeRows,
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
  isCode: IsCodeMarkingFeeSource | null;
  licenseScopeRows: LicenseScopeTableRow[];
  topManagement: TopManagementStored[];
  storedDocument: UndertakingMinimumMarkingFeeStored;
  onSave: (document: UndertakingMinimumMarkingFeeStored) => void;
  onClose: () => void;
}) {
  const resolvedDefaults = useMemo(
    () =>
      resolveUndertakingMinimumMarkingFeeDocument({
        isCode,
        contactPerson: letterData.contactPerson,
        topManagement,
        licenseScopeRows,
      }),
    [isCode, letterData.contactPerson, topManagement, licenseScopeRows],
  );

  const [document, setDocument] = useState<UndertakingMinimumMarkingFeeStored>(() =>
    mergeUndertakingMinimumMarkingFeeWithDefaults(storedDocument, resolvedDefaults),
  );

  useEffect(() => {
    setDocument(mergeUndertakingMinimumMarkingFeeWithDefaults(storedDocument, resolvedDefaults));
  }, [storedDocument, resolvedDefaults]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultUndertakingMinimumMarkingFeePrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<UndertakingMinimumMarkingFeePrintAssets>({});
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
      const defaults = defaultUndertakingMinimumMarkingFeePrintSettings();
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

  // Keep Minimum Marking Fee margin defaults in sync (matches Top Management / Plant & Machinery).
  useEffect(() => {
    const defaults = defaultUndertakingMinimumMarkingFeePrintSettings();
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

  const { firmRepName, firmRepDesignation } = useMemo(() => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return {
      firmRepName: primary.person_name || letterData.contactPerson?.trim() || "",
      firmRepDesignation: primary.designation,
    };
  }, [topManagement, letterData.contactPerson]);

  const previewData = useMemo((): UndertakingMinimumMarkingFeeLetterData  => {
    return withDocumentSignatureImage({
      ...letterData,
      applicationNumber,
      dateOfApplication,
      dateOfInspection,
      firmRepName,
      firmRepDesignation,
      document,
    }, topManagement);
  }, [
    letterData,
    applicationNumber,
    dateOfApplication,
    dateOfInspection,
    firmRepName,
    firmRepDesignation,
    document,
    topManagement]);

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildUndertakingMinimumMarkingFeeHtml(previewData, printSettings, printAssets);
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

  const iframeSize = iframeSizeForUndertakingMinimumMarkingFeePrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({
      ...prev,
      ...patch,
      // Keep letterhead logo-free even if Print Settings changes layout.
      letterhead_layout: "logo-na",
    }));
  }

  function patchDocument(patch: Partial<UndertakingMinimumMarkingFeeStored>) {
    setDocument((prev) => ({ ...prev, ...patch }));
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
    void downloadUndertakingMinimumMarkingFeeWord(previewData, printSettings, printAssets).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildUndertakingMinimumMarkingFeeHtml(previewData, printSettings, printAssets);
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Undertaking_Minimum_Marking_Fee_${safePdfFilenamePart(letterData.companyName)}.pdf`,
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
              Undertaking for Minimum Marking Fee
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
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Production &amp; Cost Details
                </p>
                <div className="space-y-3">
                  {FIELD_ROWS.map((field, index) => (
                    <div
                      key={field.key}
                      className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start sm:gap-4"
                    >
                      <label
                        htmlFor={`mmf_${field.key}`}
                        className="pt-2 text-sm font-medium text-zinc-200"
                      >
                        {index + 1}. {field.label}
                      </label>
                      <div>
                        <input
                          id={`mmf_${field.key}`}
                          type="text"
                          value={document[field.key]}
                          onChange={(event) => patchDocument({ [field.key]: event.target.value })}
                          placeholder={field.hint}
                          className={fieldInputClass()}
                        />
                        {field.hint ? (
                          <p className="mt-1 text-xs text-zinc-500">{field.hint}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
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
                  Form Preview — Undertaking for Minimum Marking Fee
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Undertaking for Minimum Marking Fee form preview"
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
          subtitle="Undertaking for Minimum Marking Fee · BIS Application"
          systemPrompt={MMF_QE_PROMPT}
          starterQuestions={MMF_QE_STARTERS}
          accentColor="amber"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
