"use client";

import React from "react";
import { useMemo, useState, useEffect, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@backend/db/supabase/client";
import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";
import { uploadTechnicalStaffDocument } from "@backend/modules/storage/technical-staff-documents";
import { updateBisProjectTargetDate, updateBisProjectNotes, convertLicenseToApplication } from "@backend/actions/bis-projects";
import {
  updateBisNewApplicationNotes,
  updateBisNewApplicationTargetDate,
} from "@backend/actions/bis-new-applications";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { ClientSnapshotModal } from "@/components/dashboard/modals/client-snapshot-modal";
import { ClientEditModal } from "@/components/dashboard/modals/client-edit-modal";
import { ConvertToLicenseModal } from "@/components/dashboard/modals/convert-to-license-modal";
import { LicenseScopeEditorModal } from "@/components/dashboard/modals/license-scope-editor-modal";
import { OslSampleRequirementsModal } from "@/components/dashboard/modals/osl-sample-requirements-modal";
import { TopManagementModal } from "@/components/dashboard/modals/top-management-modal";
import { TechnicalStaffModal } from "@/components/dashboard/modals/technical-staff-modal";
import { FactoryTestReportModal } from "@/components/dashboard/modals/factory-test-report-modal";
import { SubcontractedTestsModal } from "@/components/dashboard/modals/subcontracted-tests-modal";
import { Cmpf305Modal } from "@/components/dashboard/modals/cmpf-305-modal";
import { Cmpf306Modal } from "@/components/dashboard/modals/cmpf-306-modal";
import { RawMaterialDetailsModal } from "@/components/dashboard/modals/raw-material-details-modal";
import { CertifiedReferenceMaterialsModal } from "@/components/dashboard/modals/certified-reference-materials-modal";
import { Cmpf307Modal } from "@/components/dashboard/modals/cmpf-307-modal";
import { Cmpf310Modal } from "@/components/dashboard/modals/cmpf-310-modal";
import { Cmpf311Modal } from "@/components/dashboard/modals/cmpf-311-modal";
import { UndertakingOption2Modal } from "@/components/dashboard/modals/undertaking-option-2-modal";
import { UndertakingLongDurationTestModal } from "@/components/dashboard/modals/undertaking-long-duration-test-modal";
import { UndertakingMinimumMarkingFeeModal } from "@/components/dashboard/modals/undertaking-minimum-marking-fee-modal";
import { UndertakingGeneralIssModal } from "@/components/dashboard/modals/undertaking-general-iss-modal";
import { PlantLayoutModal } from "@/components/dashboard/modals/plant-layout-modal";
import { ProcessFlowChartModal } from "@/components/dashboard/modals/process-flow-chart-modal";
import { ProcessDescriptionModal } from "@/components/dashboard/modals/process-description-modal";
import { UpdatedSchemeOfInspectionModal } from "@/components/dashboard/modals/updated-scheme-of-inspection-modal";
import { LocationMapModal } from "@/components/dashboard/modals/location-map-modal";
import { AuthorizationLetterModal } from "@/components/dashboard/modals/authorization-letter-modal";
import { ApplicationDetailsModal } from "@/components/dashboard/modals/application-details-modal";
import { SelfEvaluationFormModal } from "@/components/dashboard/modals/self-evaluation-form-modal";
import { IsCodeEditModal } from "@/components/dashboard/modals/is-code-edit-modal";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";
import {
  buildApplicationChecklistPayload,
  parseApplicationChecklistNotes,
  type ApplicationMeta,
  type LicenseScopeFormat,
  type LicenseScopeTableRow,
} from "@backend/modules/bis/application-checklist-notes";
import { parseBisProjectLicenseScopeNotes } from "@backend/modules/bis/bis-project-license-scope-notes";
import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";
import type { TopManagementStored } from "@backend/modules/bis/top-management";
import { formatCmDisplay } from "@backend/modules/bis/bis-project-license-status";
import { isApplicationProjectKind, isPendingApplicationRow, type BisApplicationSource } from "@backend/modules/bis/bis-project-kind";
import type { TechnicalStaffStored } from "@backend/modules/bis/technical-staff";
import type { FactoryTestReportStored, FtrSampleSource } from "@backend/modules/bis/factory-test-report";
import type { SubcontractedTestStored, SubcontractedTestsDocumentStored } from "@backend/modules/bis/subcontracted-tests";
import type { Cmpf305MachineryStored } from "@backend/modules/bis/cmpf-305";
import type { RawMaterialStored } from "@backend/modules/bis/raw-material-details";
import type { CertifiedReferenceMaterialStored } from "@backend/modules/bis/certified-reference-materials";
import type { Cmpf306Stored } from "@backend/modules/bis/cmpf-306";
import type { Cmpf307Stored } from "@backend/modules/bis/cmpf-307";
import type { Cmpf310Stored } from "@backend/modules/bis/cmpf-310";
import type { Cmpf311Stored } from "@backend/modules/bis/cmpf-311";
import type { UndertakingOption2Stored } from "@backend/modules/bis/undertaking-option-2";
import type { UndertakingLongDurationTestStored } from "@backend/modules/bis/undertaking-long-duration-test";
import type { UndertakingMinimumMarkingFeeStored } from "@backend/modules/bis/undertaking-minimum-marking-fee";
import type { UndertakingGeneralIssStored } from "@backend/modules/bis/undertaking-general-iss";
import type { AuthorizationLetterStored } from "@backend/modules/bis/authorization-letter";
import type { LocationMapStored } from "@backend/modules/bis/location-map";
import type { PlantLayoutStored } from "@backend/modules/bis/plant-layout";
import type { ProcessFlowChartStored } from "@backend/modules/bis/process-flow-chart";
import type { ProcessDescriptionStored } from "@backend/modules/bis/process-description";
import type { UpdatedSchemeOfInspectionStored } from "@backend/modules/bis/updated-scheme-of-inspection";
import type { SelfEvaluationFormStored } from "@backend/modules/bis/self-evaluation-form";
import {
  editorRowsFromStored,
  storedFromEditor,
  type LegalDocumentRow,
  type LegalDocumentStored,
} from "@backend/modules/bis/legal-documents";
import { formatClientAddressLine } from "@backend/shared/format-client-address";
import { formatDisplayDate } from "@backend/shared/format-date";
import type { LicenseScopeSavePayload } from "@/components/dashboard/modals/license-scope-editor-modal";
import { BIS_APPLICATION_DROPDOWN_KEYS, DROPDOWN_KEY_CLIENT_COMPANY_SCALE } from "@backend/shared/dropdown-keys";
import type { ClientDetail as SavedClientDetail } from "@backend/actions/renewals";
import { AppDropdownCombobox } from "@/components/modules/client-master/app-dropdown-combobox";
import { type AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

const APP_SYSTEM_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with:
- New BIS license applications and procedures
- Application status tracking and follow-ups
- Documents required for fresh applications
- MANAK Online portal filing procedures
- IS code selection and product inclusion
- Application timelines and BIS inspection process

Be concise, practical, and use Indian BIS/ISI certification context.`;

const APP_STARTERS = [
  "How do I apply for a new BIS license?",
  "What documents are needed for a fresh application?",
  "How long does BIS approval take?",
  "What is product inclusion in BIS?",
];

type ClientDetail = {
  name: string | null;
  company_name: string | null;
  contact_person_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pin_code: string | null;
  gst_number: string | null;
  company_type: string | null;
  company_scale: string | null;
  opening_balance: number | null;
  balance_type: string | null;
  payment_term: string | null;
};

type IsCodeDetail = {
  is_number: string | null;
  revision_year: number | null;
  is_code_title: string | null;
  aspect_of_is: string | null;
  unit_of_is: string | null;
  product_manual_number: string | null;
  testing_charges: number | null;
  mmf_large_scale: number | null;
  mmf_medium_scale: number | null;
  mmf_small_scale: number | null;
  mmf_micro_scale: number | null;
  slab_1_quantity: string | null;
  slab_1_rate: number | null;
  slab_2_quantity: string | null;
  slab_2_rate: number | null;
  slab_3_quantity: string | null;
  slab_3_rate: number | null;
};

type ApplicationRow = {
  id: string;
  title: string;
  status: string;
  project_kind: string;
  created_at: string | null;
  target_date: string | null;
  client_id: string | null;
  cm_l_digits: string | null;
  license_validity_date: string | null;
  client_name: string;
  is_number: string | null;
  is_revision_year: number | null;
  is_code_title: string | null;
  is_code_id: string | null;
  notes: string | null;
  source?: BisApplicationSource;
};

type ChecklistRow = {
  id: string;
  description: string;
  particular: string;
  content: string;
  done: boolean;
};

function ParticularCell({
  item,
  projectId,
  onUpdate,
  onGenerateDocument,
}: {
  item: ChecklistRow;
  projectId: string;
  onUpdate: (patch: Partial<ChecklistRow>) => void;
  onGenerateDocument: (item: ChecklistRow) => void;
}) {
  const [localText, setLocalText] = useState(item.content ?? "");
  const [appliedContent, setAppliedContent] = useState(item.content ?? "");
  const [uploading, setUploading] = useState(false);

  if ((item.content ?? "") !== appliedContent) {
    setAppliedContent(item.content ?? "");
    setLocalText(item.content ?? "");
  }

  const type = item.particular;

  if (type === "Information") {
    return (
      <input
        type="text"
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={() => {
          if (localText !== item.content) onUpdate({ content: localText });
        }}
        placeholder="Enter information…"
        disabled={item.done}
        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
    );
  }

  if (type === "Upload Documents") {
    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const supabase = createClient();
        const path = `bis-projects/${projectId}/${item.id}/${file.name}`;
        const result = await uploadTechnicalStaffDocument(supabase, path, file);
        if ("error" in result) {
          window.alert("Upload failed: " + result.error);
          return;
        }
        onUpdate({ content: result.ref });
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    }

    return (
      <div className="flex items-center gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ${item.done ? "pointer-events-none opacity-50" : ""}`}>
          {uploading ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
          {uploading ? "Uploading…" : item.content ? "Replace" : "Upload File"}
          <input type="file" className="hidden" onChange={(e) => void handleFile(e)} disabled={uploading || item.done} />
        </label>
        {item.content && (
          <StorageDocumentLink
            value={item.content}
            className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300"
            label={
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </>
            }
          />
        )}
      </div>
    );
  }

  if (type === "Generate Document") {
    return (
      <button
        type="button"
        disabled={item.done}
        onClick={() => onGenerateDocument(item)}
        className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Generate Document
      </button>
    );
  }

  return <span className="text-xs text-zinc-400">—</span>;
}

