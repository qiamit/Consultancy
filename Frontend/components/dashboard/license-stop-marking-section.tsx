"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PendingRenewalsSection } from "@/components/dashboard/pending-renewals-section";
import {
  importStopMarkingFromManakExcel,
  lookupStopMarkingProjectByCml,
  markProjectStopMarking,
  type ImportStopMarkingResult,
  type StopMarkingCmlLookup,
} from "@backend/actions/stop-marking-sync";

export type LicenseStopMarkingRow = {
  id: string;
  title: string;
  status: string;
  project_kind: string;
  cm_l_digits: string | null;
  license_number: string | null;
  license_validity_date: string | null;
  target_date: string | null;
  client_id: string | null;
  client_name: string;
  client_email?: string | null;
  portal_user_id?: string | null;
  portal_password?: string | null;
  is_number: string | null;
  is_revision_year: number | null;
  is_code_title: string | null;
  is_code_id: string | null;
  notes: string | null;
  is_qe_managed?: boolean | null;
};

function StopMarkingImportResultModal({
  result,
  onClose,
}: {
  result: ImportStopMarkingResult;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div
          className={`flex items-center justify-between rounded-t-2xl px-5 py-4 ${
            result.ok ? "bg-violet-600" : "bg-rose-600"
          }`}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Manak Import
            </p>
            <h2 className="text-base font-bold text-white">
              {result.ok ? "Import complete" : "Import failed"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-5 py-5 text-sm text-zinc-700 dark:text-zinc-200">
          {result.ok ? (
            <>
              <ul className="space-y-1.5">
                <li>
                  CML in Excel:{" "}
                  <span className="font-semibold tabular-nums">{result.manakCount}</span>
                </li>
                <li>
                  Matched in your DB:{" "}
                  <span className="font-semibold tabular-nums">{result.matched}</span>
                </li>
                <li>
                  Newly marked Stop Marking:{" "}
                  <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {result.added}
                  </span>
                </li>
                <li>
                  Already on Stop Marking:{" "}
                  <span className="font-semibold tabular-nums">{result.alreadyMarked}</span>
                </li>
                {result.skippedExpired > 0 ? (
                  <li>
                    Skipped Expired (not eligible):{" "}
                    <span className="font-semibold tabular-nums">{result.skippedExpired}</span>
                  </li>
                ) : null}
                <li>
                  In Excel but not in DB:{" "}
                  <span className="font-semibold tabular-nums">{result.notInDbCount}</span>
                </li>
              </ul>
              {result.notInDbSample.length > 0 && (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
                  Sample not in DB: {result.notInDbSample.join(", ")}
                  {result.notInDbCount > result.notInDbSample.length ? "…" : ""}
                </p>
              )}
              {result.matched > 0 && result.added === 0 && result.alreadyMarked === result.matched ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                  All {result.matched} matched licences were already on Stop Marking — nothing new to
                  add. Close this dialog to see them in your Under Stop Marking list.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-rose-700 dark:text-rose-300">{result.error}</p>
          )}
        </div>

        <div className="flex justify-end rounded-b-2xl border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StopMarkingImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (result: ImportStopMarkingResult) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startImport] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleImport() {
    if (!file) {
      setError("Choose a Manak Excel file (.xlsx) first.");
      return;
    }
    setError(null);
    startImport(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const result = await importStopMarkingFromManakExcel(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onImported(result);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between rounded-t-2xl bg-violet-600 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Manak Excel
            </p>
            <h2 className="text-base font-bold text-white">Import from Manak</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm text-zinc-700 dark:text-zinc-200">
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Upload Manak <span className="font-semibold">ReportExcel.xlsx</span>. Matching uses{" "}
            <span className="font-semibold">CM/L</span> only; Client and IS are taken from your
            database.
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Excel file
            </label>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-violet-700 hover:file:bg-violet-100 dark:text-zinc-300 dark:file:bg-violet-950/40 dark:file:text-violet-200"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError(null);
              }}
            />
            {file ? (
              <p className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
                Selected: {file.name}
              </p>
            ) : null}
          </div>

          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!file || pending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Importing…" : "Import & Match"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StopMarkingAddModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [cmlInput, setCmlInput] = useState("");
  const [lookup, setLookup] = useState<Extract<StopMarkingCmlLookup, { ok: true }> | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const digits = cmlInput.replace(/\D/g, "");
    setLookup(null);
    setLookupError(null);
    setError(null);
    if (digits.length < 5) {
      setLookingUp(false);
      return;
    }

    setLookingUp(true);
    const seq = ++requestSeq.current;
    debounceRef.current = setTimeout(() => {
      void (async () => {
        const result = await lookupStopMarkingProjectByCml(digits);
        if (seq !== requestSeq.current) return;
        setLookingUp(false);
        if (!result.ok) {
          setLookup(null);
          setLookupError(result.error);
          return;
        }
        setLookup(result);
        setLookupError(null);
      })();
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cmlInput]);

  async function handleAdd() {
    if (!lookup) return;
    if (lookup.alreadyStopMarking) {
      setError("This licence is already on Stop Marking.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await markProjectStopMarking(lookup.projectId);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onAdded();
    onClose();
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

  function isDisplay(): string {
    if (!lookup?.is_number) return "—";
    return lookup.is_revision_year
      ? `${lookup.is_number}: ${lookup.is_revision_year}`
      : lookup.is_number;
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <div className="flex items-center justify-between rounded-t-2xl bg-orange-500 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Mark License</p>
            <h2 className="text-base font-bold text-white">Add to Stop Marking</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              1. CM/L Number
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Type CM/L digits…"
                value={cmlInput}
                onChange={(e) => setCmlInput(e.target.value)}
                className={inputCls}
                autoFocus
              />
              {lookingUp && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                </div>
              )}
            </div>
            {lookupError ? (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{lookupError}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              2. Client Name (from database)
            </label>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {lookup?.client_name ?? "—"}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              3. IS Code (from database)
            </label>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/60">
              <p className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {lookup ? isDisplay() : "—"}
              </p>
              {lookup?.is_code_title ? (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {lookup.is_code_title}
                </p>
              ) : null}
            </div>
          </div>

          {lookup?.alreadyStopMarking ? (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              This licence is already on Stop Marking.
            </p>
          ) : null}

          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={!lookup || lookup.alreadyStopMarking || saving}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Add to Stop Marking"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LicenseStopMarkingSection({ rows }: { rows: LicenseStopMarkingRow[] }) {
  const router = useRouter();
  const [stopMarkingModalOpen, setStopMarkingModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportStopMarkingResult | null>(null);

  return (
    <>
      <PendingRenewalsSection
        rows={rows}
        sectionLabel="Under Stop Marking"
        emptyMsg="No licenses under Stop Marking."
        initialStatusFilter="all"
        statusFilterVariant="stop_marking"
        extraHeaderButton={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-3.5 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Import from Manak
            </button>
            <button
              type="button"
              onClick={() => setStopMarkingModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3.5 py-2 text-sm font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-300 dark:hover:bg-orange-950/50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add to Stop Marking
            </button>
          </div>
        }
      />
      {stopMarkingModalOpen && (
        <StopMarkingAddModal
          onClose={() => setStopMarkingModalOpen(false)}
          onAdded={() => router.refresh()}
        />
      )}
      {importModalOpen && (
        <StopMarkingImportModal
          onClose={() => setImportModalOpen(false)}
          onImported={(result) => {
            setImportResult(result);
            if (result.ok) router.refresh();
          }}
        />
      )}
      {importResult && (
        <StopMarkingImportResultModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}
    </>
  );
}
