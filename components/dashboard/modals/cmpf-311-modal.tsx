"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@/lib/print/manufacturing-scope-declaration";
import {
  buildCmpf311Html,
  defaultCmpf311PrintSettings,
  iframeSizeForCmpf311PrintSettings,
  type Cmpf311LetterData,
} from "@/lib/print/cmpf-311";
import { downloadCmpf311Word } from "@/lib/print/cmpf-311-export";
import type { PrintSettings } from "@/lib/print/types";
import { resolveCmpf311Document, type Cmpf311Stored } from "@/lib/cmpf-311";
import {resolvePrimaryTopManagementPerson,
  type TopManagementStored,
  withDocumentSignatureImage,
} from "@/lib/top-management";

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

export function Cmpf311Modal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  productManualNumber,
  topManagement,
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
  topManagement: TopManagementStored[];
  onSave: (document: Cmpf311Stored) => void;
  onClose: () => void;
}) {
  const document = useMemo(
    () =>
      resolveCmpf311Document({
        isNumber: letterData.isNumber,
        isTitle: letterData.isTitle ?? null,
        contactPerson: letterData.contactPerson,
        topManagement,
        applicationNumber,
        dateOfApplication,
        productManualNumber,
      }),
    [
      letterData.isNumber,
      letterData.isTitle,
      letterData.contactPerson,
      topManagement,
      applicationNumber,
      dateOfApplication,
      productManualNumber,
    ],
  );

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultCmpf311PrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isFullNumber = letterData.isNumber?.trim() || "—";

  const { firmRepName, firmRepDesignation } = useMemo(() => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return {
      firmRepName: primary.person_name || letterData.contactPerson?.trim() || "",
      firmRepDesignation: primary.designation,
    };
  }, [topManagement, letterData.contactPerson]);

  const previewData = useMemo((): Cmpf311LetterData  => {
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
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildCmpf311Html(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForCmpf311PrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
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
    void downloadCmpf311Word(previewData, printSettings).catch(() =>
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
            <h2 className="truncate text-sm font-semibold text-white">CMPF 311 — SIT Acceptance</h2>
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
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Document Details
                </p>
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {[
                    ["Reference Letter No.", document.reference_letter_no || "—"],
                    ["Reference Letter Date", document.reference_letter_date || "—"],
                    ["Licence For (Standard)", document.licence_for_standard || "—"],
                    ["Product Manual No.", document.sit_document_ref || "—"],
                    ["Signatory", firmRepName || "—"],
                    ["Designation", firmRepDesignation || "—"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
                    >
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        {label}
                      </dt>
                      <dd className="mt-1 text-zinc-200">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-zinc-500">
                  Details are loaded from the application and IS Code. Use{" "}
                  <strong className="text-zinc-300">Print Preview</strong> to view the full CMPF
                  311 letter.
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
    </>
  );
}
