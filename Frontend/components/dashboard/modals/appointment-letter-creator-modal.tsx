"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { createClient } from "@backend/db/client/client";
import {
  technicalStaffDocumentPath,
  uploadTechnicalStaffDocument,
} from "@backend/modules/storage/technical-staff-documents";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  SplitModalPaneTabs,
  type SplitModalPane,
} from "@/components/dashboard/modals/split-modal-pane-tabs";
import {
  splitModalBodyClass,
  splitModalEditorPaneClass,
  splitModalPreviewPaneClass,
  splitModalSettingsPaneClass,
} from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildAppointmentLetterHtml,
  defaultAppointmentLetterDraft,
  defaultAppointmentLetterPrintSettings,
  iframeSizeForPrintSettings,
  type AppointmentLetterData,
} from "@backend/modules/print/appointment-letter";
import {
  downloadAppointmentLetterExcel,
  downloadAppointmentLetterWord,
} from "@backend/modules/print/appointment-letter-export";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  resolvePrimaryTopManagementPerson,
  withDocumentSignatureImage,
  type TopManagementStored,
} from "@backend/modules/bis/top-management";

const APPOINTMENT_LETTER_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with appointment letters for technical staff in BIS licence applications:
- Format and content for appointment letters
- Required clauses for technical personnel appointment
- Signatory details and company letterhead requirements
- BIS factory inspection documentation for technical staff

Be concise, practical, and use Indian BIS/ISI certification context.`;

const APPOINTMENT_LETTER_QE_STARTERS = [
  "What should an appointment letter for BIS technical staff include?",
  "Who should sign the appointment letter?",
  "What designation is acceptable for BIS technical staff?",
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-400";

export function AppointmentLetterCreatorModal({
  projectId,
  rowId,
  letterData,
  topManagement,
  person,
  onCreated,
  onClose,
}: {
  projectId: string;
  rowId: string;
  letterData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >;
  topManagement: TopManagementStored[];
  person: {
    person_name: string;
    designation: string;
    educational_qualification: string;
    experience_years: string;
  };
  onCreated: (url: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AppointmentLetterData>(() =>
    defaultAppointmentLetterDraft(letterData, person, topManagement),
  );
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultAppointmentLetterPrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [mobilePane, setMobilePane] = useState<SplitModalPane>("editor");
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const personKey = `${person.person_name}\0${person.designation}\0${person.educational_qualification}\0${person.experience_years}`;
  const [appliedPersonKey, setAppliedPersonKey] = useState(personKey);

  if (personKey !== appliedPersonKey) {
    setAppliedPersonKey(personKey);
    setDraft((prev) => ({
      ...prev,
      person_name: person.person_name,
      designation: person.designation,
      educational_qualification: person.educational_qualification,
      experience_years: person.experience_years,
    }));
  }

  const previewData = useMemo((): AppointmentLetterData => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return withDocumentSignatureImage(
      {
        ...draft,
        signatory_name:
          primary.person_name ||
          draft.signatory_name.trim() ||
          letterData.contactPerson?.trim() ||
          "",
        signatory_designation:
          primary.designation || draft.signatory_designation.trim() || "",
      },
      topManagement,
    );
  }, [draft, topManagement, letterData.contactPerson]);

  const previewHtml = useMemo(
    () => buildAppointmentLetterHtml(previewData, printSettings),
    [previewData, printSettings],
  );

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  const iframeSize = iframeSizeForPrintSettings(printSettings);

  function patchDraft(patch: Partial<AppointmentLetterData>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function handlePrint() {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  }

  function handleDownloadWord() {
    void downloadAppointmentLetterWord(previewData, printSettings).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  function handleDownloadExcel() {
    void downloadAppointmentLetterExcel(previewData).catch(() =>
      window.alert("Unable to download Excel file."),
    );
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  async function uploadGeneratedLetter(html: string): Promise<string | null> {
    const supabase = createClient();
    const safeName = (draft.person_name.trim() || "staff")
      .replace(/[^\w.-]+/g, "-")
      .slice(0, 40);
    const fileName = `appointment-letter-${safeName}.html`;
    const path = technicalStaffDocumentPath(
      projectId,
      rowId,
      "appointment-letter",
      fileName,
    );
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const result = await uploadTechnicalStaffDocument(supabase, path, blob, "text/html");
    if ("error" in result) {
      setError(result.error);
      return null;
    }
    return result.ref;
  }

  function handleSave() {
    if (!draft.person_name.trim()) {
      setError("Name of person is required.");
      return;
    }
    setError(null);
    startSave(async () => {
      const url = await uploadGeneratedLetter(previewHtml);
      if (!url) return;
      onCreated(url);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  return (
    <>
    <div className="fixed inset-0 z-[500] flex flex-col bg-zinc-950">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="min-w-0 shrink-0 flex-1 basis-48">
          <h2 className="truncate text-sm font-semibold text-white">Create Appointment Letter</h2>
          <p className="truncate text-xs text-zinc-400">
            {letterData.companyName}
            {draft.person_name.trim() ? ` · ${draft.person_name.trim()}` : ""}
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

      {error ? (
        <div className="border-b border-red-900 bg-red-950/40 px-4 py-2 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <SplitModalPaneTabs
        active={mobilePane}
        onChange={setMobilePane}
        editorLabel="Letter Details"
        previewLabel="Print Preview"
      />

      <div className={splitModalBodyClass()}>
        <div className={splitModalEditorPaneClass(mobilePane, Boolean(settingsPanel))}>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="al_person_name" className={labelClass}>
                    Name of Person
                  </label>
                  <input
                    id="al_person_name"
                    type="text"
                    value={draft.person_name}
                    onChange={(e) => patchDraft({ person_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="al_designation" className={labelClass}>
                    Designation
                  </label>
                  <input
                    id="al_designation"
                    type="text"
                    value={draft.designation}
                    onChange={(e) => patchDraft({ designation: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="al_qualification" className={labelClass}>
                    Educational Qualification
                  </label>
                  <input
                    id="al_qualification"
                    type="text"
                    value={draft.educational_qualification}
                    onChange={(e) => patchDraft({ educational_qualification: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="al_experience" className={labelClass}>
                    Experience in Year
                  </label>
                  <input
                    id="al_experience"
                    type="text"
                    value={draft.experience_years}
                    onChange={(e) => patchDraft({ experience_years: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="al_date" className={labelClass}>
                    Appointment Date
                  </label>
                  <input
                    id="al_date"
                    type="date"
                    value={draft.appointment_date}
                    onChange={(e) => patchDraft({ appointment_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="al_ref" className={labelClass}>
                    Reference No.
                  </label>
                  <input
                    id="al_ref"
                    type="text"
                    value={draft.reference_no}
                    onChange={(e) => patchDraft({ reference_no: e.target.value })}
                    placeholder="Optional…"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={splitModalPreviewPaneClass(mobilePane, Boolean(settingsPanel))}>
          <div className="border-b border-zinc-700/80 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-200">
              Print Preview
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            <iframe
              ref={iframeRef}
              title="Appointment letter print preview"
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

    {showQeAssistant && (
      <AiChatModal
        title="QE Assistant"
        subtitle="Appointment Letter · BIS Application"
        systemPrompt={APPOINTMENT_LETTER_QE_PROMPT}
        starterQuestions={APPOINTMENT_LETTER_QE_STARTERS}
        accentColor="emerald"
        overlayZIndexClass="z-[550]"
        onClose={() => setShowQeAssistant(false)}
      />
    )}
    </>
  );
}
