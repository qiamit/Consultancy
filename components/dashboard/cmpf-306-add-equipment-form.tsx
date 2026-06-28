"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cmpf306MakeSuggestInput,
  collectCmpf306MakeSuggestions,
} from "@/components/dashboard/cmpf-306-make-suggest-input";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";
import { suggestCmpf306EquipmentFromLicenseScope } from "@/lib/actions/cmpf-306-assistant";
import {
  defaultCmpf306AddEquipmentFormValues,
  defaultCmpf306EquipmentFormEntry,
  editorRowsFromFormEntries,
  equipmentEntriesFromScopeSuggestions,
  formEntriesFromEditorRows,
  type Cmpf306AddEquipmentFormValues,
  type Cmpf306EquipmentFormEntry,
} from "@/lib/cmpf-306-equipment-form";
import type { Cmpf306EquipmentRow } from "@/lib/cmpf-306";
import type { LicenseScopeFormat, StoredLicenseScopeRow } from "@/lib/license-scope-format";

const fieldLabelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500";
const tableHeaderLabelClass = `${fieldLabelClass} text-center`;
const fieldInputClass =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-center text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";
const fieldInputLeftClass = `${fieldInputClass} text-left`;

const equipmentGridClass =
  "grid grid-cols-[minmax(140px,2fr)_minmax(70px,0.75fr)_minmax(80px,0.85fr)_minmax(80px,0.85fr)_minmax(90px,0.9fr)_minmax(70px,0.75fr)_minmax(70px,0.75fr)_auto] items-start gap-2";

export function Cmpf306AddEquipmentForm({
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
  initialRows: Cmpf306EquipmentRow[];
  onRowsChange: (rows: Cmpf306EquipmentRow[]) => void;
}) {
  const rowsRef = useRef(initialRows);
  const [form, setForm] = useState<Cmpf306AddEquipmentFormValues>(() => ({
    ...defaultCmpf306AddEquipmentFormValues(),
    equipmentEntries: formEntriesFromEditorRows(initialRows),
  }));
  const [error, setError] = useState<string | null>(null);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [showIsCodeView, setShowIsCodeView] = useState(false);

  useEffect(() => {
    const nextRows = editorRowsFromFormEntries(form.equipmentEntries, rowsRef.current);
    rowsRef.current = nextRows;
    onRowsChange(nextRows);
  }, [form, onRowsChange]);

  const makeSuggestions = useMemo(
    () => collectCmpf306MakeSuggestions(form.equipmentEntries, initialRows),
    [form.equipmentEntries, initialRows],
  );

  function updateEquipmentEntry(
    index: number,
    patch: Partial<Cmpf306EquipmentFormEntry>,
  ) {
    setForm((prev) => ({
      ...prev,
      equipmentEntries: prev.equipmentEntries.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
    setError(null);
  }

  function addEquipmentField() {
    setForm((prev) => {
      const last = prev.equipmentEntries[prev.equipmentEntries.length - 1];
      return {
        ...prev,
        equipmentEntries: [
          ...prev.equipmentEntries,
          {
            ...defaultCmpf306EquipmentFormEntry(),
            clauseNo: last?.clauseNo ?? "",
          },
        ],
      };
    });
  }

  function removeEquipmentField(index: number) {
    setForm((prev) => {
      const next = prev.equipmentEntries.filter((_, i) => i !== index);
      return {
        ...prev,
        equipmentEntries: next.length > 0 ? next : [defaultCmpf306EquipmentFormEntry()],
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
      const result = await suggestCmpf306EquipmentFromLicenseScope({
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
        equipmentEntries: equipmentEntriesFromScopeSuggestions(result.equipment),
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
            Add Test Equipment
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
              title="Read IS code files and license scope to auto-fill required test equipment"
            >
              {autoFillLoading ? "Reading…" : "Auto Fill"}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <div className="min-w-[820px] space-y-2">
            <div className={`${equipmentGridClass} items-center`}>
              <label className={`${fieldLabelClass} text-left`}>Test Equipment Name</label>
              <label className={tableHeaderLabelClass}>Make</label>
              <label className={tableHeaderLabelClass}>Least Count</label>
              <label className={tableHeaderLabelClass}>Range</label>
              <label className={tableHeaderLabelClass}>Calibration</label>
              <label className={tableHeaderLabelClass}>Clause No.</label>
              <label className={tableHeaderLabelClass}>Quantity</label>
              <span className={`${tableHeaderLabelClass} invisible`} aria-hidden="true">
                Actions
              </span>
            </div>
            {form.equipmentEntries.map((entry, index) => (
              <div key={index} className={equipmentGridClass}>
                <input
                  type="text"
                  value={entry.equipmentName}
                  onChange={(event) =>
                    updateEquipmentEntry(index, { equipmentName: event.target.value })
                  }
                  className={fieldInputLeftClass}
                />
                <Cmpf306MakeSuggestInput
                  value={entry.make}
                  onChange={(make) => updateEquipmentEntry(index, { make })}
                  suggestions={makeSuggestions}
                  className={fieldInputClass}
                />
                <input
                  type="text"
                  value={entry.leastCount}
                  onChange={(event) =>
                    updateEquipmentEntry(index, { leastCount: event.target.value })
                  }
                  className={fieldInputClass}
                />
                <input
                  type="text"
                  value={entry.range}
                  onChange={(event) =>
                    updateEquipmentEntry(index, { range: event.target.value })
                  }
                  className={fieldInputClass}
                />
                <select
                  value={entry.calibrationRequired ? "yes" : "no"}
                  onChange={(event) =>
                    updateEquipmentEntry(index, {
                      calibrationRequired: event.target.value === "yes",
                    })
                  }
                  className={fieldInputClass}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <input
                  type="text"
                  value={entry.clauseNo}
                  onChange={(event) =>
                    updateEquipmentEntry(index, { clauseNo: event.target.value })
                  }
                  className={fieldInputClass}
                />
                <input
                  type="text"
                  value={entry.quantity}
                  onChange={(event) =>
                    updateEquipmentEntry(index, { quantity: event.target.value })
                  }
                  className={fieldInputClass}
                />
                <div className="flex items-center gap-1">
                  {index === form.equipmentEntries.length - 1 ? (
                    <button
                      type="button"
                      onClick={addEquipmentField}
                      className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-base leading-none hover:bg-zinc-700"
                      aria-label="Add equipment row"
                      title="Add equipment row"
                    >
                      ➕
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeEquipmentField(index)}
                      className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                      aria-label="Remove equipment row"
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
