"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cmpf306MakeSuggestInput,
  collectCmpf306MakeSuggestions,
} from "@/components/dashboard/cmpf-306-make-suggest-input";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";
import { suggestCmpf305MachineryFromLicenseScope } from "@backend/actions/cmpf-305-assistant";
import {
  defaultCmpf305AddMachineryFormValues,
  defaultCmpf305MachineryFormEntry,
  editorRowsFromFormEntries,
  formEntriesFromEditorRows,
  machineryEntriesFromScopeSuggestions,
  type Cmpf305AddMachineryFormValues,
  type Cmpf305MachineryFormEntry,
} from "@backend/modules/bis/cmpf-305-machinery-form";
import type { Cmpf305MachineryRow } from "@backend/modules/bis/cmpf-305";
import type { LicenseScopeFormat, StoredLicenseScopeRow } from "@backend/modules/bis/license-scope-format";

const fieldLabelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500";
const tableHeaderLabelClass = `${fieldLabelClass} text-center`;
const fieldInputClass =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-center text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";
const fieldInputLeftClass = `${fieldInputClass} text-left`;

const machineryGridClass =
  "grid grid-cols-[minmax(140px,2fr)_minmax(70px,0.75fr)_minmax(100px,1fr)_minmax(70px,0.75fr)_minmax(90px,0.9fr)_auto] items-start gap-2";

export function Cmpf305AddMachineryForm({
  isCodeId,
  isReference,
  isNumber,
  revisionYear,
  isTitle,
  licenseScope,
  licenseScopeFormat,
  licenseScopeRows,
  initialRows,
  onRowsChange,
}: {
  isCodeId: string | null;
  isReference: string;
  isNumber: string | null;
  revisionYear: number | null;
  isTitle: string;
  licenseScope: string;
  licenseScopeFormat: LicenseScopeFormat;
  licenseScopeRows: StoredLicenseScopeRow[];
  initialRows: Cmpf305MachineryRow[];
  onRowsChange: (rows: Cmpf305MachineryRow[]) => void;
}) {
  const rowsRef = useRef(initialRows);
  const [form, setForm] = useState<Cmpf305AddMachineryFormValues>(() => ({
    ...defaultCmpf305AddMachineryFormValues(),
    machineryEntries: formEntriesFromEditorRows(initialRows),
  }));
  const [error, setError] = useState<string | null>(null);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [showIsCodeView, setShowIsCodeView] = useState(false);

  useEffect(() => {
    const nextRows = editorRowsFromFormEntries(form.machineryEntries, rowsRef.current);
    rowsRef.current = nextRows;
    onRowsChange(nextRows);
  }, [form, onRowsChange]);

  const makeSuggestions = useMemo(
    () => collectCmpf306MakeSuggestions(form.machineryEntries, initialRows),
    [form.machineryEntries, initialRows],
  );

  function updateMachineryEntry(
    index: number,
    patch: Partial<Cmpf305MachineryFormEntry>,
  ) {
    setForm((prev) => ({
      ...prev,
      machineryEntries: prev.machineryEntries.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
    setError(null);
  }

  function addMachineryField() {
    setForm((prev) => ({
      ...prev,
      machineryEntries: [...prev.machineryEntries, defaultCmpf305MachineryFormEntry()],
    }));
  }

  function removeMachineryField(index: number) {
    setForm((prev) => {
      const next = prev.machineryEntries.filter((_, i) => i !== index);
      return {
        ...prev,
        machineryEntries: next.length > 0 ? next : [defaultCmpf305MachineryFormEntry()],
      };
    });
  }

  async function handleAutoFill() {
    if (!isCodeId) {
      setError("No IS code linked to this application.");
      return;
    }

    setAutoFillLoading(true);
    setError(null);
    try {
      const result = await suggestCmpf305MachineryFromLicenseScope({
        isCodeId,
        isReference,
        isTitle,
        licenseScopeFormat,
        licenseScope,
        licenseScopeRows,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setForm((prev) => ({
        ...prev,
        machineryEntries: machineryEntriesFromScopeSuggestions(result.machinery),
      }));
    } finally {
      setAutoFillLoading(false);
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Add Plant &amp; Machinery
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            {isCodeId ? (
              <button
                type="button"
                onClick={() => setShowIsCodeView(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-600/50 bg-indigo-950/40 px-2.5 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-950/70"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                IS Code Files
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleAutoFill()}
              disabled={autoFillLoading || !isCodeId}
              className="shrink-0 whitespace-nowrap rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-950/70 disabled:cursor-not-allowed disabled:opacity-50"
              title="Read IS code files and license scope to auto-fill required machinery"
            >
              {autoFillLoading ? "Reading…" : "Auto Fill"}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <div className="min-w-[760px] space-y-2">
            <div className={`${machineryGridClass} items-center`}>
              <label className={`${fieldLabelClass} text-left`}>Machinery Name</label>
              <label className={tableHeaderLabelClass}>Make</label>
              <label className={tableHeaderLabelClass}>Production Capacity / Day</label>
              <label className={tableHeaderLabelClass}>Number</label>
              <label className={tableHeaderLabelClass}>Remarks</label>
              <span className={`${tableHeaderLabelClass} invisible`} aria-hidden="true">
                Actions
              </span>
            </div>
            {form.machineryEntries.map((entry, index) => (
              <div key={index} className={machineryGridClass}>
                <input
                  type="text"
                  value={entry.machineryName}
                  onChange={(event) =>
                    updateMachineryEntry(index, { machineryName: event.target.value })
                  }
                  className={fieldInputLeftClass}
                />
                <Cmpf306MakeSuggestInput
                  value={entry.make}
                  onChange={(make) => updateMachineryEntry(index, { make })}
                  suggestions={makeSuggestions}
                  className={fieldInputClass}
                />
                <input
                  type="text"
                  value={entry.productionCapacityPerDay}
                  onChange={(event) =>
                    updateMachineryEntry(index, {
                      productionCapacityPerDay: event.target.value,
                    })
                  }
                  className={fieldInputClass}
                />
                <input
                  type="text"
                  value={entry.number}
                  onChange={(event) =>
                    updateMachineryEntry(index, { number: event.target.value })
                  }
                  className={fieldInputClass}
                />
                <input
                  type="text"
                  value={entry.remarks}
                  onChange={(event) =>
                    updateMachineryEntry(index, { remarks: event.target.value })
                  }
                  className={fieldInputClass}
                />
                <div className="flex items-center gap-1">
                  {index === form.machineryEntries.length - 1 ? (
                    <button
                      type="button"
                      onClick={addMachineryField}
                      className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-base leading-none hover:bg-zinc-700"
                      aria-label="Add machinery row"
                      title="Add machinery row"
                    >
                      ➕
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeMachineryField(index)}
                      className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                      aria-label="Remove machinery row"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? <p className="text-xs font-medium text-red-400">{error}</p> : null}
      </div>

      {showIsCodeView && isCodeId ? (
        <IsCodeViewModal
          isCodeId={isCodeId}
          isNumber={isNumber}
          revisionYear={revisionYear}
          overlayZIndexClass="z-[500]"
          onClose={() => setShowIsCodeView(false)}
        />
      ) : null}
    </>
  );
}
