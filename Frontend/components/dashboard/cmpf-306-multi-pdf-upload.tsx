"use client";

import { useRef, useState } from "react";
import { createClient } from "@backend/db/client/client";
import { StorageDocumentLink } from "@/components/dashboard/storage-document-link";
import {
  cmpf306DocumentPath,
  fileNameFromStoredDocumentRef,
  type Cmpf306DocumentKind,
} from "@backend/modules/storage/cmpf-306-documents";
import { uploadTechnicalStaffDocument } from "@backend/modules/storage/technical-staff-documents";

export function Cmpf306MultiPdfUpload({
  label,
  projectId,
  kind,
  files,
  onChange,
  buttonClassName,
}: {
  label: string;
  projectId: string;
  kind: Cmpf306DocumentKind;
  files: string[];
  onChange: (files: string[]) => void;
  buttonClassName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    const invalid = selected.filter(
      (file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"),
    );
    if (invalid.length > 0) {
      window.alert("Please upload PDF files only.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const uploaded: string[] = [];

    try {
      for (const file of selected) {
        const path = cmpf306DocumentPath(projectId, kind, file.name);
        const result = await uploadTechnicalStaffDocument(supabase, path, file, "application/pdf");
        if ("error" in result) {
          window.alert(`Upload failed for ${file.name}: ${result.error}`);
          continue;
        }
        uploaded.push(result.ref);
      }
      if (uploaded.length > 0) {
        onChange([...files, ...uploaded]);
      }
    } finally {
      setUploading(false);
    }
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}
        title={`Upload one or more PDF files for ${label}`}
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        {uploading ? "Uploading…" : label}
        {files.length > 0 ? (
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-bold">
            {files.length}
          </span>
        ) : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event)}
      />
      {files.length > 0 ? (
        <ul className="flex max-w-xs flex-col gap-1">
          {files.map((ref, index) => (
            <li
              key={`${ref}-${index}`}
              className="flex items-center gap-1 rounded-md border border-zinc-700/80 bg-zinc-900/80 px-2 py-1"
            >
              <span
                className="min-w-0 flex-1 truncate text-[10px] text-zinc-300"
                title={fileNameFromStoredDocumentRef(ref)}
              >
                {fileNameFromStoredDocumentRef(ref)}
              </span>
              <StorageDocumentLink
                value={ref}
                label="View"
                className="shrink-0 text-[10px] font-semibold text-sky-300 hover:text-sky-200"
              />
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                aria-label={`Remove ${fileNameFromStoredDocumentRef(ref)}`}
                title="Remove"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
