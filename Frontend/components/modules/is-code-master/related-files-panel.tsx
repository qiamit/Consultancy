"use client";

import { useEffect, useState } from "react";
import { createClient } from "@backend/db/client/client";

type RelatedFile = { id: string; file_name: string | null; storage_path: string };

function fileDisplayName(f: RelatedFile): string {
  return f.file_name ?? f.storage_path.split("/").pop() ?? "File";
}

function storagePublicUrl(
  path: string,
  disposition: "inline" | "attachment",
  filename?: string,
): string {
  const params = new URLSearchParams({
    bucket: "is_code_documents",
    path,
    disposition,
  });
  if (filename?.trim()) params.set("filename", filename.trim());
  return `/api/storage/public?${params.toString()}`;
}

export function IsCodeFilesViewPicker({
  isCodeId,
}: {
  isCodeId?: string | null;
}) {
  const [files, setFiles] = useState<RelatedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const id = (isCodeId ?? "").trim();

  useEffect(() => {
    if (!id) {
      setFiles([]);
      setSelectedId("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    void supabase
      .from("is_code_files")
      .select("id, file_name, storage_path")
      .eq("is_code_id", id)
      .then(({ data }) => {
        if (cancelled) return;
        const next = (data ?? []) as RelatedFile[];
        setFiles(next);
        setSelectedId((current) =>
          next.some((f) => f.id === current) ? current : (next[0]?.id ?? ""),
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return null;

  const selected = files.find((f) => f.id === selectedId) ?? null;

  function viewSelected() {
    if (!selected) return;
    const name = fileDisplayName(selected);
    window.open(
      storagePublicUrl(selected.storage_path, "inline", name),
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        disabled={loading || files.length === 0}
        aria-label="IS Code files"
        title="Select an IS PDF to view"
        className="h-[30px] min-w-[11rem] max-w-[16rem] truncate rounded-lg border border-indigo-600/50 bg-indigo-950/40 px-2 text-xs font-semibold text-indigo-100 outline-none hover:bg-indigo-950/70 disabled:opacity-50"
      >
        {loading ? (
          <option value="">Loading IS files…</option>
        ) : files.length === 0 ? (
          <option value="">No IS files</option>
        ) : (
          files.map((f) => (
            <option key={f.id} value={f.id}>
              {fileDisplayName(f)}
            </option>
          ))
        )}
      </select>
      <button
        type="button"
        onClick={viewSelected}
        disabled={!selected}
        title={selected ? `View ${fileDisplayName(selected)}` : "Select an IS file to view"}
        className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-lg border border-indigo-600/50 bg-indigo-950/40 px-2.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-950/70 disabled:opacity-50"
      >
        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        View
      </button>
    </div>
  );
}

export function IsCodeRelatedFilesPanel({
  isCodeId,
  theme = "light",
}: {
  isCodeId?: string | null;
  theme?: "light" | "dark";
}) {
  const [files, setFiles] = useState<RelatedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const id = (isCodeId ?? "").trim();

  useEffect(() => {
    if (!id) {
      setFiles([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    void supabase
      .from("is_code_files")
      .select("id, file_name, storage_path")
      .eq("is_code_id", id)
      .then(({ data }) => {
        if (cancelled) return;
        setFiles((data ?? []) as RelatedFile[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const dark = theme === "dark";
  const box = dark
    ? "mt-3 rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2.5"
    : "mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/50";
  const title = dark
    ? "text-[11px] font-semibold uppercase tracking-wide text-zinc-400"
    : "text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
  const nameCls = dark
    ? "min-w-0 truncate text-sm text-zinc-100"
    : "min-w-0 truncate text-sm text-zinc-800 dark:text-zinc-100";
  const viewCls = dark
    ? "text-xs font-semibold text-sky-300 hover:underline"
    : "text-xs font-semibold text-sky-700 hover:underline dark:text-sky-400";
  const dlCls = dark
    ? "text-xs font-semibold text-emerald-300 hover:underline"
    : "text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400";

  return (
    <div className={box}>
      <p className={title}>IS Code Files</p>
      {!id ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Select an IS Number to see Product Manual and Standard PDFs.
        </p>
      ) : loading ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          No files attached to this IS code yet.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {files.map((f) => {
            const name = fileDisplayName(f);
            return (
              <li key={f.id} className="flex items-center gap-2">
                <span className={nameCls} title={name}>
                  {name}
                </span>
                <button
                  type="button"
                  className={`${viewCls} shrink-0`}
                  onClick={() =>
                    window.open(
                      storagePublicUrl(f.storage_path, "inline", name),
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  View
                </button>
                <button
                  type="button"
                  className={`${dlCls} shrink-0`}
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = storagePublicUrl(f.storage_path, "attachment", name);
                    a.download = name;
                    a.rel = "noopener";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                >
                  Download
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