function DocumentTemplateModal({
  item,
  client,
  isCode,
  onClose,
}: {
  item: ChecklistRow;
  client: ClientDetail | null;
  isCode: IsCodeDetail | null;
  onClose: () => void;
}) {
  const address = formatClientAddressLine({
    address: client?.address,
    city: client?.city,
    pin_code: client?.pin_code,
    state: client?.state,
  });

  function handlePrint() {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { window.alert("Please allow popups to print."); return; }
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${item.description}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Times New Roman',serif;font-size:12pt;color:#000;padding:1in}
    .letterhead{text-align:center;border-bottom:3px double #000;padding-bottom:14pt;margin-bottom:20pt}
    .co-name{font-size:18pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
    .co-meta{font-size:10pt;margin-top:4pt;color:#333}
    .doc-title{text-align:center;margin:20pt 0 6pt;font-size:14pt;font-weight:bold;text-transform:uppercase;text-decoration:underline}
    .doc-ref{text-align:center;font-size:10pt;color:#555;margin-bottom:28pt}
    .body-area{min-height:4in}
    .body-line{border-bottom:1px solid #aaa;margin-bottom:28pt}
    .footer{text-align:center;margin-top:40pt;border-top:1px solid #aaa;padding-top:8pt;font-size:10pt;color:#555}
    @media print{body{padding:.75in}}
  </style>
</head>
<body>
  <div class="letterhead">
    <div class="co-name">${client?.company_name ?? "Company Name"}</div>
    <div class="co-meta">${address || ""}</div>
    ${client?.phone || client?.email ? `<div class="co-meta">${[client?.phone && `Ph: ${client.phone}`, client?.email && `Email: ${client.email}`].filter(Boolean).join(" | ")}</div>` : ""}
    ${client?.gst_number ? `<div class="co-meta">GSTIN: ${client.gst_number}</div>` : ""}
  </div>
  <div class="doc-title">${item.description}</div>
  ${isCode ? `<div class="doc-ref">Ref: IS ${isCode.is_number ?? ""}${isCode.revision_year ? `: ${isCode.revision_year}` : ""}${isCode.is_code_title ? ` — ${isCode.is_code_title}` : ""}</div>` : ""}
  <div class="body-area">
    ${Array.from({ length: 10 }).map(() => `<div class="body-line"></div>`).join("")}
  </div>
  <div class="footer">Prepared by: Quality Engineering Consultancy | BIS Certification Document</div>
</body>
</html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl dark:bg-zinc-900 max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-700">
          <div>
            <h3 className="font-bold text-zinc-800 dark:text-zinc-100">Generate Document</h3>
            <p className="text-xs text-zinc-500">{item.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Download
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-zinc-100 p-6 dark:bg-zinc-950">
          <div className="mx-auto max-w-xl bg-white p-8 font-serif shadow-md dark:bg-zinc-900 dark:text-zinc-100">
            <div className="border-b-2 border-zinc-800 pb-4 text-center dark:border-zinc-300">
              <h1 className="text-xl font-bold uppercase tracking-wide">{client?.company_name ?? "Company Name"}</h1>
              {address && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{address}</p>}
              {(client?.phone || client?.email) && (
                <p className="mt-0.5 text-xs text-zinc-500">
                  {[client?.phone && `Ph: ${client.phone}`, client?.email && `Email: ${client.email}`].filter(Boolean).join(" | ")}
                </p>
              )}
              {client?.gst_number && <p className="mt-0.5 text-xs text-zinc-500">GSTIN: {client.gst_number}</p>}
            </div>
            <div className="my-6 text-center">
              <h2 className="text-base font-bold uppercase tracking-widest underline">{item.description}</h2>
              {isCode && (
                <p className="mt-1 text-xs text-zinc-500">
                  Ref: IS {isCode.is_number}{isCode.revision_year ? `: ${isCode.revision_year}` : ""}{isCode.is_code_title ? ` — ${isCode.is_code_title}` : ""}
                </p>
              )}
            </div>
            <div className="min-h-48 space-y-7 py-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="border-b border-zinc-300 dark:border-zinc-600" />
              ))}
            </div>
            <div className="mt-8 border-t border-zinc-300 pt-3 text-center dark:border-zinc-600">
              <p className="text-xs text-zinc-500">Prepared by: Quality Engineering Consultancy</p>
              <p className="mt-0.5 text-xs text-zinc-400">BIS Certification Document</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const APP_DOC_TABLE_BTN_BASE =
  "inline-flex items-center gap-0.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-none shadow-sm transition";

const APP_DOC_TABLE_CELL = "px-2.5 py-0.5";

const APP_DOC_TABLE_ROWS_PER_SECTION = 15;

const APP_DOC_TABLE_BTN_TEAL =
  `${APP_DOC_TABLE_BTN_BASE} border-teal-200 bg-teal-50 text-teal-700 hover:border-teal-300 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:border-teal-600`;

const APP_DOC_TABLE_BTN_VIOLET =
  `${APP_DOC_TABLE_BTN_BASE} border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:border-violet-600`;

type AppDocShortcutAccent = "teal" | "violet";

type AppDocShortcutRow = {
  description: string;
  accent: AppDocShortcutAccent;
  icon: React.ReactNode;
  onOpen: () => void;
};

function AppDocShortcutIcon({ kind }: { kind: string }) {
  const cls = "h-3 w-3 shrink-0";
  switch (kind) {
    case "details":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    case "license-scope":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "sample":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      );
    case "people":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "staff":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "evaluation":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case "chart":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "transfer":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    case "machinery":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "equipment":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      );
    case "package":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "document":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "brand":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
      );
    case "fee":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "shield":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "map":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      );
    case "layout":
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
}

function ApplicationDocumentShortcutsTable({
  rows,
  startIndex = 1,
  className = "",
}: {
  rows: AppDocShortcutRow[];
  startIndex?: number;
  className?: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div
      className={`overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${className}`}
    >
      <table className="w-full border-collapse text-xs table-auto">
        <colgroup>
          <col className="w-0" />
          <col />
          <col className="w-0" />
        </colgroup>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
            <th className={`whitespace-nowrap ${APP_DOC_TABLE_CELL} text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300`}>
              Sr. No.
            </th>
            <th className={`${APP_DOC_TABLE_CELL} text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300`}>
              Description of Document / Information
            </th>
            <th className={`whitespace-nowrap ${APP_DOC_TABLE_CELL} text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300`}>
              Documents
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.description}
              className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
            >
              <td className={`whitespace-nowrap ${APP_DOC_TABLE_CELL} text-center text-xs font-medium leading-none text-zinc-700 dark:text-zinc-200`}>
                {startIndex + index}
              </td>
              <td className={`${APP_DOC_TABLE_CELL} text-xs leading-snug text-zinc-800 dark:text-zinc-100`}>
                {row.description}
              </td>
              <td className={`whitespace-nowrap ${APP_DOC_TABLE_CELL}`}>
                <button
                  type="button"
                  onClick={row.onOpen}
                  className={row.accent === "violet" ? APP_DOC_TABLE_BTN_VIOLET : APP_DOC_TABLE_BTN_TEAL}
                >
                  {row.icon}
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApplicationDocumentShortcutsTables({ rows }: { rows: AppDocShortcutRow[] }) {
  const firstTableRows = rows.slice(0, APP_DOC_TABLE_ROWS_PER_SECTION);
  const secondTableRows = rows.slice(APP_DOC_TABLE_ROWS_PER_SECTION, APP_DOC_TABLE_ROWS_PER_SECTION * 2);

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:gap-4">
      <ApplicationDocumentShortcutsTable rows={firstTableRows} startIndex={1} />
      <ApplicationDocumentShortcutsTable
        rows={secondTableRows}
        startIndex={APP_DOC_TABLE_ROWS_PER_SECTION + 1}
      />
    </div>
  );
}

function ApplicationFormModal({ row, onClose }: { row: ApplicationRow; onClose: () => void }) {
  const initialNotes = parseApplicationChecklistNotes(row.notes);
  const initialScope = parseBisProjectLicenseScopeNotes(row.notes);
  const [descOptions, setDescOptions] = useState<AppDropdownOptionRow[]>([]);
  const applicationDropdownKeys = useMemo(
    () => [...BIS_APPLICATION_DROPDOWN_KEYS, DROPDOWN_KEY_CLIENT_COMPANY_SCALE] as const,
    [],
  );
  const [appDropdownOptions, setAppDropdownOptions] = useState<
    Record<string, AppDropdownOptionRow[]>
  >({});

  const [items, setItems] = useState<ChecklistRow[]>(() =>
    initialNotes.items.map((it) => {
      const rowItem = it as Record<string, unknown>;
      return {
        id: rowItem.id as string,
        description: (rowItem.description as string) ?? "",
        particular: (rowItem.particular as string) ?? "",
        content: (rowItem.content as string) ?? "",
        done: Boolean(rowItem.done),
      };
    }),
  );
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isCode, setIsCode] = useState<IsCodeDetail | null>(null);
  const [docTemplateItem, setDocTemplateItem] = useState<ChecklistRow | null>(null);
  const [showClientEdit, setShowClientEdit] = useState(false);
  const [showIsCodeEdit, setShowIsCodeEdit] = useState(false);
  const [showApplicationDetails, setShowApplicationDetails] = useState(false);
  const [showLicenseScopeEditor, setShowLicenseScopeEditor] = useState(false);
  const [showOslSampleRequirements, setShowOslSampleRequirements] = useState(false);
  const [showPiSampleRequirements, setShowPiSampleRequirements] = useState(false);
  const [showTopManagement, setShowTopManagement] = useState(false);
  const [showTechnicalStaff, setShowTechnicalStaff] = useState(false);
  const [showFactoryTestReport, setShowFactoryTestReport] = useState(false);
  const [showSubcontractedTests, setShowSubcontractedTests] = useState(false);
  const [showCmpf305, setShowCmpf305] = useState(false);
  const [showCmpf306, setShowCmpf306] = useState(false);
  const [showRawMaterialDetails, setShowRawMaterialDetails] = useState(false);
  const [showCertifiedReferenceMaterials, setShowCertifiedReferenceMaterials] = useState(false);
  const [showCmpf307, setShowCmpf307] = useState(false);
  const [showCmpf310, setShowCmpf310] = useState(false);
  const [showCmpf311, setShowCmpf311] = useState(false);
  const [showUndertakingOption2, setShowUndertakingOption2] = useState(false);
  const [showUndertakingLongDurationTest, setShowUndertakingLongDurationTest] = useState(false);
  const [showUndertakingMinimumMarkingFee, setShowUndertakingMinimumMarkingFee] = useState(false);
  const [showAuthorizationLetter, setShowAuthorizationLetter] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [showPlantLayout, setShowPlantLayout] = useState(false);
  const [showProcessFlowChart, setShowProcessFlowChart] = useState(false);
  const [showProcessDescription, setShowProcessDescription] = useState(false);
  const [showUpdatedSchemeOfInspection, setShowUpdatedSchemeOfInspection] = useState(false);
  const [showSelfEvaluationForm, setShowSelfEvaluationForm] = useState(false);
  const [showUndertakingGeneralIss, setShowUndertakingGeneralIss] = useState(false);
  const [reopenFtrAfterSampleEdit, setReopenFtrAfterSampleEdit] = useState(false);
  const [sampleOfferLetterFocusIndex, setSampleOfferLetterFocusIndex] = useState<number | null>(
    null,
  );
  const [licenseScope, setLicenseScope] = useState(() =>
    initialScope.scopeType === "plain"
      ? initialScope.plainText || initialNotes.licenseScope
      : initialNotes.licenseScope,
  );
  const [licenseScopeFormat, setLicenseScopeFormat] = useState<LicenseScopeFormat>(
    initialScope.scopeType,
  );
  const [licenseScopeRows, setLicenseScopeRows] = useState<LicenseScopeTableRow[]>(
    initialScope.rows.length > 0 ? initialScope.rows : initialNotes.licenseScopeRows,
  );
  const [oslSampleRequirements, setOslSampleRequirements] = useState<OslSampleRequirementStored[]>(
    initialNotes.oslSampleRequirements,
  );
  const [piSampleRequirements, setPiSampleRequirements] = useState<OslSampleRequirementStored[]>(
    initialNotes.piSampleRequirements,
  );
  const [topManagement, setTopManagement] = useState<TopManagementStored[]>(
    initialNotes.topManagement,
  );
  const [technicalStaff, setTechnicalStaff] = useState<TechnicalStaffStored[]>(
    initialNotes.technicalStaff,
  );
  const [factoryTestReports, setFactoryTestReports] = useState<FactoryTestReportStored[]>(
    initialNotes.factoryTestReports,
  );
  const [subcontractedTests, setSubcontractedTests] = useState<SubcontractedTestStored[]>(
    initialNotes.subcontractedTests,
  );
  const [subcontractedTestsDocument, setSubcontractedTestsDocument] =
    useState<SubcontractedTestsDocumentStored>(initialNotes.subcontractedTestsDocument);
  const [cmpf305Machinery, setCmpf305Machinery] = useState<Cmpf305MachineryStored[]>(
    initialNotes.cmpf305Machinery,
  );
  const [rawMaterialDetails, setRawMaterialDetails] = useState<RawMaterialStored[]>(
    initialNotes.rawMaterialDetails,
  );
  const [certifiedReferenceMaterials, setCertifiedReferenceMaterials] = useState<
    CertifiedReferenceMaterialStored[]
  >(initialNotes.certifiedReferenceMaterials);
  const [cmpf306, setCmpf306] = useState<Cmpf306Stored>(initialNotes.cmpf306);
  const [cmpf307, setCmpf307] = useState<Cmpf307Stored>(initialNotes.cmpf307);
  const [cmpf310, setCmpf310] = useState<Cmpf310Stored>(initialNotes.cmpf310);
  const [cmpf311, setCmpf311] = useState<Cmpf311Stored>(initialNotes.cmpf311);
  const [undertakingOption2, setUndertakingOption2] = useState<UndertakingOption2Stored>(
    initialNotes.undertakingOption2,
  );
  const [undertakingGeneralIss, setUndertakingGeneralIss] = useState<UndertakingGeneralIssStored>(
    initialNotes.undertakingGeneralIss,
  );
  const [authorizationLetter, setAuthorizationLetter] = useState<AuthorizationLetterStored>(
    initialNotes.authorizationLetter,
  );
  const [undertakingLongDurationTest, setUndertakingLongDurationTest] =
    useState<UndertakingLongDurationTestStored>(initialNotes.undertakingLongDurationTest);
  const [undertakingMinimumMarkingFee, setUndertakingMinimumMarkingFee] =
    useState<UndertakingMinimumMarkingFeeStored>(initialNotes.undertakingMinimumMarkingFee);
  const [locationMap, setLocationMap] = useState<LocationMapStored>(initialNotes.locationMap);
  const [plantLayout, setPlantLayout] = useState<PlantLayoutStored>(initialNotes.plantLayout);
  const [processFlowChart, setProcessFlowChart] = useState<ProcessFlowChartStored>(
    initialNotes.processFlowChart,
  );
  const [processDescription, setProcessDescription] = useState<ProcessDescriptionStored>(
    initialNotes.processDescription,
  );
  const [updatedSchemeOfInspection, setUpdatedSchemeOfInspection] =
    useState<UpdatedSchemeOfInspectionStored>(initialNotes.updatedSchemeOfInspection);
  const [selfEvaluationForm, setSelfEvaluationForm] = useState<SelfEvaluationFormStored>(
    initialNotes.selfEvaluationForm,
  );
  const [applicationMeta, setApplicationMeta] = useState<ApplicationMeta>(initialNotes.meta);
  const [legalDocumentRows, setLegalDocumentRows] = useState<LegalDocumentRow[]>(() =>
    editorRowsFromStored(initialNotes.legalDocuments),
  );
  const productManualPrefilledRef = useRef(false);
  const firmScalePrefilledRef = useRef(false);
  const [saving, startSave] = useTransition();
  const saveNotesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNotesSaveRef = useRef<{
    items?: ChecklistRow[];
    meta?: ApplicationMeta;
    licenseScope?: string;
    licenseScopeFormat?: LicenseScopeFormat;
    licenseScopeRows?: LicenseScopeTableRow[];
    oslSampleRequirements?: OslSampleRequirementStored[];
    piSampleRequirements?: OslSampleRequirementStored[];
    topManagement?: TopManagementStored[];
    technicalStaff?: TechnicalStaffStored[];
    factoryTestReports?: FactoryTestReportStored[];
    subcontractedTests?: SubcontractedTestStored[];
    subcontractedTestsDocument?: SubcontractedTestsDocumentStored;
    cmpf305Machinery?: Cmpf305MachineryStored[];
    rawMaterialDetails?: RawMaterialStored[];
    certifiedReferenceMaterials?: CertifiedReferenceMaterialStored[];
    cmpf306?: Cmpf306Stored;
    cmpf307?: Cmpf307Stored;
    cmpf310?: Cmpf310Stored;
    cmpf311?: Cmpf311Stored;
    undertakingOption2?: UndertakingOption2Stored;
    undertakingGeneralIss?: UndertakingGeneralIssStored;
    authorizationLetter?: AuthorizationLetterStored;
    undertakingLongDurationTest?: UndertakingLongDurationTestStored;
    undertakingMinimumMarkingFee?: UndertakingMinimumMarkingFeeStored;
    locationMap?: LocationMapStored;
    plantLayout?: PlantLayoutStored;
    processFlowChart?: ProcessFlowChartStored;
    processDescription?: ProcessDescriptionStored;
    updatedSchemeOfInspection?: UpdatedSchemeOfInspectionStored;
    selfEvaluationForm?: SelfEvaluationFormStored;
    legalDocuments?: LegalDocumentStored[];
  }>({});

  const flushNotesSave = useCallback(() => {
    const overrides = pendingNotesSaveRef.current;
    pendingNotesSaveRef.current = {};
    startSave(async () => {
      const payload = buildApplicationChecklistPayload({
        items: overrides.items ?? items,
        licenseScope: overrides.licenseScope ?? licenseScope,
        licenseScopeFormat: overrides.licenseScopeFormat ?? licenseScopeFormat,
        licenseScopeRows: overrides.licenseScopeRows ?? licenseScopeRows,
        oslSampleRequirements: overrides.oslSampleRequirements ?? oslSampleRequirements,
        piSampleRequirements: overrides.piSampleRequirements ?? piSampleRequirements,
        topManagement: overrides.topManagement ?? topManagement,
        technicalStaff: overrides.technicalStaff ?? technicalStaff,
        factoryTestReports: overrides.factoryTestReports ?? factoryTestReports,
        subcontractedTests: overrides.subcontractedTests ?? subcontractedTests,
        subcontractedTestsDocument:
          overrides.subcontractedTestsDocument ?? subcontractedTestsDocument,
        cmpf305Machinery: overrides.cmpf305Machinery ?? cmpf305Machinery,
        rawMaterialDetails: overrides.rawMaterialDetails ?? rawMaterialDetails,
        certifiedReferenceMaterials:
          overrides.certifiedReferenceMaterials ?? certifiedReferenceMaterials,
        cmpf306: overrides.cmpf306 ?? cmpf306,
        cmpf307: overrides.cmpf307 ?? cmpf307,
        cmpf310: overrides.cmpf310 ?? cmpf310,
        cmpf311: overrides.cmpf311 ?? cmpf311,
        undertakingOption2: overrides.undertakingOption2 ?? undertakingOption2,
        undertakingGeneralIss: overrides.undertakingGeneralIss ?? undertakingGeneralIss,
        authorizationLetter: overrides.authorizationLetter ?? authorizationLetter,
        undertakingLongDurationTest:
          overrides.undertakingLongDurationTest ?? undertakingLongDurationTest,
        undertakingMinimumMarkingFee:
          overrides.undertakingMinimumMarkingFee ?? undertakingMinimumMarkingFee,
        locationMap: overrides.locationMap ?? locationMap,
        plantLayout: overrides.plantLayout ?? plantLayout,
        processFlowChart: overrides.processFlowChart ?? processFlowChart,
        processDescription: overrides.processDescription ?? processDescription,
        updatedSchemeOfInspection:
          overrides.updatedSchemeOfInspection ?? updatedSchemeOfInspection,
        selfEvaluationForm: overrides.selfEvaluationForm ?? selfEvaluationForm,
        legalDocuments: overrides.legalDocuments ?? storedFromEditor(legalDocumentRows),
        meta: overrides.meta ?? applicationMeta,
      });
      if (row.source === "bis_new_applications") {
        await updateBisNewApplicationNotes(row.id, payload);
      } else {
        await updateBisProjectNotes(row.id, payload);
      }
    });
  }, [row.id, row.source, items, licenseScope, licenseScopeFormat, licenseScopeRows, oslSampleRequirements, piSampleRequirements, topManagement, technicalStaff, factoryTestReports, subcontractedTests, subcontractedTestsDocument, cmpf305Machinery, rawMaterialDetails, certifiedReferenceMaterials, cmpf306, cmpf307, cmpf310, cmpf311, undertakingOption2, undertakingGeneralIss, authorizationLetter, undertakingLongDurationTest, undertakingMinimumMarkingFee, locationMap, plantLayout, processFlowChart, processDescription, updatedSchemeOfInspection, selfEvaluationForm, legalDocumentRows, applicationMeta]);

  const saveNotesToDb = useCallback(
    (overrides?: {
      items?: ChecklistRow[];
      meta?: ApplicationMeta;
      licenseScope?: string;
      licenseScopeFormat?: LicenseScopeFormat;
      licenseScopeRows?: LicenseScopeTableRow[];
      oslSampleRequirements?: OslSampleRequirementStored[];
      piSampleRequirements?: OslSampleRequirementStored[];
      topManagement?: TopManagementStored[];
      technicalStaff?: TechnicalStaffStored[];
      factoryTestReports?: FactoryTestReportStored[];
      subcontractedTests?: SubcontractedTestStored[];
      subcontractedTestsDocument?: SubcontractedTestsDocumentStored;
      cmpf305Machinery?: Cmpf305MachineryStored[];
      rawMaterialDetails?: RawMaterialStored[];
      certifiedReferenceMaterials?: CertifiedReferenceMaterialStored[];
      cmpf306?: Cmpf306Stored;
      cmpf307?: Cmpf307Stored;
      cmpf310?: Cmpf310Stored;
      cmpf311?: Cmpf311Stored;
      undertakingOption2?: UndertakingOption2Stored;
      undertakingGeneralIss?: UndertakingGeneralIssStored;
      authorizationLetter?: AuthorizationLetterStored;
      undertakingLongDurationTest?: UndertakingLongDurationTestStored;
      undertakingMinimumMarkingFee?: UndertakingMinimumMarkingFeeStored;
      locationMap?: LocationMapStored;
      plantLayout?: PlantLayoutStored;
      processFlowChart?: ProcessFlowChartStored;
      processDescription?: ProcessDescriptionStored;
      updatedSchemeOfInspection?: UpdatedSchemeOfInspectionStored;
      selfEvaluationForm?: SelfEvaluationFormStored;
      legalDocuments?: LegalDocumentStored[];
    }) => {
      pendingNotesSaveRef.current = {
        ...pendingNotesSaveRef.current,
        ...overrides,
      };
      if (saveNotesTimerRef.current) {
        clearTimeout(saveNotesTimerRef.current);
      }
      saveNotesTimerRef.current = setTimeout(() => {
        saveNotesTimerRef.current = null;
        flushNotesSave();
      }, 500);
    },
    [flushNotesSave],
  );

  useEffect(() => {
    return () => {
      if (saveNotesTimerRef.current) {
        clearTimeout(saveNotesTimerRef.current);
        saveNotesTimerRef.current = null;
      }
      if (Object.keys(pendingNotesSaveRef.current).length > 0) {
        flushNotesSave();
      }
    };
  }, [flushNotesSave]);

  const reloadOptions = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("app_dropdown_options")
      .select("*")
      .eq("option_key", "particular_description")
      .order("value", { ascending: true });
    if (data) setDescOptions(data as AppDropdownOptionRow[]);
  }, []);

  const reloadApplicationDropdowns = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("app_dropdown_options")
      .select("*")
      .in("option_key", [...applicationDropdownKeys])
      .order("value", { ascending: true });

    const grouped: Record<string, AppDropdownOptionRow[]> = {};
    for (const key of applicationDropdownKeys) grouped[key] = [];
    for (const opt of (data ?? []) as (AppDropdownOptionRow & { option_key?: string })[]) {
      const key = opt.option_key ?? "";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(opt);
    }
    setAppDropdownOptions(grouped);
  }, [applicationDropdownKeys]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_dropdown_options")
        .select("*")
        .eq("option_key", "particular_description")
        .order("value", { ascending: true });
      if (!cancelled && data) setDescOptions(data as AppDropdownOptionRow[]);
    })();

    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_dropdown_options")
        .select("*")
        .in("option_key", [...applicationDropdownKeys])
        .order("value", { ascending: true });

      if (cancelled) return;

      const grouped: Record<string, AppDropdownOptionRow[]> = {};
      for (const key of applicationDropdownKeys) grouped[key] = [];
      for (const opt of (data ?? []) as (AppDropdownOptionRow & { option_key?: string })[]) {
        const key = opt.option_key ?? "";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(opt);
      }
      setAppDropdownOptions(grouped);
    })();

    const supabase = createClient();

    async function loadDetails() {
      const tasks: PromiseLike<void>[] = [];

      tasks.push(
        supabase
          .from("bis_projects")
          .select("notes")
          .eq("id", row.id)
          .maybeSingle()
          .then(({ data }) => {
            if (cancelled) return;
            const parsed = parseApplicationChecklistNotes(data?.notes ?? row.notes);
            const scope = parseBisProjectLicenseScopeNotes(data?.notes ?? row.notes);
            setLicenseScope(
              scope.scopeType === "plain" ? scope.plainText || parsed.licenseScope : parsed.licenseScope,
            );
            setLicenseScopeFormat(scope.scopeType);
            setLicenseScopeRows(scope.rows.length > 0 ? scope.rows : parsed.licenseScopeRows);
            setOslSampleRequirements(parsed.oslSampleRequirements);
            setPiSampleRequirements(parsed.piSampleRequirements);
            setTopManagement(parsed.topManagement);
            setTechnicalStaff(parsed.technicalStaff);
            setFactoryTestReports(parsed.factoryTestReports);
            setApplicationMeta(parsed.meta);
          }),
      );

      if (row.client_id) {
        tasks.push(
          supabase
            .from("clients")
            .select("name, company_name, contact_person_name, email, phone, address, city, state, country, pin_code, gst_number, company_type, company_scale, opening_balance, balance_type, payment_term")
            .eq("id", row.client_id)
            .single()
            .then(({ data }) => {
              if (!cancelled) setClient(data as ClientDetail | null);
            }),
        );
      }

      if (row.is_code_id) {
        tasks.push(
          supabase
            .from("is_codes")
            .select(
              "is_number, revision_year, is_code_title, aspect_of_is, unit_of_is, product_manual_number, mmf_large_scale, mmf_medium_scale, mmf_small_scale, mmf_micro_scale, slab_1_rate",
            )
            .eq("id", row.is_code_id)
            .single()
            .then(({ data }) => {
              if (!cancelled) setIsCode(data as IsCodeDetail | null);
            }),
        );
      }

      await Promise.all(tasks);
    }

    loadDetails();
    return () => {
      cancelled = true;
    };
  }, [row.client_id, row.is_code_id, row.id, row.notes]);

  const done = items.filter((item) => item.done).length;
  const total = items.length;

  function updateMeta(patch: Partial<ApplicationMeta>) {
    const next = { ...applicationMeta, ...patch };
    setApplicationMeta(next);
    saveNotesToDb({ meta: next });
  }

  function updateLegalDocuments(rows: LegalDocumentRow[]) {
    setLegalDocumentRows(rows);
    saveNotesToDb({ legalDocuments: storedFromEditor(rows) });
  }

  function updateFirmScale(value: string) {
    const next = { ...applicationMeta, firm_scale: value };
    setApplicationMeta(next);
    saveNotesToDb({ meta: next });

    if (!row.client_id) return;

    const clientId = row.client_id;
    const scaleValue = value.trim() || null;
    void (async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("clients")
        .update({ company_scale: scaleValue })
        .eq("id", clientId);
      if (error) {
        window.alert(`Firm scale saved on application but Client Master update failed: ${error.message}`);
        return;
      }
      setClient((prev) => (prev ? { ...prev, company_scale: scaleValue } : prev));
    })();
  }

  useEffect(() => {
    productManualPrefilledRef.current = false;
    firmScalePrefilledRef.current = false;
  }, [row.id]);

  useEffect(() => {
    if (firmScalePrefilledRef.current) return;
    const fromClient = client?.company_scale?.trim() ?? "";
    if (applicationMeta.firm_scale.trim()) {
      firmScalePrefilledRef.current = true;
      return;
    }
    if (!fromClient) return;
    firmScalePrefilledRef.current = true;
    const next = { ...applicationMeta, firm_scale: fromClient };
    setApplicationMeta(next);
    saveNotesToDb({ meta: next });
  }, [client?.company_scale, applicationMeta.firm_scale]);

  useEffect(() => {
    if (productManualPrefilledRef.current) return;
    const fromIs = isCode?.product_manual_number?.trim() ?? "";
    if (applicationMeta.product_manual_number.trim()) {
      productManualPrefilledRef.current = true;
      return;
    }
    if (!fromIs) return;
    productManualPrefilledRef.current = true;
    updateMeta({ product_manual_number: fromIs });
  }, [isCode?.product_manual_number, applicationMeta.product_manual_number]);

  function updateItem(id: string, patch: Partial<ChecklistRow>) {
    const newItems = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
    setItems(newItems);
    saveNotesToDb({ items: newItems });
  }

  function removeItem(id: string) {
    const newItems = items.filter((item) => item.id !== id);
    setItems(newItems);
    saveNotesToDb({ items: newItems });
  }

  const isFullNumber =
    isCode?.is_number && isCode.revision_year
      ? `${isCode.is_number}: ${isCode.revision_year}`
      : row.is_number
        ? `${row.is_number}${row.is_revision_year ? `: ${row.is_revision_year}` : ""}`
        : "—";

  function saveLicenseScope(payload: LicenseScopeSavePayload) {
    setLicenseScope(payload.licenseScope);
    setLicenseScopeFormat(payload.format);
    setLicenseScopeRows(payload.rows);
    saveNotesToDb({
      licenseScope: payload.licenseScope,
      licenseScopeFormat: payload.format,
      licenseScopeRows: payload.rows,
    });
  }

  function saveOslSampleRequirements(rows: OslSampleRequirementStored[]) {
    setOslSampleRequirements(rows);
    saveNotesToDb({ oslSampleRequirements: rows });
  }

  function savePiSampleRequirements(rows: OslSampleRequirementStored[]) {
    setPiSampleRequirements(rows);
    saveNotesToDb({ piSampleRequirements: rows });
  }

  function saveTopManagement(rows: TopManagementStored[]) {
    setTopManagement(rows);
    saveNotesToDb({ topManagement: rows });
  }

  function saveTechnicalStaff(rows: TechnicalStaffStored[]) {
    setTechnicalStaff(rows);
    saveNotesToDb({ technicalStaff: rows });
  }

  function saveFactoryTestReports(rows: FactoryTestReportStored[]) {
    setFactoryTestReports(rows);
    saveNotesToDb({ factoryTestReports: rows });
  }

  function saveSubcontractedTests(payload: {
    rows: SubcontractedTestStored[];
    document: SubcontractedTestsDocumentStored;
  }) {
    setSubcontractedTests(payload.rows);
    setSubcontractedTestsDocument(payload.document);
    saveNotesToDb({
      subcontractedTests: payload.rows,
      subcontractedTestsDocument: payload.document,
    });
  }

  function saveCmpf305Machinery(rows: Cmpf305MachineryStored[]) {
    setCmpf305Machinery(rows);
    saveNotesToDb({ cmpf305Machinery: rows });
  }

  function saveRawMaterialDetails(rows: RawMaterialStored[]) {
    setRawMaterialDetails(rows);
    saveNotesToDb({ rawMaterialDetails: rows });
  }

  function saveCertifiedReferenceMaterials(rows: CertifiedReferenceMaterialStored[]) {
    setCertifiedReferenceMaterials(rows);
    saveNotesToDb({ certifiedReferenceMaterials: rows });
  }

  function saveCmpf306(document: Cmpf306Stored) {
    setCmpf306(document);
    saveNotesToDb({ cmpf306: document });
  }

  function saveCmpf307(document: Cmpf307Stored) {
    setCmpf307(document);
    saveNotesToDb({ cmpf307: document });
  }

  function saveCmpf310(document: Cmpf310Stored) {
    setCmpf310(document);
    saveNotesToDb({ cmpf310: document });
  }

  function saveCmpf311(document: Cmpf311Stored) {
    setCmpf311(document);
    saveNotesToDb({ cmpf311: document });
  }

  function saveUndertakingOption2(document: UndertakingOption2Stored) {
    setUndertakingOption2(document);
    saveNotesToDb({ undertakingOption2: document });
  }

  function saveUndertakingGeneralIss(document: UndertakingGeneralIssStored) {
    setUndertakingGeneralIss(document);
    saveNotesToDb({ undertakingGeneralIss: document });
  }

  function saveAuthorizationLetter(document: AuthorizationLetterStored) {
    setAuthorizationLetter(document);
    saveNotesToDb({ authorizationLetter: document });
  }

  function saveUndertakingLongDurationTest(document: UndertakingLongDurationTestStored) {
    setUndertakingLongDurationTest(document);
    saveNotesToDb({ undertakingLongDurationTest: document });
  }

  function saveUndertakingMinimumMarkingFee(document: UndertakingMinimumMarkingFeeStored) {
    setUndertakingMinimumMarkingFee(document);
    saveNotesToDb({ undertakingMinimumMarkingFee: document });
  }

  function saveLocationMap(document: LocationMapStored) {
    setLocationMap(document);
    saveNotesToDb({ locationMap: document });
  }

  function savePlantLayout(document: PlantLayoutStored) {
    setPlantLayout(document);
    saveNotesToDb({ plantLayout: document });
  }

  function saveProcessFlowChart(document: ProcessFlowChartStored) {
    setProcessFlowChart(document);
    saveNotesToDb({ processFlowChart: document });
  }

  function saveProcessDescription(document: ProcessDescriptionStored) {
    setProcessDescription(document);
    saveNotesToDb({ processDescription: document });
  }

  function saveUpdatedSchemeOfInspection(document: UpdatedSchemeOfInspectionStored) {
    setUpdatedSchemeOfInspection(document);
    saveNotesToDb({ updatedSchemeOfInspection: document });
  }

  function saveSelfEvaluationForm(document: SelfEvaluationFormStored) {
    setSelfEvaluationForm(document);
    saveNotesToDb({ selfEvaluationForm: document });
  }

  function handleEditSampleFromFtr(source: FtrSampleSource, sampleIndex: number) {
    setSampleOfferLetterFocusIndex(sampleIndex);
    setReopenFtrAfterSampleEdit(true);
    setShowFactoryTestReport(false);
    if (source === "osl") setShowOslSampleRequirements(true);
    else setShowPiSampleRequirements(true);
  }

  function closeOslSampleRequirementsModal() {
    setShowOslSampleRequirements(false);
    setSampleOfferLetterFocusIndex(null);
    if (reopenFtrAfterSampleEdit) {
      setReopenFtrAfterSampleEdit(false);
      setShowFactoryTestReport(true);
    }
  }

  function closePiSampleRequirementsModal() {
    setShowPiSampleRequirements(false);
    setSampleOfferLetterFocusIndex(null);
    if (reopenFtrAfterSampleEdit) {
      setReopenFtrAfterSampleEdit(false);
      setShowFactoryTestReport(true);
    }
  }

  function buildDeclarationData() {
    const address = formatClientAddressLine({
      address: client?.address,
      city: client?.city,
      pin_code: client?.pin_code,
      state: client?.state,
    });
    return {
      companyName: client?.company_name ?? row.client_name,
      address,
      city: client?.city ?? "",
      contactPerson: client?.contact_person_name ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      gstNumber: client?.gst_number ?? "",
      isNumber: isFullNumber !== "—" ? isFullNumber : "",
      isTitle: isCode?.is_code_title ?? row.is_code_title ?? "",
      bisBranchName: applicationMeta.bis_branch_name,
      bisBranchState: client?.state ?? "",
      bisBranchCountry: client?.country ?? "India",
      inspectionDate: row.target_date ?? "",
      applicationNumber: applicationMeta.application_number,
    };
  }

  const applicationDocShortcuts = useMemo((): AppDocShortcutRow[] => [
    {
      description: "Application Details",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="details" />,
      onOpen: () => setShowApplicationDetails(true),
    },
    {
      description: "Top Management Details",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="people" />,
      onOpen: () => setShowTopManagement(true),
    },
    {
      description: "Technical Staff Details",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="staff" />,
      onOpen: () => setShowTechnicalStaff(true),
    },
    {
      description: "Location Map",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="map" />,
      onOpen: () => setShowLocationMap(true),
    },
    {
      description: "Plant Layout",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="layout" />,
      onOpen: () => setShowPlantLayout(true),
    },
    {
      description: "Process Flow Chart",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="document" />,
      onOpen: () => setShowProcessFlowChart(true),
    },
    {
      description: "Process Description",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="document" />,
      onOpen: () => setShowProcessDescription(true),
    },
    {
      description: "Undertaking for License Scope",
      accent: "violet",
      icon: <AppDocShortcutIcon kind="license-scope" />,
      onOpen: () => setShowLicenseScopeEditor(true),
    },
    {
      description: "Sample for Out Side Lab",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="sample" />,
      onOpen: () => setShowOslSampleRequirements(true),
    },
    {
      description: "List of Plant & Machinery - CMPF 305",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="machinery" />,
      onOpen: () => setShowCmpf305(true),
    },
    {
      description: "List of Testing Equipments - CMPF - 306",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="equipment" />,
      onOpen: () => setShowCmpf306(true),
    },
    {
      description: "Brand Name Declaration - CMPF 307",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="brand" />,
      onOpen: () => setShowCmpf307(true),
    },
    {
      description: "Acceptance of Marking Fee - CMPF 310",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="fee" />,
      onOpen: () => setShowCmpf310(true),
    },
    {
      description: "Acceptance of Scheme of Inspection & Testing CMPF 311",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="shield" />,
      onOpen: () => setShowCmpf311(true),
    },
    {
      description: "Undertaking For Raw Material",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="package" />,
      onOpen: () => setShowRawMaterialDetails(true),
    },
    {
      description: "List of Certified Reference Material",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="equipment" />,
      onOpen: () => setShowCertifiedReferenceMaterials(true),
    },
    {
      description: "Undertaking for Simplified Procedure",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="document" />,
      onOpen: () => setShowUndertakingOption2(true),
    },
    {
      description: "Undertaking for General ISS",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="document" />,
      onOpen: () => setShowUndertakingGeneralIss(true),
    },
    {
      description: "Self Evaluation Form",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="evaluation" />,
      onOpen: () => setShowSelfEvaluationForm(true),
    },
    {
      description: "Authorization Letter",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="document" />,
      onOpen: () => setShowAuthorizationLetter(true),
    },
    {
      description: "Sample Offer for Inspection",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="sample" />,
      onOpen: () => setShowPiSampleRequirements(true),
    },
    {
      description: "Factory Test Reports",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="chart" />,
      onOpen: () => setShowFactoryTestReport(true),
    },
    {
      description: "Updated Scheme of Inspection & Testing",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="shield" />,
      onOpen: () => setShowUpdatedSchemeOfInspection(true),
    },
    {
      description: "Undertaking for Long Duration Test",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="document" />,
      onOpen: () => setShowUndertakingLongDurationTest(true),
    },
    {
      description: "Undertaking for Minimum Marking Fee",
      accent: "teal",
      icon: <AppDocShortcutIcon kind="fee" />,
      onOpen: () => setShowUndertakingMinimumMarkingFee(true),
    },
  ], []);

  function syncClientFromSaved(updated: SavedClientDetail) {
    setClient({
      name: updated.name,
      company_name: updated.company_name,
      contact_person_name: updated.contact_person_name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      city: updated.city,
      state: updated.state,
      country: updated.country,
      pin_code: updated.pin_code,
      gst_number: updated.gst_number,
      company_type: updated.company_type,
      company_scale: updated.company_scale,
      opening_balance: updated.opening_balance,
      balance_type: updated.balance_type,
      payment_term: updated.payment_term,
    });
  }

  function syncIsCodeFromSaved(updated: Pick<IsCodeDetail, "is_number" | "revision_year" | "is_code_title" | "aspect_of_is">) {
    setIsCode((prev) => ({
      is_number: updated.is_number,
      revision_year: updated.revision_year,
      is_code_title: updated.is_code_title,
      aspect_of_is: updated.aspect_of_is,
      unit_of_is: prev?.unit_of_is ?? null,
      product_manual_number: prev?.product_manual_number ?? null,
      testing_charges: prev?.testing_charges ?? null,
      mmf_large_scale: prev?.mmf_large_scale ?? null,
      mmf_medium_scale: prev?.mmf_medium_scale ?? null,
      mmf_small_scale: prev?.mmf_small_scale ?? null,
      mmf_micro_scale: prev?.mmf_micro_scale ?? null,
      slab_1_quantity: prev?.slab_1_quantity ?? null,
      slab_1_rate: prev?.slab_1_rate ?? null,
      slab_2_quantity: prev?.slab_2_quantity ?? null,
      slab_2_rate: prev?.slab_2_rate ?? null,
      slab_3_quantity: prev?.slab_3_quantity ?? null,
      slab_3_rate: prev?.slab_3_rate ?? null,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-zinc-900">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-3 sm:px-5 sm:py-4">
          <div className="relative flex items-center">
            <div className="absolute left-0 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 sm:flex">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="w-full text-center text-xs font-semibold uppercase tracking-wider text-white/80 sm:pl-0 sm:text-base">
              Application Checklist
            </p>
            <button
              onClick={onClose}
              className="absolute right-0 shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 text-sm font-extrabold text-white sm:text-lg">
                {client?.company_name ?? row.client_name}
              </p>
              {row.client_id && (
                <button
                  type="button"
                  onClick={() => setShowClientEdit(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>
            {isFullNumber !== "—" && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <p className="text-sm font-extrabold text-white sm:text-lg">
                  {isFullNumber}
                </p>
                {row.is_code_id && (
                  <button
                    type="button"
                    onClick={() => setShowIsCodeEdit(true)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Application documents */}
        <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-3 sm:px-5 sm:py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <ApplicationDocumentShortcutsTables rows={applicationDocShortcuts} />
        </div>

        {total > 0 && (
        <>
        {/* Mobile checklist cards */}
        <div className="divide-y divide-zinc-100 md:hidden dark:divide-zinc-800">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`space-y-3 px-3 py-3 sm:px-4 ${item.done ? "bg-sky-50/60 dark:bg-sky-950/20" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => updateItem(item.id, { done: e.target.checked })}
                      className="h-4 w-4 cursor-pointer rounded accent-sky-600"
                    />
                    Done
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    title="Remove"
                    className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Description
                </p>
                <AppDropdownCombobox
                  optionKey="particular_description"
                  name={`desc_${item.id}`}
                  label="Description"
                  dialogTitle="Manage Particular Descriptions"
                  addPlaceholder="Add description..."
                  manageAriaLabel="Manage descriptions"
                  value={item.description}
                  onChange={(v) => updateItem(item.id, { description: v })}
                  options={descOptions}
                  selectedValue={item.description}
                  onClearSelection={() => updateItem(item.id, { description: "" })}
                  hideLabel
                  listZIndexClass="z-[40]"
                  overlayZIndexClass="z-[50]"
                  inputRowShellClassName={`flex overflow-hidden rounded-lg border bg-white focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 dark:bg-zinc-800 ${item.done ? "border-zinc-200 opacity-50 dark:border-zinc-700" : "border-zinc-200 dark:border-zinc-700"}`}
                  onOptionAdded={reloadOptions}
                  onOptionDeleted={reloadOptions}
                  commitOnBlur
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Particular
                </p>
                <ParticularCell
                  item={item}
                  projectId={row.id}
                  onUpdate={(patch) => updateItem(item.id, patch)}
                  onGenerateDocument={setDocTemplateItem}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop checklist table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
              <tr>
                <th className="w-12 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sr No</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Description of Particulars</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Particular</th>
                <th className="w-16 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Done</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((item, i) => (
                <tr
                  key={item.id}
                  className={`transition-colors ${item.done ? "bg-sky-50/60 dark:bg-sky-950/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"}`}
                >
                  <td className="px-4 py-3 text-center text-xs font-bold text-zinc-400 dark:text-zinc-500">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <AppDropdownCombobox
                      optionKey="particular_description"
                      name={`desc_${item.id}`}
                      label="Description"
                      dialogTitle="Manage Particular Descriptions"
                      addPlaceholder="Add description..."
                      manageAriaLabel="Manage descriptions"
                      value={item.description}
                      onChange={(v) => updateItem(item.id, { description: v })}
                      options={descOptions}
                      selectedValue={item.description}
                      onClearSelection={() => updateItem(item.id, { description: "" })}
                      hideLabel
                      listZIndexClass="z-[40]"
                      overlayZIndexClass="z-[50]"
                      inputRowShellClassName={`flex overflow-hidden rounded-lg border bg-white focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 dark:bg-zinc-800 ${item.done ? 'border-zinc-200 opacity-50 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-700'}`}
                      onOptionAdded={reloadOptions}
                      onOptionDeleted={reloadOptions}
                      commitOnBlur
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ParticularCell
                      item={item}
                      projectId={row.id}
                      onUpdate={(patch) => updateItem(item.id, patch)}
                      onGenerateDocument={setDocTemplateItem}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => updateItem(item.id, { done: e.target.checked })}
                      className="h-4 w-4 cursor-pointer rounded accent-sky-600"
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      title="Remove"
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}

        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-3 py-3 sm:px-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {total > 0 && (
              <p className="hidden text-xs text-zinc-400 sm:inline">
                {done === total ? "✓ All items completed" : "Fill particulars and mark items as done"}
              </p>
            )}
            {saving && (
              <span className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400">
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
          >
            Close
          </button>
        </div>
      </div>

      {/* Document Template Modal */}
      {docTemplateItem && (
        <DocumentTemplateModal
          item={docTemplateItem}
          client={client}
          isCode={isCode}
          onClose={() => setDocTemplateItem(null)}
        />
      )}

      {showClientEdit && row.client_id && (
        <ClientEditModal
          clientId={row.client_id}
          onUpdated={syncClientFromSaved}
          onClose={() => setShowClientEdit(false)}
        />
      )}

      {showIsCodeEdit && row.is_code_id && (
        <IsCodeEditModal
          isCodeId={row.is_code_id}
          onUpdated={syncIsCodeFromSaved}
          onClose={() => setShowIsCodeEdit(false)}
        />
      )}

      {showLicenseScopeEditor && (
        <LicenseScopeEditorModal
          declarationData={buildDeclarationData()}
          topManagement={topManagement}
          licenseScope={licenseScope}
          licenseScopeFormat={licenseScopeFormat}
          licenseScopeRows={licenseScopeRows}
          isCodeId={row.is_code_id}
          isNumber={isCode?.is_number ?? row.is_number}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          onSave={saveLicenseScope}
          onClose={() => setShowLicenseScopeEditor(false)}
        />
      )}

      {showOslSampleRequirements && (
        <OslSampleRequirementsModal
          variant="osl"
          letterData={buildDeclarationData()}
          topManagement={topManagement}
          isCodeNumber={isCode?.is_number ?? row.is_number}
          isCodeId={row.is_code_id}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          rows={oslSampleRequirements}
          onSave={saveOslSampleRequirements}
          onClose={closeOslSampleRequirementsModal}
          initialFocusSampleIndex={sampleOfferLetterFocusIndex}
        />
      )}

      {showPiSampleRequirements && (
        <OslSampleRequirementsModal
          variant="pi"
          letterData={buildDeclarationData()}
          topManagement={topManagement}
          isCodeNumber={isCode?.is_number ?? row.is_number}
          isCodeId={row.is_code_id}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          rows={piSampleRequirements}
          onSave={savePiSampleRequirements}
          onClose={closePiSampleRequirementsModal}
          initialFocusSampleIndex={sampleOfferLetterFocusIndex}
        />
      )}

      {showTopManagement && (
        <TopManagementModal
          letterData={buildDeclarationData()}
          isCodeNumber={isCode?.is_number ?? row.is_number}
          isCodeId={row.is_code_id}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          rows={topManagement}
          onSave={saveTopManagement}
          onClose={() => setShowTopManagement(false)}
        />
      )}

      {showTechnicalStaff && (
        <TechnicalStaffModal
          projectId={row.id}
          letterData={buildDeclarationData()}
          topManagement={topManagement}
          isCodeNumber={isCode?.is_number ?? row.is_number}
          isCodeId={row.is_code_id}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          rows={technicalStaff}
          onSave={saveTechnicalStaff}
          onClose={() => setShowTechnicalStaff(false)}
        />
      )}

      {showFactoryTestReport && (
        <FactoryTestReportModal
          letterData={buildDeclarationData()}
          oslSamples={oslSampleRequirements}
          piSamples={piSampleRequirements}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          licenceNumber={
            row.cm_l_digits
              ? formatCmDisplay(row.project_kind, row.cm_l_digits)
              : ""
          }
          inspectionOfficerName={applicationMeta.inspection_officer_name}
          inspectionOfficerDesignation={applicationMeta.inspection_officer_designation}
          technicalStaff={technicalStaff}
          isCodeId={row.is_code_id}
          isNumber={isCode?.is_number ?? row.is_number}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          rows={factoryTestReports}
          onSave={saveFactoryTestReports}
          onClose={() => setShowFactoryTestReport(false)}
          onEditSample={handleEditSampleFromFtr}
        />
      )}

      {showSubcontractedTests && (
        <SubcontractedTestsModal
          letterData={buildDeclarationData()}
          topManagement={topManagement}
          isCodeId={row.is_code_id}
          isNumber={isCode?.is_number ?? row.is_number}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          rows={subcontractedTests}
          document={subcontractedTestsDocument}
          onSave={saveSubcontractedTests}
          onClose={() => setShowSubcontractedTests(false)}
        />
      )}

      {showCmpf305 && (
        <Cmpf305Modal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          inspectionOfficerName={applicationMeta.inspection_officer_name}
          inspectionOfficerDesignation={applicationMeta.inspection_officer_designation}
          topManagement={topManagement}
          isCodeId={row.is_code_id}
          isNumber={isCode?.is_number ?? row.is_number}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          licenseScope={licenseScope}
          licenseScopeFormat={licenseScopeFormat}
          licenseScopeRows={licenseScopeRows}
          rows={cmpf305Machinery}
          onSave={saveCmpf305Machinery}
          onClose={() => setShowCmpf305(false)}
        />
      )}

      {showCmpf306 && (
        <Cmpf306Modal
          projectId={row.id}
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          inspectionOfficerName={applicationMeta.inspection_officer_name}
          inspectionOfficerDesignation={applicationMeta.inspection_officer_designation}
          topManagement={topManagement}
          isCodeId={row.is_code_id}
          isNumber={isCode?.is_number ?? row.is_number}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          licenseScope={licenseScope}
          licenseScopeFormat={licenseScopeFormat}
          licenseScopeRows={licenseScopeRows}
          document={cmpf306}
          onSave={saveCmpf306}
          onClose={() => setShowCmpf306(false)}
        />
      )}

      {showRawMaterialDetails && (
        <RawMaterialDetailsModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          topManagement={topManagement}
          rows={rawMaterialDetails}
          onSave={saveRawMaterialDetails}
          onClose={() => setShowRawMaterialDetails(false)}
        />
      )}

      {showCertifiedReferenceMaterials && (
        <CertifiedReferenceMaterialsModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          topManagement={topManagement}
          rows={certifiedReferenceMaterials}
          onSave={saveCertifiedReferenceMaterials}
          onClose={() => setShowCertifiedReferenceMaterials(false)}
        />
      )}

      {showCmpf307 && (
        <Cmpf307Modal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          topManagement={topManagement}
          document={cmpf307}
          onSave={saveCmpf307}
          onClose={() => setShowCmpf307(false)}
        />
      )}

      {showCmpf310 && (
        <Cmpf310Modal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          isCode={isCode}
          companyScale={client?.company_scale ?? null}
          topManagement={topManagement}
          onSave={saveCmpf310}
          onClose={() => setShowCmpf310(false)}
        />
      )}

      {showCmpf311 && (
        <Cmpf311Modal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          productManualNumber={
            applicationMeta.product_manual_number.trim() ||
            isCode?.product_manual_number?.trim() ||
            ""
          }
          topManagement={topManagement}
          onSave={saveCmpf311}
          onClose={() => setShowCmpf311(false)}
        />
      )}

      {showUndertakingOption2 && (
        <UndertakingOption2Modal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          topManagement={topManagement}
          storedDocument={undertakingOption2}
          onSave={saveUndertakingOption2}
          onClose={() => setShowUndertakingOption2(false)}
        />
      )}

      {showApplicationDetails && (
        <ApplicationDetailsModal
          companyName={client?.company_name ?? row.client_name}
          applicationMeta={applicationMeta}
          onUpdateMeta={updateMeta}
          appDropdownOptions={appDropdownOptions}
          onReloadDropdowns={reloadApplicationDropdowns}
          isCodeProductManualNumber={isCode?.product_manual_number}
          onFirmScaleChange={updateFirmScale}
          projectId={row.id}
          legalDocumentRows={legalDocumentRows}
          onLegalDocumentsChange={updateLegalDocuments}
          onClose={() => setShowApplicationDetails(false)}
        />
      )}

      {showUndertakingGeneralIss && (
        <UndertakingGeneralIssModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          markingClause={applicationMeta.marking_clause}
          packagingClause={applicationMeta.packaging_clause}
          weeklyOff={applicationMeta.weekly_off}
          topManagement={topManagement}
          storedDocument={undertakingGeneralIss}
          onSave={saveUndertakingGeneralIss}
          onClose={() => setShowUndertakingGeneralIss(false)}
        />
      )}

      {showUndertakingLongDurationTest && (
        <UndertakingLongDurationTestModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          topManagement={topManagement}
          storedDocument={undertakingLongDurationTest}
          onSave={saveUndertakingLongDurationTest}
          onClose={() => setShowUndertakingLongDurationTest(false)}
        />
      )}

      {showUndertakingMinimumMarkingFee && (
        <UndertakingMinimumMarkingFeeModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          isCode={isCode}
          licenseScopeRows={licenseScopeRows}
          topManagement={topManagement}
          storedDocument={undertakingMinimumMarkingFee}
          onSave={saveUndertakingMinimumMarkingFee}
          onClose={() => setShowUndertakingMinimumMarkingFee(false)}
        />
      )}

      {showLocationMap && (
        <LocationMapModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          topManagement={topManagement}
          storedDocument={locationMap}
          onSave={saveLocationMap}
          onClose={() => setShowLocationMap(false)}
        />
      )}

      {showUpdatedSchemeOfInspection && (
        <UpdatedSchemeOfInspectionModal
          letterData={buildDeclarationData()}
          revisionYear={isCode?.revision_year ?? row.is_revision_year}
          storedDocument={updatedSchemeOfInspection}
          onSave={saveUpdatedSchemeOfInspection}
          onClose={() => setShowUpdatedSchemeOfInspection(false)}
        />
      )}

      {showPlantLayout && (
        <PlantLayoutModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          topManagement={topManagement}
          storedDocument={plantLayout}
          onSave={savePlantLayout}
          onClose={() => setShowPlantLayout(false)}
        />
      )}

      {showProcessFlowChart && (
        <ProcessFlowChartModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          topManagement={topManagement}
          storedDocument={processFlowChart}
          onSave={saveProcessFlowChart}
          onClose={() => setShowProcessFlowChart(false)}
        />
      )}

      {showProcessDescription && (
        <ProcessDescriptionModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          topManagement={topManagement}
          isCodeId={row.is_code_id}
          licenseScope={licenseScope}
          licenseScopeFormat={licenseScopeFormat}
          licenseScopeRows={licenseScopeRows}
          processFlowChart={processFlowChart}
          storedDocument={processDescription}
          onSave={saveProcessDescription}
          onClose={() => setShowProcessDescription(false)}
        />
      )}

      {showAuthorizationLetter && (
        <AuthorizationLetterModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          topManagement={topManagement}
          storedDocument={authorizationLetter}
          onSave={saveAuthorizationLetter}
          onClose={() => setShowAuthorizationLetter(false)}
        />
      )}

      {showSelfEvaluationForm && (
        <SelfEvaluationFormModal
          letterData={buildDeclarationData()}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          markingClause={applicationMeta.marking_clause}
          rawMaterialDetails={rawMaterialDetails}
          technicalStaff={technicalStaff}
          cmpf307={cmpf307}
          topManagement={topManagement}
          storedDocument={selfEvaluationForm}
          onSave={saveSelfEvaluationForm}
          onClose={() => setShowSelfEvaluationForm(false)}
        />
      )}

    </div>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function formatDate(dateStr: string | null): string {
  return formatDisplayDate(dateStr);
}

function toInputDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.split("T")[0] ?? "";
}

function TargetDateCell({
  projectId,
  targetDate,
  source = "bis_projects",
  onUpdate,
}: {
  projectId: string;
  targetDate: string | null;
  source?: BisApplicationSource;
  onUpdate: (id: string, date: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function beginEdit() {
    setEditValue(toInputDate(targetDate));
    setError(null);
    setEditing(true);
  }

  function save() {
    if (!editValue) {
      setError("Pick a date");
      return;
    }
    setError(null);
    startSave(async () => {
      const res =
        source === "bis_new_applications"
          ? await updateBisNewApplicationTargetDate(projectId, editValue)
          : await updateBisProjectTargetDate(projectId, editValue);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onUpdate(projectId, editValue);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="flex min-w-[140px] flex-col gap-1">
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={saving}
            autoFocus
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-800 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={save}
            disabled={saving || !editValue}
            title="Save date"
            className="rounded-md bg-sky-600 p-1 text-white hover:bg-sky-500 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={saving}
            title="Cancel"
            className="rounded-md border border-zinc-200 p-1 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {error && <span className="text-[10px] text-red-500">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={beginEdit}
      className={
        targetDate
          ? "text-xs text-zinc-700 hover:underline dark:text-zinc-300"
          : "inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
      }
    >
      {!targetDate && (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
      {targetDate ? formatDate(targetDate) : "Set date"}
    </button>
  );
}

export function PendingApplicationsSection({
  rows,
  variant = "pending_applications",
}: {
  rows: ApplicationRow[];
  variant?: "pending_applications" | "expired_licenses";
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [chatOpen, setChatOpen] = useState(false);
  const [applyRow, setApplyRow] = useState<ApplicationRow | null>(null);
  const [convertRow, setConvertRow] = useState<ApplicationRow | null>(null);
  const [viewRow, setViewRow] = useState<ApplicationRow | null>(null);
  const [isCodeView, setIsCodeView] = useState<{ id: string; is_number: string | null; revision_year: number | null } | null>(null);
  const [targetDates, setTargetDates] = useState<Record<string, string>>({});
  const [convertedIds, setConvertedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [isConverting, startConvert] = useTransition();

  const visibleRows = useMemo(() => {
    const base =
      variant === "pending_applications"
        ? rows.filter(isPendingApplicationRow)
        : rows.filter((r) => !isApplicationProjectKind(r.project_kind));
    return base.filter((r) => !convertedIds.has(r.id));
  }, [rows, convertedIds, variant]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleRows.filter((r) => {
      const matchSearch =
        !q ||
        r.client_name.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.is_number?.toLowerCase().includes(q) ?? false);
      return matchSearch;
    });
  }, [visibleRows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const isExpired = variant === "expired_licenses";

  function handleConvertToApplication(row: ApplicationRow) {
    const label = row.client_name || "this client";
    if (
      !window.confirm(
        `Convert the expired license for ${label} into a new application? The record will move to the Applications tab.`,
      )
    ) {
      return;
    }
    setConvertingId(row.id);
    startConvert(async () => {
      const res = await convertLicenseToApplication(row.id);
      setConvertingId(null);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      setConvertedIds((prev) => new Set(prev).add(row.id));
      router.refresh();
    });
  }

  return (
    <>
    <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Section header + controls */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-zinc-200 px-3 py-1.5 dark:border-zinc-800 lg:flex-nowrap">
        <h2 className="shrink-0 text-sm font-bold text-zinc-900 dark:text-white">
          {variant === "expired_licenses" ? "Expired Licenses" : "Pending Applications"}
        </h2>

        <div className="relative w-full max-w-[min(100%,12rem)] shrink-0 sm:max-w-[14rem]">
          <svg className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 py-1 pl-7 pr-2 text-xs text-zinc-800 placeholder-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>

        <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>

        <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="whitespace-nowrap">Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-md border border-zinc-200 bg-white py-1 pl-2 pr-6 text-[11px] font-medium text-zinc-700 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size} Entries</option>
            ))}
          </select>
        </label>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
          >
            ‹ Prev
          </button>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
          >
            Next ›
          </button>
        </div>

        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Ask QE Assistant
        </button>
      </div>

      {/* Table */}
      <div className="max-h-80 overflow-y-auto overflow-x-auto">
        {visibleRows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">
            {variant === "expired_licenses"
              ? "No expired licenses found."
              : "No pending applications or projects."}
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">
            No applications match your search.
          </p>
        ) : (
          <table
            className={`dashboard-section-table w-full text-sm ${isExpired ? "min-w-[720px]" : "min-w-[980px]"}`}
          >
            <thead className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Client Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">IS Number</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Start Date</th>
                {!isExpired && (
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">Target Date</th>
                )}
                {isExpired && (
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400">License Validity</th>
                )}
                {!isExpired && (
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">Convert to License</th>
                )}
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginated.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() => setViewRow(r)}
                      className="text-left text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
                    >
                      {r.client_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {r.is_code_id ? (
                      <button
                        type="button"
                        onClick={() => r.is_code_id && setIsCodeView({ id: r.is_code_id, is_number: r.is_number, revision_year: r.is_revision_year })}
                        className="font-mono text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {r.is_number}{r.is_revision_year ? `: ${r.is_revision_year}` : ""}
                      </button>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300">
                    {formatDate(r.created_at)}
                  </td>
                  {!isExpired && (
                    <td className="px-4 py-3">
                      <TargetDateCell
                        projectId={r.id}
                        targetDate={targetDates[r.id] ?? r.target_date}
                        source={r.source}
                        onUpdate={(id, date) => setTargetDates((prev) => ({ ...prev, [id]: date }))}
                      />
                    </td>
                  )}
                  {isExpired && (
                    <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300">
                      {formatDate(r.license_validity_date)}
                    </td>
                  )}
                  {!isExpired && (
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setConvertRow(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Convert
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    {isExpired ? (
                      <button
                        type="button"
                        onClick={() => handleConvertToApplication(r)}
                        disabled={isConverting && convertingId === r.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        {isConverting && convertingId === r.id ? "Converting…" : "Convert into Application"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setApplyRow(r)}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 dark:bg-sky-700 dark:hover:bg-sky-600"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Apply
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>

    {viewRow && <ClientSnapshotModal row={viewRow} onClose={() => setViewRow(null)} />}
    {isCodeView && <IsCodeViewModal isCodeId={isCodeView.id} isNumber={isCodeView.is_number} revisionYear={isCodeView.revision_year} onClose={() => setIsCodeView(null)} />}
    {applyRow && <ApplicationFormModal row={applyRow} onClose={() => setApplyRow(null)} />}
    {convertRow && !isExpired && (
      <ConvertToLicenseModal
        projectId={convertRow.id}
        clientName={convertRow.client_name}
        isNumber={
          convertRow.is_number != null
            ? `${convertRow.is_number}${convertRow.is_revision_year ? `: ${convertRow.is_revision_year}` : ""}`
            : "—"
        }
        mode="convert_application"
        source={convertRow.source ?? "bis_projects"}
        onClose={() => setConvertRow(null)}
        onConverted={() => {
          setConvertedIds((prev) => new Set(prev).add(convertRow.id));
          router.refresh();
        }}
      />
    )}

    {chatOpen && (
      <AiChatModal
        title="QE Assistant"
        subtitle="BIS Applications · AI Powered"
        systemPrompt={APP_SYSTEM_PROMPT}
        starterQuestions={APP_STARTERS}
        accentColor="amber"
        onClose={() => setChatOpen(false)}
      />
    )}
    </>
  );
}
