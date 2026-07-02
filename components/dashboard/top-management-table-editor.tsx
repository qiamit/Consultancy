"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  createTopManagementRow,
  defaultTopManagementRows,
  type TopManagementRow,
} from "@/lib/top-management";
import { removeSignatureImageBackground } from "@/lib/signature-image-background";

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
    inpLeft:
      "block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-left text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
    tdLeft: "border-b border-zinc-100 px-2 py-1.5 align-middle text-left dark:border-zinc-800/80",
    uploadBtn:
      "rounded-md border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
    clearBtn:
      "rounded px-1 text-[10px] font-semibold text-red-500 hover:bg-red-950/30",
    addBtn:
      "inline-flex h-7 w-7 items-center justify-center rounded-md border border-teal-700/50 bg-teal-950/40 text-teal-200 hover:bg-teal-950/70",
    delBtn: "inline-flex h-7 w-7 items-center justify-center rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800",
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
    inpLeft:
      "block w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-left text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40",
    tdLeft: "border-b border-zinc-800/80 px-2 py-1.5 align-middle text-left",
    uploadBtn:
      "rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-[10px] font-semibold text-zinc-200 hover:bg-zinc-800",
    clearBtn:
      "rounded px-1 text-[10px] font-semibold text-red-400 hover:bg-red-950/30",
    addBtn:
      "inline-flex h-7 w-7 items-center justify-center rounded-md border border-teal-700/50 bg-teal-950/40 text-teal-200 hover:bg-teal-950/70",
    delBtn:
      "inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-red-400",
  },
} as const;

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

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
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);

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

  async function handleSignatureFileChange(rowId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file (PNG, JPG, etc.).");
      return;
    }

    if (file.size > MAX_SIGNATURE_BYTES) {
      window.alert("Signature image must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? "").trim();
      if (!dataUrl) {
        window.alert("Unable to read the image file.");
        return;
      }

      setProcessingRowId(rowId);
      try {
        const processed = await removeSignatureImageBackground(dataUrl);
        updateRow(rowId, { signature_image_url: processed });
      } catch {
        window.alert("Unable to process the signature image.");
      } finally {
        setProcessingRowId(null);
      }
    };
    reader.onerror = () => window.alert("Unable to read the image file.");
    reader.readAsDataURL(file);
  }

  return (
    <div className={t.wrap}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead className={`${t.thead} sticky top-0 z-[1]`}>
            <tr>
              <th className={t.th}>Sr No</th>
              <th className={t.th}>Name of Person</th>
              <th className={t.th}>Designation</th>
              <th className={t.th}>Email ID</th>
              <th className={t.th}>Mobile Number</th>
              <th className={t.th}>
                Signature
                <span className="mt-0.5 block text-[9px] font-normal normal-case text-zinc-500">
                  Sr 1 → letter
                </span>
              </th>
              <th className={t.th}>
                Apply Signature
                <span className="mt-0.5 block text-[9px] font-normal normal-case text-zinc-500">
                  All documents
                </span>
              </th>
              <th className={t.th} aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isLastRow = index === rows.length - 1;
              return (
                <tr key={row.id}>
                  <td className={t.srCell}>{index + 1}</td>
                  <td className={t.tdLeft}>
                    <input
                      type="text"
                      value={row.person_name}
                      onChange={(e) => updateRow(row.id, { person_name: e.target.value })}
                      placeholder="Name…"
                      className={t.inpLeft}
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
                    {index === 0 ? (
                      <div className="flex flex-col items-center gap-1.5">
                        {row.signature_image_url ? (
                          <img
                            src={row.signature_image_url}
                            alt="Signatory signature"
                            className="mx-auto max-h-12 max-w-full rounded border border-zinc-700/60 object-contain bg-[repeating-conic-gradient(#d4d4d8_0%_25%,#fafafa_0%_50%)] bg-[length:8px_8px] dark:bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)]"
                          />
                        ) : null}
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current.get(row.id)?.click()}
                            className={t.uploadBtn}
                            disabled={processingRowId === row.id}
                          >
                            {processingRowId === row.id
                              ? "Processing…"
                              : row.signature_image_url
                                ? "Change"
                                : "Upload"}
                          </button>
                          {row.signature_image_url ? (
                            <button
                              type="button"
                              onClick={() => updateRow(row.id, { signature_image_url: "" })}
                              className={t.clearBtn}
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                        <input
                          ref={(node) => {
                            if (node) fileInputRefs.current.set(row.id, node);
                            else fileInputRefs.current.delete(row.id);
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSignatureFileChange(row.id, e)}
                        />
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-500">—</span>
                    )}
                  </td>
                  <td className={t.td}>
                    {index === 0 ? (
                      <select
                        value={row.apply_signature_on_documents ? "yes" : "no"}
                        onChange={(e) =>
                          updateRow(row.id, {
                            apply_signature_on_documents: e.target.value === "yes",
                          })
                        }
                        className={t.inp}
                        aria-label="Apply signature on all application documents"
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    ) : (
                      <span className="text-[10px] text-zinc-500">—</span>
                    )}
                  </td>
                  <td className={t.td}>
                    {isLastRow ? (
                      <button
                        type="button"
                        onClick={addRow}
                        className={t.addBtn}
                        title="Add person"
                        aria-label="Add person"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className={t.delBtn}
                        aria-label={`Remove row ${index + 1}`}
                        title="Remove row"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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
