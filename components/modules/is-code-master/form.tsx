"use client";

import { useState, type ReactNode } from "react";
import {
  deleteIsCodeFile,
  executeSaveIsCodeMaster,
  saveIsCodeMaster,
  signIsCodeFileDownload,
} from "@/lib/actions/is-codes";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";
import {
  DROPDOWN_KEY_IS_CODE_ASPECT,
  DROPDOWN_KEY_IS_CODE_UNIT,
} from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import type { IsCodeFileRow } from "@/lib/types/is-code-master";
import { bisStandardsWebsiteSearchUrl } from "@/lib/bis-standards-portal";
import {
  DEFAULT_ASPECT_OF_IS,
  DEFAULT_MONEY_FIELD,
  DEFAULT_SLAB_1_QTY,
  DEFAULT_SLAB_2_QTY,
  DEFAULT_SLAB_3_QTY,
  DEFAULT_UNIT,
  IS_FIELD_LABEL_CLASS,
} from "./constants";

export function IsCodeMasterForm({
  visible,
  overlay,
  formValues,
  isNewParam,
  idParam,
  existingFiles,
  onClose,
  onAddNew,
  onUpdateField,
  aspectOptions,
  unitOptions,
  embeddedInBis,
  onEmbeddedSaveSuccess,
}: {
  visible: boolean;
  overlay?: boolean;
  formValues: Record<string, string>;
  isNewParam: boolean;
  idParam: string | null;
  existingFiles: IsCodeFileRow[];
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (key: string, value: string) => void;
  aspectOptions: AppDropdownOptionRow[];
  unitOptions: AppDropdownOptionRow[];
  embeddedInBis?: boolean;
  onEmbeddedSaveSuccess?: (isCodeId: string) => void;
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!visible) return null;

  const rootClass = overlay
    ? "px-4 py-5"
    : "border-t border-zinc-200 bg-zinc-50/50 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/50";

  async function handleDownload(fileId: string) {
    setDownloadingId(fileId);
    try {
      const r = await signIsCodeFileDownload(fileId);
      if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
      else window.alert(r.error);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className={rootClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="is-code-master-form-title"
          className="inline-flex items-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
        >
          {isNewParam ? "New IS Code" : idParam ? "Edit IS Code" : "IS Code"}
        </h2>
        <DialogCloseXButton onClick={onClose} />
      </div>

      <form
        id="is-code-master-save-form"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        {...(embeddedInBis
          ? {
              onSubmit: async (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const r = await executeSaveIsCodeMaster(fd);
                if (r.ok) onEmbeddedSaveSuccess?.(r.id);
                else window.alert(r.error);
              },
            }
          : { action: saveIsCodeMaster })}
      >
        <input type="hidden" name="id" value={formValues.id} />

        <CurrencyHiddenFields formValues={formValues} />

        <div className="sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div className="min-w-0">
              <Field
                label="IS Number"
                name="is_number"
                required
                value={formValues.is_number}
                onChange={(v) => onUpdateField("is_number", v)}
                title="Indian Standard designation as you store it (e.g. IS 1786). The search icon opens BIS Know Your Standards in a new tab; if this field is not empty, your text is sent as the searchTerm query parameter."
                suffix={
                  <a
                    href={bisStandardsWebsiteSearchUrl(formValues.is_number)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${fieldSuffixActionClass} min-w-9`}
                    title="Open BIS Know Your Standards (new tab). Non-empty IS number is sent as the searchTerm query parameter."
                    aria-label="Open BIS Know Your Standards in a new tab; uses this IS number as searchTerm when the field is not empty."
                  >
                    <span className="sr-only">Search on BIS Know Your Standards</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 shrink-0"
                      aria-hidden
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.2-3.2" />
                    </svg>
                  </a>
                }
              />
            </div>
            <div className="min-w-0">
              <Field
                label="Revision Year"
                name="revision_year"
                required
                value={formValues.revision_year}
                onChange={(v) =>
                  onUpdateField("revision_year", v.replace(/\D/g, "").slice(0, 4))
                }
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]{4}"
                title="Four-digit calendar year, e.g. 2020"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="reaffirmation_year" className={IS_FIELD_LABEL_CLASS}>
                Reaffirmation Year
              </label>
              <div className="flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950">
                <span className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
                  RA
                </span>
                <input
                  id="reaffirmation_year"
                  name="reaffirmation_year"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{0,4}"
                  placeholder="Year"
                  title="Optional four-digit reaffirmation year"
                  value={formValues.reaffirmation_year}
                  onChange={(e) =>
                    onUpdateField(
                      "reaffirmation_year",
                      e.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="min-w-0">
              <Field
                label="Amendment Number"
                name="amendment_number"
                value={formValues.amendment_number}
                onChange={(v) => onUpdateField("amendment_number", v)}
              />
            </div>
            <div className="min-w-0">
              <ClientDropdownField
                optionKey={DROPDOWN_KEY_IS_CODE_ASPECT}
                name="aspect_of_is"
                label="Aspect of IS"
                dialogTitle="Aspect of IS"
                addPlaceholder="New aspect"
                manageAriaLabel="Add or remove aspect options"
                value={formValues.aspect_of_is}
                onChange={(v) => onUpdateField("aspect_of_is", v)}
                options={aspectOptions}
                selectedValue={formValues.aspect_of_is}
                onClearSelection={() =>
                  onUpdateField("aspect_of_is", DEFAULT_ASPECT_OF_IS)
                }
                includeEmptyOption={false}
                overlayZIndexClass="z-[118]"
              />
            </div>
            <div className="min-w-0">
              <ClientDropdownField
                optionKey={DROPDOWN_KEY_IS_CODE_UNIT}
                name="unit_of_is"
                label="Unit of IS"
                dialogTitle="Units of IS"
                addPlaceholder="New unit"
                manageAriaLabel="Add or remove units"
                value={formValues.unit_of_is}
                onChange={(v) => onUpdateField("unit_of_is", v)}
                options={unitOptions}
                selectedValue={formValues.unit_of_is}
                onClearSelection={() =>
                  onUpdateField("unit_of_is", DEFAULT_UNIT)
                }
                includeEmptyOption={false}
                overlayZIndexClass="z-[119]"
              />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div className="min-w-0 sm:col-span-1">
              <Field
                label="Product Manual Number"
                name="product_manual_number"
                value={formValues.product_manual_number}
                onChange={(v) => onUpdateField("product_manual_number", v)}
              />
            </div>
            <div className="min-w-0 sm:col-span-4">
              <Field
                label="IS Code Title"
                name="is_code_title"
                required
                value={formValues.is_code_title}
                onChange={(v) => onUpdateField("is_code_title", v)}
              />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="min-w-0">
              <CurrencyField
                label="Testing Charges"
                name="testing_charges"
                value={formValues.testing_charges}
                onChange={(v) => onUpdateField("testing_charges", v)}
              />
            </div>
            <div className="min-w-0">
              <CurrencyField
                label="MMF for Large Scale"
                name="mmf_large_scale"
                value={formValues.mmf_large_scale}
                onChange={(v) => onUpdateField("mmf_large_scale", v)}
              />
            </div>
            <div className="min-w-0">
              <CurrencyField
                label="MMF for Medium Scale"
                name="mmf_medium_scale"
                value={formValues.mmf_medium_scale}
                onChange={(v) => onUpdateField("mmf_medium_scale", v)}
              />
            </div>
            <div className="min-w-0">
              <CurrencyField
                label="MMF for Small Scale"
                name="mmf_small_scale"
                value={formValues.mmf_small_scale}
                onChange={(v) => onUpdateField("mmf_small_scale", v)}
              />
            </div>
            <div className="min-w-0">
              <CurrencyField
                label="MMF for Micro Scale"
                name="mmf_micro_scale"
                value={formValues.mmf_micro_scale}
                onChange={(v) => onUpdateField("mmf_micro_scale", v)}
              />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-4 border-t border-zinc-200 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Quantity slabs
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="min-w-0">
              <Field
                label="Slab 1 Quantity"
                name="slab_1_quantity"
                value={formValues.slab_1_quantity}
                onChange={(v) => onUpdateField("slab_1_quantity", v)}
              />
            </div>
            <div className="min-w-0">
              <CurrencyField
                label="Slab 1 Rate"
                name="slab_1_rate"
                value={formValues.slab_1_rate}
                onChange={(v) => onUpdateField("slab_1_rate", v)}
              />
            </div>
            <div className="min-w-0">
              <Field
                label="Slab 2 Quantity"
                name="slab_2_quantity"
                value={formValues.slab_2_quantity}
                onChange={(v) => onUpdateField("slab_2_quantity", v)}
              />
            </div>
            <div className="min-w-0">
              <CurrencyField
                label="Slab 2 Rate"
                name="slab_2_rate"
                value={formValues.slab_2_rate}
                onChange={(v) => onUpdateField("slab_2_rate", v)}
              />
            </div>
            <div className="min-w-0">
              <Field
                label="Slab 3 Quantity"
                name="slab_3_quantity"
                value={formValues.slab_3_quantity}
                onChange={(v) => onUpdateField("slab_3_quantity", v)}
              />
            </div>
            <div className="min-w-0">
              <CurrencyField
                label="Slab 3 Rate"
                name="slab_3_rate"
                value={formValues.slab_3_rate}
                onChange={(v) => onUpdateField("slab_3_rate", v)}
              />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/70 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/35">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/90 bg-white/70 px-4 py-3 dark:border-zinc-700/90 dark:bg-zinc-950/50">
              <label
                className={`${IS_FIELD_LABEL_CLASS} m-0`}
                htmlFor="is_code_files"
              >
                IS Code Related Files
              </label>
              {existingFiles.length > 0 ? (
                <span className="rounded-full bg-zinc-200/90 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {existingFiles.length} saved
                </span>
              ) : null}
            </div>
            <div className="space-y-4 p-4">
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-5 dark:border-zinc-600 dark:bg-zinc-950/60">
                <input
                  key={`files-${idParam ?? "new"}-${isNewParam ? "1" : "0"}`}
                  id="is_code_files"
                  name="is_code_files"
                  type="file"
                  multiple
                  className="block w-full cursor-pointer text-sm leading-relaxed text-zinc-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:shadow-sm hover:file:bg-sky-500 dark:text-zinc-400 dark:file:bg-sky-600 dark:hover:file:bg-sky-500"
                />
              </div>
              {existingFiles.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    On this record
                  </p>
                  <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white text-sm dark:divide-zinc-700 dark:border-zinc-700 dark:bg-zinc-950">
                    {existingFiles.map((f) => (
                      <li
                        key={f.id}
                        className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                      >
                        <span
                          className="flex min-w-0 flex-1 items-center gap-2.5"
                          title={f.file_name ?? f.storage_path}
                        >
                          <FileGlyph className="shrink-0 text-zinc-400 dark:text-zinc-500" />
                          <span className="min-w-0 truncate font-medium text-zinc-800 dark:text-zinc-200">
                            {f.file_name ?? f.storage_path}
                          </span>
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50 hover:underline disabled:opacity-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
                            disabled={downloadingId === f.id}
                            onClick={() => void handleDownload(f.id)}
                          >
                            {downloadingId === f.id ? "…" : "Download"}
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 hover:underline dark:text-red-400 dark:hover:bg-red-950/30"
                            onClick={() => void deleteIsCodeFile(f.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
          >
            {idParam && !isNewParam ? "Update IS Code" : "Save IS Code"}
          </button>
          {idParam && !isNewParam ? (
            <button
              type="button"
              onClick={onAddNew}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Clear / New
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/** en-IN grouping; always 2 fraction digits (e.g. `0.00`). No extra ₹ inside the value (prefix shows ₹). */
const moneyInrDisplayFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrencyDisplay(raw: string): string {
  const t = raw.trim();
  const n = Number(t === "" ? "0" : t);
  if (!Number.isFinite(n)) return moneyInrDisplayFormatter.format(0);
  return moneyInrDisplayFormatter.format(Math.round(n * 100) / 100);
}

function sanitizeCurrency(raw: string): string {
  let s = raw.replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
    const [a, b = ""] = s.split(".");
    s = a + "." + b.slice(0, 2);
  }
  if (s === "") return "";
  if (s === ".") return "0.";
  if (s.startsWith(".")) s = "0" + s;
  return s;
}

function currencySubmitValue(raw: string): string {
  const t = raw.trim();
  if (t === "" || t === ".") return "0";
  const n = Number(t);
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n * 100) / 100);
}

const fieldInputRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const fieldInputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

const fieldSuffixActionClass =
  "inline-flex shrink-0 items-center justify-center border-l border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-medium leading-none text-zinc-800 no-underline hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800";

function FileGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

const MONEY_KEYS = [
  "testing_charges",
  "mmf_large_scale",
  "mmf_medium_scale",
  "mmf_small_scale",
  "mmf_micro_scale",
  "slab_1_rate",
  "slab_2_rate",
  "slab_3_rate",
] as const;

function CurrencyHiddenFields({
  formValues,
}: {
  formValues: Record<string, string>;
}) {
  return (
    <>
      {MONEY_KEYS.map((k) => (
        <input
          key={k}
          type="hidden"
          name={k}
          readOnly
          value={currencySubmitValue(formValues[k] ?? DEFAULT_MONEY_FIELD)}
        />
      ))}
    </>
  );
}

function CurrencyField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  function normalizeMoneyInput(raw: string): string {
    const t = raw.trim();
    const n = Number(t === "" || t === "." ? "0" : t);
    if (!Number.isFinite(n)) return DEFAULT_MONEY_FIELD;
    return (Math.round(n * 100) / 100).toFixed(2);
  }
  return (
    <div className="space-y-1">
      <label htmlFor={`${name}_display`} className={IS_FIELD_LABEL_CLASS}>
        {label}
      </label>
      <div className={fieldInputRowShellClass}>
        <span
          className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-medium tabular-nums text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300"
          aria-hidden
        >
          ₹
        </span>
        <input
          id={`${name}_display`}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={focused ? value : formatCurrencyDisplay(value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const next = normalizeMoneyInput(value);
            if (next !== value) onChange(next);
          }}
          onChange={(e) => onChange(sanitizeCurrency(e.target.value))}
          className={`${fieldInputInnerClass} tabular-nums pr-3`}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  value,
  onChange,
  maxLength,
  title,
  pattern,
  inputMode,
  sanitize,
  suffix,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  title?: string;
  pattern?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  sanitize?: (raw: string) => string;
  suffix?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className={IS_FIELD_LABEL_CLASS}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {suffix ? (
        <div className={fieldInputRowShellClass}>
          <input
            id={name}
            name={name}
            type={type}
            required={required}
            maxLength={maxLength}
            title={title}
            pattern={pattern}
            inputMode={inputMode}
            value={value}
            onChange={(e) =>
              onChange(sanitize ? sanitize(e.target.value) : e.target.value)
            }
            className={fieldInputInnerClass}
          />
          {suffix}
        </div>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          title={title}
          pattern={pattern}
          inputMode={inputMode}
          value={value}
          onChange={(e) =>
            onChange(sanitize ? sanitize(e.target.value) : e.target.value)
          }
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      )}
    </div>
  );
}
