"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@backend/db/client/client";
import { formatCmDisplay } from "@backend/modules/bis/bis-project-license-status";
import { formatDisplayDate } from "@backend/shared/format-date";
import {
  SAMPLE_FAILURE_TYPES,
  SAMPLE_FAILURE_TYPE_LABELS,
  sampleFailureTypeLabel,
  type SampleFailureType,
} from "@backend/modules/bis/sample-failure-reply";
import {
  addSampleFailureReply,
  deleteSampleFailureReply,
  signSampleFailureDocumentDownload,
  updateSampleFailureReplyDraft,
  uploadSampleFailureReplyDocument,
  type AddSampleFailureReplyInput,
} from "@backend/actions/sample-failure-reply";
import { draftSampleFailureReply } from "@backend/actions/sample-failure-reply-assistant";
import { openManakEbisAssist } from "@/components/modules/bis-projects/manak-ebis-assist";
import {
  IsCodeCombobox,
  type IsCodeComboboxOption,
} from "@/components/modules/bis-projects/is-code-combobox";
import { oslSampleQrPayload } from "@/components/dashboard/osl-sample-code-qr";

function SampleCodeCell({ sampleCode, qrCode }: { sampleCode: string; qrCode: string }) {
  const code = sampleCode.trim();
  const payload = oslSampleQrPayload(sampleCode, qrCode);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    void import("qrcode")
      .then((QR) =>
        QR.toDataURL(payload, {
          width: 88,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#18181b", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!code && !payload) return <span className="text-zinc-400">—</span>;

  return (
    <span className="mx-auto inline-flex max-w-full flex-col items-center gap-1">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={payload ? `QR for ${payload}` : "QR code"}
          width={44}
          height={44}
          className="rounded-sm border border-zinc-300 bg-white p-0.5 dark:border-zinc-600"
        />
      ) : null}
      <span
        className="block max-w-[9rem] break-all text-center font-mono text-[11px] leading-tight text-zinc-700 dark:text-zinc-200"
        title={payload || code}
      >
        {code || payload}
      </span>
    </span>
  );
}

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

async function openSignedDoc(path: string | null) {
  if (!path) {
    window.alert("Document not uploaded yet.");
    return;
  }
  const result = await signSampleFailureDocumentDownload(path);
  if (!result.ok) {
    window.alert(result.error);
    return;
  }
  window.open(result.url, "_blank", "noopener,noreferrer");
}

function SampleFailureAddModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [isCodeId, setIsCodeId] = useState("");
  const [isCodes, setIsCodes] = useState<IsCodeOption[]>([]);
  const [isCodesLoading, setIsCodesLoading] = useState(false);
  const [licenseMatch, setLicenseMatch] = useState<LicenseMatch | null>(null);
  const [failureType, setFailureType] = useState<SampleFailureType | "">("");
  const [sampleCode, setSampleCode] = useState("");
  const [sampleQr, setSampleQr] = useState("");
  const [notes, setNotes] = useState("");
  const [failureLetter, setFailureLetter] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firmOptions: IsCodeComboboxOption[] = useMemo(
    () =>
      clients.map((c) => {
        const label = (c.company_name ?? c.name).trim() || "Unnamed firm";
        return { id: c.id, label, filterText: `${label} ${c.name}` };
      }),
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
      .order("company_name", { ascending: true })
      .limit(500)
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
    setIsCodeId("");
    setLicenseMatch(null);
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
      .limit(100)
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
    setLicenseMatch(null);
    if (!clientId || !isCodeId) return;
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
  }, [clientId, isCodeId]);

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
    if (!failureLetter) {
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
    formData.append("failure_letter", failureLetter);

    const result = await addSampleFailureReply(payload, formData);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Add CML — Sample Failure
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Select firm and IS code; CM/L fills from the linked licence. Attach the Sample Failure Letter.
          </p>
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
              Sample Failure Letter
            </label>
            <input
              required
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
                saving || !clientId || !isCodeId || !failureType || !sampleCode || !failureLetter
              }
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              {saving ? "Adding…" : "Add to Table"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
  const [draft, setDraft] = useState(row.reply_draft);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aiPending, setAiPending] = useState(false);
  const [offerName, setOfferName] = useState(row.offer_letter_name);
  const [reportName, setReportName] = useState(row.factory_test_report_name);
  const [failureName, setFailureName] = useState(row.failure_letter_name);
  const [offerPath, setOfferPath] = useState(row.offer_letter_path);
  const [reportPath, setReportPath] = useState(row.factory_test_report_path);
  const [failurePath, setFailurePath] = useState(row.failure_letter_path);

  async function handleGenerateDraft() {
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

  async function handleUpload(
    kind: "failure_letter" | "offer_letter" | "factory_test_report",
    file: File | null,
  ) {
    if (!file) return;
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadSampleFailureReplyDocument(row.id, kind, formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (kind === "failure_letter") {
      setFailureName(result.name);
      setFailurePath(result.path);
    }
    if (kind === "offer_letter") {
      setOfferName(result.name);
      setOfferPath(result.path);
    }
    if (kind === "factory_test_report") {
      setReportName(result.name);
      setReportPath(result.path);
    }
    setMessage(`${result.name} uploaded.`);
    onSaved();
  }

  const docsReady = Boolean(failureName && offerName && reportName);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm">
      <div className="my-4 w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
              Sample Failure Reply
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {row.client_name} · {formatCmDisplay(row.project_kind ?? "licence", row.cm_l_digits)} ·{" "}
              {formatIsCodeShort(row.is_number, row.is_revision_year)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-300">
            <p>
              <span className="font-semibold">Type:</span>{" "}
              {sampleFailureTypeLabel(row.sample_failure_type)}
            </p>
            <p className="mt-1">
              <span className="font-semibold">Sample:</span> {row.sample_code || "—"}
              {row.sample_qr_code ? ` · QR ${row.sample_qr_code}` : ""}
            </p>
            <p className="mt-1">
              Reply requires 3 documents: Sample Failure Letter, Sample Offer Letter, and Factory
              Test Report.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                {
                  key: "failure_letter" as const,
                  label: "Sample Failure Letter",
                  name: failureName,
                  path: failurePath,
                },
                {
                  key: "offer_letter" as const,
                  label: "Sample Offer Letter",
                  name: offerName,
                  path: offerPath,
                },
                {
                  key: "factory_test_report" as const,
                  label: "Factory Test Report",
                  name: reportName,
                  path: reportPath,
                },
              ] as const
            ).map((doc) => (
              <div
                key={doc.key}
                className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-100">{doc.label}</p>
                <p className="mt-1 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {doc.name || "Not uploaded"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <label className="cursor-pointer rounded-md border border-zinc-300 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    Upload
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void handleUpload(doc.key, file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!doc.path && !doc.name}
                    onClick={() => void openSignedDoc(doc.path)}
                    className="rounded-md border border-sky-300 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-40 dark:border-sky-700 dark:text-sky-300 dark:hover:bg-sky-950/30"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Reply Draft (AI assisted)
              </label>
              <button
                type="button"
                disabled={aiPending}
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
              placeholder="AI will draft a formal sample-failure reply using the failure letter, IS code details, and uploaded evidence…"
            />
            {!docsReady && (
              <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                Upload all 3 required documents before submitting on Manak Online.
              </p>
            )}
          </div>

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

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
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
  );
}

export function SampleFailureReplySection({ rows }: { rows: SampleFailureReplyRow[] }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
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

  async function handleDelete(row: SampleFailureReplyRow) {
    const ok = window.confirm(`Delete sample failure entry for ${row.client_name}?`);
    if (!ok) return;
    const result = await deleteSampleFailureReply(row.id);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-1.5 dark:border-zinc-800 sm:px-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            BIS Sample Failure Reply
          </h2>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Track PI / Market / Surveillance sample failures and draft Manak Online replies with AI.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
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
          <table className="dashboard-section-table w-full min-w-[920px] text-sm">
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
                <th className={thCls}>IS Code</th>
                <th className={thCls}>CM/L</th>
                <th className={thCls}>Type</th>
                <th className={thCls}>Sample / QR</th>
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
                    {row.is_code_title ? (
                      <div className="mx-auto mt-0.5 max-w-[12rem] truncate text-[10px] text-zinc-400">
                        {row.is_code_title}
                      </div>
                    ) : null}
                  </td>
                  <td className={`${tdCls} font-mono text-xs`}>
                    {formatCmDisplay(row.project_kind ?? "licence", row.cm_l_digits)}
                  </td>
                  <td className={tdCls}>{sampleFailureTypeLabel(row.sample_failure_type)}</td>
                  <td className={tdCls}>
                    <div className="flex justify-center">
                      <SampleCodeCell sampleCode={row.sample_code} qrCode={row.sample_qr_code} />
                    </div>
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
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleManakLogin(row)}
                        title="Manak Online Login"
                        className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
                      >
                        Manak Login
                      </button>
                      <button
                        type="button"
                        onClick={() => setReplyRow(row)}
                        title="Sample Failure Reply"
                        className="rounded-lg bg-sky-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
                      >
                        Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(row)}
                        title="Delete"
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Delete
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
          onClose={() => setModalOpen(false)}
          onAdded={() => router.refresh()}
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
