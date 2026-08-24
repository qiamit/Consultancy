"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildCmpf310Html,
  defaultCmpf310PrintSettings,
  iframeSizeForCmpf310PrintSettings,
  type Cmpf310LetterData,
} from "@backend/modules/print/cmpf-310";
import { downloadCmpf310Word } from "@backend/modules/print/cmpf-310-export";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  formatCmpf310RupeeDisplay,
  resolveCmpf310Document,
  type Cmpf310Stored,
  type IsCodeMarkingFeeSource,
} from "@backend/modules/bis/cmpf-310";
import { withDocumentSignatureImage, type TopManagementStored } from "@backend/modules/bis/top-management";

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

export function Cmpf310Modal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  isCode,
  companyScale,
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
  isCode: IsCodeMarkingFeeSource | null;
  companyScale: string | null;
  topManagement: TopManagementStored[];
  onSave: (document: Cmpf310Stored) => void;
  onClose: () => void;
}) {
  const document = useMemo(
    () =>
      resolveCmpf310Document({
        isCode,
        companyScale,
        contactPerson: letterData.contactPerson,
        topManagement,
      }),
    [isCode, companyScale, letterData.contactPerson, topManagement],
  );

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultCmpf310PrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(true);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildCmpf310Html(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForCmpf310PrintSettings(printSettings);

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
    void downloadCmpf310Word(previewData, printSettings).catch(() =>
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
          <h2 className="truncate text-sm font-semibold text-white">CMPF 310 — Marking Fee</h2>
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
                Marking Fee Details
              </p>
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Unit", document.unit || "—"],
                  ["Firm Scale", document.firm_scale || "—"],
                  ["Unit Rate", formatCmpf310RupeeDisplay(document.unit_rate_rs)],
                  ["Marking Fee (MMF)", formatCmpf310RupeeDisplay(document.marking_fee_rs)],
                  ["Reference Letter No.", document.reference_letter_no || "—"],
                  ["Reference Letter Date", document.reference_letter_date || "—"],
                  ["Signatory", document.signatory_name || "—"],
                  ["Designation", document.signatory_designation || "—"],
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
                Rates are loaded from the linked IS Code and company scale. Use{" "}
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
