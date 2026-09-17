"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { UpdatedSitTableEditor } from "@/components/dashboard/updated-sit-table-editor";
import { UpdatedSitAnnexTableEditor } from "@/components/dashboard/updated-sit-annex-table-editor";
import { UpdatedSitNotesTableEditor } from "@/components/dashboard/updated-sit-notes-table-editor";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";

import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildUpdatedSchemeOfInspectionHtml,
  defaultUpdatedSchemeOfInspectionPrintSettings,
  iframeSizeForUpdatedSchemeOfInspectionPrintSettings,
  usitPrintPageCount,
  type UpdatedSchemeOfInspectionLetterData,
  type UpdatedSchemeOfInspectionPrintAssets,
} from "@backend/modules/print/updated-scheme-of-inspection";
import {
  downloadUpdatedSchemeOfInspectionWord,
} from "@backend/modules/print/updated-scheme-of-inspection-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  documentHasContent as updatedSchemeOfInspectionHasContent,
  mergeUpdatedSchemeOfInspectionWithDefaults,
  resolveUpdatedSchemeOfInspectionDocument,
  type UpdatedSchemeOfInspectionStored,
} from "@backend/modules/bis/updated-scheme-of-inspection";
import {
  extractUpdatedSitFromIsCodeFile,
  listIsCodeFilesForUsitImport,
  type UsitImportFileOption,
} from "@backend/actions/updated-sit-import-from-is";
import {
  resolvePrimaryTopManagementPerson,
  withDocumentSignatureImage,
  type TopManagementStored,
} from "@backend/modules/bis/top-management";
import { ModalToolbarActions } from "@/components/dashboard/modals/modal-toolbar-actions";
import { DocumentModalSubtitle } from "@/components/dashboard/modals/document-modal-subtitle";
import { preferLocalDocumentIfStoredEmpty } from "@/components/dashboard/modals/prefer-stored-document-sync";

const labelClass =
  "block text-[10px] font-semibold uppercase tracking-wide text-zinc-400";
const textareaClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";

function sitRowsHaveContent(rows: UpdatedSchemeOfInspectionStored["test_rows"]): boolean {
  return rows.some(
    (r) =>
      r.clause_no.trim() ||
      r.requirement.trim() ||
      r.test_methods_ref.trim() ||
      r.equipment_req.trim() ||
      r.sample_count.trim() ||
      r.frequency.trim() ||
      r.remarks.trim() ||
      r.row_kind === "section" ||
      r.row_kind === "group",
  );
}

