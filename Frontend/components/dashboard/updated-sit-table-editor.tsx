"use client";

import type { SitTestRow } from "@backend/modules/bis/updated-scheme-of-inspection";

/** Compact single-line fields for denser table rows. */
const fieldClass =
  "box-border h-8 w-full min-w-0 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px] leading-tight text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

const textareaClass = `${fieldClass} resize-none overflow-y-auto`;

const actionBtnClass =
  "box-border flex h-8 w-full items-center justify-center rounded px-1 text-[10px] font-semibold transition-colors";

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
    const next = rows.filter((_, i) => i !== index);
    onChange(
      next.length > 0
        ? next
        : [
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
          ],
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-900">
        <table className="w-full min-w-[960px] table-fixed border-collapse text-[11px]">
          <colgroup>
            <col className="w-[5.25rem]" />
            <col className="w-[20.8%]" />
            <col className="w-[17.6%]" />
            <col className="w-[4.5rem]" />
            <col className="w-[7.7%]" />
            <col className="w-[11.88%]" />
            <col />
            <col className="w-[3.5rem]" />
          </colgroup>
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-800/80 text-[10px] uppercase tracking-wide text-zinc-400">
              <th className="px-1 py-1 text-center">Cl.</th>
              <th className="px-1.5 py-1 text-center">Requirement</th>
              <th className="px-1.5 py-1 text-center">Test Methods</th>
              <th className="px-1 py-1 text-center">R/S</th>
              <th className="px-1.5 py-1 text-center">Sample</th>
              <th className="px-1.5 py-1 text-center">Frequency</th>
              <th className="px-1.5 py-1 text-center">Remarks</th>
              <th className="px-1 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isLast = index === rows.length - 1;
              return (
                <tr key={index} className="border-b border-zinc-800 align-middle">
                  <td className="px-1 py-0.5">
                    <input
                      value={row.clause_no}
                      onChange={(e) => updateRow(index, { clause_no: e.target.value })}
                      className={`${fieldClass} !px-0 text-center`}
                      title={row.clause_no}
                    />
                  </td>
                  <td className="px-1.5 py-0.5">
                    <input
                      value={row.requirement}
                      onChange={(e) => updateRow(index, { requirement: e.target.value })}
                      className={`${fieldClass} text-left`}
                      title={row.requirement}
                    />
                  </td>
                  <td className="px-1.5 py-0.5">
                    <textarea
                      value={row.test_methods_ref}
                      onChange={(e) =>
                        updateRow(index, { test_methods_ref: e.target.value })
                      }
                      className={`${textareaClass} text-center`}
                      rows={1}
                      title={row.test_methods_ref}
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    <input
                      value={row.equipment_req}
                      onChange={(e) => updateRow(index, { equipment_req: e.target.value })}
                      className={`${fieldClass} !px-0 text-center`}
                      title={row.equipment_req}
                    />
                  </td>
                  <td className="px-1.5 py-0.5">
                    <input
                      value={row.sample_count}
                      onChange={(e) => updateRow(index, { sample_count: e.target.value })}
                      className={`${fieldClass} text-center`}
                      title={row.sample_count}
                    />
                  </td>
                  <td className="px-1.5 py-0.5">
                    <textarea
                      value={row.frequency}
                      onChange={(e) => updateRow(index, { frequency: e.target.value })}
                      className={`${textareaClass} text-center`}
                      rows={1}
                      title={row.frequency}
                    />
                  </td>
                  <td className="px-1.5 py-0.5">
                    <textarea
                      value={row.remarks}
                      onChange={(e) => updateRow(index, { remarks: e.target.value })}
                      className={textareaClass}
                      rows={1}
                      title={row.remarks}
                    />
                  </td>
                  <td className="px-1 py-0.5">
                    {isLast ? (
                      <button
                        type="button"
                        onClick={addRow}
                        aria-label="Add row"
                        className={`${actionBtnClass} border border-zinc-500 bg-zinc-100 text-zinc-900 hover:bg-white dark:border-zinc-500 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white`}
                      >
                        +
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        aria-label="Delete row"
                        className={`${actionBtnClass} border border-red-600 bg-red-600 text-white hover:bg-red-500 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-500`}
                      >
                        Del
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
