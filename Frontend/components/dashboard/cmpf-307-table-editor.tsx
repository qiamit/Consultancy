"use client";

import {
  CMPF307_OWNED_BY_OPTIONS,
  CMPF307_REGISTRATION_OPTIONS,
  createCmpf307BrandRow,
  defaultCmpf307BrandRows,
  type Cmpf307BrandRow,
} from "@backend/modules/bis/cmpf-307";

const themes = {
  dark: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800",
    thead: "bg-zinc-800",
    th: "border-b border-zinc-700 px-1.5 py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-zinc-300",
    td: "border-b border-zinc-800/80 px-1 py-1.5 align-middle text-center",
    srCell:
      "border-b border-r border-zinc-700 bg-zinc-800/60 px-2 py-2 text-center align-middle text-sm font-bold tabular-nums text-zinc-300",
    inp:
      "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1.5 text-center text-[11px] text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40",
    footer: "shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-3 py-2",
    addBtn:
      "rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800",
    delBtn: "rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400",
  },
} as const;

export function Cmpf307TableEditor({
  theme = "dark",
  rows,
  onChange,
}: {
  theme?: keyof typeof themes;
  rows: Cmpf307BrandRow[];
  onChange: (rows: Cmpf307BrandRow[]) => void;
}) {
  const t = themes[theme];

  function updateRow(id: string, patch: Partial<Cmpf307BrandRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([...rows, createCmpf307BrandRow()]);
  }

  function removeRow(id: string) {
    const next = rows.filter((r) => r.id !== id);
    onChange(next.length > 0 ? next : defaultCmpf307BrandRows());
  }

  return (
    <div className={t.wrap}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[960px] table-fixed border-collapse text-xs">
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "38%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "4%" }} />
          </colgroup>
          <thead className={`${t.thead} sticky top-0 z-[1]`}>
            <tr>
              <th className={t.th}>Sr</th>
              <th className={t.th}>Brand / Trade Mark</th>
              <th className={t.th}>Owned By</th>
              <th className={t.th}>Registered</th>
              <th className={t.th}>Date of Reg. / Intro.</th>
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
                    value={row.brand_name}
                    onChange={(e) => updateRow(row.id, { brand_name: e.target.value })}
                    placeholder="Brand / trade mark…"
                    className={`${t.inp} text-left`}
                  />
                </td>
                <td className={t.td}>
                  <select
                    value={row.owned_by}
                    onChange={(e) => updateRow(row.id, { owned_by: e.target.value })}
                    className={t.inp}
                  >
                    <option value="">—</option>
                    {CMPF307_OWNED_BY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={t.td}>
                  <select
                    value={row.registered_status}
                    onChange={(e) => updateRow(row.id, { registered_status: e.target.value })}
                    className={t.inp}
                  >
                    <option value="">—</option>
                    {CMPF307_REGISTRATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={t.td}>
                  <input
                    type="text"
                    value={row.registration_date}
                    onChange={(e) => updateRow(row.id, { registration_date: e.target.value })}
                    placeholder="Date…"
                    className={t.inp}
                  />
                </td>
                <td className={t.td}>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className={t.delBtn}
                    title="Remove row"
                    aria-label="Remove row"
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
          + Add Row
        </button>
      </div>
    </div>
  );
}
