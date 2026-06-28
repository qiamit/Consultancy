"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Cmpf306AddEquipmentForm } from "@/components/dashboard/cmpf-306-add-equipment-form";
import { Cmpf306QeAssistantModal } from "@/components/dashboard/modals/cmpf-306-qe-assistant-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@/lib/print/manufacturing-scope-declaration";
import {
  buildCmpf306Html,
  defaultCmpf306PrintSettings,
  iframeSizeForCmpf306PrintSettings,
  type Cmpf306LetterData,
} from "@/lib/print/cmpf-306";
import {
  downloadCmpf306Excel,
  downloadCmpf306ImportTemplate,
  downloadCmpf306Word,
} from "@/lib/print/cmpf-306-export";
import type { PrintSettings } from "@/lib/print/types";
import {
  editorRowsFromStored,
  storedFromEditor,
  type Cmpf306EquipmentRow,
  type Cmpf306Stored,
} from "@/lib/cmpf-306";
import { editorRowsFromImported, importCmpf306EquipmentFromXlsx } from "@/lib/cmpf-306-import";
import {
  resolvePrimaryTopManagementPerson,
  type TopManagementStored,
} from "@/lib/top-management";
import type { LicenseScopeFormat } from "@/lib/license-scope-format";
import type { StoredLicenseScopeRow } from "@/lib/license-scope-format";

export function Cmpf306Modal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  inspectionOfficerName,
  inspectionOfficerDesignation,
  topManagement,
  isCodeId,
  isNumber,
  revisionYear,
  licenseScope,
  licenseScopeFormat,
  licenseScopeRows,
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
  inspectionOfficerName: string;
  inspectionOfficerDesignation: string;
  topManagement: TopManagementStored[];
  isCodeId: string | null;
  isNumber: string | null;
  revisionYear: number | null;
  licenseScope: string;
  licenseScopeFormat: LicenseScopeFormat;
  licenseScopeRows: StoredLicenseScopeRow[];
  document: Cmpf306Stored;
  onSave: (document: Cmpf306Stored) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState(() => editorRowsFromStored(initialDocument));
  const [equipmentFormKey, setEquipmentFormKey] = useState(0);
  const separateSheetEnclosed = initialDocument.separate_sheet_enclosed;
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultCmpf306PrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const isFullNumber =
    isNumber && revisionYear != null
      ? `${isNumber}: ${revisionYear}`
      : letterData.isNumber?.trim() || isNumber || "—";

  const isReference = letterData.isNumber?.trim() || "—";

  const { firmRepName, firmRepDesignation } = useMemo(() => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return {
      firmRepName: primary.person_name || letterData.contactPerson?.trim() || "",
      firmRepDesignation: primary.designation,
    };
  }, [topManagement, letterData.contactPerson]);

  const previewDocument = useMemo(
    (): Cmpf306Stored => storedFromEditor(rows, separateSheetEnclosed),
    [rows, separateSheetEnclosed],
  );

  const previewData = useMemo((): Cmpf306LetterData => {
    return {
      ...letterData,
      applicationNumber,
      dateOfApplication,
      dateOfInspection,
      inspectionOfficerName,
      inspectionOfficerDesignation,
      firmRepName,
      firmRepDesignation,
      document: previewDocument,
    };
  }, [
    letterData,
    applicationNumber,
    dateOfApplication,
    dateOfInspection,
    inspectionOfficerName,
    inspectionOfficerDesignation,
    firmRepName,
    firmRepDesignation,
    previewDocument,
  ]);

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildCmpf306Html(previewData, printSettings);
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

  const iframeSize = iframeSizeForCmpf306PrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    startSave(() => {
      onSave(storedFromEditor(rows, separateSheetEnclosed));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  }

  function handleDownloadWord() {
    void downloadCmpf306Word(previewData, printSettings).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  function handleDownloadExcel() {
    void downloadCmpf306Excel(previewData).catch(() =>
      window.alert("Unable to download Excel file."),
    );
  }

  function handleDownloadImportTemplate() {
    void downloadCmpf306ImportTemplate().catch(() =>
      window.alert("Unable to download import template."),
    );
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const result = await importCmpf306EquipmentFromXlsx(file);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    setRows(editorRowsFromImported(result.rows));
    setEquipmentFormKey((key) => key + 1);
    window.alert(`Imported ${result.importedCount} test equipment row(s).`);
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <>
      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 shrink-0 flex-1 basis-48">
            <h2 className="truncate text-sm font-semibold text-white">
              CMPF 306 — Testing Equipments
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
              onClick={() => importFileRef.current?.click()}
              className="shrink-0 whitespace-nowrap rounded-lg border border-teal-700/50 bg-teal-950/40 px-3 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-950/70"
            >
              Upload Excel File
            </button>
            <button
              type="button"
              onClick={handleDownloadImportTemplate}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Download Import Template
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => void handleImportFile(event)}
            />
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
              onClick={handleDownloadExcel}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Download Excel File
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
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
                <Cmpf306AddEquipmentForm
                  key={equipmentFormKey}
                  isCodeId={isCodeId}
                  isReference={isReference}
                  isNumber={isNumber}
                  revisionYear={revisionYear}
                  isTitle={letterData.isTitle ?? ""}
                  licenseScope={licenseScope}
                  licenseScopeFormat={licenseScopeFormat}
                  licenseScopeRows={licenseScopeRows}
                  initialRows={rows}
                  onRowsChange={setRows}
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
                  Form Preview (CMPF 306)
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="CMPF 306 form preview"
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
        <Cmpf306QeAssistantModal
          isCodeId={isCodeId}
          isReference={isReference}
          isTitle={letterData.isTitle ?? ""}
          companyName={letterData.companyName}
          applicationNumber={applicationNumber}
          firmRepName={firmRepName}
          firmRepDesignation={firmRepDesignation}
          equipment={previewDocument.equipment}
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
