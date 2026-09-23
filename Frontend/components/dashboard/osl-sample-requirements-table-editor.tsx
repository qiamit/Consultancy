"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { formatDisplayDate } from "@backend/shared/format-date";
import { createClient } from "@backend/db/client/client";
import { uploadTechnicalStaffDocument } from "@backend/modules/storage/technical-staff-documents";
import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";
import {
  isSampleIncludedInPrint,
  parseSampleFor,
  resolveGradeAndDescription,
  rowHasContent,
  sampleForLabel,
  type OslSampleFor,
  type OslSampleRequirementRow,
} from "@backend/modules/bis/osl-sample-requirements";

const themes = {
  light: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700",
    empty: "px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400",
    editBtn:
      "rounded-lg p-1.5 text-zinc-500 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-300",
    copyBtn:
      "rounded-lg p-1.5 text-zinc-500 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/40 dark:hover:text-sky-300",
    manakCopyBtn:
      "rounded-lg p-1.5 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300",
    manakOpenBtn:
      "rounded-lg p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300",
    labelsBtn:
      "rounded-lg p-1.5 text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300",
    delBtn:
      "rounded-lg p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400",
    muted: "text-zinc-400 dark:text-zinc-500",
    highlight: "ring-2 ring-sky-500/80",
    card: "overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950",
    panel: "rounded-xl border border-zinc-200/80 bg-zinc-50/90 p-3 dark:border-zinc-800 dark:bg-zinc-950/60",
    cardLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    cardValue: "mt-0.5 text-xs leading-snug text-zinc-800 dark:text-zinc-100",
    heroLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    heroValue: "mt-1 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50",
    ticketBand: "grid gap-3 border-b border-zinc-200 bg-zinc-50 px-3.5 py-3 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900/70",
    kvWrap: "divide-y divide-zinc-200/80 px-3.5 dark:divide-zinc-800",
    kvRow: "grid gap-1 py-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-3",
    kvLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    kvValue: "text-sm leading-snug text-zinc-900 dark:text-zinc-100",
    cardFooter: "border-t border-zinc-200 bg-zinc-50 px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/70",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600/50 bg-teal-950/40 px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-950/70",
    metaRow: "flex gap-2 border-b border-zinc-200/70 py-1.5 last:border-b-0 dark:border-zinc-800/80",
  },
  dark: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800",
    empty: "px-4 py-10 text-center text-sm text-zinc-500",
    editBtn:
      "rounded-lg p-1.5 text-zinc-400 hover:bg-amber-950/50 hover:text-amber-300",
    copyBtn:
      "rounded-lg p-1.5 text-zinc-400 hover:bg-sky-950/50 hover:text-sky-300",
    manakCopyBtn:
      "rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-950/50 hover:text-emerald-300",
    manakOpenBtn:
      "rounded-lg p-1.5 text-zinc-400 hover:bg-red-950/50 hover:text-red-300",
    labelsBtn:
      "rounded-lg p-1.5 text-zinc-400 hover:bg-emerald-950/50 hover:text-emerald-300",
    delBtn:
      "rounded-lg p-1.5 text-zinc-400 hover:bg-red-950/50 hover:text-red-400",
    muted: "text-zinc-500",
    highlight: "ring-2 ring-sky-500/80",
    card: "overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-950 shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
    panel: "rounded-xl border border-zinc-800 bg-zinc-950/80 p-3",
    cardLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    cardValue: "mt-0.5 text-xs leading-snug text-zinc-100",
    heroLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    heroValue: "mt-1 text-sm font-semibold leading-snug text-zinc-50",
    ticketBand: "grid gap-3 border-b border-zinc-800 bg-zinc-900/80 px-3.5 py-3 sm:grid-cols-2",
    kvWrap: "divide-y divide-zinc-800/90 px-3.5",
    kvRow: "grid gap-1 py-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-3",
    kvLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    kvValue: "text-sm leading-snug text-zinc-100",
    cardFooter: "border-t border-zinc-800 bg-zinc-900/70 px-3.5 py-2.5",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-600/50 bg-teal-950/40 px-2.5 py-1.5 text-xs font-semibold text-teal-200 hover:bg-teal-950/70",
    metaRow: "flex gap-2 border-b border-zinc-800/90 py-1.5 last:border-b-0",
  },
} as const;

function fieldOrDash(value: string) {
  const v = value.trim();
  return v || "—";
}

