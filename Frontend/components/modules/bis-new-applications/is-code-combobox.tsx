"use client";

import { useId, useMemo, useState } from "react";
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
}) {
  const generatedInputId = useId();
  const inputId = inputIdProp ?? generatedInputId;
  const listboxId = `${inputId}-listbox`;
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    return options.find((o) => o.id === value)?.label ?? "";
  }, [value, options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 80);
    return options
      .filter((o) => {
        const hay = `${o.filterText ?? ""} ${o.label}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 80);
  }, [options, query]);

  const inputValue = listOpen ? query : selectedLabel;
  const safeHighlight =
    filtered.length === 0 ? 0 : Math.min(highlight, filtered.length - 1);

  function pick(o: IsCodeComboboxOption) {
    onChange(o.id);
    setQuery(o.label);
    setListOpen(false);
  }

  const comboboxInput = (
    <div className="relative w-full">
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
            setQuery(e.target.value);
            setHighlight(0);
            setListOpen(true);
          }}
          onFocus={() => {
            setQuery(selectedLabel);
            setHighlight(0);
            setListOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setListOpen(false), 150);
          }}
          onKeyDown={(e) => {
            if (!listOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              setListOpen(true);
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(filtered.length - 1, h + 1));
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
          placeholder="Type IS Number…"
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
      {listOpen && !disabled && filtered.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className={`absolute left-0 right-0 top-full mt-0.5 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 ${listZIndexClass}`}
          onMouseDown={(ev) => ev.preventDefault()}
        >
          {filtered.map((o, i) => (
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
          ))}
        </ul>
      ) : null}
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
