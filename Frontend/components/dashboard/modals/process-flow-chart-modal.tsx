"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import {
  ProcessFlowChartEditor,
  type ProcessFlowChartEditorHandle,
} from "@/components/dashboard/process-flow-chart-editor";
import { ProcessFlowChartSettingsPanel } from "@/components/dashboard/process-flow-chart-settings-panel";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildProcessFlowChartHtml,
  defaultProcessFlowChartPrintSettings,
  iframeSizeForProcessFlowChartPrintSettings,
  type ProcessFlowChartLetterData,
} from "@backend/modules/print/process-flow-chart";
import { downloadProcessFlowChartWord } from "@backend/modules/print/process-flow-chart-export";
import type { PrintSettings } from "@backend/modules/print/types";
import { type ProcessFlowChartStored, defaultProcessFlowChartDocument } from "@backend/modules/bis/process-flow-chart";
import type { ProcessFlowChartSettings } from "@backend/modules/bis/process-flow-chart-settings";
import {resolvePrimaryTopManagementPerson,
  type TopManagementStored,
  withDocumentSignatureImage,
} from "@backend/modules/bis/top-management";

const PROCESS_FLOW_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with Process Flow Chart documents submitted with BIS licence applications:
- Manufacturing process steps from raw material to finished goods
- Hierarchy of main process, sub-process, operations, and QC points
- BIS requirements for process flow documentation in certification applications
- Clear labeling of inputs, outputs, and inspection stages

Be concise, practical, and use Indian BIS/ISI certification context.`;

const PROCESS_FLOW_QE_STARTERS = [
  "What should a BIS process flow chart include?",
  "How do I structure process hierarchy levels?",
  "Review our process flow chart for BIS submission",
];

export function ProcessFlowChartModal({
  letterData,
  applicationNumber,
  dateOfApplication,
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
  topManagement: TopManagementStored[];
  storedDocument: ProcessFlowChartStored;
  onSave: (document: ProcessFlowChartStored) => void;
  onClose: () => void;
}) {
  const [document, setDocument] = useState<ProcessFlowChartStored>(() => ({
    ...storedDocument,
    chart_settings:
      storedDocument.chart_settings ?? defaultProcessFlowChartDocument().chart_settings,
  }));
  const chartSettings = useMemo(
    () => document.chart_settings ?? defaultProcessFlowChartDocument().chart_settings,
    [document.chart_settings],
  );
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultProcessFlowChartPrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | "chart" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasEditorRef = useRef<ProcessFlowChartEditorHandle>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);

  const { firmRepName, firmRepDesignation } = useMemo(() => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return {
      firmRepName: primary.person_name || letterData.contactPerson?.trim() || "",
      firmRepDesignation: primary.designation,
    };
  }, [topManagement, letterData.contactPerson]);

  const previewData = useMemo((): ProcessFlowChartLetterData  => {
    return withDocumentSignatureImage({
      ...letterData,
      applicationNumber,
      dateOfApplication,
      document,
      firmRepName,
      firmRepDesignation,
    }, topManagement);
  }, [letterData, applicationNumber, dateOfApplication, document, firmRepName, firmRepDesignation, topManagement]);

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildProcessFlowChartHtml(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForProcessFlowChartPrintSettings(printSettings);
  const isFullNumber = letterData.isNumber?.trim() || "—";

  function patchDocument(patch: Partial<ProcessFlowChartStored>) {
    setDocument((prev) => ({ ...prev, ...patch }));
  }

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function patchChartSettings(patch: Partial<ProcessFlowChartSettings>) {
    setDocument((prev) => ({
      ...prev,
      chart_settings: { ...prev.chart_settings, ...patch },
    }));
  }

  function handleSave() {
    startSave(async () => {
      const snapshot = await canvasEditorRef.current?.captureSnapshot();
      const nextDocument: ProcessFlowChartStored = snapshot
        ? {
            ...document,
            drawing_data_url: snapshot.drawing_data_url,
            shapes: snapshot.shapes,
            outline_items: snapshot.outline_items,
          }
        : document;

      if (snapshot) {
        setDocument(nextDocument);
      }

      onSave({
        ...nextDocument,
        chart_settings:
          nextDocument.chart_settings ?? defaultProcessFlowChartDocument().chart_settings,
      });
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handlePrint() {
    if (showPrintPreview) {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(buildProcessFlowChartHtml(previewData, printSettings));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handleDownloadWord() {
    void downloadProcessFlowChartWord(previewData, printSettings).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  function handleDownloadPng() {
    if (!document.drawing_data_url) {
      window.alert("Draw the process flow chart before downloading.");
      return;
    }

    const link = window.document.createElement("a");
    link.href = document.drawing_data_url;
    link.download = `Process_Flow_Chart_${letterData.companyName.replace(/[^\w\-]+/g, "_").slice(0, 40) || "flow"}.png`;
    link.click();
  }

  function handleUploadImageClick() {
    imageUploadInputRef.current?.click();
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file (PNG, JPG, etc.).");
      return;
    }

    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      window.alert("Image must be 8 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "").trim();
      if (!dataUrl) {
        window.alert("Unable to read the image file.");
        return;
      }
      canvasEditorRef.current?.setBackgroundImage(dataUrl);
    };
    reader.onerror = () => window.alert("Unable to read the image file.");
    reader.readAsDataURL(file);
  }

  function toggleSettingsPanel(panel: "page" | "print" | "chart") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <>
      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 shrink-0 flex-1 basis-48">
            <h2 className="truncate text-sm font-semibold text-white">
              Process Flow Chart
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
              onClick={handleUploadImageClick}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Upload Image
            </button>
            <input
              ref={imageUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFileChange}
            />
            <button
              type="button"
              onClick={handleDownloadPng}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={() => toggleSettingsPanel("chart")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                settingsPanel === "chart"
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              }`}
            >
              Chart Settings
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
              <div className="min-h-0 flex-1 flex-col p-4 sm:p-6 flex">
                <ProcessFlowChartEditor
                  ref={canvasEditorRef}
                  storeKey={applicationNumber}
                  initialOutlineItems={
                    document.outline_items ?? defaultProcessFlowChartDocument().outline_items
                  }
                  initialShapes={document.shapes ?? []}
                  chartSettings={chartSettings}
                  onChange={({ drawing_data_url, shapes, outline_items }) =>
                    patchDocument({ drawing_data_url, shapes, outline_items })
                  }
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
              <div className="border-b border-zinc-700/80 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  Form Preview — Process Flow Chart
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Process flow chart print preview"
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
              {settingsPanel === "chart" ? (
                <ProcessFlowChartSettingsPanel
                  settings={chartSettings}
                  onChange={patchChartSettings}
                />
              ) : (
                <DocumentPrintSettingsPanel
                  mode={settingsPanel}
                  settings={printSettings}
                  onChange={patchPrintSettings}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {showQeAssistant && (
        <AiChatModal
          title="QE Assistant"
          subtitle="Process Flow Chart · BIS Application"
          systemPrompt={PROCESS_FLOW_QE_PROMPT}
          starterQuestions={PROCESS_FLOW_QE_STARTERS}
          accentColor="amber"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
