"use client";

import { ApplicationDetailsForm } from "@/components/dashboard/application-details-form";
import type { ApplicationMeta } from "@backend/modules/bis/application-checklist-notes";
import type { LegalDocumentRow } from "@backend/modules/bis/legal-documents";
import { type AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

export function ApplicationDetailsModal({
  companyName,
  applicationMeta,
  onUpdateMeta,
  appDropdownOptions,
  onReloadDropdowns,
  isCodeProductManualNumber,
  onFirmScaleChange,
  projectId,
  legalDocumentRows,
  onLegalDocumentsChange,
  onClose,
}: {
  companyName: string;
  applicationMeta: ApplicationMeta;
  onUpdateMeta: (patch: Partial<ApplicationMeta>) => void;
  appDropdownOptions: Record<string, AppDropdownOptionRow[]>;
  onReloadDropdowns: () => void;
  isCodeProductManualNumber?: string | null;
  onFirmScaleChange: (value: string) => void;
  projectId: string;
  legalDocumentRows: LegalDocumentRow[];
  onLegalDocumentsChange: (rows: LegalDocumentRow[]) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
      <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-zinc-900">
        <div className="shrink-0 bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 sm:px-6 sm:py-4">
          <div className="relative flex items-center">
            <p className="w-full text-center text-sm font-semibold uppercase tracking-wider text-white/90 sm:text-base">
              Application Details
            </p>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-center text-sm font-bold text-white sm:text-base">{companyName}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
          <ApplicationDetailsForm
            applicationMeta={applicationMeta}
            onUpdateMeta={onUpdateMeta}
            appDropdownOptions={appDropdownOptions}
            onReloadDropdowns={onReloadDropdowns}
            isCodeProductManualNumber={isCodeProductManualNumber}
            onFirmScaleChange={onFirmScaleChange}
            projectId={projectId}
            legalDocumentRows={legalDocumentRows}
            onLegalDocumentsChange={onLegalDocumentsChange}
          />
        </div>
      </div>
    </div>
  );
}
