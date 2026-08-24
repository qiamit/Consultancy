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
  useSyncExternalStore,
} from "react";
import {
  addAppDropdownOption,
  deleteAppDropdownOption,
  updateAppDropdownOption,
} from "@backend/actions/app-dropdown-options";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { CLIENT_FIELD_LABEL_BLOCK_CLASS } from "./constants";
import { DialogCloseXButton } from "./dialog-close-x";
import { DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE } from "@backend/shared/dropdown-keys";

const btn =
  "rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

const inputRowShell =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const fieldWrap = "relative";

const inputInner =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

const suffixBtn =
  "inline-flex shrink-0 items-center justify-center border-l border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-medium leading-none text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800";

/** Show dial code only, e.g. "India (+91)" → "+91". */
function dialCodeDisplay(value: string, label?: string | null): string {
  const hay = `${label ?? ""} ${value}`.trim();
  const m = hay.match(/\+(\d{1,4})\b/);
  return m ? `+${m[1]}` : value.trim() || (label ?? "").trim();
}

function labelForOption(
  v: string,
  rows: { value: string; label: string }[],
) {
  if (!v) {
    const empty = rows.find((x) => x.value === "");
    return empty ? empty.label : "";
  }
  const o = rows.find((x) => x.value === v);
  return o ? (o.label || o.value) : v;
}

/** Input display: optionally keep blank when value is "" while list still uses `emptySelectLabel`. */
function displayLabelForInput(
  v: string,
  rows: { value: string; label: string }[],
  blankWhenEmpty: boolean,
) {
  if (!v && blankWhenEmpty) return "";
  return labelForOption(v, rows);
}