function sampleForBadgeClass(kind: OslSampleFor): string {
  if (kind === "ft") {
    return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  }
  if (kind === "it") {
    return "border-violet-500/40 bg-violet-500/15 text-violet-200";
  }
  return "border-teal-500/40 bg-teal-500/15 text-teal-200";
}

function TicketCode({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
        {fieldOrDash(value)}
      </p>
    </div>
  );
}

function IconEdit() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.875 4.5" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75A1.125 1.125 0 013.75 20.625V10.5A1.125 1.125 0 014.875 9.375H8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25H18a1.125 1.125 0 001.125-1.125V5.625A1.125 1.125 0 0018 4.5h-9.75A1.125 1.125 0 007.125 5.625V8.25" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0V4.306c0-.682-.448-1.28-1.087-1.487A48.23 48.23 0 0012 2.25c-.875 0-1.73.066-2.563.192A1.875 1.875 0 008.25 4.306V5.79" />
    </svg>
  );
}

function IconManakCopy() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M8.25 4.5h7.5A2.25 2.25 0 0118 6.75v12.75A2.25 2.25 0 0115.75 21.75H8.25A2.25 2.25 0 016 19.5V6.75A2.25 2.25 0 018.25 4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25h6" />
    </svg>
  );
}

function IconSampleLabels() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function IconManakOpen() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5M15 3h6m0 0v6m0-6L10.5 13.5" />
    </svg>
  );
}

function IconClip() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25A2.25 2.25 0 006 4.5v15A2.25 2.25 0 008.25 21.75h7.5A2.25 2.25 0 0018 19.5v-1.125" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12.75l1.5 1.5L21 9.75" />
    </svg>
  );
}

