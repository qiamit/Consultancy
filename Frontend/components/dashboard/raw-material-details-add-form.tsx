"use client";

import { useEffect, useRef, useState } from "react";
import { RAW_MATERIAL_BIS_MARK_OPTIONS } from "@backend/modules/bis/raw-material-details";
import {
  defaultRawMaterialAddFormValues,
  defaultRawMaterialFormEntry,
  editorRowsFromFormEntries,
  formEntriesFromEditorRows,
  type RawMaterialAddFormValues,
  type RawMaterialFormEntry,
} from "@backend/modules/bis/raw-material-details-form";
import type { RawMaterialRow } from "@backend/modules/bis/raw-material-details";

const fieldLabelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500";
const tableHeaderLabelClass = `${fieldLabelClass} text-center`;
const fieldInputClass =
  "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-center text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";
const fieldInputLeftClass = `${fieldInputClass} text-left`;

const materialGridClass =
  "grid grid-cols-[minmax(120px,1.5fr)_minmax(110px,1.3fr)_minmax(100px,1fr)_minmax(110px,1.1fr)_minmax(140px,1.4fr)_auto] items-start gap-2";

export function RawMaterialDetailsAddForm({
  initialRows,
  onRowsChange,
}: {
  initialRows: RawMaterialRow[];
  onRowsChange: (rows: RawMaterialRow[]) => void;
}) {
  const rowsRef = useRef(initialRows);
  const [form, setForm] = useState<RawMaterialAddFormValues>(() => ({
    ...defaultRawMaterialAddFormValues(),
    materialEntries: formEntriesFromEditorRows(initialRows),
  }));

  useEffect(() => {
    const nextRows = editorRowsFromFormEntries(form.materialEntries, rowsRef.current);
    rowsRef.current = nextRows;
    onRowsChange(nextRows);
  }, [form, onRowsChange]);

  function updateMaterialEntry(index: number, patch: Partial<RawMaterialFormEntry>) {
    setForm((prev) => ({
      ...prev,
      materialEntries: prev.materialEntries.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function addMaterialField() {
    setForm((prev) => ({
      ...prev,
      materialEntries: [...prev.materialEntries, defaultRawMaterialFormEntry()],
    }));
  }

  function removeMaterialField(index: number) {
    setForm((prev) => {
      const next = prev.materialEntries.filter((_, i) => i !== index);
      return {
        ...prev,
        materialEntries: next.length > 0 ? next : [defaultRawMaterialFormEntry()],
      };
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-[900px] space-y-2">
          <div className={`${materialGridClass} items-center`}>
            <label className={`${fieldLabelClass} text-left`}>Raw Material</label>
            <label className={tableHeaderLabelClass}>Name of Supplier</label>
            <label className={tableHeaderLabelClass}>BIS Certification Mark</label>
            <label className={tableHeaderLabelClass}>Test Certificate</label>
            <label className={tableHeaderLabelClass}>Batches / Packaging</label>
            <span className={`${tableHeaderLabelClass} invisible`} aria-hidden="true">
              Actions
            </span>
          </div>
          {form.materialEntries.map((entry, index) => (
            <div key={index} className={materialGridClass}>
              <input
                type="text"
                value={entry.rawMaterial}
                onChange={(event) =>
                  updateMaterialEntry(index, { rawMaterial: event.target.value })
                }
                className={fieldInputLeftClass}
              />
              <input
                type="text"
                value={entry.supplierName}
                onChange={(event) =>
                  updateMaterialEntry(index, { supplierName: event.target.value })
                }
                className={fieldInputLeftClass}
              />
              <select
                value={entry.bisCertificationMark}
                onChange={(event) =>
                  updateMaterialEntry(index, { bisCertificationMark: event.target.value })
                }
                className={fieldInputClass}
              >
                <option value="">—</option>
                {RAW_MATERIAL_BIS_MARK_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={entry.testCertificate}
                onChange={(event) =>
                  updateMaterialEntry(index, { testCertificate: event.target.value })
                }
                className={fieldInputLeftClass}
              />
              <input
                type="text"
                value={entry.batchesPackaging}
                onChange={(event) =>
                  updateMaterialEntry(index, { batchesPackaging: event.target.value })
                }
                className={fieldInputLeftClass}
              />
              <div className="flex items-center gap-1">
                {index === form.materialEntries.length - 1 ? (
                  <button
                    type="button"
                    onClick={addMaterialField}
                    className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-lg border border-teal-700/50 bg-teal-950/40 text-base leading-none text-teal-200 hover:bg-teal-950/70"
                    aria-label="Add raw material row"
                    title="Add raw material row"
                  >
                    +
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeMaterialField(index)}
                    className="flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-red-400"
                    aria-label="Remove material row"
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
    </div>
  );
}