export function AppDropdownCombobox({
  optionKey,
  name,
  label,
  dialogTitle,
  addPlaceholder,
  manageAriaLabel,
  value,
  onChange,
  options,
  selectedValue,
  onClearSelection,
  selectOptions: selectOptionsProp,
  emptySelectLabel = "—",
  overlayZIndexClass = "z-[112]",
  listZIndexClass = "z-[105]",
  /** Render the typeahead list in a portal so it is not clipped by overflow containers. */
  portalList = true,
  includeEmptyOption = true,
  searchPlaceholder = "",
  hideLabel = false,
  inputRowShellClassName = inputRowShell,
  /** When set, the + button runs this instead of opening the manage-labels dialog. */
  onSuffixButtonClick,
  suffixButtonClassName,
  blankInputWhenNoSelection = true,
  /** When true, typed text is saved as the value on blur if not picked from the list. */
  commitOnBlur = false,
  onOptionAdded,
  onOptionDeleted,
  onOptionUpdated,
}: {
  optionKey: string;
  name: string;
  label: string;
  dialogTitle: string;
  addPlaceholder: string;
  manageAriaLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: AppDropdownOptionRow[];
  selectedValue: string;
  onClearSelection: () => void;
  /** If omitted, built from `options` (+ empty row when `includeEmptyOption`). */
  selectOptions?: { value: string; label: string; filterText?: string | null }[];
  emptySelectLabel?: string;
  overlayZIndexClass?: string;
  listZIndexClass?: string;
  portalList?: boolean;
  includeEmptyOption?: boolean;
  searchPlaceholder?: string;
  /** When true, no visible label; combobox uses `label` as `aria-label`. */
  hideLabel?: boolean;
  /** Override the inner row shell (e.g. embed beside another input). */
  inputRowShellClassName?: string;
  onSuffixButtonClick?: () => void;
  suffixButtonClassName?: string;
  blankInputWhenNoSelection?: boolean;
  commitOnBlur?: boolean;
  onOptionAdded?: () => void;
  onOptionDeleted?: () => void;
  onOptionUpdated?: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const listboxId = useId();
  const inputId = `${name}_input`;
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPhoneCountryCode =
    optionKey === DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE;

  const mergedOptions = useMemo(() => {
    const base = [...options];
    const has = base.some((o) => o.value === value);
    if (value && !has) {
      base.push({
        id: `__orphan__${name}`,
        value,
        label: value,
        canDelete: false,
      });
    }
    return base;
  }, [options, value, name]);

  const selectOptions = useMemo(() => {
    if (selectOptionsProp) return selectOptionsProp;
    const rows = mergedOptions.map((o) => ({
      value: o.value,
      label: isPhoneCountryCode
        ? dialCodeDisplay(o.value, o.label)
        : (o.label ?? o.value),
      filterText: o.filterText ?? `${o.label ?? ""} ${o.value}`,
    }));
    if (!includeEmptyOption) return rows;
    return [{ value: "", label: emptySelectLabel }, ...rows];
  }, [
    selectOptionsProp,
    mergedOptions,
    emptySelectLabel,
    includeEmptyOption,
    isPhoneCountryCode,
  ]);

  const selectOptionsRef = useRef(selectOptions);
  const valueRef = useRef(value);
  const queryRef = useRef("");
  useEffect(() => {
    selectOptionsRef.current = selectOptions;
    valueRef.current = value;
  }, [selectOptions, value]);

  const closedLabel = displayLabelForInput(
    value,
    selectOptions,
    blankInputWhenNoSelection,
  );
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const [query, setQuery] = useState(closedLabel);
  queryRef.current = query;
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [listPosition, setListPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const inputValue = listOpen ? query : closedLabel;

  const typeRows = useMemo(
    () => selectOptions.filter((o) => o.value !== ""),
    [selectOptions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fromData = !q
      ? typeRows
      : typeRows.filter((o) => {
          const hay = `${o.label ?? ""} ${o.filterText ?? ""} ${o.value}`
            .toLowerCase();
          return hay.includes(q);
        });

    if (!includeEmptyOption) return fromData;

    const clearLabel = emptySelectLabel.toLowerCase();
    if (!q || clearLabel.includes(q)) {
      return [{ value: "", label: emptySelectLabel }, ...fromData];
    }
    return fromData;
  }, [query, typeRows, includeEmptyOption, emptySelectLabel]);

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

  useEffect(() => {
    if (!listOpen || !portalList) return;
    updateListPosition();
    window.addEventListener("resize", updateListPosition);
    window.addEventListener("scroll", updateListPosition, true);
    return () => {
      window.removeEventListener("resize", updateListPosition);
      window.removeEventListener("scroll", updateListPosition, true);
    };
  }, [listOpen, portalList, updateListPosition, filtered.length]);

  const pick = useCallback(
    (row: { value: string; label: string }) => {
      clearBlurTimer();
      valueRef.current = row.value;
      onChange(row.value);
      setQuery(
        displayLabelForInput(
          row.value,
          selectOptionsRef.current,
          blankInputWhenNoSelection,
        ),
      );
      setListOpen(false);
      inputRef.current?.blur();
    },
    [onChange, blankInputWhenNoSelection],
  );

  function clearBlurTimer() {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }

  function handleInputFocus() {
    clearBlurTimer();
    setQuery(closedLabel);
    setHighlight(0);
    setListOpen(true);
    if (portalList) updateListPosition();
  }

  function resolveCommittedValue(rawQuery: string): string {
    const q = rawQuery.trim();
    if (!q) return valueRef.current;
    const opts = selectOptionsRef.current;
    const byValue = opts.find((o) => o.value === q);
    if (byValue) return byValue.value;
    const byLabel = opts.find(
      (o) => (o.label || o.value).trim().toLowerCase() === q.toLowerCase(),
    );
    if (byLabel) return byLabel.value;
    return q;
  }

  function commitQueryOnBlur(): string {
    if (!commitOnBlur) return valueRef.current;
    const q = queryRef.current.trim();
    if (!q) return valueRef.current;
    const display = displayLabelForInput(
      valueRef.current,
      selectOptionsRef.current,
      blankInputWhenNoSelection,
    );
    if (q === display.trim()) return valueRef.current;
    const next = resolveCommittedValue(q);
    if (next !== valueRef.current) {
      onChange(next);
      valueRef.current = next;
    }
    return next;
  }

  function handleInputBlur() {
    const committed = commitQueryOnBlur();
    blurTimer.current = setTimeout(() => {
      setListOpen(false);
      setQuery(
        displayLabelForInput(
          committed,
          selectOptionsRef.current,
          blankInputWhenNoSelection,
        ),
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
          displayLabelForInput(
            valueRef.current,
            selectOptionsRef.current,
            blankInputWhenNoSelection,
          ),
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
      const r = await addAppDropdownOption(optionKey, draft);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      setDraft("");
      if (onOptionAdded) {
        onOptionAdded();
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, v: string, canDelete: boolean) {
    if (!canDelete) return;
    setBusy(true);
    try {
      const r = await deleteAppDropdownOption(optionKey, id, v);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      if (selectedValue === v) onClearSelection();
      if (editingId === id) {
        setEditingId(null);
        setEditDraft("");
      }
      if (onOptionDeleted) {
        onOptionDeleted();
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(id: string, oldValue: string) {
    setBusy(true);
    try {
      const r = await updateAppDropdownOption(
        optionKey,
        id,
        oldValue,
        editDraft,
      );
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      const next = editDraft.trim();
      if (selectedValue === oldValue && next) onChange(next);
      setEditingId(null);
      setEditDraft("");
      if (onOptionUpdated) {
        onOptionUpdated();
      } else if (onOptionDeleted) {
        onOptionDeleted();
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={hideLabel ? undefined : "space-y-1"}>
      {hideLabel ? null : (
        <label htmlFor={inputId} className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>
          {label}
        </label>
      )}
      <input type="hidden" name={name} value={value} />
      <div ref={anchorRef} className={fieldWrap}>
        <div className={inputRowShellClassName}>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            autoComplete="off"
            aria-label={hideLabel ? label : undefined}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={listOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              listOpen && filtered[highlight]
                ? `${listboxId}-opt-${highlight}`
                : undefined
            }
            value={inputValue}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
              setListOpen(true);
              if (portalList) updateListPosition();
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={searchPlaceholder || undefined}
            className={inputInner}
          />
          <button
            type="button"
            className={suffixButtonClassName ? `${suffixBtn} ${suffixButtonClassName}` : suffixBtn}
            aria-label={manageAriaLabel}
            aria-expanded={onSuffixButtonClick ? undefined : open}
            aria-haspopup={onSuffixButtonClick ? undefined : "dialog"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (onSuffixButtonClick) {
                onSuffixButtonClick();
                return;
              }
              setOpen(true);
            }}
          >
            +
          </button>
        </div>
        {listOpen && filtered.length > 0 && !portalList ? (
          <ul
            id={listboxId}
            role="listbox"
            className={`absolute left-0 right-0 top-full mt-0.5 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 ${listZIndexClass}`}
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
                {o.label || o.value || emptySelectLabel}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {isClient && listOpen && filtered.length > 0 && portalList && listPosition
        ? createPortal(
            <ul
              id={listboxId}
              role="listbox"
              style={{
                position: "fixed",
                top: listPosition.top,
                left: listPosition.left,
                width: listPosition.width,
              }}
              className={`max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900 ${listZIndexClass}`}
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
                  {o.label || o.value || emptySelectLabel}
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
      {isClient && open
        ? createPortal(
            <div
              className={`fixed inset-0 ${overlayZIndexClass} flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55`}
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
                    className="text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-200"
                  >
                    {dialogTitle}
                  </h2>
                  <DialogCloseXButton onClick={() => setOpen(false)} />
                </div>
                <div className="space-y-4 px-4 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={addPlaceholder}
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
                  <ul className="divide-y divide-zinc-200 overflow-hidden rounded-none border border-zinc-200 bg-white dark:divide-zinc-700 dark:border-zinc-600 dark:bg-zinc-950/60">
                    {mergedOptions.map((o) => {
                      const canManage = o.canDelete !== false;
                      const isEditing = editingId === o.id;
                      return (
                        <li
                          key={o.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100"
                        >
                          {isEditing ? (
                            <>
                              <input
                                value={editDraft}
                                onChange={(e) => setEditDraft(e.target.value)}
                                className="min-w-0 flex-1 rounded-none border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-sky-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                                disabled={busy}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void handleSaveEdit(o.id, o.value);
                                  }
                                  if (e.key === "Escape") {
                                    setEditingId(null);
                                    setEditDraft("");
                                  }
                                }}
                              />
                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  disabled={busy || !editDraft.trim()}
                                  className="text-xs font-medium text-sky-600 hover:underline disabled:opacity-40 dark:text-sky-400"
                                  onClick={() =>
                                    void handleSaveEdit(o.id, o.value)
                                  }
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="text-xs font-medium text-zinc-500 hover:underline disabled:opacity-40"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditDraft("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="min-w-0 truncate">
                                {isPhoneCountryCode
                                  ? dialCodeDisplay(o.value, o.label)
                                  : (o.label ?? o.value)}
                              </span>
                              {String(o.id).startsWith("__orphan__") ? (
                                <span
                                  className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
                                  title="Value from a client record; add it here to manage in the list."
                                >
                                  in use
                                </span>
                              ) : canManage ? (
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    title={`Edit “${o.value}”`}
                                    aria-label={`Edit “${o.value}”`}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-base leading-none hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                                    onClick={() => {
                                      setEditingId(o.id);
                                      setEditDraft(
                                        isPhoneCountryCode
                                          ? dialCodeDisplay(o.value, o.label)
                                          : o.value,
                                      );
                                    }}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    title={`Delete “${o.value}”`}
                                    aria-label={`Delete “${o.value}”`}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-base leading-none hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                                    onClick={() =>
                                      void handleDelete(o.id, o.value, true)
                                    }
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
                                  title="Built-in option (save to database to manage)"
                                >
                                  —
                                </span>
                              )}
                            </>
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
