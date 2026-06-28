"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TP_FIELD_LABEL_CLASS } from "./constants";
import {
  filterSymbolEntries,
  groupSymbolEntries,
  loadRecentSymbols,
  saveRecentSymbol,
  SPECIFIED_VALUE_SYMBOLS,
} from "./specified-value-symbols";

const inputRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const inputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

const suffixBtnClass =
  "inline-flex shrink-0 items-center justify-center border-l border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-semibold leading-none text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800";

const symbolBtnClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 px-2 text-sm font-medium text-zinc-900 hover:border-sky-400 hover:bg-sky-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-sky-600 dark:hover:bg-sky-950/40";

function SymbolGrid({
  symbols,
  groupLabel,
  onPick,
}: {
  symbols: string[];
  groupLabel: string;
  onPick: (symbol: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {symbols.map((symbol, index) => (
        <button
          key={`${groupLabel}-${symbol}-${index}`}
          type="button"
          title={`Insert ${symbol}`}
          className={symbolBtnClass}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(symbol)}
        >
          {symbol}
        </button>
      ))}
    </div>
  );
}

export function SpecifiedValueField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputId = useId();
  const panelId = useId();
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const filteredGroups = useMemo(() => {
    const filtered = filterSymbolEntries(SPECIFIED_VALUE_SYMBOLS, searchQuery);
    return groupSymbolEntries(filtered);
  }, [searchQuery]);

  const filteredRecent = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentSymbols;
    return recentSymbols.filter(
      (symbol) =>
        symbol.toLowerCase().includes(q) ||
        SPECIFIED_VALUE_SYMBOLS.some(
          (entry) =>
            entry.char === symbol &&
            (entry.group.toLowerCase().includes(q) ||
              entry.tags?.some((tag) => tag.toLowerCase().includes(q))),
        ),
    );
  }, [recentSymbols, searchQuery]);

  useEffect(() => {
    if (!open) return;

    function positionPanel() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 320), 520);
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      setPanelStyle({
        top: rect.bottom + 4,
        left: Math.max(8, left),
        width,
      });
    }

    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      const panel = document.getElementById(panelId);
      if (panel?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, panelId]);

  function togglePanel() {
    if (open) {
      setOpen(false);
      return;
    }
    setRecentSymbols(loadRecentSymbols());
    setSearchQuery("");
    setOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function insertSymbol(symbol: string) {
    const el = inputRef.current;
    if (!el) {
      onChange(value + symbol);
    } else {
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + symbol + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + symbol.length;
        el.setSelectionRange(pos, pos);
      });
    }

    setRecentSymbols(saveRecentSymbol(symbol));
    setOpen(false);
  }

  const panel =
    open && panelStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            id={panelId}
            role="dialog"
            aria-label="Insert symbol"
            className="fixed z-[130] flex max-h-[min(24rem,calc(100vh-6rem))] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-900"
            style={{
              top: panelStyle.top,
              left: panelStyle.left,
              width: panelStyle.width,
            }}
          >
            <div className="shrink-0 border-b border-zinc-200 p-3 dark:border-zinc-700">
              <label htmlFor={searchId} className="sr-only">
                Search symbols
              </label>
              <input
                ref={searchRef}
                id={searchId}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbols… (e.g. alpha, degree, less)"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-sky-500/30 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="space-y-3">
                {filteredRecent.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Recently used
                    </p>
                    <SymbolGrid
                      groupLabel="Recent"
                      symbols={filteredRecent}
                      onPick={insertSymbol}
                    />
                  </div>
                ) : null}

                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {group.label}
                      </p>
                      <SymbolGrid
                        groupLabel={group.label}
                        symbols={group.symbols}
                        onPick={insertSymbol}
                      />
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No symbols match your search.
                  </p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className={TP_FIELD_LABEL_CLASS}>
        Specified Value
      </label>
      <div ref={anchorRef} className="relative">
        <div className={inputRowShellClass}>
          <input
            ref={inputRef}
            id={inputId}
            name={name}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputInnerClass}
          />
          <button
            type="button"
            className={suffixBtnClass}
            aria-label="Insert symbol"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={togglePanel}
          >
            Ω
          </button>
        </div>
        {panel}
      </div>
    </div>
  );
}
