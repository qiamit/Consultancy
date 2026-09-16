"use client";

import { useEffect, useRef, useState } from "react";
import { ApplicationDetailsForm } from "@/components/dashboard/application-details-form";
import { ChecklistDocumentImportDialog } from "@/components/dashboard/modals/checklist-document-import-dialog";
import {
  applicationMetaHasContent,
  mergeImportedApplicationMeta,
  type ApplicationMeta,
} from "@backend/modules/bis/application-checklist-notes";
import {
  rowHasContent as legalDocumentRowHasContent,
  type LegalDocumentRow,
  type LegalDocumentStored,
} from "@backend/modules/bis/legal-documents";
import type { ChecklistImportExclude } from "@backend/modules/bis/checklist-document-import-meta";
import { type AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

export function ApplicationDetailsModal({
  companyName,
  applicationMeta,
  onUpdateMeta,
  appDropdownOptions,
  onReloadDropdowns,
  projectId,
  legalDocumentRows,
  onLegalDocumentsChange,
  onSave,
  onImportApplicationDetails,
  onOpenApplicationForm,
  clientId = null,
  excludeImportSource = null,
  saving = false,
  onClose,
}: {
  companyName: string;
  applicationMeta: ApplicationMeta;
  onUpdateMeta: (patch: Partial<ApplicationMeta>) => void;
  appDropdownOptions: Record<string, AppDropdownOptionRow[]>;
  onReloadDropdowns: () => void;
  projectId: string;
  legalDocumentRows: LegalDocumentRow[];
  onLegalDocumentsChange: (rows: LegalDocumentRow[]) => void;
  onSave: () => void;
  onImportApplicationDetails: (payload: {
    meta: ApplicationMeta;
    legalDocuments: LegalDocumentStored[];
  }) => void;
  onOpenApplicationForm?: () => void;
  clientId?: string | null;
  excludeImportSource?: ChecklistImportExclude | null;
  saving?: boolean;
  onClose: () => void;
}) {
  const [savedFlash, setSavedFlash] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const wasSavingRef = useRef(false);
  const expectFlashRef = useRef(false);

  useEffect(() => {
    if (expectFlashRef.current && wasSavingRef.current && !saving) {
      expectFlashRef.current = false;
      setSavedFlash(true);
      const timer = window.setTimeout(() => setSavedFlash(false), 2000);
      return () => window.clearTimeout(timer);
    }
    wasSavingRef.current = saving;
  }, [saving]);

  function handleSave() {
    expectFlashRef.current = true;
    setSavedFlash(false);
    onSave();
  }

  function handleImportFromApplication(payload: {
    meta: ApplicationMeta;
    legalDocuments: LegalDocumentStored[];
  }): boolean {
    const hasCurrentMeta = applicationMetaHasContent(applicationMeta);
    const hasCurrentLegal = legalDocumentRows.some(legalDocumentRowHasContent);
    if (hasCurrentMeta || hasCurrentLegal) {
      const ok = window.confirm(
        "Replace the current Application Details (and Legal Documents list) with the imported data? Application Number and Date of Application stay as they are.",
      );
      if (!ok) return false;
    }
    onImportApplicationDetails({
      meta: mergeImportedApplicationMeta(applicationMeta, payload.meta),
      legalDocuments: payload.legalDocuments,
    });
    return true;
  }

  return (
    <>
      <div className="absolute inset-0 z-[400] flex flex-col bg-zinc-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-zinc-900">
          <div className="shrink-0 bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-2.5 sm:px-5 sm:py-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <p className="min-w-0 shrink truncate text-xs font-semibold uppercase tracking-wider text-white/90 sm:text-sm md:text-base">
                Application Details
              </p>
              <p
                className="min-w-0 flex-1 truncate text-right text-xs font-bold text-white sm:text-sm md:text-base"
                title={companyName}
              >
                {companyName}
              </p>
              {savedFlash ? (
                <span className="shrink-0 text-xs font-semibold text-emerald-200">Saved ✓</span>
              ) : null}
              {saving ? (
                <span className="shrink-0 text-xs text-white/80">Saving…</span>
              ) : null}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="shrink-0 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-5">
            <ApplicationDetailsForm
              applicationMeta={applicationMeta}
              onUpdateMeta={onUpdateMeta}
              appDropdownOptions={appDropdownOptions}
              onReloadDropdowns={onReloadDropdowns}
              projectId={projectId}
              legalDocumentRows={legalDocumentRows}
              onLegalDocumentsChange={onLegalDocumentsChange}
              onSave={handleSave}
              onImportData={() => setShowImportDialog(true)}
              onOpenApplicationForm={onOpenApplicationForm}
              saving={saving}
              savedFlash={savedFlash}
            />
          </div>
        </div>
      </div>

      {showImportDialog && (
        <ChecklistDocumentImportDialog
          documentKey="application_details"
          title="Import Application Details"
          defaultClientId={clientId}
          exclude={excludeImportSource}
          onImport={(payload) => {
            if (payload.key !== "application_details") return false;
            return handleImportFromApplication(payload.document);
          }}
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </>
  );
}
