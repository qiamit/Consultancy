"use client";

import { useEffect, useState, useTransition } from "react";
import { PackagingMarkingForm } from "@/components/dashboard/packaging-marking-form";
import {
  resolveSelfEvaluationPackagingMarking,
  type SelfEvaluationFormStored,
  type SefPackagingMarkingRow,
} from "@backend/modules/bis/self-evaluation-form";

export function PackagingMarkingModal({
  companyName,
  markingClause,
  storedDocument,
  onSave,
  onClose,
}: {
  companyName: string;
  markingClause: string;
  storedDocument: SelfEvaluationFormStored;
  onSave: (rows: SefPackagingMarkingRow[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<SefPackagingMarkingRow[]>(() =>
    resolveSelfEvaluationPackagingMarking(storedDocument, markingClause),
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();

  useEffect(() => {
    setRows(resolveSelfEvaluationPackagingMarking(storedDocument, markingClause));
  }, [storedDocument, markingClause]);

  function handleSave() {
    startSave(() => {
      onSave(rows);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
      <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-zinc-900">
        <div className="shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 sm:px-6 sm:py-4">
          <div className="relative flex items-center">
            <p className="w-full text-center text-sm font-semibold uppercase tracking-wider text-white/90 sm:text-base">
              Packaging &amp; Marking
            </p>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-center text-sm font-bold text-white sm:text-base">{companyName}</p>
          <p className="mt-1 text-center text-xs text-white/80">
            Section 3 — Self Evaluation Form
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800 sm:px-6">
          {savedFlash && <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
          {saving && <span className="text-xs text-zinc-500">Saving…</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
          <PackagingMarkingForm rows={rows} onChange={setRows} />
        </div>
      </div>
    </div>
  );
}
