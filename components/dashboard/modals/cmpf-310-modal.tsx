"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@/lib/print/manufacturing-scope-declaration";
import {
  buildCmpf310Html,
  defaultCmpf310PrintSettings,
  iframeSizeForCmpf310PrintSettings,
  type Cmpf310LetterData,
} from "@/lib/print/cmpf-310";
import { downloadCmpf310Excel, downloadCmpf310Word } from "@/lib/print/cmpf-310-export";
import type { PrintSettings } from "@/lib/print/types";
import {
  resolveCmpf310Document,
  type Cmpf310Stored,
  type IsCodeMarkingFeeSource,
} from "@/lib/cmpf-310";
import type { TopManagementStored } from "@/lib/top-management";

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
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isFullNumber = letterData.isNumber?.trim() || "—";

  const previewData = useMemo((): Cmpf310LetterData => {
    return {
      ...letterData,
      applicationNumber,
      dateOfApplication,
      dateOfInspection,
      document,
    };
  }, [letterData, applicationNumber, dateOfApplication, dateOfInspection, document]);

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildCmpf310Html(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

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

  function handleDownloadExcel() {
    void downloadCmpf310Excel(previewData).catch(() =>
      window.alert("Unable to download Excel file."),
    );
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
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
  );
}
