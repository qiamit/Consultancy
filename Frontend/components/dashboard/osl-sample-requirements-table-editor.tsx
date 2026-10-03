"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDisplayDate } from "@backend/shared/format-date";
import { createClient } from "@backend/db/client/client";
import { DOCUMENTS_BUCKET } from "@backend/modules/storage/documents";
import {
  decodeStoredDocumentRef,
  isDirectDocumentUrl,
  uploadTechnicalStaffDocument,
} from "@backend/modules/storage/technical-staff-documents";
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
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/70 bg-amber-50 text-amber-800 shadow-sm hover:bg-amber-100 dark:border-amber-400/70 dark:bg-amber-500/25 dark:text-amber-100 dark:hover:bg-amber-500/40",
    copyBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/50 bg-sky-50 text-sky-700 shadow-sm hover:bg-sky-100 dark:border-sky-400/60 dark:bg-sky-500/20 dark:text-sky-100 dark:hover:bg-sky-500/35",
    generateTrBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/50 bg-emerald-50 text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-400/60 dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/35",
    labelsBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/50 bg-violet-50 text-violet-700 shadow-sm hover:bg-violet-100 dark:border-violet-400/60 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/35",
    delBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/50 bg-rose-50 text-rose-700 shadow-sm hover:bg-rose-100 dark:border-rose-400/60 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/35",
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
    tableWrap: "min-h-0 flex-1 overflow-auto",
    table: "w-full min-w-[1200px] border-collapse text-center text-xs",
    th: "sticky top-0 z-10 whitespace-nowrap border-b border-zinc-300 bg-zinc-100 px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
    td: "border-b border-zinc-200 px-2.5 py-2 align-middle text-center text-zinc-800 dark:border-zinc-800 dark:text-zinc-100",
    tdMono: "border-b border-zinc-200 px-2.5 py-2 align-middle text-center font-mono text-[11px] font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50",
    trMuted: "opacity-60",
  },
  dark: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-600 bg-zinc-900",
    empty: "px-4 py-10 text-center text-sm text-zinc-300",
    editBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/80 bg-amber-500/30 text-amber-50 shadow-sm hover:bg-amber-500/45",
    copyBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/70 bg-sky-500/25 text-sky-50 shadow-sm hover:bg-sky-500/40",
    generateTrBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/70 bg-emerald-500/25 text-emerald-50 shadow-sm hover:bg-emerald-500/40",
    labelsBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/70 bg-violet-500/25 text-violet-50 shadow-sm hover:bg-violet-500/40",
    delBtn:
      "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-400/70 bg-rose-500/25 text-rose-50 shadow-sm hover:bg-rose-500/40",
    muted: "text-zinc-400",
    highlight: "ring-2 ring-sky-400/90",
    card: "overflow-hidden rounded-xl border border-zinc-600 bg-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
    panel: "rounded-xl border border-zinc-600 bg-zinc-900 p-3",
    cardLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-300",
    cardValue: "mt-0.5 text-xs leading-snug text-zinc-50",
    heroLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-300",
    heroValue: "mt-1 text-sm font-semibold leading-snug text-white",
    ticketBand: "grid gap-3 border-b border-zinc-700 bg-zinc-800 px-3.5 py-3 sm:grid-cols-2",
    kvWrap: "divide-y divide-zinc-700 px-3.5",
    kvRow: "grid gap-1 py-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-3",
    kvLabel: "text-[10px] font-semibold uppercase tracking-wide text-zinc-300",
    kvValue: "text-sm leading-snug text-zinc-50",
    cardFooter: "border-t border-zinc-700 bg-zinc-800 px-3.5 py-2.5",
    addBtn:
      "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-400/70 bg-teal-600/30 px-2.5 py-1.5 text-xs font-semibold text-teal-100 hover:bg-teal-600/45",
    metaRow: "flex gap-2 border-b border-zinc-700 py-1.5 last:border-b-0",
    tableWrap: "min-h-0 flex-1 overflow-auto bg-zinc-900",
    table: "w-full min-w-[1280px] border-collapse text-center text-xs",
    th: "sticky top-0 z-10 whitespace-nowrap border-b border-zinc-500 bg-zinc-800 px-2.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-zinc-100",
    td: "border-b border-zinc-700 bg-zinc-900 px-2.5 py-2.5 align-middle text-center text-zinc-50",
    tdMono: "border-b border-zinc-700 bg-zinc-900 px-2.5 py-2.5 align-middle text-center font-mono text-[11px] font-semibold text-white",
    trMuted: "opacity-70",
  },
} as const;

