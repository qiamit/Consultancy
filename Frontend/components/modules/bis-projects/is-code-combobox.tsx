"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { BIS_FIELD_LABEL_CLASS } from "./constants";

export type IsCodeComboboxOption = {
  id: string;
  /** Shown in the list and input after selection. */
  label: string;
  /** If set, typeahead matches this string as well as `label` (e.g. include title). */
  filterText?: string;
};

const inputRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const inputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

const suffixBtnClass =
  "inline-flex shrink-0 items-center justify-center border-l border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-medium leading-none text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800";

export function IsCodeCombobox({
  name,
  label,
  value,
  onChange,
  options,
  disabled,
  listZIndexClass = "z-[118]",
  onAddClick,
  addButtonAriaLabel = "Add new IS code",
  hideLabel = false,
  inputId: inputIdProp,
  placeholder = "Type IS Number…",
  maxListItems = 120,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: IsCodeComboboxOption[];
  disabled?: boolean;
  listZIndexClass?: string;
  onAddClick?: () => void;
  addButtonAriaLabel?: string;
  /** Omit the built-in label (e.g. BIS form `lg` grid: label row + control row). */
  hideLabel?: boolean;
  /** When `hideLabel`, must match the external `<label htmlFor>`. */
  inputId?: string;
  placeholder?: string;
  /** Max rows shown in the dropdown (default 120). */
  maxListItems?: number;
}) {
  const generatedInputId = useId();
  const inputId = inputIdProp ?? generatedInputId;
  const listboxId = `${inputId}-listbox`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [listPosition, setListPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    return options.find((o) => o.id === value)?.label ?? "";
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const limit = Math.max(1, maxListItems);
    if (!q) return options.slice(0, limit);
    return options
      .filter((o) => {
        const hay = `${o.filterText ?? ""} ${o.label}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, limit);
  }, [options, query, maxListItems]);

  const inputValue = listOpen ? query : selectedLabel;
  const safeHighlight =
    filtered.length === 0 ? 0 : Math.min(highlight, filtered.length - 1);

  const updateListPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setListPosition({
      top: rect.bottom + 2,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!listOpen || disabled) {
      setListPosition(null);
      return;
    }
    updateListPosition();
    window.addEventListener("resize", updateListPosition);
    window.addEventListener("scroll", updateListPosition, true);
    return () => {
      window.removeEventListener("resize", updateListPosition);
      window.removeEventListener("scroll", updateListPosition, true);
    };
  }, [listOpen, disabled, updateListPosition, filtered.length, query]);

  useEffect(
    () => () => {
      if (blurTimer.current) window.clearTimeout(blurTimer.current);
    },
    [],
  );

  function clearBlurTimer() {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  function pick(o: IsCodeComboboxOption) {
    clearBlurTimer();
    onChange(o.id);
    setQuery(o.label);
    setListOpen(false);
  }

  function openList(nextQuery?: string) {
    if (disabled) return;
    if (nextQuery !== undefined) setQuery(nextQuery);
    setHighlight(0);
    setListOpen(true);
  }

  const listContent =
    listOpen && !disabled && portalReady && listPosition
      ? createPortal(
          <ul
            id={listboxId}
            role="listbox"
            style={{
              position: "fixed",
              top: listPosition.top,
              left: listPosition.left,
              width: listPosition.width,
              zIndex: 400,
            }}
            className={`max-h-56 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 ${listZIndexClass}`}
            onMouseDown={(ev) => ev.preventDefault()}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                {options.length === 0
                  ? "No options available"
                  : "No matches — try another search"}
              </li>
            ) : (
              filtered.map((o, i) => (
                <li
                  key={o.id}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === safeHighlight}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    i === safeHighlight
                      ? "bg-sky-100 text-zinc-900 dark:bg-sky-900/40 dark:text-zinc-100"
                      : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={() => pick(o)}
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>,
          document.body,
        )
      : null;

  const comboboxInput = (
    <div className="relative w-full" ref={anchorRef}>
      <input type="hidden" name={name} value={value} />
      <div className={inputRowShellClass}>
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          disabled={disabled}
          aria-label={hideLabel ? label : undefined}
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            listOpen && filtered[safeHighlight]
              ? `${listboxId}-opt-${safeHighlight}`
              : undefined
          }
          value={inputValue}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setHighlight(0);
            setListOpen(true);
            // Typing away from the selected label clears the selection so filter stays accurate.
            if (value && next !== selectedLabel) onChange("");
          }}
          onFocus={() => {
            openList(selectedLabel);
          }}
          onBlur={() => {
            clearBlurTimer();
            blurTimer.current = window.setTimeout(() => {
              setListOpen(false);
              // Restore selected label if user didn't pick a new option.
              setQuery(selectedLabel);
            }, 150);
          }}
          onKeyDown={(e) => {
            if (!listOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              openList(query || selectedLabel);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) =>
                filtered.length === 0 ? 0 : Math.min(filtered.length - 1, h + 1),
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(0, h - 1));
            } else if (e.key === "Enter" && listOpen && filtered[safeHighlight]) {
              e.preventDefault();
              pick(filtered[safeHighlight]!);
            } else if (e.key === "Escape") {
              setListOpen(false);
            }
          }}
          placeholder={placeholder}
          className={inputInnerClass}
        />
        {onAddClick ? (
          <button
            type="button"
            className={suffixBtnClass}
            aria-label={addButtonAriaLabel}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onAddClick()}
          >
            +
          </button>
        ) : null}
      </div>
      {listContent}
    </div>
  );

  if (hideLabel) {
    return comboboxInput;
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className={BIS_FIELD_LABEL_CLASS}>
        {label}
      </label>
      {comboboxInput}
    </div>
  );
}
