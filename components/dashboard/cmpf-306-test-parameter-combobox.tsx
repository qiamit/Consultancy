"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FtrTestParameterSeed } from "@/lib/factory-test-report";
import { openNewTestParameterForIsCode } from "@/lib/test-parameter-form-draft";

function parameterDisplayName(param: FtrTestParameterSeed): string {
  return param.test_name;
}

function parameterListLabel(param: FtrTestParameterSeed): string {
  return param.clause_no ? `${param.test_name} · Cl ${param.clause_no}` : param.test_name;
}

function parameterFilterText(param: FtrTestParameterSeed): string {
  return [param.test_name, param.clause_no, param.test_method, param.unit]
    .filter(Boolean)
    .join(" ");
}

const LIST_MAX_HEIGHT = 192;

const inputRowShellClass =
  "flex min-h-[37px] flex-wrap items-center gap-1 overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 px-1.5 py-1 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500/40";

const inputInnerClass =
  "min-w-[120px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-zinc-100 outline-none ring-0 focus:ring-0";

const suffixBtnClass =
  "inline-flex shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm font-medium leading-none text-zinc-100 hover:bg-zinc-800 disabled:opacity-50";

const chipClass =
  "inline-flex max-w-full items-center gap-1 rounded-md border border-sky-700/40 bg-sky-950/50 px-2 py-0.5 text-xs text-sky-100";

export function Cmpf306TestParameterCombobox({
  inputId: inputIdProp,
  parameters,
  selectedParameterIds,
  disabled,
  isCodeId,
  placeholder = "Type to search test parameters…",
  onToggleParameter,
  onRemoveParameter,
}: {
  inputId?: string;
  parameters: FtrTestParameterSeed[];
  selectedParameterIds: string[];
  disabled?: boolean;
  isCodeId: string | null;
  placeholder?: string;
  onToggleParameter: (param: FtrTestParameterSeed) => void;
  onRemoveParameter: (parameterId: string) => void;
}) {
  const generatedInputId = useId();
  const inputId = inputIdProp ?? generatedInputId;
  const listboxId = `${inputId}-listbox`;
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [listPosition, setListPosition] = useState<{
    left: number;
    width: number;
    bottom: number;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const selectedSet = useMemo(
    () => new Set(selectedParameterIds),
    [selectedParameterIds],
  );

  const selectedParams = useMemo(
    () =>
      selectedParameterIds
        .map((id) => parameters.find((param) => param.id === id))
        .filter((param): param is FtrTestParameterSeed => param !== undefined),
    [parameters, selectedParameterIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parameters.slice(0, 80);
    return parameters
      .filter((param) => parameterFilterText(param).toLowerCase().includes(q))
      .slice(0, 80);
  }, [parameters, query]);

  const safeHighlight =
    filtered.length === 0 ? 0 : Math.min(highlight, filtered.length - 1);

  const updateListPosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setListPosition({
      left: rect.left,
      width: rect.width,
      bottom: window.innerHeight - rect.top + 4,
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
  }, [listOpen, updateListPosition, filtered.length, selectedParameterIds.length]);

  function toggle(param: FtrTestParameterSeed) {
    onToggleParameter(param);
    setQuery("");
    setHighlight(0);
    inputRef.current?.focus();
  }

  function handleAddNewTestParameter() {
    if (!isCodeId) {
      window.open("/dashboard/test-parameters?new=1", "_blank", "noopener,noreferrer");
      return;
    }
    openNewTestParameterForIsCode(isCodeId);
  }

  const listContent =
    listOpen && !disabled && filtered.length > 0 && listPosition ? (
      <ul
        id={listboxId}
        role="listbox"
        aria-multiselectable="true"
        className="fixed z-[500] max-h-48 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-lg"
        style={{
          left: listPosition.left,
          width: listPosition.width,
          bottom: listPosition.bottom,
          maxHeight: LIST_MAX_HEIGHT,
        }}
        onMouseDown={(event) => event.preventDefault()}
      >
        {filtered.map((param, index) => {
          const isSelected = selectedSet.has(param.id ?? "");
          return (
            <li
              key={param.id}
              id={`${listboxId}-opt-${index}`}
              role="option"
              aria-selected={isSelected}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                index === safeHighlight
                  ? "bg-sky-900/40 text-zinc-100"
                  : "text-zinc-200 hover:bg-zinc-800"
              }`}
              onMouseEnter={() => setHighlight(index)}
              onMouseDown={() => toggle(param)}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                  isSelected
                    ? "border-sky-500 bg-sky-600 text-white"
                    : "border-zinc-600 bg-zinc-950 text-transparent"
                }`}
                aria-hidden="true"
              >
                ✓
              </span>
              <span className="min-w-0">
                {parameterListLabel(param)}
                {param.test_method ? (
                  <span className="ml-1 text-xs text-zinc-500">· {param.test_method}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <div ref={anchorRef} className="relative w-full">
      <div className={inputRowShellClass}>
        {selectedParams.map((param) => (
          <span key={param.id} className={chipClass}>
            <span className="truncate">{parameterDisplayName(param)}</span>
            <button
              type="button"
              className="shrink-0 text-sky-300/80 hover:text-white"
              aria-label={`Remove ${parameterDisplayName(param)}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onRemoveParameter(param.id ?? "")}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          autoComplete="off"
          disabled={disabled}
          role="combobox"
          aria-expanded={listOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            listOpen && filtered[safeHighlight]
              ? `${listboxId}-opt-${safeHighlight}`
              : undefined
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlight(0);
            setListOpen(true);
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
            if (
              event.key === "Backspace" &&
              query.length === 0 &&
              selectedParameterIds.length > 0
            ) {
              event.preventDefault();
              onRemoveParameter(selectedParameterIds[selectedParameterIds.length - 1]!);
              return;
            }
            if (!listOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
              setListOpen(true);
              updateListPosition();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((value) => Math.min(filtered.length - 1, value + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((value) => Math.max(0, value - 1));
            } else if (event.key === "Enter" && listOpen && filtered[safeHighlight]) {
              event.preventDefault();
              toggle(filtered[safeHighlight]!);
            } else if (event.key === "Escape") {
              setListOpen(false);
            }
          }}
          placeholder={
            disabled
              ? "Loading test parameters…"
              : selectedParams.length > 0
                ? "Add more…"
                : placeholder
          }
          className={inputInnerClass}
        />
        <button
          type="button"
          className={suffixBtnClass}
          aria-label="Add new test parameter"
          title="Add new test parameter"
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleAddNewTestParameter}
        >
          ➕
        </button>
      </div>
      {selectedParams.length > 0 ? (
        <p className="mt-1 text-[11px] text-zinc-500">
          {selectedParams.length} test parameter{selectedParams.length === 1 ? "" : "s"} selected
        </p>
      ) : null}
      {isClient && listContent ? createPortal(listContent, document.body) : null}
    </div>
  );
}
