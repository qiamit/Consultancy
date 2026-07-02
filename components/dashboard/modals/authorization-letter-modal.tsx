"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@/lib/print/manufacturing-scope-declaration";
import {
  buildAuthorizationLetterHtml,
  defaultAuthorizationLetterPrintSettings,
  iframeSizeForAuthorizationLetterPrintSettings,
  type AuthorizationLetterLetterData,
} from "@/lib/print/authorization-letter";
import {
  downloadAuthorizationLetterExcel,
  downloadAuthorizationLetterWord,
} from "@/lib/print/authorization-letter-export";
import type { PrintSettings } from "@/lib/print/types";
import {
  mergeAuthorizationLetterWithDefaults,
  resolveAuthorizationLetterDocument,
  type AuthorizationLetterStored,
} from "@/lib/authorization-letter";
import { withDocumentSignatureImage, type TopManagementStored } from "@/lib/top-management";

const AUTH_LETTER_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with the Authorization Letter submitted with BIS licence applications:
- Authorizing a representative to interact with BIS on behalf of the firm
- Scope of authority: documents, information, meetings, samples, and signing
- Signatory, authorized person, and Top Management Sr. No. 1 alignment
- Letter format, undertaking language, and revocation of authorization
- Factory inspection and application proceedings under BIS Conformity Assessment

Be concise, practical, and use Indian BIS/ISI certification context. When asked to refine wording, use formal, professional language suitable for a BIS authorization letter.`;

const AUTH_LETTER_QE_STARTERS = [
  "Who should be named as authorized representative in the BIS authorization letter?",
  "Review our authorization letter wording for BIS submission",
  "What powers should the authorized representative have for factory inspection?",
];

const FIELD_ROWS: {
  key: keyof AuthorizationLetterStored;
  label: string;
  hint?: string;
}[] = [
  {
    key: "authorized_name",
    label: "Authorized Representative — Name",
    hint: "Usually Top Management Sr. No. 1",
  },
  { key: "authorized_designation", label: "Authorized Representative — Designation" },
  { key: "signatory_name", label: "Signatory — Name" },
  { key: "signatory_designation", label: "Signatory — Designation" },
];

function fieldInputClass(): string {
  return "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";
}

export function AuthorizationLetterModal({
  letterData,
  applicationNumber,
  dateOfApplication,
  dateOfInspection,
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
  topManagement: TopManagementStored[];
  storedDocument: AuthorizationLetterStored;
  onSave: (document: AuthorizationLetterStored) => void;
  onClose: () => void;
}) {
  const resolvedDefaults = useMemo(
    () =>
      resolveAuthorizationLetterDocument({
        contactPerson: letterData.contactPerson,
        topManagement,
      }),
    [letterData.contactPerson, topManagement],
  );

  const [document, setDocument] = useState<AuthorizationLetterStored>(() =>
    mergeAuthorizationLetterWithDefaults(storedDocument, resolvedDefaults),
  );

  useEffect(() => {
    setDocument(mergeAuthorizationLetterWithDefaults(storedDocument, resolvedDefaults));
  }, [storedDocument, resolvedDefaults]);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultAuthorizationLetterPrintSettings(),
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isFullNumber = letterData.isNumber?.trim() || "—";

  const previewData = useMemo((): AuthorizationLetterLetterData => {
    return withDocumentSignatureImage(
      {
        ...letterData,
        applicationNumber,
        dateOfApplication,
        dateOfInspection,
        document,
      },
      topManagement,
    );
  }, [letterData, applicationNumber, dateOfApplication, dateOfInspection, document, topManagement]);

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildAuthorizationLetterHtml(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForAuthorizationLetterPrintSettings(printSettings);

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function patchDocument(patch: Partial<AuthorizationLetterStored>) {
    setDocument((prev) => ({ ...prev, ...patch }));
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
    void downloadAuthorizationLetterWord(previewData, printSettings).catch(() =>
      window.alert("Unable to download Word file."),
    );
  }

  function handleDownloadExcel() {
    void downloadAuthorizationLetterExcel(previewData).catch(() =>
      window.alert("Unable to download Excel file."),
    );
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <>
      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 shrink-0 flex-1 basis-48">
            <h2 className="truncate text-sm font-semibold text-white">Authorization Letter</h2>
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
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <p className="mb-3 text-xs leading-relaxed text-zinc-400">
                  Authorized representative and signatory default from Top Management Sr. No. 1.
                  Edit below, then use Print Preview to review the letter.
                </p>
                <div className="space-y-3">
                  {FIELD_ROWS.map((field) => (
                    <div
                      key={field.key}
                      className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start sm:gap-4"
                    >
                      <label
                        htmlFor={`auth_${field.key}`}
                        className="pt-2 text-sm font-medium text-zinc-200"
                      >
                        {field.label}
                      </label>
                      <div>
                        <input
                          id={`auth_${field.key}`}
                          type="text"
                          value={document[field.key]}
                          onChange={(event) => patchDocument({ [field.key]: event.target.value })}
                          className={fieldInputClass()}
                        />
                        {field.hint ? (
                          <p className="mt-1 text-xs text-zinc-500">{field.hint}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
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
                  Form Preview — Authorization Letter
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Authorization Letter form preview"
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
        <AiChatModal
          title="QE Assistant"
          subtitle="Authorization Letter · BIS Application"
          systemPrompt={AUTH_LETTER_QE_PROMPT}
          starterQuestions={AUTH_LETTER_QE_STARTERS}
          accentColor="amber"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
