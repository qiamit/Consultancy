"use client";

import { useCallback, useLayoutEffect, useRef, useState, useTransition } from "react";
import { polishUndertakingGeneralIssPoint } from "@backend/actions/undertaking-general-iss-assistant";

const inputClass =
  "w-full min-w-0 rounded border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-xs leading-relaxed text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

const TEXTAREA_MIN_HEIGHT_PX = 40;

function syncTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.max(el.scrollHeight, TEXTAREA_MIN_HEIGHT_PX)}px`;
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (el) syncTextareaHeight(el);
  }, []);

  useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value);
        syncTextareaHeight(e.target);
      }}
      placeholder={placeholder}
      className={`${inputClass} resize-none overflow-hidden disabled:opacity-60`}
      style={{ minHeight: TEXTAREA_MIN_HEIGHT_PX }}
    />
  );
}

function QePolishButton({
  disabled,
  loading,
  onClick,
}: {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title="QE Assistant — polish and elaborate this undertaking point"
      aria-label="QE Assistant — polish and elaborate this undertaking point"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-amber-700/40 bg-amber-950/30 text-base leading-none text-amber-200 transition-colors hover:bg-amber-950/55 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? (
        <span className="text-xs font-semibold" aria-hidden>
          …
        </span>
      ) : (
        <span aria-hidden>✦</span>
      )}
    </button>
  );
}

export function UndertakingGeneralIssTableEditor({
  rows,
  onChange,
}: {
  rows: string[];
  onChange: (rows: string[]) => void;
}) {
  const [polishingIndex, setPolishingIndex] = useState<number | null>(null);
  const [, startPolish] = useTransition();

  function updateRow(index: number, value: string) {
    onChange(rows.map((row, i) => (i === index ? value : row)));
  }

  function addRow() {
    onChange([...rows, ""]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== index));
  }

  function handlePolish(index: number) {
    const draft = rows[index]?.trim() ?? "";
    if (!draft) {
      window.alert("Enter undertaking text before using QE Assistant.");
      return;
    }

    setPolishingIndex(index);
    startPolish(async () => {
      const result = await polishUndertakingGeneralIssPoint(draft);
      setPolishingIndex(null);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      updateRow(index, result.text);
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-700 bg-zinc-950/60">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-700 bg-zinc-800/80">
            <th className="w-12 whitespace-nowrap px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Sr No
            </th>
            <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Undertaking Points
            </th>
            <th className="w-12 px-2 py-2 text-center" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isLastRow = index === rows.length - 1;
            const isPolishing = polishingIndex === index;
            return (
              <tr key={index} className="border-b border-zinc-800 last:border-b-0">
                <td className="whitespace-nowrap px-2 py-2 text-center text-xs font-semibold tabular-nums text-zinc-300">
                  {index + 1}
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="flex items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                      <AutoResizeTextarea
                        value={row}
                        onChange={(v) => updateRow(index, v)}
                        placeholder="Enter undertaking point…"
                        disabled={isPolishing}
                      />
                    </div>
                    <QePolishButton
                      loading={isPolishing}
                      disabled={!row.trim()}
                      onClick={() => handlePolish(index)}
                    />
                  </div>
                </td>
                <td className="px-2 py-2 text-center align-top">
                  {isLastRow ? (
                    <button
                      type="button"
                      onClick={addRow}
                      title="Add new row"
                      aria-label="Add new row"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-teal-700/50 bg-teal-950/40 text-teal-200 hover:bg-teal-950/70"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  ) : rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      title="Remove row"
                      aria-label={`Remove row ${index + 1}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-600 text-zinc-400 hover:border-red-800/50 hover:bg-red-950/30 hover:text-red-300"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
