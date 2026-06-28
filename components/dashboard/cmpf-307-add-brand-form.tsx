"use client";

import { useEffect, useRef, useState } from "react";
import {
  CMPF307_OWNED_BY_OPTIONS,
  CMPF307_REGISTRATION_OPTIONS,
} from "@/lib/cmpf-307";
import {
  defaultCmpf307AddBrandFormValues,
  defaultCmpf307BrandFormEntry,
  editorRowsFromFormEntries,
  formEntriesFromEditorRows,
  type Cmpf307AddBrandFormValues,
  type Cmpf307BrandFormEntry,
} from "@/lib/cmpf-307-brand-form";
import type { Cmpf307BrandRow } from "@/lib/cmpf-307";

const fieldLabelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500";
const tableHeaderLabelClass = `${fieldLabelClass} text-center`;
const fieldInputClass =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-center text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";
const fieldInputLeftClass = `${fieldInputClass} text-left`;

const brandGridClass =
  "grid grid-cols-[minmax(140px,2fr)_minmax(90px,0.9fr)_minmax(110px,1fr)_minmax(120px,1.1fr)_auto] items-start gap-2";

export function Cmpf307AddBrandForm({
  initialRows,
  onRowsChange,
}: {
  initialRows: Cmpf307BrandRow[];
  onRowsChange: (rows: Cmpf307BrandRow[]) => void;
}) {
  const rowsRef = useRef(initialRows);
  const [form, setForm] = useState<Cmpf307AddBrandFormValues>(() => ({
    ...defaultCmpf307AddBrandFormValues(),
    brandEntries: formEntriesFromEditorRows(initialRows),
  }));

  useEffect(() => {
    const nextRows = editorRowsFromFormEntries(form.brandEntries, rowsRef.current);
    rowsRef.current = nextRows;
    onRowsChange(nextRows);
  }, [form, onRowsChange]);

  function updateBrandEntry(index: number, patch: Partial<Cmpf307BrandFormEntry>) {
    setForm((prev) => ({
      ...prev,
      brandEntries: prev.brandEntries.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function addBrandField() {
    setForm((prev) => ({
      ...prev,
      brandEntries: [...prev.brandEntries, defaultCmpf307BrandFormEntry()],
    }));
  }

  function removeBrandField(index: number) {
    setForm((prev) => {
      const next = prev.brandEntries.filter((_, i) => i !== index);
      return {
        ...prev,
        brandEntries: next.length > 0 ? next : [defaultCmpf307BrandFormEntry()],
      };
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-[720px] space-y-2">
          <div className={`${brandGridClass} items-center`}>
            <label className={`${fieldLabelClass} text-left`}>Brand / Trade Mark</label>
            <label className={tableHeaderLabelClass}>Owned By</label>
            <label className={tableHeaderLabelClass}>Registered</label>
            <label className={tableHeaderLabelClass}>Date of Reg. / Intro.</label>
            <span className={`${tableHeaderLabelClass} invisible`} aria-hidden="true">
              Actions
            </span>
          </div>
          {form.brandEntries.map((entry, index) => (
            <div key={index} className={brandGridClass}>
              <input
                type="text"
                value={entry.brandName}
                onChange={(event) =>
                  updateBrandEntry(index, { brandName: event.target.value })
                }
                className={fieldInputLeftClass}
              />
              <select
                value={entry.ownedBy}
                onChange={(event) =>
                  updateBrandEntry(index, { ownedBy: event.target.value })
                }
                className={fieldInputClass}
              >
                <option value="">—</option>
                {CMPF307_OWNED_BY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <select
                value={entry.registeredStatus}
                onChange={(event) =>
                  updateBrandEntry(index, { registeredStatus: event.target.value })
                }
                className={fieldInputClass}
              >
                <option value="">—</option>
                {CMPF307_REGISTRATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={entry.registrationDate}
                onChange={(event) =>
                  updateBrandEntry(index, { registrationDate: event.target.value })
                }
                className={fieldInputClass}
              />
              <div className="flex items-center gap-1">
                {form.brandEntries.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeBrandField(index)}
                    className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                    aria-label="Remove brand row"
                    title="Remove row"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="h-[37px] w-[37px] shrink-0" aria-hidden="true" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={addBrandField}
        className="shrink-0 self-start rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
      >
        Add Brand Name
      </button>
    </div>
  );
}
