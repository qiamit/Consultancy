"use client";

import { useMemo } from "react";
import {
  computeCmpf306TestParameterGroups,
  type Cmpf306EquipmentRow,
} from "@backend/modules/bis/cmpf-306";

const themes = {
  dark: {
    thead: "bg-zinc-800",
    th: "border-b border-zinc-700 px-1.5 py-2 text-center text-[9px] font-semibold uppercase tracking-wide text-zinc-300",
    td: "border-b border-zinc-800/80 px-1 py-1.5 align-middle text-center",
    testParamTd: "border-b border-r border-zinc-800/80 bg-zinc-900/40 px-1 py-1.5 align-middle text-center",
    srCell:
      "border-b border-r border-zinc-700 bg-zinc-800/60 px-2 py-2 text-center align-middle text-sm font-bold tabular-nums text-zinc-300",
    inp:
      "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1.5 text-center text-[11px] text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40",
    inpLeft:
      "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1.5 text-left text-[11px] text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40",
    testParamInp:
      "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-center text-[10px] text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40",
    delBtn: "rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400",
  },
} as const;

export function Cmpf306TableEditor({
  theme = "dark",
  rows,
  onChange,
}: {
  theme?: keyof typeof themes;
  rows: Cmpf306EquipmentRow[];
  onChange: (rows: Cmpf306EquipmentRow[]) => void;
}) {
  const t = themes[theme];
  const testParameterGroups = useMemo(() => computeCmpf306TestParameterGroups(rows), [rows]);

  function updateRow(id: string, patch: Partial<Cmpf306EquipmentRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function updateTestParameterGroup(
    groupStart: number,
    groupSize: number,
    patch: Partial<Pick<Cmpf306EquipmentRow, "remarks" | "clause_number" | "test_method">>,
  ) {
    onChange(
      rows.map((row, index) =>
        index >= groupStart && index < groupStart + groupSize ? { ...row, ...patch } : row,
      ),
    );
  }

  function removeRow(id: string) {
    onChange(rows.filter((r) => r.id !== id));
  }

  if (rows.length === 0) return null;

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[1080px] table-fixed border-collapse text-xs">
        <colgroup>
          <col style={{ width: "4%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "4%" }} />
        </colgroup>
        <thead className={`${t.thead} sticky top-0 z-[1]`}>
          <tr>
            <th className={t.th}>Sr</th>
            <th className={t.th}>Test Parameter</th>
            <th className={t.th}>Test Equipments / Chemicals</th>
            <th className={t.th}>Make</th>
            <th className={t.th}>Least Count</th>
            <th className={t.th}>Range</th>
            <th className={t.th}>Calibration Status</th>
            <th className={t.th}>Quantity</th>
            <th className={t.th} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const group = testParameterGroups[index]!;
            const groupRow = rows[group.groupStart]!;

            return (
            <tr key={row.id}>
              <td className={t.srCell}>{index + 1}</td>
              {group.showCell ? (
                <td
                  className={group.rowSpan > 1 ? t.testParamTd : t.td}
                  rowSpan={group.rowSpan > 1 ? group.rowSpan : undefined}
                >
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={groupRow.remarks}
                      onChange={(e) =>
                        updateTestParameterGroup(group.groupStart, group.groupSize, {
                          remarks: e.target.value,
                        })
                      }
                      placeholder="Test name…"
                      className={t.testParamInp}
                    />
                    <input
                      type="text"
                      value={groupRow.clause_number}
                      onChange={(e) =>
                        updateTestParameterGroup(group.groupStart, group.groupSize, {
                          clause_number: e.target.value,
                        })
                      }
                      placeholder="Clause no…"
                      className={t.testParamInp}
                    />
                    <input
                      type="text"
                      value={groupRow.test_method}
                      onChange={(e) =>
                        updateTestParameterGroup(group.groupStart, group.groupSize, {
                          test_method: e.target.value,
                        })
                      }
                      placeholder="Test method…"
                      className={t.testParamInp}
                    />
                  </div>
                </td>
              ) : null}
              <td className={t.td}>
                <input
                  type="text"
                  value={row.equipment_name}
                  onChange={(e) => updateRow(row.id, { equipment_name: e.target.value })}
                  placeholder="Equipment / chemical…"
                  className={t.inpLeft}
                />
              </td>
              <td className={t.td}>
                <input
                  type="text"
                  value={row.make}
                  onChange={(e) => updateRow(row.id, { make: e.target.value })}
                  placeholder="Make…"
                  className={t.inp}
                />
              </td>
              <td className={t.td}>
                <input
                  type="text"
                  value={row.least_count}
                  onChange={(e) => updateRow(row.id, { least_count: e.target.value })}
                  placeholder="Least count…"
                  className={t.inp}
                />
              </td>
              <td className={t.td}>
                <input
                  type="text"
                  value={row.range}
                  onChange={(e) => updateRow(row.id, { range: e.target.value })}
                  placeholder="Range…"
                  className={t.inp}
                />
              </td>
              <td className={t.td}>
                <input
                  type="text"
                  value={row.calibration_details}
                  onChange={(e) => updateRow(row.id, { calibration_details: e.target.value })}
                  placeholder="Yes / No…"
                  className={t.inp}
                />
              </td>
              <td className={t.td}>
                <input
                  type="text"
                  value={row.quantity}
                  onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                  placeholder="Qty…"
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
