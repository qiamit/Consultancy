"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useEditorRowsFromStored } from "@/components/modules/finance/use-finance-master-state";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";
import { TopManagementPersonFormModal } from "@/components/dashboard/modals/top-management-person-form-modal";
import {
  TopManagementAddPersonButton,
  TopManagementTableEditor,
} from "@/components/dashboard/top-management-table-editor";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";

import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import {
  buildTopManagementHtml,
  defaultTopManagementPrintSettings,
  DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS,
  iframeSizeForTopManagementPrintSettings,
  type TopManagementLetterData,
  type TopManagementPrintAssets,
  type TopManagementTableColumnKey,
} from "@backend/modules/print/top-management";
import {
  downloadTopManagementWord,
} from "@backend/modules/print/top-management-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  createTopManagementRow,
  editorRowsFromStored,
  resolvePrimaryTopManagementPerson,
  rowHasContent,
  storedFromEditor,
  type TopManagementRow,
  type TopManagementStored,
} from "@backend/modules/bis/top-management";

const TOP_MGMT_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with Top Management details for BIS licence applications:
- Who should be listed as top management for BIS factory inspection
- Designations (Proprietor, Director, CEO, Plant Head, etc.)
- Format and content for top management declaration letters to BIS
- Contact details required for BIS correspondence

