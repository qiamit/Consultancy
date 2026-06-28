"use client";

import { useEffect } from "react";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { DROPDOWN_KEY_BIS_PROJECT_CLIENT } from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import {
  createOslSampleRequirementRow,
  defaultOslSampleRequirementRows,
  type OslSampleRequirementRow,
  type OslSamplePriority,
} from "@/lib/osl-sample-requirements";

const oslClientShell =
  "flex overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 shadow-sm focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/40";

const themes = {
  light: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700",
    thead: "bg-zinc-100 dark:bg-zinc-800",
    th: "border-b border-zinc-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
    groupStart: "border-t-2 border-zinc-200 dark:border-zinc-700",
    groupMid: "border-b border-zinc-100 dark:border-zinc-800/80",
    srCell:
      "border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-center align-middle text-sm font-bold tabular-nums text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
    label: "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400",
    td: "px-2 py-1.5 align-top",
    inp:
      "block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
    footer: "shrink-0 border-t border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/50",
    addBtn:
      "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700",
    delBtn: "rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800",
  },
  dark: {
    wrap: "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800",
    thead: "bg-zinc-800",
    th: "border-b border-zinc-700 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-300",
    groupStart: "border-t-2 border-zinc-700",
    groupMid: "border-b border-zinc-800/80",
    srCell:
      "border-r border-zinc-700 bg-zinc-800/60 px-2 py-2 text-center align-middle text-sm font-bold tabular-nums text-zinc-300",
    label: "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-500",
    td: "px-2 py-1.5 align-top",
    inp:
      "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40",
    footer: "shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-3 py-2",
    addBtn:
      "rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800",
    delBtn: "rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-red-400",
  },
} as const;

function FieldCell({
  label,
  t,
  children,
  colSpan,
}: {
  label: string;
  t: (typeof themes)[keyof typeof themes];
  children: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td className={t.td} colSpan={colSpan}>
      <label className={t.label}>{label}</label>
      {children}
    </td>
  );
}

