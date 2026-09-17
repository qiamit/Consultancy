"use client";

import { useState } from "react";
import { sendAiMessage } from "@backend/actions/ai-chat";
import {
  emptySitAnnexExtraRow,
  USIT_NOTE_SECTIONS,
  type UpdatedSchemeOfInspectionStored,
  type UsitNoteFieldKey,
} from "@backend/modules/bis/updated-scheme-of-inspection";

export type { UsitNoteFieldKey };

export const USIT_NOTE_FIELDS = USIT_NOTE_SECTIONS;

const fieldClass =
  "box-border h-11 w-full min-w-0 rounded border border-zinc-600 bg-zinc-950 px-1.5 py-1 text-[11px] leading-tight text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";

const REFINE_SYSTEM = `You refine Table 1 Notes wording for a BIS Updated Scheme of Inspection & Testing document.
Return ONLY the refined note text. No markdown, no labels, no quotes.`;

export function UpdatedSitNotesTableEditor({
  document,
  onChange,
}: {
  document: UpdatedSchemeOfInspectionStored;
  onChange: (patch: Partial<UpdatedSchemeOfInspectionStored>) => void;
}) {
  const extraRows = document.note_extra_rows ?? [];
  const [refiningId, setRefiningId] = useState<string | null>(null);

  function addExtraRow() {
    onChange({ note_extra_rows: [...extraRows, emptySitAnnexExtraRow()] });
  }

  function updateExtraRow(index: number, patch: Partial<(typeof extraRows)[number]>) {
    onChange({
      note_extra_rows: extraRows.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    });
  }

  function removeExtraRow(index: number) {
    onChange({ note_extra_rows: extraRows.filter((_, i) => i !== index) });
  }

  async function refineText(
    id: string,
    header: string,
    text: string,
    apply: (next: string) => void,
  ) {
    const trimmed = text.trim();
    if (!trimmed) {
      window.alert(`Enter ${header || "note"} text before AI refining.`);
      return;
    }
    if (refiningId) return;
    setRefiningId(id);
    try {
      const res = await sendAiMessage(
        [
          {
            role: "user",
            content: `Note label: ${header || "Custom"}
Instruction: Use formal, professional BIS Product Manual / Scheme of Inspection note wording.

Current text:
${trimmed}`,
          },
        ],
        REFINE_SYSTEM,
        undefined,
        2048,
      );
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      const refined = res.reply.trim();
      if (!refined) {
        window.alert("AI returned empty text. Try again.");
        return;
      }
      apply(refined);
    } catch {
      window.alert("AI refining failed. Try again.");
    } finally {
      setRefiningId(null);
    }
  }

  return (
    <div className="mb-3 space-y-2">
      <div className="overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-900">
        <table className="w-full min-w-[640px] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-800/80 text-[10px] uppercase tracking-wide text-zinc-400">
              <th className="w-[12rem] px-1.5 py-1.5 text-left">Header</th>
              <th className="px-1.5 py-1.5 text-left">Text</th>
              <th className="w-[7.5rem] px-1.5 py-1.5 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {USIT_NOTE_FIELDS.map(({ key, header }) => (
              <tr key={key} className="border-b border-zinc-800 align-middle">
                <td className="px-1.5 py-1">
                  <input
                    readOnly
                    value={header}
                    className={`${fieldClass} cursor-default text-zinc-300`}
                    tabIndex={-1}
                  />
                </td>
                <td className="px-1.5 py-1">
                  <input
                    value={document[key]}
                    onChange={(e) => onChange({ [key]: e.target.value })}
                    className={fieldClass}
                    title={document[key]}
                  />
                </td>
                <td className="px-1.5 py-1">
                  <button
                    type="button"
                    disabled={refiningId !== null}
                    onClick={() =>
                      void refineText(key, header, document[key], (next) =>
                        onChange({ [key]: next }),
                      )
                    }
                    className="box-border flex h-11 w-full items-center justify-center rounded border border-sky-700/70 bg-sky-950/40 px-1 text-[10px] font-semibold text-sky-200 hover:bg-sky-900/50 disabled:opacity-50"
                  >
                    {refiningId === key ? "…" : "AI Refining"}
                  </button>
                </td>
              </tr>
            ))}

            {extraRows.map((row, index) => {
              const id = `note-extra-${index}`;
              return (
                <tr key={id} className="border-b border-zinc-800 align-middle">
                  <td className="px-1.5 py-1">
                    <input
                      value={row.header}
                      onChange={(e) => updateExtraRow(index, { header: e.target.value })}
                      placeholder="Header"
                      className={fieldClass}
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <input
                      value={row.text}
                      onChange={(e) => updateExtraRow(index, { text: e.target.value })}
                      className={fieldClass}
                      title={row.text}
                    />
                  </td>
                  <td className="px-1.5 py-1">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={refiningId !== null}
                        onClick={() =>
                          void refineText(id, row.header, row.text, (next) =>
                            updateExtraRow(index, { text: next }),
                          )
                        }
                        className="box-border flex h-11 min-w-0 flex-1 items-center justify-center rounded border border-sky-700/70 bg-sky-950/40 px-1 text-[10px] font-semibold text-sky-200 hover:bg-sky-900/50 disabled:opacity-50"
                      >
                        {refiningId === id ? "…" : "AI"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeExtraRow(index)}
                        className="box-border flex h-11 items-center rounded border border-red-800 px-2 text-[10px] font-semibold text-red-300 hover:bg-red-950/40"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-start rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2">
        <button
          type="button"
          onClick={addExtraRow}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Add New Row
        </button>
      </div>
    </div>
  );
}