export function UpdatedSchemeOfInspectionModal({
  letterData,
  revisionYear,
  isCodeId = null,
  applicationNumber = "",
  dateOfApplication = "",
  topManagement = [],
  storedDocument,
  onSave,
  onClose,
}: {
  letterData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >;
  revisionYear: number | null;
  isCodeId?: string | null;
  applicationNumber?: string;
  dateOfApplication?: string;
  topManagement?: TopManagementStored[];
  storedDocument: UpdatedSchemeOfInspectionStored;
  onSave: (document: UpdatedSchemeOfInspectionStored) => void;
  onClose: () => void;
}) {
  const resolvedDefaults = useMemo(
    () =>
      resolveUpdatedSchemeOfInspectionDocument({
        isNumber: letterData.isNumber,
        isTitle: letterData.isTitle ?? null,
        revisionYear: revisionYear != null ? String(revisionYear) : null,
      }),
    [letterData.isNumber, letterData.isTitle, revisionYear],
  );

  const [document, setDocument] = useState<UpdatedSchemeOfInspectionStored>(() =>
    mergeUpdatedSchemeOfInspectionWithDefaults(storedDocument, resolvedDefaults),
  );
  const [activePanel, setActivePanel] = useState<"annex" | "table" | "notes" | "ai" | null>(
    "table",
  );
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultUpdatedSchemeOfInspectionPrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<UpdatedSchemeOfInspectionPrintAssets>({});
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [saving, startSave] = useTransition();
  const [aiFiles, setAiFiles] = useState<UsitImportFileOption[]>([]);
  const [aiSelectedFileId, setAiSelectedFileId] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiFilesLoading, setAiFilesLoading] = useState(false);
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setDocument((prev) =>
      preferLocalDocumentIfStoredEmpty(
        storedDocument,
        prev,
        updatedSchemeOfInspectionHasContent,
        (stored) => mergeUpdatedSchemeOfInspectionWithDefaults(stored, resolvedDefaults),
      ),
    );
  }, [storedDocument, resolvedDefaults]);

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
        orientation: _orientation,
        ...companySettings
      } = fromDb;
      const defaults = defaultUpdatedSchemeOfInspectionPrintSettings();
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
        letterhead_show_gst: companySettings.letterhead_show_gst ?? prev.letterhead_show_gst,
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

  // Keep Updated SIT margin defaults in sync (matches Top Management / Plant & Machinery).
  useEffect(() => {
    const defaults = defaultUpdatedSchemeOfInspectionPrintSettings();
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

  const previewData = useMemo((): UpdatedSchemeOfInspectionLetterData => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return withDocumentSignatureImage(
      {
        ...letterData,
        applicationNumber:
          applicationNumber.trim() || letterData.applicationNumber || "",
        dateOfApplication,
        signatoryName:
          primary.person_name || letterData.signatoryName || letterData.contactPerson,
        signatoryDesignation:
          primary.designation || letterData.signatoryDesignation || "",
        document,
      },
      topManagement,
    );
  }, [
    letterData,
    document,
    applicationNumber,
    dateOfApplication,
    topManagement,
  ]);

  const iframeSize = iframeSizeForUpdatedSchemeOfInspectionPrintSettings(printSettings);
  const previewPageCount = usitPrintPageCount();

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildUpdatedSchemeOfInspectionHtml(previewData, printSettings, printAssets);
    doc.open();
    doc.write(html);
    doc.close();
    requestAnimationFrame(() =>
      syncPrintPreviewIframe(iframe, { minHeightMm: iframeSize.heightMm }),
    );
  }, [previewData, printSettings, printAssets, iframeSize.heightMm]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  function patchDocument(patch: Partial<UpdatedSchemeOfInspectionStored>) {
    setDocument((prev) => ({ ...prev, ...patch }));
  }

  async function openAiPanel() {
    if (!isCodeId?.trim()) {
      window.alert(
        "No IS Code linked to this application. Link an IS Code first, then upload the Product Manual PDF in IS Code Master.",
      );
      return;
    }
    setActivePanel("ai");
    setAiStatus(null);
    setAiFilesLoading(true);
    try {
      const res = await listIsCodeFilesForUsitImport(isCodeId);
      if (!res.ok) {
        setActivePanel(null);
        window.alert(res.error);
        return;
      }
      setAiFiles(res.files);
      setAiSelectedFileId((prev) => {
        if (prev && res.files.some((f) => f.id === prev)) return prev;
        return res.files[0]?.id ?? "";
      });
      if (res.productManualNumber && !document.pm_reference.trim()) {
        patchDocument({ pm_reference: res.productManualNumber });
      }
    } catch {
      setActivePanel(null);
      window.alert("Could not load IS Code files.");
    } finally {
      setAiFilesLoading(false);
    }
  }

  function togglePanel(panel: "annex" | "table" | "notes" | "ai") {
    if (panel === "ai") {
      if (activePanel === "ai") {
        setActivePanel(null);
        return;
      }
      void openAiPanel();
      return;
    }
    setActivePanel((prev) => (prev === panel ? null : panel));
  }

  async function runAiExtract() {
    if (aiExtracting) return;
    if (!aiSelectedFileId.trim()) {
      window.alert("Select an IS Code / Product Manual file from the dropdown.");
      return;
    }
    setAiExtracting(true);
    setAiStatus("Extracting Annexure + Table + Notes from Product Manual…");
    try {
      const res = await extractUpdatedSitFromIsCodeFile({
        isCodeId,
        fileId: aiSelectedFileId,
        instruction: aiInstruction,
      });
      if (!res.ok) {
        window.alert(res.error);
        setAiStatus(null);
        return;
      }

      if (sitRowsHaveContent(document.test_rows) && res.filled.table) {
        const ok = window.confirm(
          "Replace existing Table 1 rows with extracted data from the Product Manual?",
        );
        if (!ok) {
          setAiStatus(null);
          return;
        }
      }

      patchDocument({
        ...res.annexPatch,
        ...(res.filled.table ? { test_rows: res.testRows } : {}),
        ...(res.pm_reference.trim()
          ? { pm_reference: res.pm_reference.trim() }
          : {}),
      });

      const parts = [
        res.filled.annex ? "Annexure" : null,
        res.filled.table ? "Table" : null,
        res.filled.notes ? "Notes" : null,
      ].filter(Boolean);
      const missing = [
        !res.filled.annex ? "Annexure" : null,
        !res.filled.table ? "Table" : null,
        !res.filled.notes ? "Notes" : null,
      ].filter(Boolean);

      if (missing.length > 0) {
        window.alert(
          `Filled: ${parts.join(", ") || "none"}.\nStill missing: ${missing.join(", ")}.\nClick Extract & Fill again, or check the Product Manual PDF / instruction.`,
        );
        setAiStatus(`Partial fill from ${res.fileName}`);
      } else {
        setAiStatus(`Annexure, Table & Notes filled from ${res.fileName}`);
      }

      // Prefer Annexure view so user can verify all three tabs quickly
      setActivePanel(res.filled.annex ? "annex" : res.filled.table ? "table" : "notes");
      window.setTimeout(() => setAiStatus(null), 5000);
    } catch {
      window.alert("AI extraction failed. Try again or fill manually.");
      setAiStatus(null);
    } finally {
      setAiExtracting(false);
    }
  }

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
    const exportSettings = {
      ...printSettings,
      orientation: "portrait" as const,
    };
    void downloadUpdatedSchemeOfInspectionWord(
      previewData,
      exportSettings,
      printAssets,
    ).catch(() => window.alert("Unable to download Word file."));
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      // Same HTML + print settings as Print Preview (always portrait for USIT).
      const exportSettings = {
        ...printSettings,
        orientation: "portrait" as const,
      };
      const html = buildUpdatedSchemeOfInspectionHtml(
        previewData,
        exportSettings,
        printAssets,
      );
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Updated_Scheme_Of_Inspection_${safePdfFilenamePart(letterData.companyName)}.pdf`,
        settings: exportSettings,
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
    <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
      <div className="flex shrink-0 items-center gap-2 overflow-hidden border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">
            Updated Scheme of Inspection &amp; Testing
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
          </ModalToolbarActions>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-x-auto">
        {!showPrintPreview && (
          <div
            className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-zinc-900 ${
              settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
            }`}
          >
            <div className="border-b border-zinc-800 px-4 py-3">
              <div className="mb-3 grid w-full grid-cols-5 items-end gap-1.5 sm:gap-2">
                <label className="min-w-0">
                  <span className={`${labelClass} truncate`}>PM Number</span>
                  <input
                    value={document.pm_reference}
                    onChange={(e) => patchDocument({ pm_reference: e.target.value })}
                    className="mt-1 w-full min-w-0 rounded-lg border border-zinc-700 bg-zinc-950 px-1.5 py-2 text-[10px] text-zinc-100 outline-none focus:border-sky-500 sm:px-2.5 sm:text-xs"
                  />
                </label>
                {(
                  [
                    ["ai", "AI"],
                    ["annex", "Annexure"],
                    ["table", "Table"],
                    ["notes", "Notes"],
                  ] as const
                ).map(([panel, label]) => {
                  const active = activePanel === panel;
                  const isAi = panel === "ai";
                  return (
                    <button
                      key={panel}
                      type="button"
                      disabled={isAi && (aiExtracting || aiFilesLoading)}
                      onClick={() => togglePanel(panel)}
                      className={`min-w-0 w-full truncate rounded-lg border px-1 py-2 text-[10px] font-semibold sm:px-2 sm:text-xs disabled:opacity-50 ${
                        active
                          ? isAi
                            ? "border-sky-500 bg-sky-600 text-white"
                            : "border-teal-500 bg-teal-600 text-white"
                          : isAi
                            ? "border-sky-700/70 bg-sky-950/40 text-sky-200 hover:bg-sky-900/50"
                            : "border-zinc-600 text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {isAi && aiFilesLoading
                        ? "…"
                        : isAi && aiExtracting
                          ? "…"
                          : label}
                    </button>
                  );
                })}
              </div>

              {aiStatus && (
                <p className="mb-3 text-[11px] text-sky-300/90">{aiStatus}</p>
              )}

              {activePanel === "ai" && (
                <div className="mb-3 space-y-3 rounded-lg border border-sky-800/50 bg-zinc-950/80 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-300/90">
                    AI Extract from Product Manual
                  </p>
                  <label className="block">
                    <span className={labelClass}>IS Code File</span>
                    <select
                      value={aiSelectedFileId}
                      onChange={(e) => setAiSelectedFileId(e.target.value)}
                      disabled={aiFilesLoading || aiExtracting || aiFiles.length === 0}
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-100 outline-none focus:border-sky-500 disabled:opacity-50"
                    >
                      {aiFiles.length === 0 ? (
                        <option value="">No files uploaded</option>
                      ) : (
                        aiFiles.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.file_name}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelClass}>Instruction (optional)</span>
                    <textarea
                      value={aiInstruction}
                      onChange={(e) => setAiInstruction(e.target.value)}
                      disabled={aiExtracting}
                      placeholder="e.g. Focus on Annex C Levels of Control and Table 1 only; keep clause numbers exact…"
                      className={textareaClass}
                      rows={3}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={aiExtracting || aiFilesLoading || !aiSelectedFileId}
                      onClick={() => void runAiExtract()}
                      className="rounded-lg border border-sky-600 bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                    >
                      {aiExtracting ? "Extracting…" : "Extract & Fill"}
                    </button>
                    <button
                      type="button"
                      disabled={aiExtracting}
                      onClick={() => setActivePanel(null)}
                      className="rounded-lg border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {activePanel === "annex" && (
                <UpdatedSitAnnexTableEditor
                  document={document}
                  onChange={patchDocument}
                />
              )}

              {activePanel === "notes" && (
                <UpdatedSitNotesTableEditor
                  document={document}
                  onChange={patchDocument}
                />
              )}

              {activePanel === "table" && (
                <>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Table 1 — Test Details
                  </p>
                  <UpdatedSitTableEditor
                    rows={document.test_rows}
                    onChange={(test_rows) => patchDocument({ test_rows })}
                  />
                </>
              )}
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
                Form Preview — Updated Scheme of Inspection &amp; Testing ({previewPageCount} pages)
                <span className="ml-2 font-normal normal-case text-zinc-400">
                  Page 1 &amp; Page 2 portrait (Annex C · Table 1 + Notes)
                </span>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <iframe
                ref={iframeRef}
                title="Updated Scheme of Inspection and Testing preview"
                className="mx-auto max-w-full border-0 bg-zinc-600 shadow-none"
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
  );
}
