"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { PackagingMarkingForm } from "@/components/dashboard/packaging-marking-form";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildSelfEvaluationFormHtml,
  defaultSelfEvaluationFormPrintSettings,
  iframeSizeForSelfEvaluationFormPrintSettings,
  sefPrintPageCount,
  type SelfEvaluationFormLetterData,
} from "@backend/modules/print/self-evaluation-form";
import { downloadSelfEvaluationFormWord } from "@backend/modules/print/self-evaluation-form-export";
import type { PrintSettings } from "@backend/modules/print/types";
import type { Cmpf307Stored } from "@backend/modules/bis/cmpf-307";
import type { RawMaterialStored } from "@backend/modules/bis/raw-material-details";
import {
  buildSefBrandRows,
  buildSefQcStaffRows,
  buildSefRawMaterialRows,
  resolveSelfEvaluationFormDocument,
  resolveSelfEvaluationPackagingMarking,
  type SelfEvaluationFormStored,
} from "@backend/modules/bis/self-evaluation-form";
import type { TechnicalStaffStored } from "@backend/modules/bis/technical-staff";
import { withDocumentSignatureImage, type TopManagementStored } from "@backend/modules/bis/top-management";

const SEF_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with the Self Evaluation cum Verification Form submitted with BIS licence applications:
- General information, plant layout, and factory details
- Raw material details, suppliers, and BIS certification mark status
- Packaging and marking particulars per the applicable Indian Standard
- Quality control staff qualifications and experience
- Brand name / trade mark declarations and CMPF 307 alignment
- Final declaration and signatory requirements for BIS factory inspection

Be concise, practical, and use Indian BIS/ISI certification context. When asked to refine wording, use formal, professional language suitable for a BIS submission.`;

const SEF_QE_STARTERS = [
  "What sections are required in the Self Evaluation Form?",
  "Review our packaging and marking details for BIS submission",
  "What does BIS expect in the brand name declaration section?",
];

export function SelfEvaluationFormModal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  markingClause,
  rawMaterialDetails,
  technicalStaff,
  cmpf307,
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
  rawMaterialDetails: RawMaterialStored[];
  technicalStaff: TechnicalStaffStored[];
  cmpf307: Cmpf307Stored;
  topManagement: TopManagementStored[];
  storedDocument: SelfEvaluationFormStored;
  onSave: (document: SelfEvaluationFormStored) => void;
  onClose: () => void;
}) {
  const resolvedDefaults = useMemo(
    () =>
      resolveSelfEvaluationFormDocument({
        contactPerson: letterData.contactPerson,
        topManagement,
        city: letterData.city,
        dateOfApplication,
        plantLayout: storedDocument.plant_layout,
      }),
    [
      letterData.contactPerson,
      letterData.city,
      topManagement,
      dateOfApplication,
      storedDocument.plant_layout,
    ],
  );

  const [document, setDocument] = useState<SelfEvaluationFormStored>(() => ({
    ...resolvedDefaults,
    packaging_marking: resolveSelfEvaluationPackagingMarking(storedDocument, markingClause),
  }));

  useEffect(() => {
    setDocument({
      ...resolvedDefaults,
      packaging_marking: resolveSelfEvaluationPackagingMarking(storedDocument, markingClause),
    });
  }, [resolvedDefaults, storedDocument, markingClause]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultSelfEvaluationFormPrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isFullNumber = letterData.isNumber?.trim() || "—";

  const previewData = useMemo((): SelfEvaluationFormLetterData  => {
    return withDocumentSignatureImage({
      ...letterData,
      applicationNumber,
      dateOfApplication,
      dateOfInspection,
      markingClause,
      brandsWithoutMarkReasons: cmpf307.brands_without_mark_reasons,
      document,
      rawMaterialRows: buildSefRawMaterialRows(rawMaterialDetails),
      packagingMarkingRows: resolveSelfEvaluationPackagingMarking(document, markingClause),
      qcStaffRows: buildSefQcStaffRows(technicalStaff),
      brandRows: buildSefBrandRows(cmpf307),
    }, topManagement);
  }, [
    letterData,
    applicationNumber,
    dateOfApplication,
    dateOfInspection,
    markingClause,
    cmpf307,
    document,
    rawMaterialDetails,
    technicalStaff,
    topManagement]);

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildSelfEvaluationFormHtml(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForSelfEvaluationFormPrintSettings(printSettings);
  const previewPageCount = sefPrintPageCount();

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
    void downloadSelfEvaluationFormWord(previewData, printSettings).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  function handlePackagingMarkingChange(rows: SelfEvaluationFormStored["packaging_marking"]) {
    setDocument((prev) => ({ ...prev, packaging_marking: rows }));
  }

  function handlePlantLayoutChange(plantLayout: string) {
    setDocument((prev) => ({ ...prev, plant_layout: plantLayout }));
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <>
    <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="min-w-0 shrink-0 flex-1 basis-48">
          <h2 className="truncate text-sm font-semibold text-white">Self Evaluation Form</h2>
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b border-zinc-800 px-4 py-3 sm:px-6">
                <p className="text-xs leading-relaxed text-zinc-400">
                  Raw material details, quality control staff, and brand names are pulled from their
                  respective checklist items. Edit plant layout and packaging &amp; marking below;
                  then use Print Preview to review the full form.
                </p>
                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] lg:items-end">
                  <h3 className="text-sm font-semibold text-zinc-100 lg:col-span-2">
                    1. General Information
                  </h3>
                  <label className="text-xs font-medium text-zinc-400 lg:pb-2">Plant Layout</label>
                  <input
                    type="text"
                    value={document.plant_layout}
                    onChange={(e) => handlePlantLayoutChange(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    placeholder="Enclosed"
                  />
                </div>
              </div>

              <section className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6 sm:py-4">
                <h3 className="mb-2 shrink-0 text-sm font-semibold text-zinc-100">
                  3. Packaging &amp; Marking
                </h3>
                <div className="min-h-0 flex-1 overflow-auto">
                  <PackagingMarkingForm
                    className="min-h-full"
                    rows={resolveSelfEvaluationPackagingMarking(document, markingClause)}
                    onChange={handlePackagingMarkingChange}
                  />
                </div>
              </section>
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
                Form Preview — Self Evaluation cum Verification Form ({previewPageCount} pages)
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <iframe
                ref={iframeRef}
                title="Self Evaluation Form preview"
                className="mx-auto max-w-full border-0 bg-white shadow-2xl"
                style={{
                  width: `min(100%, ${iframeSize.widthMm}mm)`,
                  minHeight: `${iframeSize.heightMm * previewPageCount}mm`,
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
          subtitle="Self Evaluation cum Verification Form · BIS Application"
          systemPrompt={SEF_QE_PROMPT}
          starterQuestions={SEF_QE_STARTERS}
          accentColor="amber"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