Be concise, practical, and use Indian BIS/ISI certification context.`;

const TOP_MGMT_QE_STARTERS = [
  "Who should be listed in Top Management for BIS application?",
  "What designations are acceptable for BIS top management?",
  "How to draft a top management letter for BIS branch?",
];

export function TopManagementModal({
  letterData,
  isCodeNumber,
  isCodeId,
  revisionYear,
  rows: initialStored,
  onSave,
  onClose,
}: {
  letterData: Omit<
    TopManagementLetterData,
    "rows" | "signatoryName" | "signatoryDesignation"
  >;
  isCodeNumber: string | null;
  isCodeId: string | null;
  revisionYear: number | null;
  rows: TopManagementStored[];
  onSave: (rows: TopManagementStored[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useEditorRowsFromStored(initialStored, editorRowsFromStored);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultTopManagementPrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<TopManagementPrintAssets>({});
  const [tableColumns, setTableColumns] = useState<TopManagementTableColumnKey[]>(
    () => [...DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS],
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [showIsCodeView, setShowIsCodeView] = useState(false);
  const [personFormRow, setPersonFormRow] = useState<
    TopManagementRow | null | undefined
  >(undefined);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isFullNumber = letterData.isNumber?.trim() || "—";

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
      const defaults = defaultTopManagementPrintSettings();
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

  // Keep Top Management margin defaults in sync (overrides company 12mm).
  useEffect(() => {
    const defaults = defaultTopManagementPrintSettings();
    setPrintSettings((prev) => ({
      ...prev,
      font_family: defaults.font_family,
      show_letterhead: true,
      letterhead_layout: "logo-na",
      margin_top: defaults.margin_top,
      margin_bottom: defaults.margin_bottom,
      margin_left: defaults.margin_left,
      margin_right: defaults.margin_right,
      }));
  }, []);

  const previewData = useMemo((): TopManagementLetterData => {
    const stored = storedFromEditor(rows);
    const primary = resolvePrimaryTopManagementPerson(stored);
    return {
      ...letterData,
      signatoryName: primary.person_name || letterData.contactPerson?.trim() || "",
      signatoryDesignation: primary.designation,
      rows: stored,
    };
  }, [letterData, rows]);

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildTopManagementHtml(
      previewData,
      printSettings,
      tableColumns,
      printAssets,
    );
    doc.open();
    doc.write(html);
    doc.close();
    requestAnimationFrame(() => syncPrintPreviewIframe(iframe));
  }, [previewData, printSettings, tableColumns, printAssets]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForTopManagementPrintSettings(printSettings);

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
      const stored = storedFromEditor(rows);
      onSave(stored);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function openAddPersonForm() {
    setPersonFormRow(null);
  }

  function openEditPersonForm(row: TopManagementRow) {
    setPersonFormRow(row);
  }

  function handlePersonFormSave(row: TopManagementRow) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = row;
        return next;
      }
      return [...prev, row];
    });
    setPersonFormRow(undefined);
  }

  function handleRemovePerson(row: TopManagementRow) {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function handleCopyPerson(row: TopManagementRow) {
    const copy: TopManagementRow = {
      ...row,
      id: createTopManagementRow().id,
      signature_image_url: "",
      apply_signature_on_documents: false,
    };
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx < 0) return [...prev, copy];
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }

  const personFormIsPrimary = useMemo(() => {
    if (personFormRow === undefined) return false;
    if (personFormRow === null) {
      return rows.filter(rowHasContent).length === 0;
    }
    const visible = rows.filter(rowHasContent);
    return visible[0]?.id === personFormRow.id;
  }, [personFormRow, rows]);

  function handlePrint() {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  }

  function handleDownloadWord() {
    void downloadTopManagementWord(
      previewData,
      printSettings,
      tableColumns,
      printAssets,
    ).catch(() => window.alert("Unable to download Word file."));
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildTopManagementHtml(
      previewData,
      printSettings,
      tableColumns,
      printAssets,
    );
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Top_Management_${safePdfFilenamePart(letterData.companyName)}.pdf`,
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
      <div className="absolute inset-0 z-[400] flex flex-col bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 shrink-0 flex-1 basis-48">
            <h2 className="truncate text-sm font-semibold text-white">Top Management Details</h2>
            <p className="truncate text-xs text-zinc-400">
              {letterData.companyName}
              {isFullNumber !== "—" ? ` · ${isFullNumber}` : ""}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {savedFlash && (
              <span className="text-xs font-semibold text-emerald-400">Saved ✓</span>
            )}
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
              <div className="space-y-3 border-b border-zinc-800 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium leading-snug text-zinc-200">
                    Top Management persons for{" "}
                    <span className="font-semibold text-teal-300">
                      {letterData.companyName}
                    </span>
                    {isFullNumber !== "—" ? (
                      <>
                        {" "}
                        ·{" "}
                        <span className="text-zinc-300">{isFullNumber}</span>
                      </>
                    ) : null}
                  </p>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <TopManagementAddPersonButton
                      theme="dark"
                      onClick={openAddPersonForm}
                    />
                    {isCodeId ? (
                      <button
                        type="button"
                        onClick={() => setShowIsCodeView(true)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-600/50 bg-indigo-950/40 px-2.5 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-950/70"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View IS Files
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
                <TopManagementTableEditor
                  theme="dark"
                  rows={rows}
                  onEdit={openEditPersonForm}
                  onCopy={handleCopyPerson}
                  onRemove={handleRemovePerson}
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
                  Print Preview
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Top Management print preview"
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
                topMgmtTableColumns={settingsPanel === "print" ? tableColumns : undefined}
                onTopMgmtTableColumnsChange={
                  settingsPanel === "print" ? setTableColumns : undefined
                }
                hideLetterheadLogo
              />
            </div>
          )}
        </div>

        {personFormRow !== undefined ? (
          <TopManagementPersonFormModal
            initial={personFormRow}
            showSignatureFields={personFormIsPrimary}
            onSave={handlePersonFormSave}
            onClose={() => setPersonFormRow(undefined)}
          />
        ) : null}
      </div>

      {showIsCodeView && isCodeId && (
        <IsCodeViewModal
          isCodeId={isCodeId}
          isNumber={isCodeNumber}
          revisionYear={revisionYear}
          overlayZIndexClass="z-[450]"
          onClose={() => setShowIsCodeView(false)}
        />
      )}

      {showQeAssistant && (
        <AiChatModal
          title="QE Assistant"
          subtitle="Top Management · BIS Application"
          systemPrompt={TOP_MGMT_QE_PROMPT}
          starterQuestions={TOP_MGMT_QE_STARTERS}
          accentColor="emerald"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
