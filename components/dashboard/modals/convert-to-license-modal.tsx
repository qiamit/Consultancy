"use client";

import { useState, useTransition } from "react";
import {
  convertApplicationToLicense,
  updateBisProjectLicenseDetails,
} from "@/lib/actions/bis-projects";
import { convertBisNewApplicationToLicense } from "@/lib/actions/bis-new-applications";
import type { BisApplicationSource } from "@/lib/bis-project-kind";

export function ConvertToLicenseModal({
  projectId,
  clientName,
  isNumber,
  mode = "convert_application",
  source = "bis_projects",
  onClose,
  onConverted,
}: {
  projectId: string;
  clientName: string;
  isNumber: string;
  mode?: "convert_application" | "update_license";
  source?: BisApplicationSource;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [cmDigits, setCmDigits] = useState("");
  const [validityDate, setValidityDate] = useState("");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isRenewal = mode === "update_license";
  const title = isRenewal ? "Update License" : "Convert to License";
  const submitLabel = isRenewal ? "Update License" : "Convert to License";
  const description = isRenewal
    ? "Enter the renewed CM/L number and license validity for this record."
    : "Enter the issued CM/L number and license validity. This application will move to BIS All Projects as a license.";

  function handleConvert() {
    if (cmDigits.length !== 10) {
      setError("CM/L number must be exactly 10 digits.");
      return;
    }
    if (!validityDate) {
      setError("Pick a license validity date.");
      return;
    }
    setError(null);
    startSave(async () => {
      const res = isRenewal
        ? await updateBisProjectLicenseDetails(projectId, cmDigits, validityDate)
        : source === "bis_new_applications"
          ? await convertBisNewApplicationToLicense(projectId, cmDigits, validityDate)
          : await convertApplicationToLicense(projectId, cmDigits, validityDate);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onConverted();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-to-license-title"
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-200 bg-gradient-to-r from-sky-50 to-indigo-50 px-6 py-4 dark:border-zinc-700 dark:from-sky-950/20 dark:to-indigo-950/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 id="convert-to-license-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {title}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {clientName}
                  {isNumber !== "—" ? ` · ${isNumber}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>

          <div>
            <label htmlFor="convert_cm_l" className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              CM/L Number <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950">
              <span className="inline-flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold tabular-nums text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
                CM/L
              </span>
              <input
                id="convert_cm_l"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={cmDigits}
                onChange={(e) => setCmDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="0000000000"
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 font-mono text-sm tabular-nums text-zinc-900 outline-none dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="convert_validity" className="block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              License Validity Date <span className="text-red-500">*</span>
            </label>
            <input
              id="convert_validity"
              type="date"
              value={validityDate}
              onChange={(e) => setValidityDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-lg border border-zinc-200 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={saving || cmDigits.length !== 10 || !validityDate}
            className="flex-1 rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
          >
            {saving ? (isRenewal ? "Updating…" : "Converting…") : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
