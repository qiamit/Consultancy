"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildCmpf310Html,
  cmpf310PrintPageCount,
  defaultCmpf310PrintSettings,
  iframeSizeForCmpf310PrintSettings,
  type Cmpf310LetterData,
  type Cmpf310PrintAssets,
} from "@backend/modules/print/cmpf-310";
import { downloadCmpf310Word } from "@backend/modules/print/cmpf-310-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  mergeCmpf310WithDefaults,
  resolveCmpf310Defaults,
  type Cmpf310Stored,
  type IsCodeMarkingFeeSource,
} from "@backend/modules/bis/cmpf-310";
import { withDocumentSignatureImage, type TopManagementStored } from "@backend/modules/bis/top-management";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";
import { ModalToolbarActions } from "@/components/dashboard/modals/modal-toolbar-actions";
import { DocumentModalSubtitle } from "@/components/dashboard/modals/document-modal-subtitle";
import { ApplicationMetaDropdown } from "@/components/dashboard/application-details-form";
import { DROPDOWN_KEY_CLIENT_COMPANY_SCALE } from "@backend/shared/dropdown-keys";
import { type AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

const CMPF310_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with CMPF 310 — Acceptance of Rate of Marking Fee:
- Minimum marking fee (MMF), unit rate, and firm scale under BIS Scheme-I of Schedule-II
- Payment terms for advance MMF, annual production-based fee, and fee returns
- Reference letter, applicant details, and signatory for BIS submission
- Clarifying marking fee slabs from the applicable Indian Standard

Be concise, practical, and use Indian BIS/ISI certification context. When asked to refine wording, use formal, professional language suitable for a BIS declaration letter.`;

const CMPF310_QE_STARTERS = [
  "Explain the CMPF 310 marking fee payment terms",
  "Review our minimum marking fee acceptance for BIS",
  "What should we cite as reference letter details?",
];

const FIELD_INPUT_CLASS =
  "mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30";

export function Cmpf310Modal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  isCode,
  companyScale,
  topManagement,
  document: initialDocument,
  appDropdownOptions,
  onReloadDropdowns,
  onFirmScaleChange,
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
  companyScale: string | null;
  topManagement: TopManagementStored[];
  document: Cmpf310Stored;
  appDropdownOptions: Record<string, AppDropdownOptionRow[]>;
  onReloadDropdowns: () => void;
  onFirmScaleChange: (value: string) => void;
  onSave: (document: Cmpf310Stored) => void;
  onClose: () => void;
}) {
  const [document, setDocument] = useState(() =>
    mergeCmpf310WithDefaults(
      initialDocument,
      resolveCmpf310Defaults({
        isCode,
        companyScale,
        contactPerson: letterData.contactPerson,
        topManagement,
      }),
    ),
  );
  const skipAutoRateSync = useRef(true);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultCmpf310PrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<Cmpf310PrintAssets>({});
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // When Firm Scale / IS Code changes, re-auto-pick rate fields (user can still edit after).
  useEffect(() => {
    const defaults = resolveCmpf310Defaults({
      isCode,
      companyScale,
      contactPerson: letterData.contactPerson,
      topManagement,
    });
    if (skipAutoRateSync.current) {
      skipAutoRateSync.current = false;
      setDocument((prev) => mergeCmpf310WithDefaults(prev, defaults));
      return;
    }
    setDocument((prev) => ({
      ...prev,
      unit: defaults.unit || "",
      firm_scale: defaults.firm_scale || "",
      unit_rate_rs: defaults.unit_rate_rs || "",
      marking_fee_rs: defaults.marking_fee_rs || "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-pick rates when scale / IS fee source changes
  }, [
    companyScale,
    isCode?.unit_of_is,
    isCode?.slab_1_rate,
    isCode?.mmf_micro_scale,
    isCode?.mmf_small_scale,
    isCode?.mmf_medium_scale,
    isCode?.mmf_large_scale,
  ]);

  // Fill empty signatory from Top Management / contact without overwriting edits.
  useEffect(() => {
    const defaults = resolveCmpf310Defaults({
      isCode,
      companyScale,
      contactPerson: letterData.contactPerson,
      topManagement,
    });
    setDocument((prev) => {
      const nextName = prev.signatory_name.trim()
        ? prev.signatory_name
        : defaults.signatory_name || "";
      const nextDesignation = prev.signatory_designation.trim()
        ? prev.signatory_designation
        : defaults.signatory_designation || "";
      if (
        nextName === prev.signatory_name &&
        nextDesignation === prev.signatory_designation
      ) {
        return prev;
      }
      return {
        ...prev,
        signatory_name: nextName,
        signatory_designation: nextDesignation,
      };
    });
  }, [topManagement, letterData.contactPerson, isCode, companyScale]);

  function patchDocument(patch: Partial<Cmpf310Stored>) {
    setDocument((prev) => ({ ...prev, ...patch }));
  }

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
      const defaults = defaultCmpf310PrintSettings();
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

  // Keep CMPF 310 margin defaults in sync (matches Top Management / Plant & Machinery).
  useEffect(() => {
    const defaults = defaultCmpf310PrintSettings();
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

  const previewData = useMemo((): Cmpf310LetterData  => {
    return withDocumentSignatureImage({
      ...letterData,
      applicationNumber,
      dateOfApplication,
      dateOfInspection,
      document,
    }, topManagement);
  }, [letterData, applicationNumber, dateOfApplication, dateOfInspection, document, topManagement]);

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildCmpf310Html(previewData, printSettings, printAssets);
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

  const previewPageCount = useMemo(
    () => cmpf310PrintPageCount(printSettings),
    [printSettings],
  );
  const iframeSize = iframeSizeForCmpf310PrintSettings(
    printSettings,
    previewPageCount,
  );

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
    void downloadCmpf310Word(previewData, printSettings, printAssets).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildCmpf310Html(previewData, printSettings, printAssets);
      await downloadPrintHtmlAsPdf({
        html,
        filename: `CMPF_310_${safePdfFilenamePart(letterData.companyName)}.pdf`,
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
          <h2 className="truncate text-sm font-semibold text-white">CMPF 310 — Marking Fee</h2>
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
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mb-4 max-w-md">
                <ApplicationMetaDropdown
                  label="Firm Scale"
                  optionKey={DROPDOWN_KEY_CLIENT_COMPANY_SCALE}
                  dialogTitle="Company Scales"
                  addPlaceholder="New scale name…"
                  manageAriaLabel="Add or remove company scales"
                  value={companyScale ?? ""}
                  onChange={onFirmScaleChange}
                  options={appDropdownOptions[DROPDOWN_KEY_CLIENT_COMPANY_SCALE] ?? []}
                  onOptionsChanged={onReloadDropdowns}
                />
              </div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Marking Fee Details
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Unit
                  </span>
                  <input
                    type="text"
                    value={document.unit}
                    onChange={(e) => patchDocument({ unit: e.target.value })}
                    placeholder="e.g. 1 Piece"
                    className={FIELD_INPUT_CLASS}
                  />
                </label>
                <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Firm Scale
                  </span>
                  <input
                    type="text"
                    value={document.firm_scale}
                    onChange={(e) => patchDocument({ firm_scale: e.target.value })}
                    placeholder="From Firm Scale above"
                    className={FIELD_INPUT_CLASS}
                  />
                </label>
                <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Unit Rate (₹)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={document.unit_rate_rs}
                    onChange={(e) => patchDocument({ unit_rate_rs: e.target.value })}
                    placeholder="Auto from IS Code"
                    className={FIELD_INPUT_CLASS}
                  />
                </label>
                <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Marking Fee / MMF (₹)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={document.marking_fee_rs}
                    onChange={(e) => patchDocument({ marking_fee_rs: e.target.value })}
                    placeholder="Auto from Firm Scale"
                    className={FIELD_INPUT_CLASS}
                  />
                </label>
                <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Reference Letter No.
                  </span>
                  <input
                    type="text"
                    value={document.reference_letter_no}
                    onChange={(e) =>
                      patchDocument({ reference_letter_no: e.target.value })
                    }
                    placeholder="Optional"
                    className={FIELD_INPUT_CLASS}
                  />
                </label>
                <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Reference Letter Date
                  </span>
                  <input
                    type="text"
                    value={document.reference_letter_date}
                    onChange={(e) =>
                      patchDocument({ reference_letter_date: e.target.value })
                    }
                    placeholder="DD/MM/YYYY"
                    className={FIELD_INPUT_CLASS}
                  />
                </label>
                <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Signatory
                  </span>
                  <input
                    type="text"
                    value={document.signatory_name}
                    onChange={(e) =>
                      patchDocument({ signatory_name: e.target.value })
                    }
                    placeholder="From Top Management"
                    className={FIELD_INPUT_CLASS}
                  />
                </label>
                <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    Designation
                  </span>
                  <input
                    type="text"
                    value={document.signatory_designation}
                    onChange={(e) =>
                      patchDocument({ signatory_designation: e.target.value })
                    }
                    placeholder="From Top Management"
                    className={FIELD_INPUT_CLASS}
                  />
                </label>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                Fields auto-fill from the linked IS Code and Firm Scale; you can edit any value.
                Changing Firm Scale reloads Unit / Rate / MMF. Use{" "}
                <strong className="text-zinc-300">Print Preview</strong> to view the full CMPF
                310 letter.
              </p>
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
                Form Preview (CMPF 310)
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <iframe
                ref={iframeRef}
                title="CMPF 310 form preview"
                scrolling="no"
                className="mx-auto max-w-full border-0 bg-white shadow-2xl"
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
        subtitle="CMPF 310 · Acceptance of Rate of Marking Fee"
        systemPrompt={CMPF310_QE_PROMPT}
        starterQuestions={CMPF310_QE_STARTERS}
        accentColor="amber"
        overlayZIndexClass="z-[500]"
        onClose={() => setShowQeAssistant(false)}
      />
    )}
    </>
  );
}
