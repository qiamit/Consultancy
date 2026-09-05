"use client";



import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useEditorRowsFromStored } from "@/components/modules/finance/use-finance-master-state";

import { FtrTestParameterPickerModal } from "@/components/dashboard/modals/ftr-test-parameter-picker-modal";

import { SubcontractedTestsQeAssistantModal } from "@/components/dashboard/modals/subcontracted-tests-qe-assistant-modal";

import { SubcontractedTestsTableEditor } from "@/components/dashboard/subcontracted-tests-table-editor";

import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";


import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";

import { ClientMasterEmbedModal } from "@/components/modules/finance/client-master-embed-modal";

import { createClient } from "@backend/db/client/client";

import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";

import {

  buildSubcontractedTestsHtml,

  defaultSubcontractedTestsPrintSettings,

  iframeSizeForSubcontractedTestsPrintSettings,

  type SubcontractedTestsLetterData,

  type SubcontractedTestsPrintAssets,

} from "@backend/modules/print/subcontracted-tests";

import { downloadSubcontractedTestsWord } from "@backend/modules/print/subcontracted-tests-export";

import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";

import type { PrintSettings } from "@backend/modules/print/types";

import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

import type { FtrTestParameterSeed } from "@backend/modules/bis/factory-test-report";

import {
  createSubcontractedTestRow,
  editorRowsFromStored,
  mergeSubcontractedTestsDocumentWithDefaults,
  mergeTestParametersIntoSubcontractedRows,
  storedFromEditor,
  type SubcontractedTestStored,
  type SubcontractedTestsDocumentStored,
} from "@backend/modules/bis/subcontracted-tests";
import {
  resolvePrimaryTopManagementPerson,
  withDocumentSignatureImage,
  type TopManagementStored,
} from "@backend/modules/bis/top-management";

type ClientPickerRow = {
  id: string;
  name: string;
  company_name: string | null;
};

function clientDisplayLabel(c: ClientPickerRow): string {
  const company = (c.company_name ?? "").trim();
  if (company) return company;
  return (c.name ?? "").trim() || "—";
}

const fieldInp =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={fieldInp} />
    </div>
  );
}

