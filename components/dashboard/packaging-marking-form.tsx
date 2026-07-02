"use client";

import type { SefPackagingMarkingRow } from "@/lib/self-evaluation-form";

export function PackagingMarkingForm({
  rows,
  onChange,
  className,
}: {
  rows: SefPackagingMarkingRow[];
  onChange: (rows: SefPackagingMarkingRow[]) => void;
  className?: string;
}) {
  function updateValue(index: number, value: string) {
    onChange(
      rows.map((row, i) => (i === index ? { ...row, value } : row)),
    );
  }

  return (
    <div
      className={`h-full min-h-0 overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${className ?? ""}`}
    >
      <table className="h-full w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-[4%]" />
          <col className="w-[30%]" />
          <col className="w-[66%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              Sr.
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              Particulars
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              Information
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.label}
              className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-800"
            >
              <td className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {index + 1}
              </td>
              <td className="px-3 py-2 align-top text-xs leading-snug text-zinc-800 dark:text-zinc-100">
                {row.label}
              </td>
              <td className="px-3 py-2 align-top">
                <textarea
                  value={row.value}
                  onChange={(e) => updateValue(index, e.target.value)}
                  rows={row.label.length > 50 ? 4 : 3}
                  className="min-h-[4.5rem] w-full min-w-[400px] resize-y rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
