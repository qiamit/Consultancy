"use client";

import { useEffect, useRef, useState } from "react";
import type { CompanyTextTemplateRow } from "@/lib/types/company-text-template";

const fieldClass =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

export function CompanyTemplateSearchBox({
  templates,
  onPick,
  onTemplatePick,
  ariaLabel,
  placeholder,
  defaultQuery,
}: {
  templates: CompanyTextTemplateRow[];
  onPick: (body: string) => void;
  onTemplatePick?: (template: CompanyTextTemplateRow) => void;
  ariaLabel: string;
  placeholder: string;
  listId?: string;
  defaultQuery?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const displayValue = query || (defaultQuery ?? "").trim();

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  if (templates.length === 0) return null;

  const filtered = displayValue.trim()
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(displayValue.toLowerCase()) ||
          t.code.toLowerCase().includes(displayValue.toLowerCase()),
      )
    : templates;

  function pick(t: CompanyTextTemplateRow) {
    setQuery(t.name);
    setOpen(false);
    onPick(t.body);
    onTemplatePick?.(t);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        aria-label={ariaLabel}
        value={displayValue}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          const exact = templates.find(
            (x) =>
              x.name.toLowerCase() === next.toLowerCase() ||
              x.code.toLowerCase() === next.toLowerCase(),
          );
          if (exact) pick(exact);
        }}
        placeholder={placeholder}
        className={`${fieldClass} py-1.5 text-xs`}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {filtered.map((t) => (
            <li
              key={t.id}
              role="option"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(t);
              }}
              className="cursor-pointer px-3 py-1.5 text-xs text-zinc-800 hover:bg-sky-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {t.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
