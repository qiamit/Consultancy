"use client";

import {
  emptyLongDurationTestRow,
  LONG_DURATION_TEST_TYPE_OPTIONS,
  type LongDurationTestRow,
} from "@backend/modules/bis/undertaking-long-duration-test";

const fieldClass =
  "box-border h-8 w-full min-w-0 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px] leading-tight text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

const actionBtnClass =
  "box-border flex h-8 w-full items-center justify-center rounded px-1 text-[10px] font-semibold transition-colors";

export function LongDurationTestUndertakingTableEditor({
  rows,
  onChange,
}: {
  rows: LongDurationTestRow[];
  onChange: (rows: LongDurationTestRow[]) => void;
}) {
  const list = rows.length > 0 ? rows : [emptyLongDurationTestRow()];

  function updateRow(index: number, patch: Partial<LongDurationTestRow>) {
    onChange(list.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...list, emptyLongDurationTestRow()]);
  }

  function removeRow(index: number) {
    const next = list.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptyLongDurationTestRow()]);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-900">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800/80">
            <th className="w-[28%] px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Type of Test
            </th>
            <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Duration of Test
            </th>
            <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Date of Completion
            </th>
            <th className="w-[3.5rem] px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((row, index) => {
            const isLast = index === list.length - 1;
            const typeOptions =
              row.type_of_test.trim() &&
              !(LONG_DURATION_TEST_TYPE_OPTIONS as readonly string[]).includes(
                row.type_of_test.trim(),
              )
                ? [...LONG_DURATION_TEST_TYPE_OPTIONS, row.type_of_test.trim()]
                : [...LONG_DURATION_TEST_TYPE_OPTIONS];

            return (
              <tr key={index} className="border-b border-zinc-800 align-middle last:border-b-0">
                <td className="px-2 py-1">
                  <select
                    value={row.type_of_test}
                    onChange={(e) => updateRow(index, { type_of_test: e.target.value })}
                    className={fieldClass}
                    aria-label={`Type of test row ${index + 1}`}
                  >
                    <option value="">Select type of test</option>
                    {typeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={row.duration_of_test}
                    onChange={(e) => updateRow(index, { duration_of_test: e.target.value })}
                    className={fieldClass}
                    placeholder="e.g. 96 hours"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="date"
                    value={row.date_of_completion}
                    onChange={(e) => updateRow(index, { date_of_completion: e.target.value })}
                    className={fieldClass}
                  />
                </td>
                <td className="px-1 py-1">
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
  );
}
