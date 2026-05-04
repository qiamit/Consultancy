"use client";

import { useState } from "react";
import { saveProductMaster } from "@/lib/actions/products-master";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";
import {
  DROPDOWN_KEY_PRODUCT_GST_RATE,
  DROPDOWN_KEY_PRODUCT_UNIT,
} from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import {
  DEFAULT_GST_RATE,
  DEFAULT_MONEY_FIELD,
  DEFAULT_UNIT,
  PRODUCT_FIELD_LABEL_CLASS,
} from "./constants";

const HSN_LOOKUP_URL =
  "https://services.gst.gov.in/services/searchhsnsac";

function itemPrefix(category: string): "P" | "S" {
  return category === "service" ? "S" : "P";
}

export function ProductMasterForm({
  visible,
  overlay,
  formValues,
  isNewParam,
  idParam,
  onClose,
  onAddNew,
  onUpdateField,
  unitOptions,
  gstRateOptions,
}: {
  visible: boolean;
  overlay?: boolean;
  formValues: Record<string, string>;
  isNewParam: boolean;
  idParam: string | null;
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (key: string, value: string) => void;
  unitOptions: AppDropdownOptionRow[];
  gstRateOptions: AppDropdownOptionRow[];
}) {
  if (!visible) return null;

  const rootClass = overlay
    ? "px-4 py-5"
    : "border-t border-zinc-200 bg-zinc-50/50 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/50";

  const isProduct = formValues.category !== "service";

  function setCategory(next: string) {
    onUpdateField("category", next);
    if (next === "service") {
      onUpdateField("purchase_price", DEFAULT_MONEY_FIELD);
      onUpdateField("opening_stock", "");
      onUpdateField("low_stock_value", "");
    }
  }

  return (
    <div className={rootClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="product-master-form-title"
          className="inline-flex items-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
        >
          {isNewParam ? "New Item" : idParam ? "Edit Item" : "Item"}
        </h2>
        <DialogCloseXButton onClick={onClose} />
      </div>

      <form
        id="product-master-save-form"
        action={saveProductMaster}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input type="hidden" name="id" value={formValues.id} />

        <CurrencyHiddenFields formValues={formValues} isProduct={isProduct} />

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:items-start">
            <div className={formRowCellClass}>
              <div className={formRowLabelSlotClass}>
                <label
                  htmlFor="product_category_toggle"
                  className={`block ${PRODUCT_FIELD_LABEL_CLASS}`}
                >
                  Category of Item
                </label>
              </div>
              <div className={formRowControlClass}>
                <input
                  type="hidden"
                  name="category"
                  readOnly
                  value={
                    formValues.category === "service" ? "service" : "product"
                  }
                />
                <button
                  type="button"
                  id="product_category_toggle"
                  onClick={() =>
                    setCategory(
                      formValues.category === "service" ? "product" : "service",
                    )
                  }
                  className="w-full rounded-lg border border-sky-700 bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:border-sky-500 dark:bg-sky-500 dark:hover:bg-sky-400 dark:focus-visible:ring-offset-zinc-900"
                  aria-label={
                    formValues.category === "service"
                      ? "Category Service, click to switch to Product"
                      : "Category Product, click to switch to Service"
                  }
                  title={
                    formValues.category === "service"
                      ? "Service — click to switch to Product"
                      : "Product — click to switch to Service"
                  }
                >
                  {formValues.category === "service" ? "Service" : "Product"}
                </button>
              </div>
            </div>
            <div className={formRowCellClass}>
              <div className={formRowLabelSlotClass}>
                <label
                  htmlFor="item_code_suffix"
                  className={`block ${PRODUCT_FIELD_LABEL_CLASS}`}
                >
                  Item Code
                  <span className="text-red-500"> *</span>
                </label>
              </div>
              <div className={`${formRowControlClass} ${fieldInputRowShellClass}`}>
                <span
                  className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold tabular-nums text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200"
                  aria-hidden
                >
                  {itemPrefix(formValues.category)}
                </span>
                <input
                  id="item_code_suffix"
                  name="item_code_suffix"
                  required
                  maxLength={39}
                  autoComplete="off"
                  title="Next number is filled automatically for new items (per P or S). You may change it: letters, numbers, hyphen."
                  value={formValues.item_code_suffix}
                  onChange={(e) =>
                    onUpdateField(
                      "item_code_suffix",
                      e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, ""),
                    )
                  }
                  className={`${fieldInputInnerClass} font-mono uppercase`}
                  placeholder="e.g. 0001"
                />
              </div>
            </div>
            <div className={formRowCellClass}>
              <Field
                label="Make"
                name="make"
                value={formValues.make}
                onChange={(v) => onUpdateField("make", v)}
                alignToFormGrid
              />
            </div>
            <div className={formRowCellClass}>
              <div className={formRowLabelSlotClass}>
                <label
                  htmlFor="unit_of_item_input"
                  className={`block ${PRODUCT_FIELD_LABEL_CLASS}`}
                >
                  Unit of Item
                </label>
              </div>
              <div className={formRowControlClass}>
                <ClientDropdownField
                  optionKey={DROPDOWN_KEY_PRODUCT_UNIT}
                  name="unit_of_item"
                  label="Unit of Item"
                  hideLabel
                  dialogTitle="Units of item"
                  addPlaceholder="New unit"
                  manageAriaLabel="Add or remove units"
                  value={formValues.unit_of_item}
                  onChange={(v) => onUpdateField("unit_of_item", v)}
                  options={unitOptions}
                  selectedValue={formValues.unit_of_item}
                  onClearSelection={() =>
                    onUpdateField("unit_of_item", DEFAULT_UNIT)
                  }
                  includeEmptyOption={false}
                  overlayZIndexClass="z-[118]"
                />
              </div>
            </div>
            <div className={formRowCellClass}>
              <div className={formRowLabelSlotClass}>
                <label
                  htmlFor="hsn_code"
                  className={`block ${PRODUCT_FIELD_LABEL_CLASS}`}
                >
                  HSN Code
                </label>
              </div>
              <div className={`${formRowControlClass} relative`}>
                <input
                  id="hsn_code"
                  name="hsn_code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{0,8}"
                  maxLength={8}
                  title="Up to 8 digits"
                  value={formValues.hsn_code}
                  onChange={(e) =>
                    onUpdateField(
                      "hsn_code",
                      e.target.value.replace(/\D/g, "").slice(0, 8),
                    )
                  }
                  className="block w-full rounded-lg border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <a
                  href={HSN_LOOKUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open GST HSN search in a new tab"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-zinc-500 outline-none transition-colors hover:bg-zinc-100 hover:text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-sky-400"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </a>
              </div>
            </div>
            <div className={formRowCellClass}>
              <div className={formRowLabelSlotClass}>
                <label
                  htmlFor="gst_rate_input"
                  className={`block ${PRODUCT_FIELD_LABEL_CLASS}`}
                >
                  GST Rate
                </label>
              </div>
              <div className={formRowControlClass}>
                <ClientDropdownField
                  optionKey={DROPDOWN_KEY_PRODUCT_GST_RATE}
                  name="gst_rate"
                  label="GST Rate"
                  hideLabel
                  dialogTitle="GST rates"
                  addPlaceholder="e.g. 28%"
                  manageAriaLabel="Add or remove GST rates"
                  value={formValues.gst_rate}
                  onChange={(v) => onUpdateField("gst_rate", v)}
                  options={gstRateOptions}
                  selectedValue={formValues.gst_rate}
                  onClearSelection={() =>
                    onUpdateField("gst_rate", DEFAULT_GST_RATE)
                  }
                  includeEmptyOption={false}
                  overlayZIndexClass="z-[119]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <Field
            label="Name of the Item"
            name="name"
            required
            value={formValues.name}
            onChange={(v) => onUpdateField("name", v)}
          />
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <label htmlFor="description" className={PRODUCT_FIELD_LABEL_CLASS}>
            Description of the Item
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formValues.description}
            onChange={(e) => onUpdateField("description", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

        <div
          className={`min-w-0 grid grid-cols-1 gap-4 sm:col-span-2 lg:col-span-4 ${
            isProduct ? "lg:grid-cols-5" : "lg:grid-cols-2"
          }`}
        >
          <div className="min-w-0">
            <CurrencyField
              label="MRP of Item"
              idPrefix="mrp"
              value={formValues.mrp}
              onChange={(v) => onUpdateField("mrp", v)}
            />
          </div>
          <div className="min-w-0">
            <CurrencyField
              label="Sale Price"
              idPrefix="sale_price"
              value={formValues.sale_price}
              onChange={(v) => onUpdateField("sale_price", v)}
            />
          </div>
          {isProduct ? (
            <>
              <div className="min-w-0">
                <CurrencyField
                  label="Purchase Price"
                  idPrefix="purchase_price"
                  value={formValues.purchase_price}
                  onChange={(v) => onUpdateField("purchase_price", v)}
                />
              </div>
              <div className="min-w-0">
                <Field
                  label="Opening Stock"
                  name="opening_stock"
                  value={formValues.opening_stock}
                  onChange={(v) => onUpdateField("opening_stock", v)}
                />
              </div>
              <div className="min-w-0">
                <Field
                  label="Low Stock Value"
                  name="low_stock_value"
                  value={formValues.low_stock_value}
                  onChange={(v) => onUpdateField("low_stock_value", v)}
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
          >
            Save
          </button>
          {isNewParam || idParam ? (
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

/** First row of product form: same label height + `mt-1` so controls align on one line. */
const formRowLabelSlotClass =
  "min-h-[2.75rem] flex flex-col justify-end text-left";
const formRowCellClass = "flex min-h-0 min-w-0 flex-col";
const formRowControlClass = "mt-1 min-w-0";

const MONEY_KEYS = ["mrp", "sale_price", "purchase_price"] as const;

function CurrencyHiddenFields({
  formValues,
  isProduct,
}: {
  formValues: Record<string, string>;
  isProduct: boolean;
}) {
  return (
    <>
      {MONEY_KEYS.map((k) => {
        const val =
          k === "purchase_price" && !isProduct
            ? "0"
            : currencySubmitValue(formValues[k] ?? DEFAULT_MONEY_FIELD);
        return <input key={k} type="hidden" name={k} readOnly value={val} />;
      })}
      {!isProduct ? (
        <>
          <input type="hidden" name="opening_stock" value="" readOnly />
          <input type="hidden" name="low_stock_value" value="" readOnly />
        </>
      ) : null}
    </>
  );
}

function CurrencyField({
  label,
  idPrefix,
  value,
  onChange,
}: {
  label: string;
  idPrefix: string;
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
      <label htmlFor={`${idPrefix}_ctl`} className={PRODUCT_FIELD_LABEL_CLASS}>
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
          id={`${idPrefix}_ctl`}
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
  alignToFormGrid,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  /** Align with product first row grid (label slot + control). */
  alignToFormGrid?: boolean;
}) {
  const inputClassName =
    "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

  if (alignToFormGrid) {
    return (
      <>
        <div className={formRowLabelSlotClass}>
          <label htmlFor={name} className={`block ${PRODUCT_FIELD_LABEL_CLASS}`}>
            {label}
            {required ? <span className="text-red-500"> *</span> : null}
          </label>
        </div>
        <div className={formRowControlClass}>
          <input
            id={name}
            name={name}
            type={type}
            required={required}
            maxLength={maxLength}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName}
          />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-1">
      <label htmlFor={name} className={PRODUCT_FIELD_LABEL_CLASS}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
    </div>
  );
}
