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
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildCmpf311Html,
  defaultCmpf311PrintSettings,
  iframeSizeForCmpf311PrintSettings,
  type Cmpf311LetterData,
  type Cmpf311PrintAssets,
} from "@backend/modules/print/cmpf-311";
import { downloadCmpf311Word } from "@backend/modules/print/cmpf-311-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  documentHasContent as cmpf311HasContent,
  mergeCmpf311WithDefaults,
  resolveCmpf311Document,
  type Cmpf311Stored,
} from "@backend/modules/bis/cmpf-311";
import {
  type TopManagementStored,
  withDocumentSignatureImage,
} from "@backend/modules/bis/top-management";
import type { ChecklistImportExclude } from "@backend/modules/bis/checklist-document-import-meta";
import { ModalToolbarActions } from "@/components/dashboard/modals/modal-toolbar-actions";
import { DocumentModalSubtitle } from "@/components/dashboard/modals/document-modal-subtitle";
import { ChecklistDocumentImportDialog } from "@/components/dashboard/modals/checklist-document-import-dialog";
import type { ApplicationMeta } from "@backend/modules/bis/application-checklist-notes";

const CMPF311_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with CMPF 311 — Acceptance of Scheme of Inspection & Testing (SIT):
- Product Manual Number and SIT document references for the applicable Indian Standard
- Licence scope, reference letter details, and signatory for BIS submission
- Undertaking to follow the Scheme of Inspection and Testing and maintain records