function SampleEntryRows({
  row,
  index,
  t,
  clientOptions,
  onRequestAddClient,
  onUpdate,
  onRemove,
  isFirst,
  highlighted,
}: {
  row: OslSampleRequirementRow;
  index: number;
  t: (typeof themes)[keyof typeof themes];
  clientOptions: AppDropdownOptionRow[];
  onRequestAddClient: (rowId: string) => void;
  onUpdate: (patch: Partial<OslSampleRequirementRow>) => void;
  onRemove: () => void;
  isFirst: boolean;
  highlighted?: boolean;
}) {
  const srNo = String(index + 1).padStart(2, "0");
  const row1Class = `${isFirst ? t.groupMid : `${t.groupStart} ${t.groupMid}`}${highlighted ? " ring-2 ring-inset ring-sky-500/60 bg-sky-950/20" : ""}`;

  return (
    <>
      <tr id={`osl-sample-entry-${index}`} className={row1Class}>
        <td rowSpan={5} className={t.srCell}>
          {srNo}
        </td>
        <FieldCell label="Sample Description" t={t} colSpan={4}>
          <input
            type="text"
            value={row.sample_description}
            onChange={(e) => onUpdate({ sample_description: e.target.value })}
            className={t.inp}
            placeholder="Description…"
          />
        </FieldCell>
      </tr>
      <tr className={t.groupMid}>
        <FieldCell label="Declared Value" t={t} colSpan={4}>
          <input
            type="text"
            value={row.declared_value}
            onChange={(e) => onUpdate({ declared_value: e.target.value })}
            className={t.inp}
            placeholder="Value…"
          />
        </FieldCell>
      </tr>
      <tr className={t.groupMid}>
        <FieldCell label="Batch Number" t={t}>
          <input
            type="text"
            value={row.batch_number}
            onChange={(e) => onUpdate({ batch_number: e.target.value })}
            className={t.inp}
            placeholder="Batch…"
          />
        </FieldCell>
        <FieldCell label="Date of Manufacturing" t={t}>
          <input
            type="date"
            value={row.date_of_manufacturing}
            onChange={(e) => onUpdate({ date_of_manufacturing: e.target.value })}
            className={t.inp}
          />
        </FieldCell>
        <FieldCell label="Sample Quantity" t={t}>
          <input
            type="text"
            value={row.sample_quantity}
            onChange={(e) => onUpdate({ sample_quantity: e.target.value })}
            className={t.inp}
            placeholder="Qty…"
          />
        </FieldCell>
        <FieldCell label="Batch Quantity" t={t}>
          <input
            type="text"
            value={row.batch_quantity}
            onChange={(e) => onUpdate({ batch_quantity: e.target.value })}
            className={t.inp}
            placeholder="Qty…"
          />
        </FieldCell>
      </tr>
      <tr className={t.groupMid}>
        <FieldCell label="Sample Code" t={t}>
          <input
            type="text"
            value={row.sample_code}
            onChange={(e) => onUpdate({ sample_code: e.target.value })}
            className={t.inp}
            placeholder="Code…"
          />
        </FieldCell>
        <FieldCell label="QR Code" t={t}>
          <input
            type="text"
            value={row.qr_code}
            onChange={(e) => onUpdate({ qr_code: e.target.value })}
            className={t.inp}
            placeholder="QR…"
          />
        </FieldCell>
        <FieldCell label="Sample Type" t={t}>
          <input
            type="text"
            value={row.sample_type}
            onChange={(e) => onUpdate({ sample_type: e.target.value })}
            className={t.inp}
            placeholder="Type…"
          />
        </FieldCell>
        <FieldCell label="Priority" t={t}>
          <select
            value={row.priority}
            onChange={(e) => onUpdate({ priority: e.target.value as OslSamplePriority })}
            className={t.inp}
          >
            <option value="Priority">Priority</option>
            <option value="Non Priority">Non Priority</option>
          </select>
        </FieldCell>
      </tr>
      <tr className={t.groupMid}>
        <FieldCell label="Name of the Laboratory" t={t} colSpan={3}>
          <ClientDropdownField
            hideLabel
            inputRowShellClassName={oslClientShell}
            listZIndexClass="z-[410]"
            optionKey={DROPDOWN_KEY_BIS_PROJECT_CLIENT}
            name={`osl_lab_${row.id}`}
            label="Name of the Laboratory"
            dialogTitle="Clients"
            addPlaceholder="New client label"
            manageAriaLabel="Add new client"
            value={row.laboratory_name}
            onChange={(v) => onUpdate({ laboratory_name: v })}
            options={clientOptions}
            selectedValue={row.laboratory_name}
            onClearSelection={() => onUpdate({ laboratory_name: "" })}
            includeEmptyOption={false}
            searchPlaceholder="Search client…"
            blankInputWhenNoSelection
            onSuffixButtonClick={() => onRequestAddClient(row.id)}
          />
        </FieldCell>
        <td className={`${t.td} align-bottom text-right`}>
          <button
            type="button"
            onClick={onRemove}
            className={`${t.delBtn} inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500`}
            aria-label={`Remove sample ${srNo}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
        </td>
      </tr>
    </>
  );
}

export function OslSampleRequirementsTableEditor({
  rows,
  onChange,
  clientOptions,
  onRequestAddClient,
  theme = "light",
  focusSampleIndex = null,
}: {
  rows: OslSampleRequirementRow[];
  onChange: (rows: OslSampleRequirementRow[]) => void;
  clientOptions: AppDropdownOptionRow[];
  onRequestAddClient: (rowId: string) => void;
  theme?: keyof typeof themes;
  focusSampleIndex?: number | null;
}) {
  const t = themes[theme];

  useEffect(() => {
    if (focusSampleIndex == null || focusSampleIndex < 0) return;
    const el = document.getElementById(`osl-sample-entry-${focusSampleIndex}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusSampleIndex, rows.length]);

  function updateRow(id: string, patch: Partial<OslSampleRequirementRow>) {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    onChange([...rows, createOslSampleRequirementRow()]);
  }

  function removeRow(id: string) {
    const next = rows.filter((r) => r.id !== id);
    onChange(next.length > 0 ? next : defaultOslSampleRequirementRows());
  }

  return (
    <div className={t.wrap}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className={`${t.thead} sticky top-0 z-[1]`}>
            <tr>
              <th className={`${t.th} w-12 text-center`}>Sr No</th>
              <th className={t.th} colSpan={4}>
                Sample details (5 rows per entry)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <SampleEntryRows
                key={row.id}
                row={row}
                index={index}
                t={t}
                clientOptions={clientOptions}
                onRequestAddClient={onRequestAddClient}
                isFirst={index === 0}
                onUpdate={(patch) => updateRow(row.id, patch)}
                onRemove={() => removeRow(row.id)}
                highlighted={focusSampleIndex === index}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className={t.footer}>
        <button type="button" onClick={addRow} className={t.addBtn}>
          + Add Sample
        </button>
      </div>
    </div>
  );
}
