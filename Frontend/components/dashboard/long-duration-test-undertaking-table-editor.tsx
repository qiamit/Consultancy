"use client";

import type { LongDurationTestRow } from "@backend/modules/bis/undertaking-long-duration-test";

const inputClass =
  "w-full min-w-0 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

export function LongDurationTestUndertakingTableEditor({
  rows,
  onChange,
}: {
  rows: LongDurationTestRow[];
  onChange: (rows: LongDurationTestRow[]) => void;
}) {
  function updateRow(index: number, patch: Partial<LongDurationTestRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-900">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800/80">
            <th className="whitespace-nowrap px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Sr.
            </th>
            <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Type of Test
            </th>
            <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Duration of Test
            </th>
            <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Date of Completion
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-zinc-800 last:border-b-0">
              <td className="whitespace-nowrap px-2 py-1 text-center text-xs font-medium text-zinc-300">
                {index + 1}
              </td>
              <td className="px-2 py-1">
                <input
                  type="text"
                  value={row.type_of_test}
                  onChange={(e) => updateRow(index, { type_of_test: e.target.value })}
                  className={inputClass}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="text"
                  value={row.duration_of_test}
                  onChange={(e) => updateRow(index, { duration_of_test: e.target.value })}
                  className={inputClass}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  type="date"
                  value={row.date_of_completion}
                  onChange={(e) => updateRow(index, { date_of_completion: e.target.value })}
                  className={inputClass}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
