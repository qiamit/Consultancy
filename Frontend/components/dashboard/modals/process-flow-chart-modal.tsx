"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";

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
  type ProcessFlowChartPrintAssets,
} from "@backend/modules/print/process-flow-chart";
import { downloadProcessFlowChartWord } from "@backend/modules/print/process-flow-chart-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  type ProcessFlowChartStored,
  defaultProcessFlowChartDocument,
  documentHasContent,
} from "@backend/modules/bis/process-flow-chart";
import {
  parseProcessFlowChartSettings,
  type ProcessFlowChartSettings,
} from "@backend/modules/bis/process-flow-chart-settings";
import {
  resolvePrimaryTopManagementPerson,
  type TopManagementStored,
  withDocumentSignatureImage,
} from "@backend/modules/bis/top-management";
import type { ProcessFlowImportExclude } from "@backend/actions/process-flow-chart-import";
import { ModalToolbarActions } from "@/components/dashboard/modals/modal-toolbar-actions";
import { DocumentModalSubtitle } from "@/components/dashboard/modals/document-modal-subtitle";
import { ProcessFlowChartImportDialog } from "@/components/dashboard/modals/process-flow-chart-import-dialog";

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
  dateOfInspection,
  topManagement,
  storedDocument,
  clientId = null,
  excludeImportSource = null,
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
  storedDocument: ProcessFlowChartStored;
  /** Current party — pre-selected in Import Chart dialog. */
  clientId?: string | null;
  /** Skip the open application/license in the import list. */
  excludeImportSource?: ProcessFlowImportExclude | null;
  onSave: (document: ProcessFlowChartStored) => void;
  onClose: () => void;
}) {
  const [document, setDocument] = useState<ProcessFlowChartStored>(() => ({
    ...storedDocument,
    chart_settings: parseProcessFlowChartSettings({
      ...(storedDocument.chart_settings ?? defaultProcessFlowChartDocument().chart_settings),
      // Keep print preview on a single A4 page by default.
      print_chart_size: "fit_page",
    }),
  }));
  const chartSettings = useMemo(
    () => parseProcessFlowChartSettings(document.chart_settings),
    [document.chart_settings],
  );
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultProcessFlowChartPrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<ProcessFlowChartPrintAssets>({});
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | "chart" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [saving, startSave] = useTransition();
  const [editorRevision, setEditorRevision] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasEditorRef = useRef<ProcessFlowChartEditorHandle>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);

  // If parent loads a filled chart while this modal still shows blank (race on open), restore it.
  // Do NOT restore whenever local has fewer rows — that undoes Delete / edits until Save.
  useEffect(() => {
    const storedFilled = (storedDocument.outline_items ?? []).filter((i) => i.text.trim()).length;
    const localFilled = (document.outline_items ?? []).filter((i) => i.text.trim()).length;
    if (localFilled > 0) return;
    if (storedFilled <= 0) return;
    setDocument({
      ...storedDocument,
      chart_settings: parseProcessFlowChartSettings({
        ...(storedDocument.chart_settings ?? defaultProcessFlowChartDocument().chart_settings),
        print_chart_size:
          storedDocument.chart_settings?.print_chart_size ??
          document.chart_settings?.print_chart_size ??
          "fit_page",
      }),
    });
    setEditorRevision((n) => n + 1);
  }, [storedDocument, document]);

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
      const defaults = defaultProcessFlowChartPrintSettings();
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

  // Keep Process Flow Chart margin defaults in sync (matches Top Management).
  useEffect(() => {
    const defaults = defaultProcessFlowChartPrintSettings();
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

  const previewData = useMemo((): ProcessFlowChartLetterData  => {
    return withDocumentSignatureImage({
      ...letterData,
      applicationNumber,
      dateOfApplication,
      dateOfInspection,
      document,
      firmRepName,
      firmRepDesignation,
    }, topManagement);
  }, [letterData, applicationNumber, dateOfApplication, dateOfInspection, document, firmRepName, firmRepDesignation, topManagement]);

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildProcessFlowChartHtml(previewData, printSettings, printAssets);
    doc.open();
    doc.write(html);
    doc.close();
    const fitOnePage = previewData.document.chart_settings?.print_chart_size !== "full";
    requestAnimationFrame(() => {
      if (fitOnePage) {
        // Keep a locked A4 sheet; outer pane scrolls if viewport is shorter.
        iframe.style.height = `${iframeSizeForProcessFlowChartPrintSettings(printSettings).heightMm}mm`;
        iframe.style.minHeight = iframe.style.height;
        iframe.style.overflow = "hidden";
        iframe.setAttribute("scrolling", "no");
        if (doc.documentElement) doc.documentElement.style.overflow = "hidden";
        if (doc.body) doc.body.style.overflow = "hidden";
        return;
      }
      syncPrintPreviewIframe(iframe);
    });
  }, [previewData, printSettings, printAssets]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const fitOnePagePreview = chartSettings.print_chart_size !== "full";
  const iframeSize = iframeSizeForProcessFlowChartPrintSettings(printSettings);
  const isFullNumber = letterData.isNumber?.trim() || "—";

  function patchDocument(patch: Partial<ProcessFlowChartStored>) {
    setDocument((prev) => {
      // Never let an empty editor snapshot wipe a filled chart (HMR / race).
      if (patch.outline_items) {
        const prevFilled = (prev.outline_items ?? []).filter((i) => i.text.trim()).length;
        const nextFilled = patch.outline_items.filter((i) => i.text.trim()).length;
        if (prevFilled > 0 && nextFilled === 0) {
          return prev;
        }
      }
      return { ...prev, ...patch };
    });
  }

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({
      ...prev,
      ...patch,
      // Keep letterhead logo-free even if Print Settings changes layout.
      letterhead_layout: "logo-na",
    }));
  }

  function patchChartSettings(patch: Partial<ProcessFlowChartSettings>) {
    // Chart settings change the drawn image — leave Print Preview so the editor
    // remounts and regenerates drawing_data_url before the next Save.
    if (showPrintPreview) {
      setShowPrintPreview(false);
    }
    setDocument((prev) => ({
      ...prev,
      chart_settings: parseProcessFlowChartSettings({
        ...prev.chart_settings,
        ...patch,
      }),
    }));
  }

  async function handleSave() {
    // Await snapshot before closing — Close runs Save then unmounts.
    // Persist synchronously (not inside startTransition) so Close cannot unmount
    // before parent state / DB flush receives the updated chart.
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

    const toSave: ProcessFlowChartStored = {
      ...nextDocument,
      chart_settings:
        nextDocument.chart_settings ?? defaultProcessFlowChartDocument().chart_settings,
    };
    onSave(toSave);
    startSave(() => {
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
    printWindow.document.write(buildProcessFlowChartHtml(previewData, printSettings, printAssets));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handleDownloadWord() {
    void downloadProcessFlowChartWord(previewData, printSettings, printAssets).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildProcessFlowChartHtml(previewData, printSettings, printAssets);
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Process_Flow_Chart_${safePdfFilenamePart(letterData.companyName)}.pdf`,
        settings: printSettings,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to download PDF.");
    } finally {
      setPdfDownloading(false);
    }
  }

  function handleUploadImageClick() {
    imageUploadInputRef.current?.click();
  }

  function handleOpenImportDialog() {
    setShowImportDialog(true);
  }

  function handleImportChart(nextDocument: ProcessFlowChartStored): boolean {
    if (documentHasContent(document)) {
      const ok = window.confirm(
        "Replace the current Process Flow Chart with the imported chart?",
      );
      if (!ok) return false;
    }
    setDocument({
      ...nextDocument,
      chart_settings: parseProcessFlowChartSettings({
        ...(nextDocument.chart_settings ?? defaultProcessFlowChartDocument().chart_settings),
        print_chart_size:
          nextDocument.chart_settings?.print_chart_size ??
          document.chart_settings?.print_chart_size ??
          "fit_page",
      }),
    });
    setEditorRevision((n) => n + 1);
    setShowPrintPreview(false);
    return true;
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

  async function togglePrintPreview() {
    if (showPrintPreview) {
      setShowPrintPreview(false);
      return;
    }
    // Capture clean chart (no selection outline) while editor is still mounted.
    const snapshot = await canvasEditorRef.current?.captureSnapshot();
    if (snapshot) {
      setDocument((prev) => ({
        ...prev,
        drawing_data_url: snapshot.drawing_data_url,
        shapes: snapshot.shapes,
        outline_items: snapshot.outline_items,
      }));
    }
    setShowPrintPreview(true);
  }

  return (
    <>
      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 overflow-hidden border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">
              Process Flow Chart
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
              onClick={() => void togglePrintPreview()}
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
              onClick={handleOpenImportDialog}
              title="Import Chart from Another Application or License"
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Import Chart
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
          </ModalToolbarActions>
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
                  key={`${applicationNumber}-${editorRevision}`}
                  ref={canvasEditorRef}
                  storeKey={`${applicationNumber}-${editorRevision}`}
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
              className={`flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-600 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
              }`}
            >
              <div className="border-b border-zinc-700/80 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  Form Preview — Process Flow Chart
                </p>
              </div>
              <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Process flow chart print preview"
                  className="max-w-full border-0 bg-white shadow-2xl"
                  scrolling={fitOnePagePreview ? "no" : "yes"}
                  style={printPreviewIframeStyle(iframeSize.widthMm, iframeSize.heightMm)}
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
                  hideLetterheadLogo
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

      {showImportDialog && (
        <ProcessFlowChartImportDialog
          defaultClientId={clientId}
          exclude={excludeImportSource}
          onImport={(nextDocument) => handleImportChart(nextDocument)}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </>
  );
}