function SampleDetailsPopup({
  row,
  srNo,
  onClose,
  onEdit,
}: {
  row: OslSampleRequirementRow;
  srNo: string;
  onClose: () => void;
  onEdit: (row: OslSampleRequirementRow) => void;
}) {
  const kind = parseSampleFor(row.sample_for);
  const gradeAndDescription = resolveGradeAndDescription(row);
  const manufactured = row.date_of_manufacturing.trim()
    ? formatDisplayDate(row.date_of_manufacturing)
    : "";
  const rows: { label: string; value: string }[] = [
    { label: "Sample Code", value: fieldOrDash(row.sample_code) },
    { label: "QR Code", value: fieldOrDash(row.qr_code) },
    { label: "Batch Number", value: fieldOrDash(row.batch_number) },
    { label: "Manufactured", value: fieldOrDash(manufactured) },
    { label: "Sample Quantity", value: fieldOrDash(row.sample_quantity) },
    { label: "Batch Quantity", value: fieldOrDash(row.batch_quantity) },
    {
      label: "Grade / Type / Variety",
      value: fieldOrDash(gradeAndDescription.grade_type_variety),
    },
    {
      label: "Sample Description",
      value: fieldOrDash(gradeAndDescription.sample_description),
    },
    { label: "Declared Value", value: fieldOrDash(row.declared_value) },
    { label: "Laboratory", value: fieldOrDash(row.laboratory_name) },
    { label: "Sample For", value: sampleForLabel(kind) },
    { label: "Priority", value: fieldOrDash(row.priority) },
    { label: "Sample Type", value: fieldOrDash(row.sample_type) },
    { label: "Shelf Life", value: fieldOrDash(row.shelf_life) },
    { label: "Mode of Disposal", value: fieldOrDash(row.mode_of_disposal) },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="osl-sample-details-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <h3 id="osl-sample-details-title" className="text-sm font-semibold text-white">
            Sample Details · {srNo}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Close
          </button>
        </div>
        <dl className="min-h-0 flex-1 space-y-0 overflow-y-auto px-4 py-2">
          {rows.map((item) => (
            <div
              key={item.label}
              className="grid gap-0.5 border-b border-zinc-800/80 py-2.5 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {item.label}
              </dt>
              <dd className="m-0 break-words text-sm text-zinc-100">{item.value}</dd>
            </div>
          ))}
          {row.declared_drawing_ref?.trim() ? (
            <div className="grid gap-0.5 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Drawing / PDF
              </dt>
              <dd className="m-0">
                <StorageDocumentLink
                  value={row.declared_drawing_ref}
                  download={row.declared_drawing_name?.trim() || true}
                  title={row.declared_drawing_name?.trim() || "Download drawing / PDF"}
                  label={row.declared_drawing_name?.trim() || "Download"}
                  className="inline-flex max-w-full items-center truncate rounded-md border border-sky-600/40 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20"
                />
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="flex justify-end gap-2 border-t border-zinc-800 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(row);
            }}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
          >
            Edit Sample
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function fieldOrDash(value: string) {
  const v = value.trim();
  return v || "—";
}

function sampleForBadgeClass(kind: OslSampleFor): string {
  if (kind === "ft") {
    return "border-amber-400/80 bg-amber-500/30 text-amber-50";
  }
  if (kind === "it") {
    return "border-violet-400/80 bg-violet-500/30 text-violet-50";
  }
  return "border-teal-400/80 bg-teal-500/30 text-teal-50";
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

function oslDocumentStoragePath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const decoded = decodeStoredDocumentRef(trimmed);
  if (decoded) return decoded;
  if (
    trimmed.startsWith("osl-sample-test-requests/") ||
    trimmed.startsWith("osl-sample-test-reports/")
  ) {
    return trimmed;
  }
  if (!isDirectDocumentUrl(trimmed)) return null;
  try {
    const path = decodeURIComponent(new URL(trimmed).pathname.replace(/^\/+/, ""));
    if (
      path.startsWith("osl-sample-test-requests/") ||
      path.startsWith("osl-sample-test-reports/")
    ) {
      return path;
    }
  } catch {
    return null;
  }
  return null;
}

export function oslDocumentInlineUrl(ref: string, filename?: string): string | null {
  const path = oslDocumentStoragePath(ref);
  if (!path) return null;
  const params = new URLSearchParams({
    bucket: DOCUMENTS_BUCKET,
    path,
    disposition: "inline",
  });
  const name = (filename ?? "").trim() || path.split("/").pop() || "Test-Request.pdf";
  params.set("filename", name);
  return `/api/storage/public?${params.toString()}`;
}

export async function fetchOslDocumentFile(
  ref: string,
  filename: string,
): Promise<File | null> {
  const name = filename.trim() || "Test-Request.pdf";
  const inlineUrl = oslDocumentInlineUrl(ref, name);
  if (inlineUrl) {
    const res = await fetch(inlineUrl);
    if (res.ok) {
      const blob = await res.blob();
      return new File([blob], name, { type: "application/pdf" });
    }
  }
  return null;
}

function sampleDocButtonClass(
  kind: "request" | "report",
  hasSampleCode: boolean,
  hasPdf: boolean,
): string {
  if (hasPdf) {
    return kind === "request"
      ? "border-emerald-400/80 bg-emerald-500/25 text-emerald-100 hover:bg-emerald-500/40"
      : "border-sky-400/80 bg-sky-500/25 text-sky-100 hover:bg-sky-500/40";
  }
  if (kind === "request" && hasSampleCode && !hasPdf) {
    return "border-rose-400/80 bg-rose-500/25 text-rose-100 hover:bg-rose-500/40";
  }
  return "border-zinc-500 bg-zinc-800 text-zinc-100 hover:bg-zinc-700";
}

/** Request / Report chip — click opens Add · View · Delete · Download. */
function SampleDocMenuButton({
  kind,
  hasSampleCode = false,
  fileRef,
  fileName,
  uploading,
  onAttach,
  onDelete,
}: {
  kind: "request" | "report";
  hasSampleCode?: boolean;
  fileRef: string;
  fileName?: string;
  uploading: boolean;
  onAttach: (file: File | null) => void;
  onDelete: () => void;
}) {
  const label = kind === "request" ? "Test Request" : "Test Report";
  const shortLabel = kind === "request" ? "Request" : "Report";
  const inputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const hasPdf = Boolean(fileRef.trim());
  const attachedName = (fileName ?? "").trim();

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(event: MouseEvent) {
      const t = event.target;
      if (!(t instanceof Node)) return;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function openMenu() {
    if (uploading) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 168;
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, window.innerWidth - width - 8),
      );
      setMenuPos({ top: rect.bottom + 4, left });
    }
    setMenuOpen(true);
  }

  function openPicker() {
    setMenuOpen(false);
    inputRef.current?.click();
  }

  function viewDoc() {
    setMenuOpen(false);
    const inlineUrl = oslDocumentInlineUrl(fileRef, attachedName);
    if (inlineUrl) {
      window.open(inlineUrl, "_blank", "noopener,noreferrer");
      return;
    }
    window.alert(`${label} file could not be opened.`);
  }

  async function downloadDoc() {
    setMenuOpen(false);
    if (!hasPdf || downloading) return;
    setDownloading(true);
    try {
      const file = await fetchOslDocumentFile(
        fileRef,
        attachedName || `${shortLabel}.pdf`,
      );
      if (!file) {
        window.alert(`${label} file could not be downloaded.`);
        return;
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  const title = uploading
    ? `Attaching ${label}…`
    : hasPdf
      ? `${label}${attachedName ? `: ${attachedName}` : ""}. Click for Add / View / Delete / Download.`
      : `No ${label} yet. Click for Add / View / Delete / Download.`;

  const menuItemClass =
    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <span className="inline-flex">
      <button
        ref={btnRef}
        type="button"
        disabled={uploading}
        onClick={openMenu}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={title}
        title={title}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sampleDocButtonClass(kind, hasSampleCode, hasPdf)} ${
          uploading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {kind === "request" ? <IconDoc /> : <IconClip />}
        {shortLabel}
        <svg className="h-2.5 w-2.5 opacity-80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
        disabled={uploading}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (file) onAttach(file);
        }}
      />
      {menuOpen && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={`${label} actions`}
              className="fixed z-[620] w-[168px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-xl shadow-black/50"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button type="button" role="menuitem" className={menuItemClass} onClick={openPicker}>
                Add
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                disabled={!hasPdf}
                onClick={viewDoc}
              >
                View
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                disabled={!hasPdf}
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
              >
                Delete
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                disabled={!hasPdf || downloading}
                onClick={() => void downloadDoc()}
              >
                {downloading ? "Downloading…" : "Download"}
              </button>
            </div>,
            document.body,
          )
        : null}
      {confirmOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[630] flex items-center justify-center bg-black/70 px-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`osl-delete-${kind}-title`}
              onClick={() => setConfirmOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3
                  id={`osl-delete-${kind}-title`}
                  className="text-sm font-semibold text-white"
                >
                  Delete {label}?
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                  Remove{" "}
                  <span className="font-semibold text-zinc-100">
                    {attachedName || `this ${label} PDF`}
                  </span>
                  ? This cannot be undone.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmOpen(false);
                      onDelete();
                    }}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
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
          ? "border-sky-400/80 bg-sky-500/30 text-sky-100"
          : "border-zinc-500 bg-zinc-800 text-zinc-300"
      }`}
    >
      <span
        className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors ${
          on ? "bg-sky-400" : "bg-zinc-500"
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
  onGenerateTestRequest,
  onViewSampleLabels,
  sampleLabelsLoading = false,
  sampleLabelsRowId = null,
  onRemove,
  onUpdate,
  theme = "light",
  focusSampleIndex = null,
  manakGeneratedRowId = null,
}: {
  rows: OslSampleRequirementRow[];
  onEdit: (row: OslSampleRequirementRow) => void;
  onCopy: (row: OslSampleRequirementRow) => void;
  /** Copy payload + open Manak Test Request in one action. */
  onGenerateTestRequest?: (row: OslSampleRequirementRow) => void;
  onViewSampleLabels?: (row: OslSampleRequirementRow) => void;
  sampleLabelsLoading?: boolean;
  sampleLabelsRowId?: string | null;
  onRemove: (row: OslSampleRequirementRow) => void;
  onUpdate: (row: OslSampleRequirementRow) => void;
  theme?: keyof typeof themes;
  focusSampleIndex?: number | null;
  manakGeneratedRowId?: string | null;
}) {
  const t = themes[theme];
  const visibleRows = useMemo(() => rows.filter(rowHasContent), [rows]);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [detailsRow, setDetailsRow] = useState<{
    row: OslSampleRequirementRow;
    srNo: string;
  } | null>(null);

  async function attachSampleFile(
    row: OslSampleRequirementRow,
    file: File | null,
    kind: "request" | "report",
  ) {
    if (!file) return;
    const key = `${row.id}:${kind}`;
    const label = kind === "request" ? "Test request" : "Test report";
    setUploadingKey(key);
    try {
      const folder = kind === "request" ? "osl-sample-test-requests" : "osl-sample-test-reports";
      const fallback = kind === "request" ? "test-request" : "test-report";
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
    } catch (err) {
      window.alert(
        `${label} upload failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setUploadingKey(null);
    }
  }

  async function removeSampleDocFile(
    row: OslSampleRequirementRow,
    kind: "request" | "report",
  ) {
    const ref =
      kind === "request"
        ? (row.test_request_ref ?? "").trim()
        : (row.test_report_ref ?? "").trim();
    const path = oslDocumentStoragePath(ref);
    if (path) {
      await createClient()
        .storage.from(DOCUMENTS_BUCKET)
        .remove([path])
        .catch(() => undefined);
    }
    onUpdate({
      ...row,
      ...(kind === "request"
        ? { test_request_ref: "", test_request_name: "" }
        : { test_report_ref: "", test_report_name: "" }),
    });
  }

  useEffect(() => {
    if (focusSampleIndex == null || focusSampleIndex < 0) return;
    const el = document.querySelector(
      `[data-osl-sample-index="${focusSampleIndex}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusSampleIndex, visibleRows.length]);

  function rowToolbar(row: OslSampleRequirementRow, srNo: string) {
    const iconClass = "h-3.5 w-3.5 shrink-0";
    return (
      <div className="inline-flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onEdit(row)}
          className={t.editBtn}
          aria-label={`Edit sample form ${srNo}`}
          title="Edit Form"
        >
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213 3 20.25l1.037-4.5L16.862 3.487z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onCopy(row)}
          className={t.copyBtn}
          aria-label={`Duplicate sample ${srNo}`}
          title="Duplicate"
        >
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        {onGenerateTestRequest ? (
          <button
            type="button"
            onClick={() => onGenerateTestRequest(row)}
            className={`${t.generateTrBtn} ${
              manakGeneratedRowId === row.id ? "ring-2 ring-emerald-300/80" : ""
            }`}
            aria-label={`Generate Test Request for sample ${srNo}`}
            title={
              manakGeneratedRowId === row.id
                ? "Opening Manak Test Request…"
                : "Generate Test Request"
            }
          >
            <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </button>
        ) : null}
        {onViewSampleLabels ? (
          <button
            type="button"
            onClick={() => onViewSampleLabels(row)}
            disabled={sampleLabelsLoading}
            className={`${t.labelsBtn} disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={`View sample labels for sample ${srNo}`}
            title={
              sampleLabelsLoading && sampleLabelsRowId === row.id
                ? "Loading sample labels…"
                : "View Sample Labels"
            }
          >
            <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onRemove(row)}
          className={t.delBtn}
          aria-label={`Delete sample ${srNo}`}
          title="Delete"
        >
          <svg className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
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
        <div className={`${t.tableWrap} p-2 sm:p-3`}>
          <table className={t.table}>
            <thead>
              <tr>
                <th className={t.th}>#</th>
                <th className={t.th}>Sample For</th>
                <th className={t.th}>QR Code</th>
                <th className={t.th}>Sample Code</th>
                <th className={t.th}>Sample Details</th>
                <th className={t.th}>Priority</th>
                <th className={t.th} title="Include in letter table (print / Word / PDF)">
                  In Letter
                </th>
                <th className={t.th}>Request</th>
                <th className={t.th}>Report</th>
                <th className={t.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const srNo = String(index + 1).padStart(2, "0");
                const highlighted = focusSampleIndex === index;
                const kind = parseSampleFor(row.sample_for);
                const sampleFor = sampleForLabel(kind);
                const inLetter = isSampleIncludedInPrint(row);
                const batchLabel = row.batch_number.trim() || "View details";
                const priority = row.priority.trim();
                return (
                  <tr
                    key={row.id}
                    data-osl-sample-index={index}
                    className={`${highlighted ? t.highlight : ""} ${
                      inLetter ? "" : t.trMuted
                    }`}
                  >
                    <td className={t.td}>
                      <span className="font-semibold text-zinc-200">{srNo}</span>
                    </td>
                    <td className={t.td}>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${sampleForBadgeClass(kind)}`}
                      >
                        {sampleFor}
                      </span>
                    </td>
                    <td className={t.tdMono}>
                      {row.qr_code.trim() ? (
                        <button
                          type="button"
                          onClick={() => onEdit(row)}
                          className="font-mono text-[11px] font-semibold text-sky-200 underline decoration-sky-400/70 underline-offset-2 hover:text-sky-100 hover:decoration-sky-200"
                          title="Edit Form"
                          aria-label={`Edit sample form ${srNo} (QR ${row.qr_code.trim()})`}
                        >
                          {row.qr_code.trim()}
                        </button>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className={t.tdMono}>
                      {row.sample_code.trim() ? (
                        row.sample_code.trim()
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className={`${t.td} max-w-[14rem] break-words`}>
                      <button
                        type="button"
                        onClick={() => setDetailsRow({ row, srNo })}
                        className="text-xs font-semibold text-violet-200 underline decoration-violet-400/70 underline-offset-2 hover:text-violet-100 hover:decoration-violet-200"
                        title="View sample details"
                        aria-label={`View sample details for ${srNo}`}
                      >
                        {batchLabel}
                      </button>
                    </td>
                    <td className={t.td}>
                      {priority ? (
                        <span className="inline-flex items-center rounded-full border border-zinc-400/80 bg-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-50">
                          {priority}
                        </span>
                      ) : (
                        <span className={t.muted}>—</span>
                      )}
                    </td>
                    <td className={t.td}>
                      <InLetterToggle
                        on={inLetter}
                        onToggle={() =>
                          onUpdate({
                            ...row,
                            include_in_print: !inLetter,
                          })
                        }
                      />
                    </td>
                    <td className={t.td}>
                      <SampleDocMenuButton
                        kind="request"
                        hasSampleCode={Boolean(row.sample_code.trim())}
                        fileRef={row.test_request_ref ?? ""}
                        fileName={row.test_request_name}
                        uploading={uploadingKey === `${row.id}:request`}
                        onAttach={(file) => void attachSampleFile(row, file, "request")}
                        onDelete={() => void removeSampleDocFile(row, "request")}
                      />
                    </td>
                    <td className={t.td}>
                      <SampleDocMenuButton
                        kind="report"
                        fileRef={row.test_report_ref ?? ""}
                        fileName={row.test_report_name}
                        uploading={uploadingKey === `${row.id}:report`}
                        onAttach={(file) => void attachSampleFile(row, file, "report")}
                        onDelete={() => void removeSampleDocFile(row, "report")}
                      />
                    </td>
                    <td className={t.td}>
                      {rowToolbar(row, srNo)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {detailsRow ? (
        <SampleDetailsPopup
          row={detailsRow.row}
          srNo={detailsRow.srNo}
          onClose={() => setDetailsRow(null)}
          onEdit={onEdit}
        />
      ) : null}
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
