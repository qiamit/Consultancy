"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@backend/db/client/client";
import { uploadTechnicalStaffDocument } from "@backend/modules/storage/technical-staff-documents";
import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";
import {
  CMPF307_OWNED_BY_OPTIONS,
  CMPF307_REGISTRATION_OPTIONS,
} from "@backend/modules/bis/cmpf-307";
import {
  defaultCmpf307AddBrandFormValues,
  defaultCmpf307BrandFormEntry,
  editorRowsFromFormEntries,
  formEntriesFromEditorRows,
  type Cmpf307AddBrandFormValues,
  type Cmpf307BrandFormEntry,
} from "@backend/modules/bis/cmpf-307-brand-form";
import type { Cmpf307BrandRow } from "@backend/modules/bis/cmpf-307";

const fieldLabelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500";
const tableHeaderLabelClass = `${fieldLabelClass} text-center`;
const fieldInputClass =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-center text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";
const fieldInputLeftClass = `${fieldInputClass} text-left`;

const brandGridClass =
  "grid grid-cols-[minmax(140px,2fr)_minmax(90px,0.9fr)_minmax(110px,1fr)_minmax(120px,1.1fr)_auto] items-start gap-2";

export function Cmpf307AddBrandForm({
  initialRows,
  onRowsChange,
}: {
  initialRows: Cmpf307BrandRow[];
  onRowsChange: (rows: Cmpf307BrandRow[]) => void;
}) {
  const rowsRef = useRef(initialRows);
  const [form, setForm] = useState<Cmpf307AddBrandFormValues>(() => ({
    ...defaultCmpf307AddBrandFormValues(),
    brandEntries: formEntriesFromEditorRows(initialRows),
  }));
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    const nextRows = editorRowsFromFormEntries(form.brandEntries, rowsRef.current);
    rowsRef.current = nextRows;
    onRowsChange(nextRows);
  }, [form, onRowsChange]);

  function updateBrandEntry(index: number, patch: Partial<Cmpf307BrandFormEntry>) {
    setForm((prev) => ({
      ...prev,
      brandEntries: prev.brandEntries.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function addBrandField() {
    setForm((prev) => ({
      ...prev,
      brandEntries: [...prev.brandEntries, defaultCmpf307BrandFormEntry()],
    }));
  }

  async function attachBrandFile(
    index: number,
    file: File | null,
    kind: "agreement" | "trademark",
  ) {
    if (!file) return;
    const key = `${index}:${kind}`;
    setUploadingKey(key);
    try {
      const folder = kind === "agreement" ? "cmpf-307-agreements" : "cmpf-307-trademarks";
      const fallback = kind === "agreement" ? "agreement-copy" : "trademark-certificate";
      const label = kind === "agreement" ? "Agreement" : "Trademark certificate";
      const safeName = file.name.replace(/[^\w.\-]+/g, "-").slice(0, 120) || fallback;
      const path = `${folder}/${Date.now()}-${index}-${safeName}`;
      const result = await uploadTechnicalStaffDocument(createClient(), path, file);
      if ("error" in result) {
        window.alert(`${label} upload failed: ${result.error}`);
        return;
      }
      updateBrandEntry(
        index,
        kind === "agreement"
          ? {
              agreementCopyRef: result.ref,
              agreementCopyName: file.name.trim() || safeName,
            }
          : {
              trademarkCertificateRef: result.ref,
              trademarkCertificateName: file.name.trim() || safeName,
            },
      );
    } finally {
      setUploadingKey(null);
    }
  }

  function removeBrandField(index: number) {
    setForm((prev) => {
      const next = prev.brandEntries.filter((_, i) => i !== index);
      return {
        ...prev,
        brandEntries: next.length > 0 ? next : [defaultCmpf307BrandFormEntry()],
      };
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-[720px] space-y-2">
          <div className={`${brandGridClass} items-center`}>
            <label className={`${fieldLabelClass} text-left`}>Brand / Trade Mark</label>
            <label className={tableHeaderLabelClass}>Owned By</label>
            <label className={tableHeaderLabelClass}>Registered</label>
            <label className={tableHeaderLabelClass}>Date of Reg. / Intro.</label>
            <span className={`${tableHeaderLabelClass} invisible`} aria-hidden="true">
              Actions
            </span>
          </div>
          {form.brandEntries.map((entry, index) => (
            <div key={index} className="space-y-1.5">
              <div className={brandGridClass}>
                <input
                  type="text"
                  value={entry.brandName}
                  onChange={(event) =>
                    updateBrandEntry(index, { brandName: event.target.value })
                  }
                  className={fieldInputLeftClass}
                />
                <select
                  value={entry.ownedBy}
                  onChange={(event) =>
                    updateBrandEntry(index, { ownedBy: event.target.value })
                  }
                  className={fieldInputClass}
                >
                  <option value="">—</option>
                  {CMPF307_OWNED_BY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  value={entry.registeredStatus}
                  onChange={(event) =>
                    updateBrandEntry(index, { registeredStatus: event.target.value })
                  }
                  className={fieldInputClass}
                >
                  <option value="">—</option>
                  {CMPF307_REGISTRATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={entry.registrationDate}
                  onChange={(event) =>
                    updateBrandEntry(index, { registrationDate: event.target.value })
                  }
                  className={fieldInputClass}
                />
                <div className="flex items-center gap-1">
                  {form.brandEntries.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeBrandField(index)}
                      className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                      aria-label="Remove brand row"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  ) : (
                    <span className="h-[37px] w-[37px] shrink-0" aria-hidden="true" />
                  )}
                </div>
              </div>
              {entry.ownedBy === "Others" ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2">
                  <p className="min-w-0 flex-1 text-[11px] leading-snug text-amber-100">
                    Agreement between both parties is required. Upload the Agreement Copy.
                  </p>
                  <label
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                      entry.agreementCopyRef.trim()
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                        : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                    } ${uploadingKey === `${index}:agreement` ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {uploadingKey === `${index}:agreement`
                      ? "Uploading…"
                      : entry.agreementCopyRef.trim()
                        ? "Replace Agreement"
                        : "Upload Agreement"}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      disabled={uploadingKey === `${index}:agreement`}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void attachBrandFile(index, file, "agreement");
                      }}
                    />
                  </label>
                  {entry.agreementCopyRef.trim() ? (
                    <StorageDocumentLink
                      value={entry.agreementCopyRef}
                      label={entry.agreementCopyName.trim() || "View"}
                      className="inline-flex items-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20"
                    />
                  ) : null}
                </div>
              ) : null}
              {entry.registeredStatus === "Registered" ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-700/40 bg-sky-950/30 px-3 py-2">
                  <p className="min-w-0 flex-1 text-[11px] leading-snug text-sky-100">
                    Trademark Certificate copy is required. Upload the certificate.
                  </p>
                  <label
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                      entry.trademarkCertificateRef.trim()
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
                        : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                    } ${uploadingKey === `${index}:trademark` ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {uploadingKey === `${index}:trademark`
                      ? "Uploading…"
                      : entry.trademarkCertificateRef.trim()
                        ? "Replace Certificate"
                        : "Upload Certificate"}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      disabled={uploadingKey === `${index}:trademark`}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        e.target.value = "";
                        void attachBrandFile(index, file, "trademark");
                      }}
                    />
                  </label>
                  {entry.trademarkCertificateRef.trim() ? (
                    <StorageDocumentLink
                      value={entry.trademarkCertificateRef}
                      label={entry.trademarkCertificateName.trim() || "View"}
                      className="inline-flex items-center rounded-lg border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={addBrandField}
        className="shrink-0 self-start rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
      >
        Add Brand Name
      </button>
    </div>
  );
}
