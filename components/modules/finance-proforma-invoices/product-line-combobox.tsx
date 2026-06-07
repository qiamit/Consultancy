"use client";

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";

const inputRowShell =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const inputInner =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

function labelForOption(
  v: string,
  rows: { value: string; label: string }[],
): string {
  if (!v) return "";
  const o = rows.find((x) => x.value === v);
  return o ? (o.label || o.value) : v;
}

/** Searchable product picker for quotation line rows (replaces native &lt;select&gt;). */
export function ProductLineCombobox({
  options,
  value,
  onPick,
  idSuffix,
}: {
  options: AppDropdownOptionRow[];
  value: string;
  onPick: (productId: string) => void;
  /** Unique per table row for aria ids */
  idSuffix: string;
}) {
  const listboxId = useId();
  const inputId = `product_line_${idSuffix}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mergedOptions = useMemo(() => {
    const base = [...options];
    if (value && !base.some((o) => o.value === value)) {
      base.push({
        id: `__orphan__${value}`,
        value,
        label: value,
        canDelete: false,
      });
    }
    return base;
  }, [options, value]);

  const typeRows = useMemo(
    () =>
      mergedOptions.map((o) => ({
        value: o.value,
        label: o.label ?? o.value,
        filterText: o.filterText,
      })),
    [mergedOptions],
  );

  const selectOptionsRef = useRef(typeRows);
  selectOptionsRef.current = typeRows;

  const valueRef = useRef(value);
  valueRef.current = value;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => labelForOption(value, typeRows));
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return !q
      ? typeRows
      : typeRows.filter((o) => {
          const hay = `${o.label ?? ""} ${o.filterText ?? ""} ${o.value}`
            .toLowerCase();
          return hay.includes(q);
        });
  }, [query, typeRows]);

  useEffect(() => {
    setHighlight(0);
  }, [query, filtered.length]);

  useEffect(() => {
    if (open) return;
    setQuery(labelForOption(value, typeRows));
  }, [value, typeRows, open]);

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  const pick = useCallback(
    (row: { value: string; label: string }) => {
      onPick(row.value);
      setQuery(labelForOption(row.value, selectOptionsRef.current));
      setOpen(false);
      inputRef.current?.blur();
    },
    [onPick],
  );

  function clearBlurTimer() {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  function handleFocus() {
    clearBlurTimer();
    setOpen(true);
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      setQuery(
        labelForOption(valueRef.current, selectOptionsRef.current),
      );
      blurTimer.current = null;
    }, 120);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) =>
        filtered.length === 0 ? 0 : (h + 1) % filtered.length,
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) =>
        filtered.length === 0
          ? 0
          : (h - 1 + filtered.length) % filtered.length,
      );
      return;
    }
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setQuery(
          labelForOption(valueRef.current, selectOptionsRef.current),
        );
      }
      return;
    }
    if (e.key === "Enter") {
      if (filtered.length === 0) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const row = filtered[Math.min(highlight, filtered.length - 1)]!;
      pick(row);
    }
  }

  return (
    <div className="relative">
      <div className={inputRowShell}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && filtered[highlight]
              ? `${listboxId}-opt-${highlight}`
              : undefined
          }
          aria-label="Product or service"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search product / service…"
          className={inputInner}
        />
      </div>
      {open && filtered.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[130] mt-0.5 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtered.map((o, i) => (
            <li
              key={o.value || "__empty__"}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlight
                  ? "bg-sky-100 text-zinc-900 dark:bg-sky-900/40 dark:text-zinc-100"
                  : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
              }`}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={() => pick(o)}
            >
              {o.label || o.value}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
