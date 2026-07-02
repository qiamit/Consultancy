"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";
import {
  createLegalDocumentRow,
  type LegalDocumentRow,
} from "@/lib/legal-documents";
import { legalDocumentPath } from "@/lib/storage/legal-documents";
import {
  decodeStoredDocumentRef,
  uploadTechnicalStaffDocument,
} from "@/lib/storage/technical-staff-documents";

function displayFileName(ref: string): string {
  const path = decodeStoredDocumentRef(ref);
  if (!path) return "";
  const parts = path.split("/");
  return parts[parts.length - 1] ?? "";
}

export function LegalDocumentsTableEditor({
  projectId,
  rows,
  onChange,
}: {
  projectId: string;
  rows: LegalDocumentRow[];
  onChange: (rows: LegalDocumentRow[]) => void;
}) {
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<LegalDocumentRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...rows, createLegalDocumentRow()]);
  }

  function removeRow(id: string) {
    const next = rows.filter((row) => row.id !== id);
    onChange(next.length > 0 ? next : [createLegalDocumentRow()]);
  }

  async function handleUpload(rowId: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingRowId(rowId);
    try {
      const supabase = createClient();
      const path = legalDocumentPath(projectId, rowId, file.name);
      const result = await uploadTechnicalStaffDocument(supabase, path, file);
      if ("error" in result) {
        window.alert(`Upload failed: ${result.error}`);
        return;
      }
      updateRow(rowId, { document_ref: result.ref });
    } finally {
      setUploadingRowId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Legal Documents</h3>
        <button
          type="button"
          onClick={addRow}
          className="shrink-0 rounded-lg border border-teal-600/40 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-700/50 dark:bg-teal-950/40 dark:text-teal-200 dark:hover:bg-teal-950/70"
        >
          Add Row
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60">
              <th className="w-12 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Sr.
              </th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Document Description
              </th>
              <th className="w-56 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Document
              </th>
              <th className="w-12 px-3 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const uploading = uploadingRowId === row.id;
              const fileLabel = displayFileName(row.document_ref);
              return (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
                >
                  <td className="px-3 py-2 align-top text-zinc-500">{index + 1}</td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(event) =>
                        updateRow(row.id, { description: event.target.value })
                      }
                      placeholder="Enter document name…"
                      className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1.5">
                      <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                        {uploading ? "Uploading…" : row.document_ref ? "Replace File" : "Upload File"}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(event) => void handleUpload(row.id, event)}
                          disabled={uploading}
                        />
                      </label>
                      {row.document_ref ? (
                        <div className="flex flex-col gap-1">
                          {fileLabel ? (
                            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {fileLabel}
                            </span>
                          ) : null}
                          <StorageDocumentLink
                            value={row.document_ref}
                            className="inline-flex w-fit items-center gap-1 rounded-lg border border-sky-800 bg-sky-950/30 px-2 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-950/50"
                          />
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800"
                      aria-label="Remove row"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