Be concise, practical, and use Indian BIS/ISI certification context. When asked to refine wording, use formal, professional language suitable for a BIS declaration letter.`;

const CMPF311_QE_STARTERS = [
  "Explain the CMPF 311 SIT acceptance undertaking",
  "What Product Manual Number should we cite?",
  "Review our reference letter details for CMPF 311",
];

const FIELD_INPUT_CLASS =
  "mt-1 block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30";

export function Cmpf311Modal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  productManualNumber,
  isCodeProductManualNumber,
  topManagement,
  document: initialDocument,
  clientId = null,
  excludeImportSource = null,
  onUpdateMeta,
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
  productManualNumber: string;
  isCodeProductManualNumber?: string | null;
  topManagement: TopManagementStored[];
  document: Cmpf311Stored;
  clientId?: string | null;
  excludeImportSource?: ChecklistImportExclude | null;
  onUpdateMeta: (patch: Partial<ApplicationMeta>) => void;
  onSave: (document: Cmpf311Stored) => void;
  onClose: () => void;
}) {
  const resolvedProductManualNumber =
    productManualNumber.trim() || isCodeProductManualNumber?.trim() || "";

  function buildResolvedDocument(): Cmpf311Stored {
    return resolveCmpf311Document({
      isNumber: letterData.isNumber,
      isTitle: letterData.isTitle ?? null,
      contactPerson: letterData.contactPerson,
      topManagement,
      applicationNumber,
      dateOfApplication,
      productManualNumber: resolvedProductManualNumber,
    });
  }

  const [document, setDocument] = useState(() =>
    mergeCmpf311WithDefaults(initialDocument, buildResolvedDocument()),
  );
  const skipAutoFieldSync = useRef(true);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultCmpf311PrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<Cmpf311PrintAssets>({});
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Re-auto-pick linked fields when application / IS / product manual sources change.
  useEffect(() => {
    const resolved = buildResolvedDocument();
    if (skipAutoFieldSync.current) {
      skipAutoFieldSync.current = false;
      setDocument((prev) => mergeCmpf311WithDefaults(prev, resolved));
      return;
    }
    setDocument((prev) => ({
      ...prev,
      reference_letter_no: resolved.reference_letter_no,
      reference_letter_date: resolved.reference_letter_date,
      licence_for_standard: resolved.licence_for_standard,
      sit_document_ref: resolved.sit_document_ref,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when source inputs change
  }, [
    applicationNumber,
    dateOfApplication,
    resolvedProductManualNumber,
    letterData.isNumber,
    letterData.isTitle,
  ]);

  // Fill empty signatory from Top Management without overwriting edits.
  useEffect(() => {
    const resolved = buildResolvedDocument();
    setDocument((prev) => {
      const nextName = prev.signatory_name.trim()
        ? prev.signatory_name
        : resolved.signatory_name;
      const nextDesignation = prev.signatory_designation.trim()
        ? prev.signatory_designation
        : resolved.signatory_designation;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topManagement, letterData.contactPerson]);

  function patchDocument(patch: Partial<Cmpf311Stored>) {
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
      const defaults = defaultCmpf311PrintSettings();
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

  // Keep CMPF 311 margin defaults in sync (matches Top Management / Plant & Machinery).
  useEffect(() => {
    const defaults = defaultCmpf311PrintSettings();
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

  const previewData = useMemo((): Cmpf311LetterData  => {
    return withDocumentSignatureImage({
      ...letterData,
      applicationNumber,
      dateOfApplication,
      dateOfInspection,
      firmRepName: document.signatory_name,
      firmRepDesignation: document.signatory_designation,
      document,
    }, topManagement);
  }, [
    letterData,
    applicationNumber,
    dateOfApplication,
    dateOfInspection,
    document,
    topManagement,
  ]);

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildCmpf311Html(previewData, printSettings, printAssets);
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

  const iframeSize = iframeSizeForCmpf311PrintSettings(printSettings);

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
    void downloadCmpf311Word(previewData, printSettings, printAssets).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildCmpf311Html(previewData, printSettings, printAssets);
      await downloadPrintHtmlAsPdf({
        html,
        filename: `CMPF_311_${safePdfFilenamePart(letterData.companyName)}.pdf`,
        settings: printSettings,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to download PDF.");
    } finally {
      setPdfDownloading(false);
    }
  }

  function handleImportFromApplication(nextDocument: Cmpf311Stored): boolean {
    if (cmpf311HasContent(document)) {
      const ok = window.confirm(
        "Replace the current SIT Acceptance details with the imported data?",
      );
      if (!ok) return false;
    }
    setDocument(nextDocument);
    setShowPrintPreview(false);
    return true;
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <>
      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 overflow-hidden border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">CMPF 311 — SIT Acceptance</h2>
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
              onClick={() => setShowImportDialog(true)}
              title="Import SIT Acceptance from Another Application or License"
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Import
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
                  <label
                    htmlFor="cmpf311_product_manual_number"
                    className="mb-1 block text-sm font-medium leading-tight text-zinc-400"
                  >
                    Product Manual Number
                  </label>
                  <input
                    id="cmpf311_product_manual_number"
                    type="text"
                    value={productManualNumber}
                    onChange={(e) => onUpdateMeta({ product_manual_number: e.target.value })}
                    placeholder={
                      isCodeProductManualNumber?.trim()
                        ? `IS Code default: ${isCodeProductManualNumber.trim()}`
                        : "From IS Code Master…"
                    }
                    className="block w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 shadow-sm outline-none placeholder:text-zinc-600 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Document Details
                </p>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
                      placeholder="From Application Number"
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
                      placeholder="From Date of Application"
                      className={FIELD_INPUT_CLASS}
                    />
                  </label>
                  <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Licence For (Standard)
                    </span>
                    <input
                      type="text"
                      value={document.licence_for_standard}
                      onChange={(e) =>
                        patchDocument({ licence_for_standard: e.target.value })
                      }
                      placeholder="From IS Number / Title"
                      className={FIELD_INPUT_CLASS}
                    />
                  </label>
                  <label className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      Product Manual No.
                    </span>
                    <input
                      type="text"
                      value={document.sit_document_ref}
                      onChange={(e) =>
                        patchDocument({ sit_document_ref: e.target.value })
                      }
                      placeholder="From Product Manual Number"
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
                  Fields auto-fill from Application, IS Code, and Product Manual Number; you can
                  edit any value. Changing Product Manual Number above reloads Product Manual No.
                  Use <strong className="text-zinc-300">Print Preview</strong> to view the full
                  CMPF 311 letter.
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
                  Form Preview (CMPF 311)
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="CMPF 311 form preview"
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
          subtitle="CMPF 311 · Acceptance of Scheme of Inspection & Testing"
          systemPrompt={CMPF311_QE_PROMPT}
          starterQuestions={CMPF311_QE_STARTERS}
          accentColor="amber"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}

      {showImportDialog && (
        <ChecklistDocumentImportDialog
          documentKey="cmpf_311"
          title="Import SIT Acceptance"
          defaultClientId={clientId}
          exclude={excludeImportSource}
          onImport={(payload) => {
            if (payload.key !== "cmpf_311") return false;
            return handleImportFromApplication(payload.document);
          }}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </>
  );
}
