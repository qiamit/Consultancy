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
  buildDefaultSlab1Text,
  computeMarkingFeeCalculation,
  documentHasContent as undertakingMinimumMarkingFeeHasContent,
  firmStatusFromFirmScale,
  formatMarkingFeeInr,
  formatMarkingFeeUnitRate,
  mergeUndertakingMinimumMarkingFeeWithDefaults,
  resolveUndertakingMinimumMarkingFeeDocument,
  type UndertakingMinimumMarkingFeeStored,
} from "@backend/modules/bis/undertaking-minimum-marking-fee";
import {
  resolvePrimaryTopManagementPerson,
  type TopManagementStored,
  withDocumentSignatureImage,
} from "@backend/modules/bis/top-management";
import { ModalToolbarActions } from "@/components/dashboard/modals/modal-toolbar-actions";
import { DocumentModalSubtitle } from "@/components/dashboard/modals/document-modal-subtitle";
import { preferLocalDocumentIfStoredEmpty } from "@/components/dashboard/modals/prefer-stored-document-sync";

const MMF_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with Marking Fee Calculation (Annex-1) for BIS licence applications:
- Components: Testing (2 FS + 2 MS), cost of market samples, BIS overhead (Rs. 37,000)
- MMF rounding: Large Scale rounded up to next thousand; MSME = 80% of LS rounded up
- Unit rate: MMF ÷ annual production; band 0.01%–0.2% of cost of production; round to 0.05 paisa
- Scheme-I of Schedule-II under BIS (Conformity Assessment) Regulations, 2018

