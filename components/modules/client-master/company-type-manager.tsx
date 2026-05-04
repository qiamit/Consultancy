"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  addAppDropdownOption,
  deleteAppDropdownOption,
} from "@/lib/actions/app-dropdown-options";
import { DROPDOWN_KEY_CLIENT_COMPANY_TYPE } from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import { CLIENT_FIELD_LABEL_BLOCK_CLASS } from "./constants";
import { DialogCloseXButton } from "./dialog-close-x";

const btn =
  "rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

/** Input row only: overflow hidden keeps rounded corners; list is a sibling so it is not clipped. */
const inputRowShell =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const fieldWrap = "relative";

const inputInner =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

const suffixBtn =
  "inline-flex shrink-0 items-center justify-center border-l border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-medium leading-none text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800";

function labelForOption(
  v: string,
  selectOptions: { value: string; label: string }[],
) {
  if (!v) return "";
  const o = selectOptions.find((x) => x.value === v);
  return o ? (o.label || o.value) : v;
}

export function CompanyTypeManager({
  value,
  onChange,
  selectOptions,
  options,
  selectedValue,
  onClearSelection,
}: {
  value: string;
  onChange: (v: string) => void;
  selectOptions: { value: string; label: string }[];
  options: AppDropdownOptionRow[];
  selectedValue: string;
  onClearSelection: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectOptionsRef = useRef(selectOptions);
  selectOptionsRef.current = selectOptions;
  const valueRef = useRef(value);
  valueRef.current = value;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState(() => labelForOption(value, selectOptions));
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const typeRows = useMemo(
    () => selectOptions.filter((o) => o.value !== ""),
    [selectOptions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return typeRows;
    return typeRows.filter((o) => {
      const text = (o.label ?? o.value).toLowerCase();
      return text.includes(q) || o.value.toLowerCase().includes(q);
    });
  }, [query, typeRows]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setQuery(labelForOption(value, selectOptionsRef.current));
  }, [value]);

  useEffect(() => {
    setHighlight(0);
  }, [query, filtered.length]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  const pick = useCallback(
    (row: { value: string; label: string }) => {
      onChange(row.value);
      setQuery(row.label || row.value);
      setListOpen(false);
      inputRef.current?.blur();
    },
    [onChange],
  );

  function clearBlurTimer() {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  function handleInputFocus() {
    clearBlurTimer();
    setListOpen(true);
  }

  function handleInputBlur() {
    blurTimer.current = setTimeout(() => {
      setListOpen(false);
      setQuery(
        labelForOption(valueRef.current, selectOptionsRef.current),
      );
      blurTimer.current = null;
    }, 120);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!listOpen) setListOpen(true);
      setHighlight((h) =>
        filtered.length === 0 ? 0 : (h + 1) % filtered.length,
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!listOpen) setListOpen(true);
      setHighlight((h) =>
        filtered.length === 0
          ? 0
          : (h - 1 + filtered.length) % filtered.length,
      );
      return;
    }
    if (e.key === "Escape") {
      if (listOpen) {
        e.preventDefault();
        setListOpen(false);
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

  async function handleAdd() {
    setBusy(true);
    try {
      const r = await addAppDropdownOption(
        DROPDOWN_KEY_CLIENT_COMPANY_TYPE,
        draft,
      );
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      setDraft("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, v: string, canDelete: boolean) {
    if (!canDelete) return;
    setBusy(true);
    try {
      const r = await deleteAppDropdownOption(
        DROPDOWN_KEY_CLIENT_COMPANY_TYPE,
        id,
        v,
      );
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      if (selectedValue === v) onClearSelection();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <label htmlFor="company_type_input" className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>
        Type of Company
      </label>
      <input type="hidden" name="company_type" value={value} />
      <div className={fieldWrap}>
        <div className={inputRowShell}>
          <input
            ref={inputRef}
            id="company_type_input"
            type="text"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              listOpen && filtered[highlight]
                ? `${listboxId}-opt-${highlight}`
                : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setListOpen(true);
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder="Type to search types…"
            className={inputInner}
          />
          <button
            type="button"
            className={suffixBtn}
            aria-label="Add or remove company types"
            aria-expanded={open}
            aria-haspopup="dialog"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen(true)}
          >
            +
          </button>
        </div>
        {listOpen && filtered.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full z-[105] mt-0.5 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
            onMouseDown={(e) => e.preventDefault()}
          >
            {filtered.map((o, i) => (
              <li
                key={o.value}
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
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="mb-10 w-full max-w-md rounded-xl border-2 border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                  <h2
                    id={titleId}
                    className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                  >
                    Company Types
                  </h2>
                  <DialogCloseXButton onClick={() => setOpen(false)} />
                </div>
                <div className="space-y-4 px-4 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="New Type Name"
                      className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className={`${btn} px-3 py-2 text-sm`}
                      disabled={busy || !draft.trim()}
                      onClick={() => void handleAdd()}
                    >
                      Add
                    </button>
                  </div>
                  <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-700 dark:border-zinc-600 dark:bg-zinc-950/60">
                    {options.map((o) => {
                      const canDelete = o.canDelete !== false;
                      return (
                        <li
                          key={o.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100"
                        >
                          <span className="min-w-0 truncate">
                            {o.label ?? o.value}
                          </span>
                          {canDelete ? (
                            <button
                              type="button"
                              disabled={busy}
                              title={`Delete “${o.value}”`}
                              className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
                              onClick={() =>
                                void handleDelete(o.id, o.value, canDelete)
                              }
                            >
                              Delete
                            </button>
                          ) : (
                            <span
                              className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
                              title="Built-in type (save to database to manage)"
                            >
                              —
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
