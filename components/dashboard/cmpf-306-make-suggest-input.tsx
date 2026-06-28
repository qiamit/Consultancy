"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const LIST_MAX_HEIGHT = 192;

export function collectCmpf306MakeSuggestions(
  entries: { make: string }[],
  initialRows: { make: string }[] = [],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  function add(raw: string) {
    const value = raw.trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(value);
  }

  for (const row of initialRows) add(row.make);
  for (const entry of entries) add(entry.make);

  return result.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

export function Cmpf306MakeSuggestInput({
  value,
  onChange,
  suggestions,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  className: string;
}) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [listPosition, setListPosition] = useState<{
    left: number;
    width: number;
    top: number;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const filtered = useMemo(() => {
    const query = value.trim().toLowerCase();
    const matches = !query
      ? suggestions
      : suggestions.filter((item) => item.toLowerCase().includes(query));
    return matches.slice(0, 20);
  }, [suggestions, value]);

  const safeHighlight =
    filtered.length === 0 ? 0 : Math.min(highlight, filtered.length - 1);

  const updateListPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setListPosition({
      left: rect.left,
      width: rect.width,
      top: rect.bottom + 4,
    });
  }, []);

  useEffect(() => {
    if (!listOpen) return;
    updateListPosition();
    window.addEventListener("resize", updateListPosition);
    window.addEventListener("scroll", updateListPosition, true);
    return () => {
      window.removeEventListener("resize", updateListPosition);
      window.removeEventListener("scroll", updateListPosition, true);
    };
  }, [listOpen, updateListPosition, filtered.length]);

  function pick(item: string) {
    onChange(item);
    setListOpen(false);
    inputRef.current?.focus();
  }

  const listContent =
    listOpen && filtered.length > 0 && listPosition ? (
      <ul
        id={listboxId}
        role="listbox"
        className="fixed z-[500] overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
        style={{
          left: listPosition.left,
          width: listPosition.width,
          top: listPosition.top,
          maxHeight: LIST_MAX_HEIGHT,
        }}
        onMouseDown={(event) => event.preventDefault()}
      >
        {filtered.map((item, index) => (
          <li
            key={item}
            id={`${listboxId}-opt-${index}`}
            role="option"
            aria-selected={index === safeHighlight}
            className={`cursor-pointer px-3 py-2 text-center text-sm ${
              index === safeHighlight
                ? "bg-sky-900/40 text-zinc-100"
                : "text-zinc-200 hover:bg-zinc-800"
            }`}
            onMouseEnter={() => setHighlight(index)}
            onMouseDown={() => pick(item)}
          >
            {item}
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <>
      <div ref={anchorRef} className="relative w-full">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            listOpen && filtered[safeHighlight]
              ? `${listboxId}-opt-${safeHighlight}`
              : undefined
          }
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setHighlight(0);
            setListOpen(true);
            updateListPosition();
          }}
          onFocus={() => {
            setHighlight(0);
            setListOpen(true);
            updateListPosition();
          }}
          onBlur={() => {
            window.setTimeout(() => setListOpen(false), 150);
          }}
          onKeyDown={(event) => {
            if (!listOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              setListOpen(true);
              updateListPosition();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((current) => Math.min(filtered.length - 1, current + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((current) => Math.max(0, current - 1));
            } else if (event.key === "Enter" && listOpen && filtered[safeHighlight]) {
              event.preventDefault();
              pick(filtered[safeHighlight]!);
            } else if (event.key === "Escape") {
              setListOpen(false);
            }
          }}
          className={className}
        />
      </div>
      {isClient && listContent ? createPortal(listContent, document.body) : null}
    </>
  );
}
