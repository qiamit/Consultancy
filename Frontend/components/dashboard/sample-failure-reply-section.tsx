"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@backend/db/client/client";
import { formatCmDisplay } from "@backend/modules/bis/bis-project-license-status";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatClientAddressLine } from "@backend/shared/format-client-address";
import {
  SAMPLE_FAILURE_TYPES,
  SAMPLE_FAILURE_TYPE_LABELS,
  isSampleFailureType,
  sampleFailureTypeLabel,
  type SampleFailureType,
} from "@backend/modules/bis/sample-failure-reply";
import {
  addSampleFailureReply,
  updateSampleFailureReply,
  updateSampleFailureReplyDraft,
  type AddSampleFailureReplyInput,
} from "@backend/actions/sample-failure-reply";
import { draftSampleFailureReply } from "@backend/actions/sample-failure-reply-assistant";
import { updateBisProjectNotes } from "@backend/actions/bis-projects";
import {
  buildApplicationChecklistPayload,
  parseApplicationChecklistNotes,
} from "@backend/modules/bis/application-checklist-notes";
import {
  combineOslAndPiSamples,
  documentHasContent as oslDocumentHasContent,
  splitOslAndPiSamples,
  type OslSampleRequirementStored,
} from "@backend/modules/bis/osl-sample-requirements";
import {
  ftrReportHasContent,
  type FactoryTestReportStored,
} from "@backend/modules/bis/factory-test-report";
import type { TopManagementStored } from "@backend/modules/bis/top-management";
import type { TechnicalStaffStored } from "@backend/modules/bis/technical-staff";
import { openManakEbisAssist } from "@/components/modules/bis-projects/manak-ebis-assist";
import { useSidebarLayout } from "@/components/dashboard/sidebar-layout-context";
import {
  IsCodeCombobox,
  type IsCodeComboboxOption,
} from "@/components/modules/bis-projects/is-code-combobox";

const OslSampleRequirementsModal = dynamic(
  () =>
    import("@/components/dashboard/modals/osl-sample-requirements-modal").then((m) => ({
      default: m.OslSampleRequirementsModal,
    })),
  { ssr: false },
);

const FactoryTestReportModal = dynamic(
  () =>
    import("@/components/dashboard/modals/factory-test-report-modal").then((m) => ({
      default: m.FactoryTestReportModal,
    })),
  { ssr: false },
);

export type SampleFailureReplyRow = {
  id: string;
  sample_failure_type: string;
  sample_code: string;
  sample_qr_code: string;
  cm_l_digits: string | null;
  project_kind: string | null;
  status: string;
  notes: string;
  reply_draft: string;
  failure_letter_path: string | null;
  failure_letter_name: string | null;
  offer_letter_path: string | null;
  offer_letter_name: string | null;
  factory_test_report_path: string | null;
  factory_test_report_name: string | null;
  client_id: string;
  bis_project_id: string | null;
  is_code_id: string;
  client_name: string;
  is_number: string | null;
  is_revision_year: number | null;
  is_code_title: string | null;
  portal_user_id: string | null;
  portal_password: string | null;
  created_at: string;
};

type ClientOption = { id: string; name: string; company_name: string | null };
type IsCodeOption = {
  is_code_id: string;
  is_number: string | null;
  revision_year: number | null;
  is_code_title: string | null;
};
type LicenseMatch = {
  id: string;
  cm_l_digits: string | null;
  project_kind: string;
  portal_user_id: string | null;
  portal_password: string | null;
};

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:disabled:bg-zinc-900";

const thCls =
  "px-3 py-2.5 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400";

const tdCls = "px-3 py-3 text-center align-middle text-sm text-zinc-700 dark:text-zinc-300";

function formatIsCodeShort(isNumber: string | null, revisionYear: number | null): string {
  if (!isNumber) return "—";
  return revisionYear ? `${isNumber}: ${revisionYear}` : isNumber;
}

