"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FtrTestParameterPickerModal } from "@/components/dashboard/modals/ftr-test-parameter-picker-modal";
import { FtrTestRowsTableEditor } from "@/components/dashboard/modals/ftr-test-rows-table-editor";
import { FtrQeAssistantModal } from "@/components/dashboard/modals/ftr-qe-assistant-modal";
import { FtrSampleDetailsModal } from "@/components/dashboard/modals/ftr-sample-details-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@/lib/print/manufacturing-scope-declaration";
import {
  buildFactoryTestReportHtml,
  defaultFactoryTestReportPrintSettings,
  ftrPrintPageCount,
  ftrPrintPaginationOptionsFromSettings,
  iframeSizeForFactoryTestReportPrintSettings,
  type FactoryTestReportLetterData,
  type FactoryTestReportPrintSettings,
} from "@/lib/print/factory-test-report";
import { downloadFactoryTestReportExcel } from "@/lib/print/factory-test-report-export";
import type { OslSampleRequirementStored } from "@/lib/osl-sample-requirements";
import { rowHasContent as oslRowHasContent } from "@/lib/osl-sample-requirements";
import type { TechnicalStaffStored } from "@/lib/technical-staff";
import { resolveQualityControlIncharge } from "@/lib/technical-staff";
import {
  editorReportsFromStored,
  mergeTestParametersIntoRows,
  refreshReportHeadersFromSample,
  sortFtrTestRowsByClause,
  storedReportsFromEditor,
  syncFactoryTestReportsFromSamples,
  ftrTestRowKey,
  type FactoryTestReportRow,
  type FactoryTestReportStored,
  type FtrContext,
  type FtrSampleSource,
  type FtrTestParameterSeed,
} from "@/lib/factory-test-report";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";

const headerInp =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";

function HeaderField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={headerInp} />
    </div>
  );
}

