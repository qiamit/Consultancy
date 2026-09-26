"use client";

import { useRef, useState, useTransition } from "react";
import { addIsCodeFiles, importIsCodesMaster } from "@backend/actions/is-codes";
import {
  parseIsCodeImportSpreadsheet,
} from "@backend/modules/is-code/is-code-master-csv";
import {
  importPathBasename,
  matchFilesToImportTargets,
  splitImportFilePaths,
  targetKeyFromIsNumber,
  type ImportFileTarget,
} from "@backend/modules/is-code/import-file-match";
import type { IsCodeMasterRow } from "@backend/shared/types/is-code-master";

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function canInsertRow(row: Record<string, string>): boolean {
  return Boolean(
    row.is_number?.trim() &&
      /^\d{4}$/.test(String(row.revision_year || "").trim()) &&
      row.is_code_title?.trim(),
  );
}

export function IsCodeImportModal({
  existingRows,
  onClose,
  onDone,
}: {
  existingRows: IsCodeMasterRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const sheetRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const pdfsRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<File | null>(null);
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  function addPdfs(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter(isPdfFile);
    setPdfs((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const merged = [...prev];
      for (const file of next) {
        const key = `${file.name}:${file.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      }
      return merged;
    });
    setError(null);
  }

  function handleImport() {
    if (!sheet && pdfs.length === 0) {
      setError("Choose an Excel/CSV file and/or the folder of Standard PDFs.");
      return;
    }
    startBusy(async () => {
      setError(null);
      setStatus("Reading import files…");
      try {
        let sheetRows: Record<string, string>[] = [];
        if (sheet) {
          const parsed = await parseIsCodeImportSpreadsheet(sheet);
          if (!parsed.ok) {
            setError(parsed.error);
            setStatus(null);
            return;
          }
          sheetRows = parsed.rows;
        }

        const pathCount = sheetRows.filter((row) => row.file_path).length;
        if (pathCount > 0 && pdfs.length === 0) {
          setError(
            "Excel has file paths. Select the local folder (or PDFs) that contains those Standard files, then Import again.",
          );
          setStatus(null);
          return;
        }

        const insertRows = sheetRows.filter(canInsertRow);
        let importedCodes: { id: string; is_number: string; revision_year: number }[] = [];
        let inserted = 0;
        let skipped = 0;

        if (insertRows.length > 0) {
          setStatus(`Saving ${insertRows.length} IS code row(s)…`);
          const result = await importIsCodesMaster(insertRows);
          if (!result.ok) {
            setError(result.error);
            setStatus(null);
            return;
          }
          importedCodes = result.codes;
          inserted = result.inserted;
          skipped = result.skipped;
        }

        const idByKey = new Map<string, string>();
        for (const row of existingRows) {
          idByKey.set(
            `${targetKeyFromIsNumber(row.is_number)}|${row.revision_year}`,
            row.id,
          );
          idByKey.set(targetKeyFromIsNumber(row.is_number), row.id);
        }
        for (const code of importedCodes) {
          idByKey.set(
            `${targetKeyFromIsNumber(code.is_number)}|${code.revision_year}`,
            code.id,
          );
          idByKey.set(targetKeyFromIsNumber(code.is_number), code.id);
        }

        const targets: ImportFileTarget[] = [];
        const targetIds: string[] = [];
        const seenIds = new Set<string>();

        const addTarget = (
          isNumber: string,
          year: number | undefined,
          paths: string[],
          preferredId?: string,
        ) => {
          const key = targetKeyFromIsNumber(isNumber);
          const id =
            preferredId ||
            (year != null ? idByKey.get(`${key}|${year}`) : undefined) ||
            idByKey.get(key);
          if (!id || seenIds.has(id)) return;
          seenIds.add(id);
          targets.push({
            key,
            year,
            basenames: new Set(
              paths.map((p) => importPathBasename(p).toLowerCase()).filter(Boolean),
            ),
          });
          targetIds.push(id);
        };

        if (sheetRows.length > 0) {
          for (const row of sheetRows) {
            const year = /^\d{4}$/.test(String(row.revision_year || "").trim())
              ? Number(row.revision_year)
              : undefined;
            addTarget(row.is_number, year, splitImportFilePaths(row.file_path || ""));
          }
        } else {
          for (const row of existingRows) {
            addTarget(row.is_number, row.revision_year, []);
          }
        }

        let uploaded = 0;
        let unmatched = 0;
        if (pdfs.length > 0 && targets.length > 0) {
          const matched = matchFilesToImportTargets(targets, pdfs);
          unmatched = matched.unmatched.length;
          let done = 0;
          for (const [index, files] of matched.assigned) {
            const id = targetIds[index];
            if (!id || files.length === 0) continue;
            done += 1;
            setStatus(`Uploading PDFs ${done}/${matched.assigned.size}…`);
            const fd = new FormData();
            for (const file of files) fd.append("files", file, file.name);
            const res = await addIsCodeFiles(id, fd);
            if (!res.ok) {
              setError(res.error);
              setStatus(null);
              return;
            }
            uploaded += res.added;
          }
        }

        const parts = [
          inserted ? `${inserted} new IS code(s)` : null,
          skipped ? `${skipped} already in the list` : null,
          uploaded ? `${uploaded} PDF(s) uploaded` : null,
          unmatched ? `${unmatched} PDF(s) did not match an IS number` : null,
        ].filter(Boolean);
        window.alert(parts.length ? `Import complete: ${parts.join(", ")}.` : "Nothing to import.");
        onDone();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed.");
        setStatus(null);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="is-code-import-title"
        className="flex w-full max-w-lg flex-col rounded-none border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div>
            <h2 id="is-code-import-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Import IS Codes & PDFs
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Excel/CSV rows plus Standard PDFs from a local folder. If Excel has a file_path column, those names are matched and uploaded.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-none p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              1. Excel or CSV
            </p>
            <input
              ref={sheetRef}
              type="file"
              accept=".csv,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                setSheet(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => sheetRef.current?.click()}
              className="w-full rounded-none border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-left text-sm text-zinc-700 hover:border-sky-400 hover:bg-sky-50/40 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {sheet ? sheet.name : "Choose Excel / CSV…"}
            </button>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Optional column <span className="font-medium">file_path</span> — full path or file name, one or more separated by ;
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              2. Standard PDF folder
            </p>
            <input
              ref={folderRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                addPdfs(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={pdfsRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                addPdfs(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const input = folderRef.current;
                  if (!input) return;
                  input.setAttribute("webkitdirectory", "true");
                  input.setAttribute("directory", "true");
                  input.click();
                }}
                className="flex-1 rounded-none border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                Choose folder
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => pdfsRef.current?.click()}
                className="flex-1 rounded-none border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                Choose PDFs
              </button>
            </div>
            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              {pdfs.length === 0
                ? "No PDFs selected. Names like IS_10577_Standard.pdf match the IS number."
                : `${pdfs.length} PDF${pdfs.length === 1 ? "" : "s"} ready to match and upload.`}
            </p>
          </div>

          {status ? (
            <p className="text-xs text-sky-700 dark:text-sky-300">{status}</p>
          ) : null}
          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-700 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-none border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="rounded-none bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