Be concise, practical, and use Indian BIS/ISI certification context.`;

const MMF_QE_STARTERS = [
  "Explain Annex-1 marking fee calculation steps",
  "How is effective testing rate chosen (BIS lab vs OSL)?",
  "What inputs are needed for MMF and unit rate?",
];

type FieldDef = {
  key: keyof UndertakingMinimumMarkingFeeStored;
  label: string;
  hint?: string;
  multiline?: boolean;
  /** Columns out of 4 on xl; 2 on sm. Default 2. */
  span?: 1 | 2 | 4;
};

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "1 — Header & Product",
    fields: [
      {
        key: "firm_status",
        label: "Firm Status (MSME / LS)",
        hint: "Auto from Firm Scale",
        span: 1,
      },
      {
        key: "bis_branch",
        label: "BO Branch",
        hint: "Auto from Application",
        span: 1,
      },
      {
        key: "is_product_line",
        label: "IS & Product Line",
        hint: "e.g. IS 10054: 2025 Product: …",
        span: 4,
      },
    ],
  },
  {
    title: "2 — Installed Capacity",
    fields: [
      { key: "unit_of_sale", label: "Unit of Sale", span: 1 },
      {
        key: "annual_production_qty",
        label: "Annual Production Qty (numeric)",
        hint: "e.g. 18000000",
        span: 1,
      },
      {
        key: "annual_production_capacity",
        label: "Annual Production Capacity (display)",
        hint: "e.g. 1,80,00,000 Square Meter Per Annum",
        span: 2,
      },
      {
        key: "value_of_production_per_unit",
        label: "Value of Production (Per Unit)",
        span: 2,
      },
      {
        key: "cost_of_production_per_unit",
        label: "Cost of Production (Per Unit)",
        span: 2,
      },
    ],
  },
  {
    title: "3 — Market Surveillance",
    fields: [
      {
        key: "market_surveillance_plan",
        label: "Market Surveillance Plan (proposed)",
        multiline: true,
        span: 4,
      },
    ],
  },
  {
    title: "4 — Testing Charges",
    fields: [
      {
        key: "bis_lab_testing_charges",
        label: "BIS Lab Testing Charges (Rs.)",
        hint: "Leave blank if not available",
        span: 2,
      },
      {
        key: "osl_avg_testing_charges",
        label: "OSL Average Testing Charges (Rs.)",
        span: 2,
      },
      { key: "factory_sample_count", label: "Factory Sample Count", hint: "Default: 2", span: 1 },
      { key: "market_sample_count", label: "Market Sample Count", hint: "Default: 2", span: 1 },
      {
        key: "factory_sample_rate",
        label: "Factory Sample Rate (Rs.)",
        hint: "Blank = effective testing rate",
        span: 1,
      },
      {
        key: "market_sample_rate",
        label: "Market Sample Rate (Rs.)",
        hint: "Blank = effective testing rate",
        span: 1,
      },
    ],
  },
  {
    title: "5 — Cost of Market Sample",
    fields: [
      { key: "market_sample_quantity", label: "Quantity per Market Sample", span: 2 },
      { key: "market_sample_cost", label: "Cost of Market Sample (Rs.)", span: 2 },
    ],
  },
  {
    title: "6 — Overhead & MMF Overrides",
    fields: [
      { key: "overhead_cost", label: "Direct Cost of Overhead (Rs.)", hint: "Default: 37000", span: 2 },
      {
        key: "mmf_large_override",
        label: "MMF Large Scale Override (Rs.)",
        hint: "Optional",
        span: 1,
      },
      {
        key: "mmf_msme_override",
        label: "MMF MSME Override (Rs.)",
        hint: "Optional",
        span: 1,
      },
    ],
  },
  {
    title: "9 — Final Unit Rate & Slabs",
    fields: [
      {
        key: "final_unit_rate",
        label: "Final Unit Rate",
        hint: "Auto-filled from suggested if empty",
        span: 2,
      },
      {
        key: "slab_1_text",
        label: "Slab-1 Text",
        hint: "Auto-filled from suggested if empty",
        span: 2,
      },
      { key: "slab_2_text", label: "Slab-2 Text", span: 2 },
      { key: "slab_3_text", label: "Slab-3 Text", span: 2 },
    ],
  },
  {
    title: "Signatory",
    fields: [
      { key: "signatory_name", label: "Signatory Name", span: 2 },
      { key: "signatory_designation", label: "Designation", span: 2 },
    ],
  },
];

function fieldSpanClass(span: FieldDef["span"]): string {
  switch (span ?? 2) {
    case 1:
      return "sm:col-span-1 xl:col-span-1";
    case 4:
      return "sm:col-span-2 xl:col-span-4";
    default:
      return "sm:col-span-1 xl:col-span-2";
  }
}

function fieldInputClass(): string {
  return "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";
}

function summaryRow(label: string, value: string): React.ReactNode {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 py-1 text-xs last:border-b-0">
      <span className="text-zinc-400">{label}</span>
      <span className="text-right font-medium text-zinc-100">{value}</span>
    </div>
  );
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
  firmScale,
  bisBranchName,
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
  firmScale: string;
  bisBranchName: string;
  onSave: (document: UndertakingMinimumMarkingFeeStored) => void;
  onClose: () => void;
}) {
  const isFullNumber = letterData.isNumber?.trim() || "—";

  const resolvedDefaults = useMemo(
    () =>
      resolveUndertakingMinimumMarkingFeeDocument({
        isCode,
        contactPerson: letterData.contactPerson,
        topManagement,
        licenseScopeRows,
        firmScale,
        bisBranchName,
        isNumber: letterData.isNumber,
        isTitle: letterData.isTitle,
      }),
    [
      isCode,
      letterData.contactPerson,
      letterData.isNumber,
      letterData.isTitle,
      topManagement,
      licenseScopeRows,
      firmScale,
      bisBranchName,
    ],
  );

  const [document, setDocument] = useState<UndertakingMinimumMarkingFeeStored>(() =>
    mergeUndertakingMinimumMarkingFeeWithDefaults(storedDocument, resolvedDefaults),
  );

  useEffect(() => {
    setDocument((prev) => {
      const synced = preferLocalDocumentIfStoredEmpty(
        storedDocument,
        prev,
        undertakingMinimumMarkingFeeHasContent,
        (stored) => mergeUndertakingMinimumMarkingFeeWithDefaults(stored, resolvedDefaults),
      );
      // Prefer-local can keep an earlier empty-status draft when stored is still empty;
      // fill Firm Status / BO from Application once sources are available (editable after).
      const fromScale = firmStatusFromFirmScale(firmScale);
      const fromBranch =
        bisBranchName.trim() || letterData.bisBranchName.trim() || "";
      const next = { ...synced };
      let changed = synced !== prev;
      if (!next.firm_status.trim() && fromScale) {
        next.firm_status = fromScale;
        changed = true;
      }
      if (!next.bis_branch.trim() && fromBranch) {
        next.bis_branch = fromBranch;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [
    storedDocument,
    resolvedDefaults,
    firmScale,
    bisBranchName,
    letterData.bisBranchName,
  ]);

  const calculation = useMemo(() => computeMarkingFeeCalculation(document), [document]);

  useEffect(() => {
    setDocument((prev) => {
      let changed = false;
      const next = { ...prev };

      if (!prev.final_unit_rate.trim() && calculation.suggestedUnitRate != null) {
        next.final_unit_rate = formatMarkingFeeUnitRate(calculation.suggestedUnitRate);
        changed = true;
      }
      if (!prev.slab_1_text.trim() && calculation.suggestedUnitRate != null) {
        next.slab_1_text = buildDefaultSlab1Text(
          calculation.suggestedUnitRate,
          prev.unit_of_sale,
        );
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [
    calculation.suggestedUnitRate,
    document.unit_of_sale,
    document.final_unit_rate,
    document.slab_1_text,
  ]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultUndertakingMinimumMarkingFeePrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<UndertakingMinimumMarkingFeePrintAssets>({});
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [showCalcSummary, setShowCalcSummary] = useState(false);
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

  const { firmRepName, firmRepDesignation } = useMemo(() => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return {
      firmRepName: primary.person_name || letterData.contactPerson?.trim() || "",
      firmRepDesignation: primary.designation,
    };
  }, [topManagement, letterData.contactPerson]);

  const previewData = useMemo((): UndertakingMinimumMarkingFeeLetterData => {
    return withDocumentSignatureImage(
      {
        ...letterData,
        applicationNumber,
        dateOfApplication,
        dateOfInspection,
        firmRepName,
        firmRepDesignation,
        document,
      },
      topManagement,
    );
  }, [
    letterData,
    applicationNumber,
    dateOfApplication,
    dateOfInspection,
    firmRepName,
    firmRepDesignation,
    document,
    topManagement,
  ]);

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
      letterhead_layout: "logo-na",
    }));
  }

  function patchDocument(patch: Partial<UndertakingMinimumMarkingFeeStored>) {
    setDocument((prev) => {
      const next = { ...prev, ...patch };
      if ("market_sample_cost" in patch && patch.market_sample_cost !== undefined) {
        next.market_cost_most_common_variety = patch.market_sample_cost;
      }
      if ("market_cost_most_common_variety" in patch && patch.market_cost_most_common_variety !== undefined) {
        next.market_sample_cost = patch.market_cost_most_common_variety;
      }
      return next;
    });
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
        filename: `Marking_Fee_Calculation_Annex1_${safePdfFilenamePart(letterData.companyName)}.pdf`,
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
        <div className="flex shrink-0 items-center gap-2 overflow-hidden border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">
              Marking Fee Calculation (Annex-1)
            </h2>
            <DocumentModalSubtitle companyName={letterData.companyName} isNumber={isFullNumber} />
          </div>
          <ModalToolbarActions onClose={onClose}>
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
          </ModalToolbarActions>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-x-auto">
          {!showPrintPreview && (
            <div
              className={`flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-900 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
              }`}
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <div className="mb-4 rounded-lg border border-sky-900/50 bg-sky-950/20">
                  <button
                    type="button"
                    onClick={() => setShowCalcSummary((open) => !open)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-sky-950/40"
                    aria-expanded={showCalcSummary}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                      Live Calculation Summary
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      {!showCalcSummary ? (
                        <span className="truncate text-[11px] font-medium text-zinc-300">
                          LS {formatMarkingFeeInr(calculation.mmfLarge)} · MSME{" "}
                          {formatMarkingFeeInr(calculation.mmfMsme)}
                        </span>
                      ) : null}
                      <span className="shrink-0 text-sky-400" aria-hidden>
                        {showCalcSummary ? "▾" : "▸"}
                      </span>
                    </span>
                  </button>
                  {showCalcSummary ? (
                    <div className="border-t border-sky-900/40 px-3 pb-3 pt-1">
                      {summaryRow(
                        "Effective Testing Rate",
                        calculation.effectiveTestingRate != null
                          ? formatMarkingFeeInr(calculation.effectiveTestingRate)
                          : "—",
                      )}
                      {summaryRow(
                        "Factory Testing",
                        `${calculation.factorySampleCount} × ${formatMarkingFeeInr(calculation.factorySampleRate)} = ${formatMarkingFeeInr(calculation.factoryTestingAmount)}`,
                      )}
                      {summaryRow(
                        "Market Testing",
                        `${calculation.marketSampleCount} × ${formatMarkingFeeInr(calculation.marketSampleRate)} = ${formatMarkingFeeInr(calculation.marketTestingAmount)}`,
                      )}
                      {summaryRow(
                        "Market Sample Cost",
                        `${calculation.marketSampleCount} × ${formatMarkingFeeInr(calculation.marketSampleUnitCost)} = ${formatMarkingFeeInr(calculation.marketSampleCostAmount)}`,
                      )}
                      {summaryRow("Overhead", formatMarkingFeeInr(calculation.overheadAmount))}
                      {summaryRow("TOTAL (raw)", formatMarkingFeeInr(calculation.totalRaw))}
                      {summaryRow("MMF — Large Scale", formatMarkingFeeInr(calculation.mmfLarge))}
                      {summaryRow(
                        "MMF — MSME",
                        `${formatMarkingFeeInr(calculation.mmfMsmeRaw)} → ${formatMarkingFeeInr(calculation.mmfMsme)}`,
                      )}
                      {summaryRow(
                        "Probable Unit Rate",
                        calculation.probableUnitRate != null
                          ? formatMarkingFeeUnitRate(calculation.probableUnitRate)
                          : "—",
                      )}
                      {summaryRow(
                        "Band (0.01% – 0.2%)",
                        calculation.bandMin != null && calculation.bandMax != null
                          ? `${formatMarkingFeeUnitRate(calculation.bandMin)} – ${formatMarkingFeeUnitRate(calculation.bandMax)}`
                          : "—",
                      )}
                      {summaryRow(
                        "Suggested Unit Rate",
                        calculation.suggestedUnitRate != null
                          ? formatMarkingFeeUnitRate(calculation.suggestedUnitRate)
                          : "—",
                      )}
                    </div>
                  ) : null}
                </div>

                {SECTIONS.map((section) => (
                  <div key={section.title} className="mb-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {section.title}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {section.fields.map((field) => (
                        <div key={field.key} className={`min-w-0 ${fieldSpanClass(field.span)}`}>
                          <label
                            htmlFor={`mmf_${field.key}`}
                            className="mb-1 block text-sm font-medium text-zinc-200"
                          >
                            {field.label}
                          </label>
                          {field.multiline ? (
                            <textarea
                              id={`mmf_${field.key}`}
                              rows={3}
                              value={document[field.key]}
                              onChange={(event) =>
                                patchDocument({ [field.key]: event.target.value })
                              }
                              placeholder={field.hint}
                              className={fieldInputClass()}
                            />
                          ) : (
                            <input
                              id={`mmf_${field.key}`}
                              type="text"
                              value={document[field.key]}
                              onChange={(event) =>
                                patchDocument({ [field.key]: event.target.value })
                              }
                              placeholder={field.hint}
                              className={fieldInputClass()}
                            />
                          )}
                          {field.hint ? (
                            <p className="mt-1 text-[11px] text-zinc-500">{field.hint}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
                  Form Preview — Marking Fee Calculation (Annex-1)
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Marking Fee Calculation Annex-1 preview"
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
          subtitle="Marking Fee Calculation (Annex-1) · BIS Application"
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
