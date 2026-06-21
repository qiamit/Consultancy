"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import {
  addIsCodeFiles,
  deleteIsCodeFile,
  signIsCodeFileDownload,
} from "@/lib/actions/is-codes";
import type { IsCodeFileRow, IsCodeMasterRow } from "@/lib/types/is-code-master";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({
  file,
  onDeleted,
}: {
  file: IsCodeFileRow;
  onDeleted: (id: string) => void;
}) {
  const [viewing, startView] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleView = () => {
    startView(async () => {
      setError(null);
      const res = await signIsCodeFileDownload(file.id);
      if (!res.ok) { setError(res.error); return; }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${file.file_name ?? file.id}"? This cannot be undone.`)) return;
    startDelete(async () => {
      setError(null);
      try {
        await deleteIsCodeFile(file.id);
        onDeleted(file.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed.");
      }
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <svg className="h-5 w-5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
        <span className="min-w-0 truncate text-sm font-medium text-zinc-800 dark:text-zinc-100" title={file.file_name ?? file.id}>
          {file.file_name ?? "Unnamed file"}
        </span>
      </div>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleView}
          disabled={viewing || deleting}
          className="rounded px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
        >
          {viewing ? "Opening…" : "View"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={viewing || deleting}
          className="rounded px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export function FileManagerModal({
  row,
  onClose,
  onFilesChanged,
}: {
  row: IsCodeMasterRow;
  onClose: () => void;
  onFilesChanged: (isCodeId: string, files: IsCodeFileRow[]) => void;
}) {
  const [files, setFiles] = useState<IsCodeFileRow[]>(row.files ?? []);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleted = useCallback((id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      onFilesChanged(row.id, next);
      return next;
    });
  }, [row.id, onFilesChanged]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(e.target.files ?? []));
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;
    startUpload(async () => {
      setUploadError(null);
      setUploadSuccess(null);
      const fd = new FormData();
      for (const f of selectedFiles) fd.append("files", f);
      const res = await addIsCodeFiles(row.id, fd);
      if (!res.ok) {
        setUploadError(res.error);
        return;
      }
      setUploadSuccess(`${res.added} file${res.added === 1 ? "" : "s"} uploaded successfully.`);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Reload files list from server (optimistic: we don't have the new IDs, so refetch)
      // For now, show a note that page will reflect after close
      setUploadSuccess(`${res.added} file${res.added === 1 ? "" : "s"} uploaded. Close and reopen to see them listed.`);
      onFilesChanged(row.id, files); // trigger parent refresh
    });
  };

  const totalSize = selectedFiles.reduce((a, f) => a + f.size, 0);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-manager-title"
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-zinc-200 bg-zinc-50 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div>
            <h2 id="file-manager-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Files — {row.is_number}: {row.revision_year}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {files.length} file{files.length === 1 ? "" : "s"} attached
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {files.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No files attached yet. Upload files below.
            </p>
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <FileRow key={f.id} file={f} onDeleted={handleDeleted} />
              ))}
            </div>
          )}
        </div>

        {/* Upload section */}
        <div className="border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Add Files
          </p>
          <div className="flex items-center gap-3">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600 hover:border-sky-400 hover:bg-sky-50/40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-sky-500">
              <svg className="h-4 w-4 shrink-0 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="min-w-0 truncate">
                {selectedFiles.length === 0
                  ? "Choose files…"
                  : `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected (${formatBytes(totalSize)})`}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            <button
              type="button"
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="shrink-0 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-700 dark:hover:bg-sky-600"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>

          {uploadError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{uploadError}</p>
          )}
          {uploadSuccess && (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{uploadSuccess}</p>
          )}
        </div>
      </div>
    </div>
  );
}
