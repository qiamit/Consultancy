"use client";

import {
  createTopManagementRow,
  defaultTopManagementRows,
  type TopManagementRow,
} from "@/lib/top-management";

const themes = {
  light: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700",
    thead: "bg-zinc-100 dark:bg-zinc-800",
    th: "border-b border-zinc-200 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
    td: "border-b border-zinc-100 px-2 py-1.5 align-middle text-center dark:border-zinc-800/80",
    srCell:
      "border-b border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-center align-middle text-sm font-bold tabular-nums text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
    inp:
      "block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-center text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
    footer: "shrink-0 border-t border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/50",
    addBtn:
      "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
    delBtn: "rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800",
  },
  dark: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800",
    thead: "bg-zinc-800",
    th: "border-b border-zinc-700 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-300",
    td: "border-b border-zinc-800/80 px-2 py-1.5 align-middle text-center",
    srCell:
      "border-b border-r border-zinc-700 bg-zinc-800/60 px-2 py-2 text-center align-middle text-sm font-bold tabular-nums text-zinc-300",
    inp:
      "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-center text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40",
    footer: "shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-3 py-2",
    addBtn:
      "rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800",
    delBtn: "rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400",
  },
} as const;

export function TopManagementTableEditor({
  theme = "light",
  rows,
  onChange,
}: {
  theme?: keyof typeof themes;
  rows: TopManagementRow[];
  onChange: (rows: TopManagementRow[]) => void;
}) {
  const t = themes[theme];

  function updateRow(id: string, patch: Partial<TopManagementRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([...rows, createTopManagementRow()]);
  }

  function removeRow(id: string) {
    const next = rows.filter((r) => r.id !== id);
    onChange(next.length > 0 ? next : defaultTopManagementRows());
  }

  return (
    <div className={t.wrap}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "7%" }} />
          </colgroup>
          <thead className={`${t.thead} sticky top-0 z-[1]`}>
            <tr>
              <th className={t.th}>Sr No</th>
              <th className={t.th}>Name of Person</th>
              <th className={t.th}>Designation</th>
              <th className={t.th}>Email ID</th>
              <th className={t.th}>Mobile Number</th>
              <th className={t.th} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id}>
                <td className={t.srCell}>{index + 1}</td>
                <td className={t.td}>
                  <input
                    type="text"
                    value={row.person_name}
                    onChange={(e) => updateRow(row.id, { person_name: e.target.value })}
                    placeholder="Name…"
                    className={t.inp}
                  />
                </td>
                <td className={t.td}>
                  <input
                    type="text"
                    value={row.designation}
                    onChange={(e) => updateRow(row.id, { designation: e.target.value })}
                    placeholder="Designation…"
                    className={t.inp}
                  />
                </td>
                <td className={t.td}>
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => updateRow(row.id, { email: e.target.value })}
                    placeholder="email@example.com"
                    className={`${t.inp} break-all`}
                    autoComplete="off"
                  />
                </td>
                <td className={t.td}>
                  <input
                    type="tel"
                    value={row.mobile}
                    onChange={(e) => updateRow(row.id, { mobile: e.target.value })}
                    placeholder="Mobile…"
                    className={t.inp}
                    autoComplete="off"
                  />
                </td>
                <td className={t.td}>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className={t.delBtn}
                    aria-label={`Remove row ${index + 1}`}
                    title="Remove row"
                  >
                    <svg className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={t.footer}>
        <button type="button" onClick={addRow} className={t.addBtn}>
          + Add Person
        </button>
      </div>
    </div>
  );
}
