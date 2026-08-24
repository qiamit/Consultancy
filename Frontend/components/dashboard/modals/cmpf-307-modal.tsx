"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { Cmpf307AddBrandForm } from "@/components/dashboard/cmpf-307-add-brand-form";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildCmpf307Html,
  defaultCmpf307PrintSettings,
  iframeSizeForCmpf307PrintSettings,
  type Cmpf307LetterData,
} from "@backend/modules/print/cmpf-307";
import { downloadCmpf307Word } from "@backend/modules/print/cmpf-307-export";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  editorRowsFromStored,
  storedFromEditor,
  type Cmpf307Stored,
} from "@backend/modules/bis/cmpf-307";
import {resolvePrimaryTopManagementPerson,
  type TopManagementStored,
  withDocumentSignatureImage,
} from "@backend/modules/bis/top-management";

const CMPF307_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with CMPF 307 — Declaration of Brand Names Proposed to be Covered Under Certification:
- Brand/trade names to be marked with the BIS Standard Mark
- Owned by Self vs Others, Registered vs Unregistered status
- Registration dates and supporting documents (registration certificates, authorization agreements)
- Brands that will not carry the BIS Certification Mark and reasons
- BIS declarations on brand disputes, changes, and production records

Be concise, practical, and use Indian BIS/ISI certification context. When asked to refine wording, use formal, professional language suitable for a BIS declaration letter.`;

const CMPF307_QE_STARTERS = [
  "What brand names should we declare for this IS?",
  "Explain registered vs unregistered brand requirements for CMPF 307",
  "Review our CMPF 307 brand declaration for BIS submission",
];

export function Cmpf307Modal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  topManagement,
  document: initialDocument,
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
  topManagement: TopManagementStored[];
  document: Cmpf307Stored;
  onSave: (document: Cmpf307Stored) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(() => editorRowsFromStored(initialDocument));
  const brandsWithoutMarkReasons = initialDocument.brands_without_mark_reasons;
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultCmpf307PrintSettings(),
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

  const previewDocument = useMemo(
    (): Cmpf307Stored => storedFromEditor(rows, brandsWithoutMarkReasons),
    [rows, brandsWithoutMarkReasons],
  );

  const previewData = useMemo((): Cmpf307LetterData  => {
    return withDocumentSignatureImage({
      ...letterData,
      applicationNumber,
      dateOfApplication,
      dateOfInspection,
      firmRepName,
      firmRepDesignation,
      document: previewDocument,
    }, topManagement);
  }, [
    letterData,
    applicationNumber,
    dateOfApplication,
    dateOfInspection,
    firmRepName,
    firmRepDesignation,
    previewDocument,
    topManagement]);

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildCmpf307Html(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForCmpf307PrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    startSave(() => {
      onSave(storedFromEditor(rows, brandsWithoutMarkReasons));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  }

  function handleDownloadWord() {
    void downloadCmpf307Word(previewData, printSettings).catch(() =>
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
          <h2 className="truncate text-sm font-semibold text-white">CMPF 307 — Brand Names</h2>
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
            className="shrink-0 whitespace-nowrap rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-950/70"
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
              <Cmpf307AddBrandForm initialRows={rows} onRowsChange={setRows} />
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
                Form Preview (CMPF 307)
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <iframe
                ref={iframeRef}
                title="CMPF 307 form preview"
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
          subtitle="CMPF 307 · Brand Names"
          systemPrompt={CMPF307_QE_PROMPT}
          starterQuestions={CMPF307_QE_STARTERS}
          accentColor="amber"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