function formatIsDisplay(
  isNumber: string | null,
  revisionYear: number | null,
  title: string | null,
): string {
  const base = formatIsCodeShort(isNumber, revisionYear);
  if (base === "—" || !title) return base;
  return `${base} — ${title}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    drafted: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
    submitted: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return map[status] ?? map.open;
}

function SampleFailureAddModal({
  onClose,
  onSaved,
  editRow = null,
}: {
  onClose: () => void;
  onSaved: () => void;
  editRow?: SampleFailureReplyRow | null;
}) {
  const isEdit = Boolean(editRow);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientId, setClientId] = useState(editRow?.client_id ?? "");
  const [isCodeId, setIsCodeId] = useState(editRow?.is_code_id ?? "");
  const [isCodes, setIsCodes] = useState<IsCodeOption[]>([]);
  const [isCodesLoading, setIsCodesLoading] = useState(false);
  const [licenseMatch, setLicenseMatch] = useState<LicenseMatch | null>(() =>
    editRow
      ? {
          id: editRow.bis_project_id ?? "",
          cm_l_digits: editRow.cm_l_digits,
          project_kind: editRow.project_kind ?? "licence",
          portal_user_id: editRow.portal_user_id,
          portal_password: editRow.portal_password,
        }
      : null,
  );
  const [failureType, setFailureType] = useState<SampleFailureType | "">(
    isSampleFailureType(editRow?.sample_failure_type ?? "")
      ? (editRow!.sample_failure_type as SampleFailureType)
      : "",
  );
  const [sampleCode, setSampleCode] = useState(editRow?.sample_code ?? "");
  const [sampleQr, setSampleQr] = useState(editRow?.sample_qr_code ?? "");
  const [notes, setNotes] = useState(editRow?.notes ?? "");
  const [failureLetter, setFailureLetter] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipClearOnFirmLoad = useRef(isEdit);

  const firmOptions: IsCodeComboboxOption[] = useMemo(
    () =>
      clients
        .map((c) => {
          const company = (c.company_name ?? "").trim();
          const name = (c.name ?? "").trim();
          const label = company || name || "Unnamed firm";
          return {
            id: c.id,
            label,
            filterText: [company, name].filter(Boolean).join(" "),
          };
        })
        .sort((a, b) =>
          a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
        ),
    [clients],
  );

  const isCodeComboboxOptions: IsCodeComboboxOption[] = useMemo(
    () =>
      isCodes.map((ic) => {
        const label = formatIsDisplay(ic.is_number, ic.revision_year, ic.is_code_title);
        return {
          id: ic.is_code_id,
          label,
          filterText: `${ic.is_number ?? ""} ${ic.revision_year ?? ""} ${ic.is_code_title ?? ""}`,
        };
      }),
    [isCodes],
  );

  const isCodePlaceholder = !clientId
    ? "Select firm first…"
    : isCodesLoading
      ? "Loading IS codes…"
      : isCodes.length === 0
        ? "No IS codes for this firm"
        : "Type to search IS code…";

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("clients")
      .select("id, name, company_name")
      .order("company_name", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setClients((data ?? []) as ClientOption[]);
        setClientsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const preserveSelection = skipClearOnFirmLoad.current;
    if (preserveSelection) {
      skipClearOnFirmLoad.current = false;
    } else {
      setIsCodeId("");
      setLicenseMatch(null);
    }
    if (!clientId) {
      setIsCodes([]);
      return;
    }
    let cancelled = false;
    setIsCodesLoading(true);
    const supabase = createClient();
    void supabase
      .from("bis_projects")
      .select("is_code_id, is_codes(is_number, revision_year, is_code_title)")
      .eq("client_id", clientId)
      .neq("project_kind", "application")
      .not("is_code_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const options: IsCodeOption[] = [];
        for (const row of data ?? []) {
          const r = row as Record<string, unknown>;
          const codeId = r.is_code_id as string | null;
          if (!codeId || seen.has(codeId)) continue;
          seen.add(codeId);
          const ic = Array.isArray(r.is_codes) ? r.is_codes[0] : r.is_codes;
          options.push({
            is_code_id: codeId,
            is_number: (ic as { is_number?: string } | null)?.is_number ?? null,
            revision_year: (ic as { revision_year?: number } | null)?.revision_year ?? null,
            is_code_title: (ic as { is_code_title?: string } | null)?.is_code_title ?? null,
          });
        }
        setIsCodes(options);
        setIsCodesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !isCodeId) {
      if (!isEdit || !isCodeId) setLicenseMatch(null);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("bis_projects")
      .select("id, cm_l_digits, project_kind, portal_user_id, portal_password")
      .eq("client_id", clientId)
      .eq("is_code_id", isCodeId)
      .neq("project_kind", "application")
      .not("cm_l_digits", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setLicenseMatch({
          id: data.id as string,
          cm_l_digits: data.cm_l_digits as string | null,
          project_kind: (data.project_kind as string) ?? "licence",
          portal_user_id: (data.portal_user_id as string | null) ?? null,
          portal_password: (data.portal_password as string | null) ?? null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, isCodeId, isEdit]);

  const cmDisplay = licenseMatch
    ? formatCmDisplay(licenseMatch.project_kind, licenseMatch.cm_l_digits)
    : "—";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Select a firm name.");
      return;
    }
    if (!isCodeId) {
      setError("Select an IS code.");
      return;
    }
    if (!failureType) {
      setError("Select type of sample failure.");
      return;
    }
    if (!sampleCode.trim()) {
      setError("Sample Code is required.");
      return;
    }
    if (!isEdit && !failureLetter) {
      setError("Attach Sample Failure Letter.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload: AddSampleFailureReplyInput = {
      client_id: clientId,
      is_code_id: isCodeId,
      bis_project_id: licenseMatch?.id ?? null,
      cm_l_digits: licenseMatch?.cm_l_digits ?? null,
      project_kind: licenseMatch?.project_kind ?? null,
      sample_failure_type: failureType,
      sample_code: sampleCode,
      sample_qr_code: sampleQr,
      notes,
    };

    const formData = new FormData();
    if (failureLetter) {
      formData.append("failure_letter", failureLetter);
    }

    const result = isEdit && editRow
      ? await updateSampleFailureReply(editRow.id, payload, formData)
      : await addSampleFailureReply(payload, formData);

    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            {isEdit ? "Edit CML — Sample Failure" : "Add CML — Sample Failure"}
          </h2>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <label htmlFor="sfr_firm" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Firm Name
              </label>
              <IsCodeCombobox
                name="client_id"
                label="Firm Name"
                hideLabel
                inputId="sfr_firm"
                value={clientId}
                onChange={setClientId}
                options={firmOptions}
                disabled={clientsLoading}
                placeholder={clientsLoading ? "Loading firms…" : "Type to search firm…"}
                listZIndexClass="z-[310]"
                maxListItems={2000}
              />
            </div>

            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                CM/L Number
              </label>
              <input
                type="text"
                readOnly
                value={cmDisplay}
                className={`${inputCls} font-mono tabular-nums`}
                aria-readonly
              />
            </div>
          </div>

          <div>
            <label htmlFor="sfr_is" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              IS Code
            </label>
            <IsCodeCombobox
              key={clientId || "no-firm"}
              name="is_code_id"
              label="IS Code"
              hideLabel
              inputId="sfr_is"
              value={isCodeId}
              onChange={setIsCodeId}
              options={isCodeComboboxOptions}
              disabled={!clientId || isCodesLoading}
              placeholder={isCodePlaceholder}
              listZIndexClass="z-[310]"
              maxListItems={500}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Type of Sample Failure
              </label>
              <select
                required
                value={failureType}
                onChange={(e) => setFailureType(e.target.value as SampleFailureType | "")}
                className={inputCls}
              >
                <option value="">Select type</option>
                {SAMPLE_FAILURE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SAMPLE_FAILURE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Sample Code
              </label>
              <input
                required
                value={sampleCode}
                onChange={(e) => setSampleCode(e.target.value)}
                className={inputCls}
                placeholder="Sample code"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Sample QR Code
              </label>
              <input
                value={sampleQr}
                onChange={(e) => setSampleQr(e.target.value)}
                className={inputCls}
                placeholder="Optional QR payload"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Sample Failure Letter{isEdit ? " (optional replace)" : ""}
            </label>
            {isEdit && editRow?.failure_letter_name ? (
              <p className="mb-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Current: {editRow.failure_letter_name}
              </p>
            ) : null}
            <input
              required={!isEdit}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
              onChange={(e) => setFailureLetter(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky-700 hover:file:bg-sky-100 dark:text-zinc-300 dark:file:bg-sky-950/40 dark:file:text-sky-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Internal notes for reply drafting"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                !clientId ||
                !isCodeId ||
                !failureType ||
                !sampleCode.trim() ||
                (!isEdit && !failureLetter)
              }
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              {saving
                ? isEdit
                  ? "Saving…"
                  : "Adding…"
                : isEdit
                  ? "Save Changes"
                  : "Add to Table"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


const docTileBase =
  "inline-flex min-h-[3.25rem] w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold leading-snug shadow-sm transition active:scale-[0.99]";

const docTileTeal =
  `${docTileBase} border-teal-200 bg-teal-50 text-teal-800 hover:border-teal-300 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:border-teal-600 dark:hover:bg-teal-950/60`;

function SampleFailureDocIcon({ kind }: { kind: "offer" | "report" | "reply" }) {
  const cls = "h-4 w-4 shrink-0";
  if (kind === "offer") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    );
  }
  if (kind === "report") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

type ClientLetterData = {
  name: string;
  company_name: string | null;
  contact_person_name: string | null;
  email: string | null;
  phone: string | null;
  phone_country_code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pin_code: string | null;
  gst_number: string | null;
};

type ChecklistBundle = ReturnType<typeof parseApplicationChecklistNotes>;

const CHECKLIST_PRESERVE_KEYS = [
  "source_license_id",
  "license_scope",
  "license_scope_format",
  "license_scope_rows",
  "osl_sample_requirements",
  "pi_sample_requirements",
  "top_management",
  "technical_staff",
  "factory_test_reports",
  "subcontracted_tests",
  "subcontracted_tests_document",
  "cmpf_305_machinery",
  "raw_material_details",
  "certified_reference_materials",
  "cmpf_306",
  "cmpf_307",
  "cmpf_310",
  "cmpf_311",
  "undertaking_option_2",
  "undertaking_general_iss",
  "authorization_letter",
  "undertaking_long_duration_test",
  "undertaking_minimum_marking_fee",
  "location_map",
  "plant_layout",
  "process_flow_chart",
  "process_description",
  "updated_scheme_of_inspection",
  "self_evaluation_form",
  "legal_documents",
] as const;

async function saveLinkedProjectChecklist(
  projectId: string,
  existingNotes: string,
  next: ChecklistBundle,
  explicitClear: Set<string> = new Set(),
): Promise<{ ok: true; notes: string } | { ok: false; error: string }> {
  let existingObj: Record<string, unknown> = {};
  try {
    existingObj = JSON.parse(existingNotes.trim() || "{}") as Record<string, unknown>;
  } catch {
    existingObj = {};
  }
  const sourceLicenseId =
    typeof existingObj.source_license_id === "string" ? existingObj.source_license_id : null;
  const payload = buildApplicationChecklistPayload({
    ...next,
    sourceLicenseId,
  });
  const newObj = JSON.parse(payload) as Record<string, unknown>;
  if (existingObj && typeof existingObj === "object" && existingObj.type === "application_checklist") {
    for (const key of CHECKLIST_PRESERVE_KEYS) {
      if (!(key in newObj) && key in existingObj && !explicitClear.has(key)) {
        newObj[key] = existingObj[key];
      }
    }
  }
  const notes = JSON.stringify(newObj);
  const result = await updateBisProjectNotes(projectId, notes);
  if (!result.ok) return result;
  return { ok: true, notes };
}

function SampleFailureReplyModal({
  row,
  onClose,
  onSaved,
}: {
  row: SampleFailureReplyRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { open: sidebarOpen } = useSidebarLayout();
  const [portalReady, setPortalReady] = useState(false);
  const [panel, setPanel] = useState<"offer" | "report" | "reply" | null>(null);
  const [draft, setDraft] = useState(row.reply_draft);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aiPending, setAiPending] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [rawNotes, setRawNotes] = useState("");
  const [client, setClient] = useState<ClientLetterData | null>(null);
  const [oslSampleRequirements, setOslSampleRequirements] = useState<OslSampleRequirementStored[]>([]);
  const [piSampleRequirements, setPiSampleRequirements] = useState<OslSampleRequirementStored[]>([]);
  const [factoryTestReports, setFactoryTestReports] = useState<FactoryTestReportStored[]>([]);
  const [topManagement, setTopManagement] = useState<TopManagementStored[]>([]);
  const [technicalStaff, setTechnicalStaff] = useState<TechnicalStaffStored[]>([]);
  const [applicationMeta, setApplicationMeta] = useState(() => ({
    application_number: "",
    date_of_application: "",
    date_of_inspection: "",
    bis_branch_name: "",
    inspection_officer_name: "",
    inspection_officer_designation: "",
  }));
  const checklistRef = useRef<ChecklistBundle | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const projectId = (row.bis_project_id ?? "").trim();
    const clientId = (row.client_id ?? "").trim();
    setLoadingDocs(true);
    const supabase = createClient();

    void (async () => {
      const [clientRes, projectRes] = await Promise.all([
        clientId
          ? supabase
              .from("clients")
              .select(
                "name, company_name, contact_person_name, email, phone, phone_country_code, address, city, state, country, pin_code, gst_number",
              )
              .eq("id", clientId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        projectId
          ? supabase.from("bis_projects").select("notes").eq("id", projectId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;

      if (clientRes.data) {
        setClient(clientRes.data as ClientLetterData);
      }

      const notes = String((projectRes.data as { notes?: string | null } | null)?.notes ?? "");
      const parsed = parseApplicationChecklistNotes(notes);
      checklistRef.current = parsed;
      setRawNotes(notes);
      setOslSampleRequirements(parsed.oslSampleRequirements);
      setPiSampleRequirements(parsed.piSampleRequirements);
      setFactoryTestReports(parsed.factoryTestReports);
      setTopManagement(parsed.topManagement);
      setTechnicalStaff(parsed.technicalStaff);
      setApplicationMeta({
        application_number: parsed.meta.application_number ?? "",
        date_of_application: parsed.meta.date_of_application ?? "",
        date_of_inspection: parsed.meta.date_of_inspection ?? "",
        bis_branch_name: parsed.meta.bis_branch_name ?? "",
        inspection_officer_name: parsed.meta.inspection_officer_name ?? "",
        inspection_officer_designation: parsed.meta.inspection_officer_designation ?? "",
      });
      setLoadingDocs(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [row.bis_project_id, row.client_id]);

  const isLabel = formatIsCodeShort(row.is_number, row.is_revision_year);
  const cmLabel = formatCmDisplay(row.project_kind ?? "licence", row.cm_l_digits);
  const projectId = (row.bis_project_id ?? "").trim();
  const offerReady = oslDocumentHasContent(
    combineOslAndPiSamples(oslSampleRequirements, piSampleRequirements),
  );
  const reportReady = factoryTestReports.some(ftrReportHasContent);
  const docsReady = offerReady && reportReady;

  function buildLetterData() {
    const address = formatClientAddressLine({
      address: client?.address,
      city: client?.city,
      pin_code: client?.pin_code,
      state: client?.state,
    });
    const phoneDigits = (client?.phone ?? "").trim();
    const phoneCode = (client?.phone_country_code ?? "").trim();
    const mobile = phoneDigits ? [phoneCode, phoneDigits].filter(Boolean).join(" ") : "";
    return {
      companyName: client?.company_name ?? row.client_name,
      address,
      city: client?.city ?? "",
      contactPerson: client?.contact_person_name ?? "",
      phone: mobile,
      email: client?.email ?? "",
      gstNumber: client?.gst_number ?? "",
      isNumber: isLabel !== "—" ? isLabel : "",
      isTitle: row.is_code_title ?? "",
      bisBranchName: applicationMeta.bis_branch_name,
      bisBranchState: client?.state ?? "",
      bisBranchCountry: client?.country ?? "India",
      inspectionDate: applicationMeta.date_of_inspection || "",
      applicationNumber: applicationMeta.application_number,
    };
  }

  function requireProject(): boolean {
    if (projectId) return true;
    setError(
      "Link a CM/L (IS code) on this sample failure entry first, then open Sample Offer Letter / Factory Test Report.",
    );
    setPanel(null);
    return false;
  }

  async function persistChecklist(
    next: ChecklistBundle,
    explicitClear: Set<string> = new Set(),
  ): Promise<boolean> {
    if (!requireProject()) return false;
    const result = await saveLinkedProjectChecklist(projectId, rawNotes, next, explicitClear);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    checklistRef.current = next;
    setRawNotes(result.notes);
    setMessage("Saved to linked licence checklist.");
    onSaved();
    return true;
  }

  function saveOslSampleRequirements(rows: OslSampleRequirementStored[]) {
    const { osl, pi } = splitOslAndPiSamples(rows);
    setOslSampleRequirements(osl);
    setPiSampleRequirements(pi);
    const base = checklistRef.current ?? parseApplicationChecklistNotes(rawNotes);
    const next = { ...base, oslSampleRequirements: osl, piSampleRequirements: pi };
    const clear = new Set<string>();
    if (osl.length === 0) clear.add("osl_sample_requirements");
    if (pi.length === 0) clear.add("pi_sample_requirements");
    void persistChecklist(next, clear);
  }

  function saveFactoryTestReports(rows: FactoryTestReportStored[]) {
    setFactoryTestReports(rows);
    const base = checklistRef.current ?? parseApplicationChecklistNotes(rawNotes);
    const next = { ...base, factoryTestReports: rows };
    const clear = new Set<string>();
    if (rows.length === 0) clear.add("factory_test_reports");
    void persistChecklist(next, clear);
  }

  async function handleGenerateDraft() {
    if (!docsReady) {
      setError("Prepare Sample Offer Letter and Factory Test Report first, then generate the AI reply draft.");
      return;
    }
    setAiPending(true);
    setError(null);
    setMessage(null);
    const result = await draftSampleFailureReply(row.id);
    setAiPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft(result.draft);
    setMessage("AI reply draft ready. Review and save.");
  }

  function handleSaveDraft() {
    setError(null);
    setMessage(null);
    startTransition(() => {
      void updateSampleFailureReplyDraft(row.id, draft).then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setMessage("Reply draft saved.");
        onSaved();
      });
    });
  }

  function openPanel(next: "offer" | "report" | "reply") {
    setError(null);
    setMessage(null);
    if ((next === "offer" || next === "report") && !requireProject()) return;
    setPanel(next);
  }

  if (!portalReady) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm ${
        sidebarOpen ? "lg:left-64" : "lg:left-0"
      }`}
    >
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-zinc-900">
        <div className="shrink-0 bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-3 sm:px-5 sm:py-4">
          <div className="relative flex items-center">
            <div className="absolute left-0 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 sm:flex">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="w-full text-center text-xs font-semibold uppercase tracking-wider text-white/80 sm:text-base">
              Sample Failure Reply
            </p>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b border-zinc-200 bg-white px-3 py-2.5 sm:px-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="min-w-0 text-sm font-extrabold text-zinc-900 sm:text-base dark:text-zinc-50">
                {row.client_name}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {sampleFailureTypeLabel(row.sample_failure_type)}
                {row.sample_code.trim() ? ` · Sample ${row.sample_code.trim()}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
              {isLabel !== "—" ? (
                <p className="text-sm font-extrabold text-zinc-900 sm:text-base dark:text-zinc-50">
                  {isLabel}
                </p>
              ) : null}
              <p className="font-mono text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {cmLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-3 sm:px-5 sm:py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            {loadingDocs ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading licence documents…</p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <button type="button" onClick={() => openPanel("offer")} className={docTileTeal}>
                  <SampleFailureDocIcon kind="offer" />
                  <span className="min-w-0 flex-1">
                    Sample Offer Letter
                    <span className="mt-0.5 block text-[10px] font-medium opacity-80">
                      {offerReady ? "Ready" : "Create like Application"}
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => openPanel("report")} className={docTileTeal}>
                  <SampleFailureDocIcon kind="report" />
                  <span className="min-w-0 flex-1">
                    Factory Test Report
                    <span className="mt-0.5 block text-[10px] font-medium opacity-80">
                      {reportReady ? "Ready" : "Create like Application"}
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => openPanel("reply")} className={docTileTeal}>
                  <SampleFailureDocIcon kind="reply" />
                  <span className="min-w-0 flex-1">
                    Sample Failure Reply
                    <span className="mt-0.5 block text-[10px] font-medium opacity-80">
                      {docsReady ? "AI draft after docs" : "Complete docs first"}
                    </span>
                  </span>
                </button>
              </div>
            )}
            {error && !panel ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {panel === "offer" && (
        <OslSampleRequirementsModal
          variant="osl"
          letterData={buildLetterData()}
          topManagement={topManagement}
          isCodeNumber={row.is_number}
          isCodeId={row.is_code_id}
          revisionYear={row.is_revision_year}
          rows={combineOslAndPiSamples(oslSampleRequirements, piSampleRequirements)}
          clientId={row.client_id}
          excludeImportSource={
            projectId ? { id: projectId, source: "bis_projects" } : null
          }
          onSave={saveOslSampleRequirements}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "report" && (
        <FactoryTestReportModal
          letterData={buildLetterData()}
          oslSamples={oslSampleRequirements}
          piSamples={piSampleRequirements}
          applicationNumber={applicationMeta.application_number}
          dateOfApplication={applicationMeta.date_of_application}
          dateOfInspection={applicationMeta.date_of_inspection}
          licenceNumber={cmLabel !== "—" ? cmLabel : ""}
          inspectionOfficerName={applicationMeta.inspection_officer_name}
          inspectionOfficerDesignation={applicationMeta.inspection_officer_designation}
          technicalStaff={technicalStaff}
          isCodeId={row.is_code_id}
          isNumber={row.is_number}
          revisionYear={row.is_revision_year}
          rows={factoryTestReports}
          onSave={saveFactoryTestReports}
          onClose={() => setPanel(null)}
          onEditSample={() => {
            setPanel("offer");
          }}
        />
      )}

      {panel === "reply" && (
        <div className="fixed inset-0 z-[210] flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Sample Failure Reply</h3>
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  setError(null);
                  setMessage(null);
                }}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              {!docsReady ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  Prepare Sample Offer Letter and Factory Test Report first (same as Application). Then generate the AI failure reply draft.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={aiPending || !docsReady}
                  onClick={() => void handleGenerateDraft()}
                  className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:bg-violet-950/50"
                >
                  {aiPending ? "Drafting with AI…" : "Generate / Improve Reply with AI"}
                </button>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={14}
                className={`${inputCls} font-mono text-[13px] leading-relaxed`}
                placeholder="AI will draft the sample failure reply after Offer Letter and Factory Test Report are ready…"
              />
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {message}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleSaveDraft}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
                >
                  {pending ? "Saving…" : "Save Reply Draft"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

export function SampleFailureReplySection({ rows }: { rows: SampleFailureReplyRow[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<SampleFailureReplyRow | null>(null);
  const [replyRow, setReplyRow] = useState<SampleFailureReplyRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const rowIds = rows.map((r) => r.id);
  const allSelected = rows.length > 0 && rowIds.every((id) => selectedIds.has(id));
  const someSelected = rowIds.some((id) => selectedIds.has(id)) && !allSelected;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  function toggleRowSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (rows.length > 0 && rowIds.every((id) => prev.has(id))) return new Set();
      return new Set(rowIds);
    });
  }

  function openAddModal() {
    setEditRow(null);
    setModalOpen(true);
  }

  function openEditModal(row: SampleFailureReplyRow) {
    setEditRow(row);
    setModalOpen(true);
  }

  function closeAddModal() {
    setModalOpen(false);
    setEditRow(null);
  }

  function handleManakLogin(row: SampleFailureReplyRow) {
    const userId = (row.portal_user_id ?? "").trim();
    const password = (row.portal_password ?? "").trim();
    if (!userId || !password) {
      window.alert(
        "Manak Online login credentials are not saved on the linked licence. Open All BIS Licenses and save Portal User ID / Password first.",
      );
      return;
    }
    openManakEbisAssist({
      userId,
      password,
      clientName: row.client_name,
      isLabel: formatIsCodeShort(row.is_number, row.is_revision_year),
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-1.5 dark:border-zinc-800 sm:px-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            BIS Sample Failure Reply
          </h2>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add CML Number
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No sample failure entries yet. Click &ldquo;Add CML Number&rdquo; to create one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="dashboard-section-table w-full min-w-[820px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50">
              <tr>
                <th className={`${thCls} w-11`} aria-label="Select">
                  <div className="flex justify-center">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-900"
                      title="Select all"
                      aria-label="Select all sample failure entries"
                    />
                  </div>
                </th>
                <th className={thCls}>Firm</th>
                <th className={thCls}>IS / CM/L</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Sample Code</th>
                <th className={thCls}>Status</th>
                <th className={thCls}>Added</th>
                <th className={`${thCls} sm:pr-5`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                  <td className={`${tdCls} w-11`}>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRowSelection(row.id)}
                        className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-900"
                        aria-label={`Select ${row.client_name}`}
                      />
                    </div>
                  </td>
                  <td className={`${tdCls} font-medium text-zinc-900 dark:text-zinc-100`}>
                    {row.client_name}
                  </td>
                  <td className={tdCls}>
                    <div>{formatIsCodeShort(row.is_number, row.is_revision_year)}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatCmDisplay(row.project_kind ?? "licence", row.cm_l_digits)}
                    </div>
                  </td>
                  <td className={tdCls}>{sampleFailureTypeLabel(row.sample_failure_type)}</td>
                  <td className={`${tdCls} font-mono text-xs`}>
                    {row.sample_code.trim() || "—"}
                    {row.sample_qr_code.trim() ? (
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        QR: {row.sample_qr_code.trim()}
                      </div>
                    ) : null}
                  </td>
                  <td className={tdCls}>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadge(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className={tdCls}>{formatDisplayDate(row.created_at)}</td>
                  <td className={`${tdCls} sm:pr-5`}>
                    <div className="inline-flex flex-nowrap items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleManakLogin(row)}
                        title="Manak Online Login"
                        aria-label="Manak Online Login"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyRow(row)}
                        title="Sample Failure Reply"
                        aria-label="Sample Failure Reply"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-500 dark:bg-sky-700 dark:hover:bg-sky-600"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(row)}
                        title="Edit"
                        aria-label="Edit"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <SampleFailureAddModal
          key={editRow?.id ?? "new"}
          editRow={editRow}
          onClose={closeAddModal}
          onSaved={() => router.refresh()}
        />
      )}

      {replyRow && (
        <SampleFailureReplyModal
          row={replyRow}
          onClose={() => setReplyRow(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