function AttachFileButton({
  attached,
  fileName,
  uploading,
  title,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls",
  icon,
  onPick,
}: {
  attached: boolean;
  fileName?: string;
  uploading: boolean;
  title: string;
  accept?: string;
  icon: ReactNode;
  onPick: (file: File | null) => void;
}) {
  const attachedName = (fileName ?? "").trim();
  return (
    <label
      className={`inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-full border ${
        attached
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
          : "border-zinc-600/70 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-800"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
      aria-label={
        uploading
          ? `Attaching ${title}`
          : attachedName
            ? `Attached: ${attachedName}. Click to replace.`
            : title
      }
      title={
        uploading
          ? "Attaching…"
          : attachedName
            ? `Attached: ${attachedName}. Click to replace.`
            : title
      }
    >
      {icon}
      <input
        type="file"
        className="hidden"
        accept={accept}
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          onPick(file);
        }}
      />
    </label>
  );
}

function InLetterToggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      aria-label={
        on
          ? "Included in letter table. Click to exclude."
          : "Excluded from letter table. Click to include."
      }
      title={
        on
          ? "Included in letter table (print / Word / PDF). Click to exclude."
          : "Excluded from letter table. Click to include."
      }
      className={`inline-flex h-[22px] w-[34px] shrink-0 items-center justify-center rounded-full border transition-colors ${
        on
          ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
          : "border-zinc-600/70 bg-zinc-800/50 text-zinc-500"
      }`}
    >
      <span
        className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${
          on ? "bg-sky-500" : "bg-zinc-600"
        }`}
        aria-hidden
      >
        <span
          className={`absolute h-2.5 w-2.5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-3" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function OslSampleRequirementsTableEditor({
  rows,
  onEdit,
  onCopy,
  onCopyForManak,
  onOpenManak,
  onViewSampleLabels,
  sampleLabelsLoading = false,
  sampleLabelsRowId = null,
  onRemove,
  onUpdate,
  theme = "light",
  focusSampleIndex = null,
  manakCopiedRowId = null,
}: {
  rows: OslSampleRequirementRow[];
  onEdit: (row: OslSampleRequirementRow) => void;
  onCopy: (row: OslSampleRequirementRow) => void;
  onCopyForManak?: (row: OslSampleRequirementRow) => void;
  onOpenManak?: (row: OslSampleRequirementRow) => void;
  onViewSampleLabels?: (row: OslSampleRequirementRow) => void;
  sampleLabelsLoading?: boolean;
  sampleLabelsRowId?: string | null;
  onRemove: (row: OslSampleRequirementRow) => void;
  onUpdate: (row: OslSampleRequirementRow) => void;
  theme?: keyof typeof themes;
  focusSampleIndex?: number | null;
  manakCopiedRowId?: string | null;
}) {
  const t = themes[theme];
  const visibleRows = useMemo(() => rows.filter(rowHasContent), [rows]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  async function attachSampleFile(
    row: OslSampleRequirementRow,
    file: File | null,
    kind: "request" | "report",
  ) {
    if (!file) return;
    const key = `${row.id}:${kind}`;
    setUploadingKey(key);
    try {
      const folder = kind === "request" ? "osl-sample-test-requests" : "osl-sample-test-reports";
      const fallback = kind === "request" ? "test-request" : "test-report";
      const label = kind === "request" ? "Test request" : "Test report";
      const safeName = file.name.replace(/[^\w.\-]+/g, "-").slice(0, 120) || fallback;
      const safeId = row.id.replace(/[^\w.\-]+/g, "-").slice(0, 80);
      const path = `${folder}/${safeId}/${Date.now()}-${safeName}`;
      const result = await uploadTechnicalStaffDocument(createClient(), path, file);
      if ("error" in result) {
        window.alert(`${label} upload failed: ${result.error}`);
        return;
      }
      onUpdate({
        ...row,
        ...(kind === "request"
          ? {
              test_request_ref: result.ref,
              test_request_name: file.name.trim() || safeName,
            }
          : {
              test_report_ref: result.ref,
              test_report_name: file.name.trim() || safeName,
            }),
      });
    } finally {
      setUploadingKey(null);
    }
  }

  useEffect(() => {
    if (focusSampleIndex == null || focusSampleIndex < 0) return;
    const el = document.querySelector(
      `[data-osl-sample-index="${focusSampleIndex}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusSampleIndex, visibleRows.length]);

  function rowToolbar(
    row: OslSampleRequirementRow,
    srNo: string,
    kind: OslSampleFor,
    sampleFor: string,
    inLetter: boolean,
  ) {
    return (
      <div className="inline-flex max-w-full flex-wrap items-center gap-0.5">
        <InLetterToggle
          on={inLetter}
          onToggle={() =>
            onUpdate({
              ...row,
              include_in_print: !inLetter,
            })
          }
        />
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${sampleForBadgeClass(kind)}`}
        >
          {sampleFor}
        </span>
        {row.priority.trim() ? (
          <span className="inline-flex items-center rounded-full border border-zinc-600/70 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
            {row.priority}
          </span>
        ) : null}
        <AttachFileButton
          attached={Boolean(row.test_request_ref?.trim())}
          fileName={row.test_request_name}
          uploading={uploadingKey === `${row.id}:request`}
          title="Attach Test Request"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          icon={<IconDoc />}
          onPick={(file) => void attachSampleFile(row, file, "request")}
        />
        {row.test_request_ref?.trim() ? (
          <StorageDocumentLink
            value={row.test_request_ref}
            label="Request"
            className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200 hover:bg-sky-500/20"
          />
        ) : null}
        <AttachFileButton
          attached={Boolean(row.test_report_ref?.trim())}
          fileName={row.test_report_name}
          uploading={uploadingKey === `${row.id}:report`}
          title="Attach Test Report"
          icon={<IconClip />}
          onPick={(file) => void attachSampleFile(row, file, "report")}
        />
        {row.test_report_ref?.trim() ? (
          <StorageDocumentLink
            value={row.test_report_ref}
            label="Report"
            className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200 hover:bg-sky-500/20"
          />
        ) : null}
        <span className="mx-0.5 h-4 w-px shrink-0 bg-zinc-700/80" aria-hidden />
        <button
          type="button"
          onClick={() => onEdit(row)}
          className={t.editBtn}
          aria-label={`Edit sample ${srNo}`}
          title="Edit"
        >
          <IconEdit />
        </button>
        <button
          type="button"
          onClick={() => onCopy(row)}
          className={t.copyBtn}
          aria-label={`Duplicate sample ${srNo}`}
          title="Duplicate sample card"
        >
          <IconCopy />
        </button>
        {onCopyForManak ? (
          <button
            type="button"
            onClick={() => onCopyForManak(row)}
            className={t.manakCopyBtn}
            aria-label={`Copy sample ${srNo} for Manak Test Request`}
            title={
              manakCopiedRowId === row.id
                ? "Copied for Manak Test Request"
                : "Copy for Manak Test Request"
            }
          >
            <IconManakCopy />
          </button>
        ) : null}
        {onOpenManak ? (
          <button
            type="button"
            onClick={() => onOpenManak(row)}
            className={t.manakOpenBtn}
            aria-label={`Open Manak Test Request for sample ${srNo}`}
            title="Open Manak Test Request"
          >
            <IconManakOpen />
          </button>
        ) : null}
        {onViewSampleLabels ? (
          <button
            type="button"
            onClick={() => onViewSampleLabels(row)}
            disabled={sampleLabelsLoading}
            className={`${t.labelsBtn} ${
              sampleLabelsRowId === row.id ? "text-emerald-300" : ""
            } disabled:opacity-50`}
            aria-label={`View sample labels for sample ${srNo}`}
            title={
              sampleLabelsLoading && sampleLabelsRowId === row.id
                ? "Loading sample labels…"
                : "View Sample Labels"
            }
          >
            <IconSampleLabels />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(row)}
          className={t.delBtn}
          aria-label={`Delete sample ${srNo}`}
          title="Delete"
        >
          <IconTrash />
        </button>
      </div>
    );
  }

  return (
    <div className={t.wrap}>
      {visibleRows.length === 0 ? (
        <p className={t.empty}>
          No samples added yet. Use &ldquo;Add Sample&rdquo; to enter sample details.
        </p>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {visibleRows.map((row, index) => {
              const srNo = String(index + 1).padStart(2, "0");
              const highlighted = focusSampleIndex === index;
              const kind = parseSampleFor(row.sample_for);
              const sampleFor = sampleForLabel(kind);
              const inLetter = isSampleIncludedInPrint(row);
              const dom = row.date_of_manufacturing.trim()
                ? formatDisplayDate(row.date_of_manufacturing)
                : "";
              const gradeAndDescription = resolveGradeAndDescription(row);
              const details: { label: string; value: ReactNode }[] = [
                { label: "Sample Quantity", value: fieldOrDash(row.sample_quantity) },
                {
                  label: "Grade / Type / Variety",
                  value: fieldOrDash(gradeAndDescription.grade_type_variety),
                },
                {
                  label: "Declared Value",
                  value: (
                    <>
                      <span className="break-words">{fieldOrDash(row.declared_value)}</span>
                      {row.declared_drawing_ref?.trim() ? (
                        <StorageDocumentLink
                          value={row.declared_drawing_ref}
                          download={row.declared_drawing_name?.trim() || true}
                          title={row.declared_drawing_name?.trim() || "Download drawing / PDF"}
                          label={row.declared_drawing_name?.trim() || "Download"}
                          className="mt-1.5 inline-flex max-w-full items-center truncate rounded-md border border-sky-600/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200 hover:bg-sky-500/20"
                        />
                      ) : null}
                    </>
                  ),
                },
                { label: "Laboratory", value: fieldOrDash(row.laboratory_name) },
              ];

              return (
                <article
                  key={row.id}
                  data-osl-sample-index={index}
                  className={`${t.card} ${highlighted ? t.highlight : ""} ${
                    inLetter ? "" : "opacity-70"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-3.5 py-2 dark:border-zinc-800">
                    {rowToolbar(row, srNo, kind, sampleFor, inLetter)}
                  </div>

                  <div className={t.ticketBand}>
                    <TicketCode label="Sample Code" value={row.sample_code} />
                    <TicketCode label="QR Code" value={row.qr_code} />
                  </div>

                  <dl className={t.kvWrap}>
                    <div className="grid gap-3 py-2.5 sm:grid-cols-2">
                      <div>
                        <dt className={t.kvLabel}>Batch Number</dt>
                        <dd className={`${t.kvValue} m-0 mt-0.5 break-words`}>
                          {fieldOrDash(row.batch_number)}
                        </dd>
                      </div>
                      <div>
                        <dt className={t.kvLabel}>Manufactured</dt>
                        <dd className={`${t.kvValue} m-0 mt-0.5 break-words`}>
                          {fieldOrDash(dom)}
                        </dd>
                      </div>
                    </div>
                    {details.map((item) => (
                      <div key={item.label} className={t.kvRow}>
                        <dt className={t.kvLabel}>{item.label}</dt>
                        <dd className={`${t.kvValue} m-0 break-words`}>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function OslSampleAddButton({
  theme = "dark",
  onClick,
}: {
  theme?: keyof typeof themes;
  onClick: () => void;
}) {
  const t = themes[theme];
  return (
    <button type="button" onClick={onClick} className={t.addBtn}>
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Add Sample
    </button>
  );
}