export function SubcontractedTestsModal({

  letterData,

  topManagement,

  isCodeId,

  isNumber,

  revisionYear,

  rows: initialStored,

  document: initialDocument,

  onSave,

  onClose,

}: {

  letterData: Omit<

    ManufacturingScopeDeclarationData,

    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"

  >;

  topManagement: TopManagementStored[];

  isCodeId: string | null;

  isNumber: string | null;

  revisionYear: number | null;

  rows: SubcontractedTestStored[];

  document: SubcontractedTestsDocumentStored;

  onSave: (payload: {
    rows: SubcontractedTestStored[];
    document: SubcontractedTestsDocumentStored;
  }) => void;

  onClose: () => void;

}) {

  const [rows, setRows] = useEditorRowsFromStored(initialStored, editorRowsFromStored);

  const [document, setDocument] = useState(() =>
    mergeSubcontractedTestsDocumentWithDefaults(initialDocument, letterData.contactPerson),
  );

  const [showParameterPicker, setShowParameterPicker] = useState(false);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>

    defaultSubcontractedTestsPrintSettings(),

  );

  const [printAssets, setPrintAssets] = useState<SubcontractedTestsPrintAssets>({});

  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);

  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const [showQeAssistant, setShowQeAssistant] = useState(false);

  const [clientRows, setClientRows] = useState<ClientPickerRow[]>([]);

  const [addClientForRowId, setAddClientForRowId] = useState<string | null>(null);

  const [savedFlash, setSavedFlash] = useState(false);

  const [pdfDownloading, setPdfDownloading] = useState(false);

  const [saving, startSave] = useTransition();

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("id, name, company_name")
        .order("company_name", { ascending: true });
      if (!cancelled) setClientRows((data ?? []) as ClientPickerRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const defaults = defaultSubcontractedTestsPrintSettings();
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

  // Keep Subcontracted Tests margin defaults in sync (matches Top Management / Plant & Machinery).
  useEffect(() => {
    const defaults = defaultSubcontractedTestsPrintSettings();
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

  const reloadClients = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("clients")
      .select("id, name, company_name")
      .order("company_name", { ascending: true });
    setClientRows((data ?? []) as ClientPickerRow[]);
  }, []);

  const clientOptions: AppDropdownOptionRow[] = useMemo(
    () =>
      clientRows.map((c) => {
        const label = clientDisplayLabel(c);
        return {
          id: c.id,
          value: label,
          label,
          filterText: [c.name, c.company_name].filter(Boolean).join(" ") || null,
          canDelete: false,
        };
      }),
    [clientRows],
  );

  const isFullNumber =

    isNumber && revisionYear ? `${isNumber}: ${revisionYear}` : isNumber ?? "—";

  const isReference = letterData.isNumber?.trim() || "—";



  const previewData = useMemo((): SubcontractedTestsLetterData => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return withDocumentSignatureImage(
      {
        ...letterData,
        rows: storedFromEditor(rows),
        document: {
          ...document,
          signatory_name:
            primary.person_name ||
            document.signatory_name.trim() ||
            letterData.contactPerson?.trim() ||
            "",
          signatory_designation:
            primary.designation || document.signatory_designation.trim() || "",
        },
      },
      topManagement,
    );
  }, [letterData, topManagement, rows, document]);



  const refreshPreview = useCallback(() => {

    const iframe = iframeRef.current;

    const doc = iframe?.contentDocument;

    if (!iframe || !doc) return;

    const html = buildSubcontractedTestsHtml(previewData, printSettings, printAssets);

    doc.open();

    doc.write(html);

    doc.close();

    requestAnimationFrame(() => syncPrintPreviewIframe(iframe));

  }, [previewData, printSettings, printAssets]);



  useEffect(() => {

    refreshPreview();

  }, [refreshPreview]);



  useEffect(() => {

    if (showPrintPreview) {

      refreshPreview();

    }

  }, [showPrintPreview, refreshPreview]);



  const iframeSize = iframeSizeForSubcontractedTestsPrintSettings(printSettings);



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

      onSave({ rows: storedFromEditor(rows), document });

      setSavedFlash(true);

      window.setTimeout(() => setSavedFlash(false), 2000);

    });

  }



  function patchDocument(patch: Partial<SubcontractedTestsDocumentStored>) {

    setDocument((prev) => ({ ...prev, ...patch }));

  }



  function handleAddParameters(selected: FtrTestParameterSeed[]) {

    setRows((prev) => mergeTestParametersIntoSubcontractedRows(prev, selected));

    setShowParameterPicker(false);

  }



  function handleAddTestParameter() {

    if (isCodeId) {

      setShowParameterPicker(true);

      return;

    }

    setRows((prev) => [...prev, createSubcontractedTestRow()]);

  }



  function handlePrint() {

    iframeRef.current?.contentWindow?.focus();

    iframeRef.current?.contentWindow?.print();

  }



  function handleDownloadWord() {

    void downloadSubcontractedTestsWord(previewData, printSettings, printAssets).catch(

      () => window.alert("Unable to download Word file."),

    );

  }



  async function handleDownloadPdf() {

    if (pdfDownloading) return;

    setPdfDownloading(true);

    try {

      const html = buildSubcontractedTestsHtml(previewData, printSettings, printAssets);

      await downloadPrintHtmlAsPdf({

        html,

        filename: `Subcontracted_Tests_${safePdfFilenamePart(letterData.companyName)}.pdf`,

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

      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">

        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">

          <div className="min-w-0 shrink-0 flex-1 basis-48">

            <h2 className="truncate text-sm font-semibold text-white">Test Subcontracted</h2>

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

              <div className="shrink-0 space-y-3 border-b border-zinc-800 px-4 py-3">

                <button

                  type="button"

                  onClick={handleAddTestParameter}

                  title={

                    isCodeId

                      ? "Add test parameters from IS Code master"

                      : "Add a blank test parameter row (link an IS Code to pick from master)"

                  }

                  className="inline-flex items-center gap-2 rounded-lg border border-teal-700/50 bg-teal-950/40 px-4 py-2 text-xs font-semibold text-teal-200 hover:bg-teal-950/70"

                >

                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />

                  </svg>

                  Add Test Parameter

                </button>

              </div>



              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">

                <SubcontractedTestsTableEditor

                  theme="dark"

                  rows={rows}

                  onChange={setRows}

                  hideFooter

                  clientOptions={clientOptions}

                  onRequestAddClient={setAddClientForRowId}

                />

                <div className="mt-4 shrink-0 border-t border-zinc-800 pt-4">

                  <p className="mb-2 text-xs font-semibold text-zinc-400">Signatory (for print)</p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                    <Field

                      label="Name"

                      value={document.signatory_name}

                      onChange={(v) => patchDocument({ signatory_name: v })}

                    />

                    <Field

                      label="Designation"

                      value={document.signatory_designation}

                      onChange={(v) => patchDocument({ signatory_designation: v })}

                    />

                  </div>

                </div>

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

                  title="Subcontracted tests print preview"

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

                hideLetterheadLogo

              />

            </div>

          )}

        </div>

      </div>



      {showParameterPicker && (

        <FtrTestParameterPickerModal

          isReference={isReference}

          isCodeId={isCodeId}

          isNumber={isNumber}

          revisionYear={revisionYear}

          onAdd={handleAddParameters}

          onClose={() => setShowParameterPicker(false)}

        />

      )}

      {addClientForRowId && (

        <ClientMasterEmbedModal

          onClose={() => setAddClientForRowId(null)}

          onSuccess={async (clientId) => {

            const rowId = addClientForRowId;

            setAddClientForRowId(null);

            await reloadClients();

            const supabase = createClient();

            const { data } = await supabase

              .from("clients")

              .select("name, company_name")

              .eq("id", clientId)

              .maybeSingle();

            if (data && rowId) {

              const label = clientDisplayLabel(data as ClientPickerRow);

              setRows((prev) =>

                prev.map((r) =>

                  r.id === rowId ? { ...r, laboratory_name: label } : r,

                ),

              );

            }

          }}

        />

      )}

      {showQeAssistant && (

        <SubcontractedTestsQeAssistantModal

          isCodeId={isCodeId}

          isReference={isReference}

          isTitle={letterData.isTitle ?? ""}

          companyName={letterData.companyName}

          rows={storedFromEditor(rows)}

          document={document}

          onClose={() => setShowQeAssistant(false)}

        />

      )}

    </>

  );

}


