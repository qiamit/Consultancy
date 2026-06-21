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
import { createPortal } from "react-dom";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";

const inputRowShell =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const inputInner =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

function labelForOption(v: string, rows: { value: string; label: string }[]): string {
  if (!v) return "";
  const o = rows.find((x) => x.value === v);
  return o ? (o.label || o.value) : v;
}

export function ProductLineCombobox({
  options,
  value,
  onPick,
  onAddNew,
  onOpenProductModal,
  idSuffix,
}: {
  options: AppDropdownOptionRow[];
  value: string;
  onPick: (productId: string) => void;
  onAddNew?: (label: string) => void;
  onOpenProductModal?: (prefillName: string) => void;
  idSuffix: string;
}) {
  const listboxId = useId();
  const inputId = `product_line_${idSuffix}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const typeRows = useMemo(
    () => {
      const base = [...options];
      if (value && !base.some((o) => o.value === value)) {
        base.push({ id: `__orphan__${value}`, value, label: value, canDelete: false });
      }
      return base.map((o) => ({ value: o.value, label: o.label ?? o.value, filterText: o.filterText }));
    },
    [options, value],
  );

  const selectOptionsRef = useRef(typeRows);
  selectOptionsRef.current = typeRows;
  const valueRef = useRef(value);
  valueRef.current = value;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => labelForOption(value, typeRows));
  const [highlight, setHighlight] = useState(0);
  const [portalPos, setPortalPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const trimmedQuery = query.trim();

  const filtered = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    return !q
      ? typeRows
      : typeRows.filter((o) =>
          `${o.label ?? ""} ${o.filterText ?? ""} ${o.value}`.toLowerCase().includes(q),
        );
  }, [trimmedQuery, typeRows]);

  const showAddNew =
    trimmedQuery.length > 0 &&
    !typeRows.some((o) => o.label.toLowerCase() === trimmedQuery.toLowerCase());

  // Always show dropdown on open — show empty state if no items
  const dropdownVisible = open;
  const totalItems = filtered.length + (showAddNew ? 1 : 0);

  useEffect(() => { setHighlight(0); }, [query]);

  useEffect(() => {
    if (open) return;
    setQuery(labelForOption(value, typeRows));
  }, [value, typeRows, open]);

  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  // Compute portal position on open
  useEffect(() => {
    if (!dropdownVisible || !wrapRef.current) { setPortalPos(null); return; }

    function update() {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      const DROPDOWN_H = 220;
      const spaceBelow = window.innerHeight - r.bottom;
      if (r.top > DROPDOWN_H && spaceBelow < DROPDOWN_H) {
        // Open above
        setPortalPos({ bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width });
      } else {
        // Open below
        setPortalPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [dropdownVisible]);

  const pick = useCallback(
    (row: { value: string; label: string }) => {
      onPick(row.value);
      setQuery(labelForOption(row.value, selectOptionsRef.current));
      setOpen(false);
      inputRef.current?.blur();
    },
    [onPick],
  );

  function pickAddNew() {
    if (onAddNew) {
      onAddNew(trimmedQuery);
    } else {
      onPick(trimmedQuery);
    }
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function clearBlurTimer() {
    if (blurTimer.current) { clearTimeout(blurTimer.current); blurTimer.current = null; }
  }

  function handleFocus() { clearBlurTimer(); setOpen(true); }

  function handleBlur() {
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      setQuery(labelForOption(valueRef.current, selectOptionsRef.current));
      blurTimer.current = null;
    }, 150);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (totalItems > 0) setHighlight((h) => (h + 1) % totalItems);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (totalItems > 0) setHighlight((h) => (h - 1 + totalItems) % totalItems);
      return;
    }
    if (e.key === "Escape") {
      if (open) { e.preventDefault(); setOpen(false); setQuery(labelForOption(valueRef.current, selectOptionsRef.current)); }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (showAddNew && highlight === filtered.length) { pickAddNew(); return; }
      if (filtered.length > 0) pick(filtered[Math.min(highlight, filtered.length - 1)]!);
    }
  }

  const dropdown = dropdownVisible && portalPos ? (
    <ul
      id={listboxId}
      role="listbox"
      style={{
        position: "fixed",
        zIndex: 99999,
        left: portalPos.left,
        width: portalPos.width,
        ...(portalPos.top !== undefined ? { top: portalPos.top } : { bottom: portalPos.bottom }),
      }}
      className="max-h-52 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900"
      onMouseDown={(e) => e.preventDefault()}
    >
      {filtered.length === 0 && !showAddNew && (
        <li className="px-3 py-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
          No items found.{" "}
          <span className="text-zinc-400 dark:text-zinc-300">
            Type a name to add a new item.
          </span>
        </li>
      )}

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

      {showAddNew && (
        <li
          id={`${listboxId}-opt-${filtered.length}`}
          role="option"
          aria-selected={highlight === filtered.length}
          className={`cursor-pointer border-t border-zinc-100 px-3 py-2 text-sm font-medium dark:border-zinc-700 ${
            highlight === filtered.length
              ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
              : "text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/20"
          }`}
          onMouseEnter={() => setHighlight(filtered.length)}
          onMouseDown={pickAddNew}
        >
          <span className="mr-1 font-bold">+</span> Add &ldquo;{trimmedQuery}&rdquo; as new item
        </li>
      )}
    </ul>
  ) : null;

  return (
    <div className="relative" ref={wrapRef}>
      <div className={inputRowShell}>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={dropdownVisible}
          aria-controls={listboxId}
          aria-activedescendant={
            dropdownVisible && highlight < totalItems ? `${listboxId}-opt-${highlight}` : undefined
          }
          aria-label="Product or service"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search product / service…"
          className={inputInner}
        />
        {onOpenProductModal && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); onOpenProductModal(trimmedQuery); }}
            className="flex items-center justify-center px-2 text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400"
            title="Add new product / service"
          >
            <span className="text-base font-bold leading-none">+</span>
          </button>
        )}
      </div>
      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