export function FactoryTestReportModal({
  letterData,
  oslSamples,
  piSamples,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
  licenceNumber,
  inspectionOfficerName,
  inspectionOfficerDesignation,
  technicalStaff,
  isCodeId,
  isNumber,
  revisionYear,
  rows: initialStored,
  onSave,
  onClose,
  onEditSample,
}: {
  letterData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >;
  oslSamples: OslSampleRequirementStored[];
  piSamples: OslSampleRequirementStored[];
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  licenceNumber: string;
  inspectionOfficerName: string;
  inspectionOfficerDesignation: string;
  technicalStaff: TechnicalStaffStored[];
  isCodeId: string | null;
  isNumber: string | null;
  revisionYear: number | null;
  rows: FactoryTestReportStored[];
  onSave: (rows: FactoryTestReportStored[]) => void;
  onClose: () => void;
  onEditSample: (source: FtrSampleSource, sampleIndex: number) => void;
}) {
  const rowsKey = JSON.stringify(initialStored);
  const [reports, setReports] = useState<FactoryTestReportRow[]>(() =>
    editorReportsFromStored(initialStored),
  );
  const [activeReportId, setActiveReportId] = useState<string>(
    () => editorReportsFromStored(initialStored)[0]?.id ?? "",
  );
  const [appliedRowsKey, setAppliedRowsKey] = useState(rowsKey);
  const [autoSynced, setAutoSynced] = useState(false);
  const [printSettings, setPrintSettings] = useState<FactoryTestReportPrintSettings>(() =>
    defaultFactoryTestReportPrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const [showParameterPicker, setShowParameterPicker] = useState(false);
  const [showSampleDetails, setShowSampleDetails] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [testRowSearch, setTestRowSearch] = useState("");
  const [selectedTestRowKeys, setSelectedTestRowKeys] = useState<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isReference = letterData.isNumber?.trim() || "—";

  const qualityControlIncharge = useMemo(
    () => resolveQualityControlIncharge(technicalStaff),
    [technicalStaff],
  );

  const ftrContext = useMemo((): FtrContext => {
    const address = letterData.address.trim();
    const rawAppNo = applicationNumber.trim();
    const appNo =
      !rawAppNo || rawAppNo.toUpperCase() === "N/A" || rawAppNo === "—"
        ? ""
        : formatApplicationNumberDisplay(rawAppNo);
    return {
      applicantName: letterData.companyName,
      applicantAddress: address,
      applicationNumber: appNo,
      licenceNumber,
      productTitle: letterData.isTitle ?? "",
      isCode: isReference !== "—" ? isReference : "",
      dateOfApplication,
      dateOfInspection,
      inspectionOfficerName: inspectionOfficerName.trim(),
      inspectionOfficerDesignation: inspectionOfficerDesignation.trim(),
      qualityControlInchargeName: qualityControlIncharge.name,
      qualityControlInchargeDesignation: qualityControlIncharge.designation,
    };
  }, [
    letterData.companyName,
    letterData.address,
    letterData.isTitle,
    applicationNumber,
    licenceNumber,
    isReference,
    dateOfApplication,
    dateOfInspection,
    inspectionOfficerName,
    inspectionOfficerDesignation,
    qualityControlIncharge.name,
    qualityControlIncharge.designation,
  ]);

  const hasSampleContent = useMemo(
    () =>
      oslSamples.some((s) => oslRowHasContent(s)) ||
      piSamples.some((s) => oslRowHasContent(s)),
    [oslSamples, piSamples],
  );

  if (hasSampleContent && !autoSynced) {
    setAutoSynced(true);
    const synced = syncFactoryTestReportsFromSamples({
      oslSamples,
      piSamples,
      existing: initialStored,
      ctx: ftrContext,
    });
    const next = editorReportsFromStored(synced);
    if (next.length > 0) {
      setReports(next);
      setActiveReportId((current) =>
        next.some((r) => r.id === current) ? current : next[0]!.id,
      );
    }
  } else if (rowsKey !== appliedRowsKey) {
    setAppliedRowsKey(rowsKey);
    const next = editorReportsFromStored(initialStored);
    setReports(next);
    setActiveReportId((current) =>
      next.length > 0 && !next.some((r) => r.id === current) ? next[0]!.id : current,
    );
  }

  const contextualReports = useMemo(() => {
    if (reports.length === 0) return reports;
    return reports.map((report) => {
      const sample =
        report.source === "osl"
          ? oslSamples[report.source_index]
          : piSamples[report.source_index];
      const patch = refreshReportHeadersFromSample(report, sample, ftrContext);
      return {
        ...(Object.keys(patch).length > 0 ? { ...report, ...patch } : report),
        witnessed_by: ftrContext.inspectionOfficerName,
        tested_by: ftrContext.qualityControlInchargeName,
      };
    });
  }, [reports, ftrContext, oslSamples, piSamples]);

  const activeReport =
    contextualReports.find((r) => r.id === activeReportId) ?? contextualReports[0] ?? null;

  const assistantReport = useMemo((): FactoryTestReportStored | null => {
    if (!activeReport) return null;
    return storedReportsFromEditor([activeReport])[0] ?? null;
  }, [activeReport]);

  const activeLinkedSample = useMemo((): OslSampleRequirementStored | null => {
    if (!activeReport) return null;
    const samples = activeReport.source === "osl" ? oslSamples : piSamples;
    return samples[activeReport.source_index] ?? null;
  }, [activeReport, oslSamples, piSamples]);

  const previewData = useMemo((): FactoryTestReportLetterData => {
    const activeReports = activeReport ? storedReportsFromEditor([activeReport]) : [];
    return {
      ...letterData,
      city: letterData.city ?? "",
      reports: activeReports,
      inspectionOfficerName: inspectionOfficerName.trim(),
      inspectionOfficerDesignation: inspectionOfficerDesignation.trim(),
      qualityControlInchargeName: qualityControlIncharge.name,
      qualityControlInchargeDesignation: qualityControlIncharge.designation,
    };
  }, [
    letterData,
    activeReport,
    inspectionOfficerName,
    inspectionOfficerDesignation,
    qualityControlIncharge.name,
    qualityControlIncharge.designation,
  ]);

  const allReportsData = useMemo((): FactoryTestReportLetterData => {
    return {
      ...letterData,
      city: letterData.city ?? "",
      reports: storedReportsFromEditor(contextualReports),
      inspectionOfficerName: inspectionOfficerName.trim(),
      inspectionOfficerDesignation: inspectionOfficerDesignation.trim(),
      qualityControlInchargeName: qualityControlIncharge.name,
      qualityControlInchargeDesignation: qualityControlIncharge.designation,
    };
  }, [
    letterData,
    contextualReports,
    inspectionOfficerName,
    inspectionOfficerDesignation,
    qualityControlIncharge.name,
    qualityControlIncharge.designation,
  ]);

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildFactoryTestReportHtml(previewData, printSettings);
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

  const iframeSize = iframeSizeForFactoryTestReportPrintSettings(printSettings);

  const previewPageCount = useMemo(() => {
    if (!activeReport) return 1;
    return ftrPrintPageCount(
      activeReport.test_rows,
      ftrPrintPaginationOptionsFromSettings(printSettings),
    );
  }, [activeReport, printSettings]);

  function patchPrintSettings(patch: Partial<FactoryTestReportPrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function patchFtrPrintOptions(
    patch: Partial<Pick<FactoryTestReportPrintSettings, "show_witnessed_by" | "show_tested_by">>,
  ) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function handleSyncFromSamples() {
    const synced = syncFactoryTestReportsFromSamples({
      oslSamples,
      piSamples,
      existing: storedReportsFromEditor(reports),
      ctx: ftrContext,
    });
    const next = editorReportsFromStored(synced);
    setReports(next);
    if (next.length > 0) setActiveReportId(next[0].id);
  }

  function selectReport(id: string) {
    setActiveReportId(id);
    setTestRowSearch("");
    setSelectedTestRowKeys(new Set());
  }

  function handleRemoveSelectedTestRows() {
    if (!activeReport) return;
    if (selectedTestRowKeys.size === 0) {
      window.alert("Select at least one test parameter to remove.");
      return;
    }
    const n = selectedTestRowKeys.size;
    if (
      !window.confirm(
        n === 1
          ? "Remove this test parameter from the report?"
          : `Remove ${n} test parameters from the report?`,
      )
    ) {
      return;
    }
    const nextRows = activeReport.test_rows.filter(
      (r) => r.row_type !== "test" || !selectedTestRowKeys.has(ftrTestRowKey(r)),
    );
    updateActiveReport({ test_rows: nextRows });
    setSelectedTestRowKeys(new Set());
  }

  function handleAddTestParameters(selected: FtrTestParameterSeed[]) {
    if (!activeReport) return;
    const merged = mergeTestParametersIntoRows(
      activeReport.test_rows,
      selected,
      isReference !== "—" ? isReference : activeReport.is_code,
    );
    const sections = merged.filter((r) => r.row_type === "section");
    const tests = sortFtrTestRowsByClause(merged);
    updateActiveReport({ test_rows: [...sections, ...tests] });
  }

  function updateActiveReport(patch: Partial<FactoryTestReportRow>) {
    if (!activeReport) return;
    setReports((prev) =>
      prev.map((r) => (r.id === activeReport.id ? { ...r, ...patch } : r)),
    );
  }

  function handleSave() {
    startSave(() => {
      onSave(storedReportsFromEditor(contextualReports));
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  }

  async function handleDownloadExcel() {
    try {
      await downloadFactoryTestReportExcel(allReportsData, letterData.companyName);
    } catch {
      window.alert("Unable to download Excel file.");
    }
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="min-w-0 shrink-0 flex-1 basis-48">
          <h2 className="truncate text-sm font-semibold text-white">Factory Test Report (FTR)</h2>
          <p className="truncate text-xs text-zinc-400">
            {letterData.companyName}
            {isReference !== "—" ? ` · ${isReference}` : ""}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {savedFlash && (
            <span className="text-xs font-semibold text-emerald-400">Saved ✓</span>
          )}
          {saving && <span className="text-xs text-zinc-400">Saving…</span>}
          <button
            type="button"
            onClick={handleSyncFromSamples}
            className="shrink-0 whitespace-nowrap rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-950/70"
          >
            Sync from OSL / PI Samples
          </button>
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
            onClick={() => void handleDownloadExcel()}
            className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Download Excel
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
        {!showPrintPreview && (
          <div
            className={`flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-900 ${
              settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
            }`}
          >
          {reports.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="text-sm text-zinc-400">
                No FTR reports yet. Add samples in <strong className="text-zinc-200">Sample for OSL</strong> or{" "}
                <strong className="text-zinc-200">Sample for PI</strong>, then click Sync.
              </p>
              <button
                type="button"
                onClick={handleSyncFromSamples}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Sync from OSL / PI Samples
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 border-b border-zinc-800 px-4 py-3">
                {reports.map((report, index) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => selectReport(report.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      activeReport?.id === report.id
                        ? "border-sky-500 bg-sky-950/50 text-sky-200"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    }`}
                  >
                    FTR {index + 1}
                    {report.sample_label ? ` · ${report.sample_label.slice(0, 24)}` : ""}
                  </button>
                ))}
              </div>

              {activeReport && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-zinc-800 p-4 lg:grid-cols-3 xl:grid-cols-4">
                    <HeaderField
                      label="Testing Start"
                      value={activeReport.date_of_testing_start}
                      onChange={(v) => updateActiveReport({ date_of_testing_start: v })}
                      type="date"
                    />
                    <HeaderField
                      label="Testing Completion"
                      value={activeReport.date_of_testing_completion}
                      onChange={(v) => updateActiveReport({ date_of_testing_completion: v })}
                      type="date"
                    />
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-3">
                    <input
                      type="search"
                      value={testRowSearch}
                      onChange={(e) => setTestRowSearch(e.target.value)}
                      placeholder="Search test rows…"
                      autoComplete="off"
                      className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40 sm:max-w-xs"
                    />
                    <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowQeAssistant(true)}
                        disabled={!assistantReport}
                        className="shrink-0 rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-950/70 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        QE Assistant
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSampleDetails(true)}
                        disabled={!activeLinkedSample}
                        className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        View Sample Details
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveSelectedTestRows}
                        disabled={selectedTestRowKeys.size === 0}
                        className="shrink-0 rounded-lg border border-red-700/50 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-950/70 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove Test Parameter
                        {selectedTestRowKeys.size > 0 ? ` (${selectedTestRowKeys.size})` : ""}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowParameterPicker(true)}
                        className="shrink-0 rounded-lg border border-sky-700/50 bg-sky-950/40 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-950/70"
                      >
                        Add Test Parameter
                      </button>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <FtrTestRowsTableEditor
                      rows={activeReport.test_rows}
                      searchQuery={testRowSearch}
                      selectedKeys={selectedTestRowKeys}
                      onSelectedKeysChange={setSelectedTestRowKeys}
                      onChange={(test_rows) => updateActiveReport({ test_rows })}
                    />
                  </div>
                </div>
              )}
            </>
          )}
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
                {activeReport
                  ? ` — FTR ${reports.findIndex((r) => r.id === activeReport.id) + 1} (${previewPageCount} page${previewPageCount === 1 ? "" : "s"})`
                  : ""}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <iframe
                ref={iframeRef}
                title="Factory Test Report preview"
                className="mx-auto max-w-full border-0 bg-slate-400 shadow-2xl"
                style={{
                  width: `min(100%, ${iframeSize.widthMm}mm)`,
                  minHeight: `${iframeSize.heightMm * previewPageCount + Math.max(0, previewPageCount - 1) * 8}mm`,
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
              ftrPrintOptions={{
                show_witnessed_by: printSettings.show_witnessed_by,
                show_tested_by: printSettings.show_tested_by,
              }}
              onFtrPrintOptionsChange={patchFtrPrintOptions}
            />
          </div>
        )}
      </div>

      {showSampleDetails && activeReport && activeLinkedSample && (
        <FtrSampleDetailsModal
          source={activeReport.source}
          sampleIndex={activeReport.source_index}
          sample={activeLinkedSample}
          onClose={() => setShowSampleDetails(false)}
          onEdit={() => {
            setShowSampleDetails(false);
            onEditSample(activeReport.source, activeReport.source_index);
          }}
        />
      )}

      {showQeAssistant && assistantReport && (
        <FtrQeAssistantModal
          isCodeId={isCodeId}
          isReference={isReference}
          isTitle={letterData.isTitle ?? ""}
          companyName={letterData.companyName}
          report={assistantReport}
          onClose={() => setShowQeAssistant(false)}
        />
      )}

      {showParameterPicker && (
        <FtrTestParameterPickerModal
          isReference={isReference}
          isCodeId={isCodeId}
          isNumber={isNumber}
          revisionYear={revisionYear}
          onAdd={handleAddTestParameters}
          onClose={() => setShowParameterPicker(false)}
        />
      )}
    </div>
  );
}
