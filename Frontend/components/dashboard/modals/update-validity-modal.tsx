"use client";

import { useState, useTransition } from "react";
import { updateLicenseValidity } from "@backend/actions/renewals";
import { formatDisplayDate, parseToDate, toYmdDateString } from "@backend/shared/format-date";

/** Default new validity = current validity + 365 calendar days (renewal year). */
function defaultNewValidityYmd(currentValidity: string | null): string {
  const base = parseToDate(currentValidity) ?? new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  next.setDate(next.getDate() + 365);
  return toYmdDateString(next);
}

export function UpdateValidityModal({
  projectId,
  currentValidity,
  cmLNumber,
  isNumber,
  onClose,
  onUpdated,
}: {
  projectId: string;
  currentValidity: string | null;
  cmLNumber: string;
  isNumber: string;
  onClose: () => void;
  onUpdated: (newDate: string) => void;
}) {
  const [date, setDate] = useState(() => defaultNewValidityYmd(currentValidity));
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!date) return;
    setError(null);
    startSave(async () => {
      const res = await updateLicenseValidity(projectId, date);
      if (!res.ok) { setError(res.error); return; }
      onUpdated(date);
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-zinc-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 dark:border-zinc-700 dark:from-emerald-950/20 dark:to-teal-950/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Update License Validity</h2>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                CM/L Number
              </p>
              <p className="mt-0.5 truncate font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                {cmLNumber || "—"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Validity
              </p>
              <p className="mt-0.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                {currentValidity ? formatDisplayDate(currentValidity) : "—"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                IS Number
              </p>
              <p className="mt-0.5 truncate font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                {isNumber || "—"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              New Validity Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!date || saving}
            className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {saving ? "Updating…" : "Update Validity"}
          </button>
        </div>
      </div>
    </div>
  );
}
