"use client";

import type { SitTestRow, SitTestRowKind } from "@/lib/updated-scheme-of-inspection";

const inputClass =
  "w-full min-w-0 rounded border border-zinc-300 bg-white px-1.5 py-1 text-[11px] text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

const textareaClass = `${inputClass} resize-y min-h-[44px]`;

export function UpdatedSitTableEditor({
  rows,
  onChange,
}: {
  rows: SitTestRow[];
  onChange: (rows: SitTestRow[]) => void;
}) {
  function updateRow(index: number, patch: Partial<SitTestRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([
      ...rows,
      {
        row_kind: "data",
        clause_no: "",
        requirement: "",
        test_methods_ref: "",
        equipment_req: "",
        sample_count: "",
        frequency: "",
        remarks: "",
      },
    ]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-900">
        <table className="w-full min-w-[960px] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-800/80 text-[10px] uppercase tracking-wide text-zinc-400">
              <th className="px-1.5 py-1.5 text-left">Type</th>
              <th className="px-1.5 py-1.5 text-left">Cl.</th>
              <th className="px-1.5 py-1.5 text-left">Requirement</th>
              <th className="px-1.5 py-1.5 text-left">Test Methods</th>
              <th className="px-1.5 py-1.5 text-left">R/S</th>
              <th className="px-1.5 py-1.5 text-left">Sample</th>
              <th className="px-1.5 py-1.5 text-left">Frequency</th>
              <th className="px-1.5 py-1.5 text-left">Remarks</th>
              <th className="px-1.5 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-zinc-800 align-top">
                <td className="px-1.5 py-1">
                  <select
                    value={row.row_kind}
                    onChange={(e) =>
                      updateRow(index, { row_kind: e.target.value as SitTestRowKind })
                    }
                    className={inputClass}
                  >
                    <option value="data">Data</option>
                    <option value="group">Group</option>
                    <option value="section">Section</option>
                  </select>
                </td>
                <td className="px-1.5 py-1">
                  <input
                    value={row.clause_no}
                    onChange={(e) => updateRow(index, { clause_no: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <td className="px-1.5 py-1">
                  <textarea
                    value={row.requirement}
                    onChange={(e) => updateRow(index, { requirement: e.target.value })}
                    className={textareaClass}
                    rows={2}
                  />
                </td>
                <td className="px-1.5 py-1">
                  <textarea
                    value={row.test_methods_ref}
                    onChange={(e) => updateRow(index, { test_methods_ref: e.target.value })}
                    className={textareaClass}
                    rows={2}
                  />
                </td>
                <td className="px-1.5 py-1">
                  <input
                    value={row.equipment_req}
                    onChange={(e) => updateRow(index, { equipment_req: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <td className="px-1.5 py-1">
                  <input
                    value={row.sample_count}
                    onChange={(e) => updateRow(index, { sample_count: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <td className="px-1.5 py-1">
                  <textarea
                    value={row.frequency}
                    onChange={(e) => updateRow(index, { frequency: e.target.value })}
                    className={textareaClass}
                    rows={2}
                  />
                </td>
                <td className="px-1.5 py-1">
                  <textarea
                    value={row.remarks}
                    onChange={(e) => updateRow(index, { remarks: e.target.value })}
                    className={textareaClass}
                    rows={2}
                  />
                </td>
                <td className="px-1.5 py-1">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="rounded border border-red-300 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    Del
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        Add Row
      </button>
    </div>
  );
}
