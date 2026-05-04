"use client";

import { executeSaveClientMaster, saveClientMaster } from "@/lib/actions/clients";
import { normalizeEmailInput } from "@/lib/validation/email";
import { isValidGstinOrEmpty, normalizeGstInput } from "@/lib/validation/gst-india";
import {
  DROPDOWN_KEY_CLIENT_CITY,
  DROPDOWN_KEY_CLIENT_COMPANY_STATUS,
  DROPDOWN_KEY_CLIENT_COUNTRY,
  DROPDOWN_KEY_CLIENT_PAYMENT_TERM,
  DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE,
  DROPDOWN_KEY_CLIENT_PIN_CODE,
  DROPDOWN_KEY_CLIENT_STATE,
} from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import {
  CLIENT_FIELD_LABEL_CLASS,
  COMPANY_TYPES,
  DEFAULT_COMPANY_SCALE,
  DEFAULT_COMPANY_STATUS,
  DEFAULT_COMPANY_TYPE,
  DEFAULT_PAYMENT_TERM,
  DEFAULT_CITY,
  DEFAULT_PIN_CODE,
  DEFAULT_STATE,
  DEFAULT_COUNTRY,
  SCALES,
} from "./constants";
import { ClientDropdownField } from "./client-dropdown-field";
import { CompanyScaleManager } from "./company-scale-manager";
import { CompanyTypeManager } from "./company-type-manager";
import { DialogCloseXButton } from "./dialog-close-x";
import { useState, type ReactNode } from "react";

/** Official pre-login Search Taxpayer (GSTIN/UIN). Query strings are rejected by the portal SPA. */
const GST_TAXPAYER_SEARCH_URL =
  "https://services.gst.gov.in/services/searchtp";

const openingBalanceRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const openingBalanceInputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 tabular-nums dark:bg-transparent dark:text-zinc-100";

const openingBalanceInrDisplayFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatOpeningBalanceCurrencyDisplay(raw: string): string {
  const t = raw.trim();
  const n = Number(t === "" ? "0" : t);
  if (!Number.isFinite(n)) return openingBalanceInrDisplayFormatter.format(0);
  return openingBalanceInrDisplayFormatter.format(Math.round(n * 100) / 100);
}

function sanitizeOpeningBalanceInput(raw: string): string {
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

function normalizeOpeningBalanceSubmit(raw: string): string {
  const t = raw.trim();
  if (t === "" || t === ".") return "0.00";
  const n = Number(t);
  if (!Number.isFinite(n)) return "0.00";
  return (Math.round(n * 100) / 100).toFixed(2);
}

function OpeningBalanceCurrencyField({
  openingBalance,
  balanceType,
  onOpeningBalanceChange,
  onBalanceTypeChange,
}: {
  openingBalance: string;
  balanceType: "Dr" | "Cr";
  onOpeningBalanceChange: (v: string) => void;
  onBalanceTypeChange: (v: "Dr" | "Cr") => void;
}) {
  const [focused, setFocused] = useState(false);

  function toggleBalanceType() {
    onBalanceTypeChange(balanceType === "Dr" ? "Cr" : "Dr");
  }

  const toggleBtnClass =
    "min-w-[2.75rem] shrink-0 border-l border-zinc-200 bg-sky-600 px-3 py-2 text-xs font-semibold tabular-nums text-white outline-none transition hover:bg-sky-500 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-zinc-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:focus-visible:ring-offset-zinc-950";

  return (
    <div className="space-y-1">
      <label htmlFor="opening_balance_display" className={CLIENT_FIELD_LABEL_CLASS}>
        Opening Balance (INR)
      </label>
      <div className={openingBalanceRowShellClass}>
        <span
          className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-medium tabular-nums text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300"
          aria-hidden
        >
          ₹
        </span>
        <input
          id="opening_balance_display"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={
            focused ? openingBalance : formatOpeningBalanceCurrencyDisplay(openingBalance)
          }
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            const next = normalizeOpeningBalanceSubmit(openingBalance);
            if (next !== openingBalance) onOpeningBalanceChange(next);
          }}
          onChange={(e) =>
            onOpeningBalanceChange(sanitizeOpeningBalanceInput(e.target.value))
          }
          className={openingBalanceInputInnerClass}
        />
        <button
          type="button"
          onClick={toggleBalanceType}
          className={toggleBtnClass}
          aria-label={
            balanceType === "Dr"
              ? "Balance type Debit, click to switch to Credit"
              : "Balance type Credit, click to switch to Debit"
          }
          title={
            balanceType === "Dr"
              ? "Debit — click to switch to Credit"
              : "Credit — click to switch to Debit"
          }
        >
          {balanceType}
        </button>
      </div>
    </div>
  );
}

export function ClientMasterForm({
  visible,
  overlay,
  form,
  isNewParam,
  idParam,
  onClose,
  onAddNew,
  onUpdateField,
  companyTypeOptions,
  companyScaleOptions,
  companyStatusOptions,
  pinCodeOptions,
  cityOptions,
  stateOptions,
  countryOptions,
  paymentTermOptions,
  phoneCountryCodeOptions,
  embeddedInBis,
  onEmbeddedSaveSuccess,
}: {
  visible: boolean;
  overlay?: boolean;
  form: Record<string, string>;
  isNewParam: boolean;
  idParam: string | null;
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (key: string, value: string) => void;
  companyTypeOptions: AppDropdownOptionRow[];
  companyScaleOptions: AppDropdownOptionRow[];
  companyStatusOptions: AppDropdownOptionRow[];
  pinCodeOptions: AppDropdownOptionRow[];
  cityOptions: AppDropdownOptionRow[];
  stateOptions: AppDropdownOptionRow[];
  countryOptions: AppDropdownOptionRow[];
  paymentTermOptions: AppDropdownOptionRow[];
  phoneCountryCodeOptions: AppDropdownOptionRow[];
  /** When set, submit uses `executeSaveClientMaster` and does not redirect (e.g. BIS overlay). */
  embeddedInBis?: boolean;
  onEmbeddedSaveSuccess?: (clientId: string) => void;
}) {
  if (!visible) return null;

  const rootClass = overlay
    ? "px-4 py-5"
    : "border-t border-zinc-200 bg-zinc-50/50 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/50";

  return (
    <div className={rootClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="client-master-form-title"
          className="inline-flex items-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
        >
          {isNewParam ? "New Client" : idParam ? "Edit Client" : "Client"}
        </h2>
        <DialogCloseXButton onClick={onClose} />
      </div>
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        {...(embeddedInBis
          ? {
              onSubmit: async (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const r = await executeSaveClientMaster(fd);
                if (r.ok) onEmbeddedSaveSuccess?.(r.id);
                else window.alert(r.error);
              },
            }
          : { action: saveClientMaster })}
      >
        <input type="hidden" name="id" value={form.id} />
        <input
          type="hidden"
          name="opening_balance"
          readOnly
          value={normalizeOpeningBalanceSubmit(form.opening_balance)}
        />
        <div className="sm:col-span-1 lg:col-span-1">
          <Field
            label="GST Number"
            name="gst_number"
            value={form.gst_number}
            onChange={(v) => onUpdateField("gst_number", v)}
            maxLength={28}
            autoComplete="off"
            title="15-character GSTIN. Paste with spaces or hyphens is normalized (letters and digits only, max 15). Leave blank if not registered. With a valid 15-character GSTIN, the search icon opens gst.gov.in and copies your GSTIN — press Ctrl+V in their GSTIN field."
            sanitize={normalizeGstInput}
            suffix={
              <a
                href={GST_TAXPAYER_SEARCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${fieldSuffixActionClass} min-w-9`}
                title="Open Search Taxpayer on the GST portal. If your GSTIN is valid (15 characters), it is copied to the clipboard first — paste with Ctrl+V in the portal GSTIN box."
                aria-label="Open GST taxpayer search on the government GST portal in a new tab. If your GSTIN is valid, it is copied first so you can paste it into the portal field."
                onClick={(e) => {
                  const g = normalizeGstInput(form.gst_number);
                  if (g.length !== 15 || !isValidGstinOrEmpty(g)) return;
                  e.preventDefault();
                  const opened = window.open(GST_TAXPAYER_SEARCH_URL, "_blank");
                  void navigator.clipboard.writeText(g).catch(() => {});
                  if (!opened) {
                    window.location.href = GST_TAXPAYER_SEARCH_URL;
                  }
                }}
              >
                <span className="sr-only">
                  Open GST taxpayer search (copies valid GSTIN for paste)
                </span>
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
        <div className="sm:col-span-1 lg:col-span-2">
          <Field
            label="Name of Company"
            name="company_name"
            required
            value={form.company_name}
            onChange={(v) => onUpdateField("company_name", v)}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <ClientDropdownField
            optionKey={DROPDOWN_KEY_CLIENT_COMPANY_STATUS}
            name="company_status"
            label="Status of Company"
            dialogTitle="Company Status"
            addPlaceholder="New Status"
            manageAriaLabel="Add or remove company statuses"
            value={form.company_status}
            onChange={(v) => onUpdateField("company_status", v)}
            options={companyStatusOptions}
            selectedValue={form.company_status}
            onClearSelection={() =>
              onUpdateField("company_status", DEFAULT_COMPANY_STATUS)
            }
            includeEmptyOption={false}
            overlayZIndexClass="z-[112]"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="min-w-0">
              <CompanyTypeManager
                value={form.company_type}
                onChange={(v) => onUpdateField("company_type", v)}
                selectOptions={[
                  { value: "", label: "— Select —" },
                  ...COMPANY_TYPES.map((t) => ({ value: t, label: t })),
                ]}
                options={companyTypeOptions}
                selectedValue={form.company_type}
                onClearSelection={() =>
                  onUpdateField("company_type", DEFAULT_COMPANY_TYPE)
                }
              />
            </div>
            <div className="min-w-0">
              <CompanyScaleManager
                value={form.company_scale}
                onChange={(v) => onUpdateField("company_scale", v)}
                selectOptions={[
                  { value: "", label: "— Select —" },
                  ...SCALES.map((t) => ({ value: t, label: t })),
                ]}
                options={companyScaleOptions}
                selectedValue={form.company_scale}
                onClearSelection={() =>
                  onUpdateField("company_scale", DEFAULT_COMPANY_SCALE)
                }
              />
            </div>
            <div className="min-w-0">
              <OpeningBalanceCurrencyField
                openingBalance={form.opening_balance}
                balanceType={form.balance_type === "Cr" ? "Cr" : "Dr"}
                onOpeningBalanceChange={(v) =>
                  onUpdateField("opening_balance", v)
                }
                onBalanceTypeChange={(v) =>
                  onUpdateField("balance_type", v)
                }
              />
              <input
                type="hidden"
                name="balance_type"
                readOnly
                value={form.balance_type === "Cr" ? "Cr" : "Dr"}
              />
            </div>
            <div className="min-w-0">
              <ClientDropdownField
                optionKey={DROPDOWN_KEY_CLIENT_PAYMENT_TERM}
                name="payment_term"
                label="Payment Term"
                dialogTitle="Payment terms"
                addPlaceholder="New payment term"
                manageAriaLabel="Add or remove payment terms"
                value={form.payment_term}
                onChange={(v) => onUpdateField("payment_term", v)}
                options={paymentTermOptions}
                selectedValue={form.payment_term}
                onClearSelection={() =>
                  onUpdateField("payment_term", DEFAULT_PAYMENT_TERM)
                }
                overlayZIndexClass="z-[118]"
              />
            </div>
          </div>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="min-w-0">
              <Field
                label="Name of Contact Person"
                name="contact_person_name"
                value={form.contact_person_name}
                onChange={(v) => onUpdateField("contact_person_name", v)}
              />
            </div>
            <div className="min-w-0">
              <Field
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(v) => onUpdateField("email", v)}
                sanitize={normalizeEmailInput}
              />
            </div>
            <div className="min-w-0">
              <div className="space-y-1">
                <label htmlFor="phone" className={CLIENT_FIELD_LABEL_CLASS}>
                  Mobile Number
                </label>
                <div className={fieldInputRowShellClass}>
                  <div className="w-[min(calc(7.5rem-5mm),42%)] shrink-0 border-r border-zinc-200 dark:border-zinc-700">
                    <ClientDropdownField
                      optionKey={DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE}
                      name="phone_country_code"
                      label="Country code"
                      dialogTitle="Phone country codes"
                      addPlaceholder="+00"
                      manageAriaLabel="Add or remove phone country codes"
                      value={form.phone_country_code}
                      onChange={(v) => onUpdateField("phone_country_code", v)}
                      options={phoneCountryCodeOptions}
                      selectedValue={form.phone_country_code}
                      onClearSelection={() =>
                        onUpdateField("phone_country_code", "+91")
                      }
                      includeEmptyOption={false}
                      overlayZIndexClass="z-[116]"
                      hideLabel
                      inputRowShellClassName="flex min-h-[2.375rem] min-w-0 flex-1 overflow-hidden border-0 bg-transparent py-0 shadow-none ring-0 focus-within:border-0 focus-within:ring-0 dark:bg-transparent"
                    />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      onUpdateField("phone", e.target.value.replace(/\D/g, ""))
                    }
                    inputMode="numeric"
                    autoComplete="tel-national"
                    className={fieldInputInnerClass}
                    title="National mobile number without country code"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <label htmlFor="address" className={CLIENT_FIELD_LABEL_CLASS}>
            Address
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            value={form.address}
            onChange={(e) => onUpdateField("address", e.target.value)}
            className="block w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div className="lg:col-span-1">
          <ClientDropdownField
            optionKey={DROPDOWN_KEY_CLIENT_PIN_CODE}
            name="pin_code"
            label="PIN Code"
            dialogTitle="PIN Codes"
            addPlaceholder="New PIN Code"
            manageAriaLabel="Add or remove PIN codes"
            value={form.pin_code}
            onChange={(v) => onUpdateField("pin_code", v)}
            options={pinCodeOptions}
            selectedValue={form.pin_code}
            onClearSelection={() =>
              onUpdateField("pin_code", DEFAULT_PIN_CODE)
            }
            overlayZIndexClass="z-[117]"
          />
        </div>
        <div className="lg:col-span-1">
          <ClientDropdownField
            optionKey={DROPDOWN_KEY_CLIENT_CITY}
            name="city"
            label="City"
            dialogTitle="Cities"
            addPlaceholder="New City Name"
            manageAriaLabel="Add or remove cities"
            value={form.city}
            onChange={(v) => onUpdateField("city", v)}
            options={cityOptions}
            selectedValue={form.city}
            onClearSelection={() => onUpdateField("city", DEFAULT_CITY)}
            overlayZIndexClass="z-[113]"
          />
        </div>
        <div className="lg:col-span-1">
          <ClientDropdownField
            optionKey={DROPDOWN_KEY_CLIENT_STATE}
            name="state"
            label="State"
            dialogTitle="State / Provinces"
            addPlaceholder="New State / Provinces"
            manageAriaLabel="Add or remove states"
            value={form.state}
            onChange={(v) => onUpdateField("state", v)}
            options={stateOptions}
            selectedValue={form.state}
            onClearSelection={() =>
              onUpdateField("state", DEFAULT_STATE)
            }
            overlayZIndexClass="z-[114]"
          />
        </div>
        <div className="lg:col-span-1">
          <ClientDropdownField
            optionKey={DROPDOWN_KEY_CLIENT_COUNTRY}
            name="country"
            label="Country"
            dialogTitle="Countries"
            addPlaceholder="New Country"
            manageAriaLabel="Add or remove countries"
            value={form.country}
            onChange={(v) => onUpdateField("country", v)}
            options={countryOptions}
            selectedValue={form.country}
            onClearSelection={() =>
              onUpdateField("country", DEFAULT_COUNTRY)
            }
            includeEmptyOption={false}
            overlayZIndexClass="z-[115]"
          />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <label htmlFor="notes" className={CLIENT_FIELD_LABEL_CLASS}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={1}
            value={form.notes}
            onChange={(e) => onUpdateField("notes", e.target.value)}
            className="block h-10 w-full resize-none overflow-y-auto rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-normal shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
          >
            {idParam && !isNewParam ? "Update Client" : "Save Client"}
          </button>
          {idParam && !isNewParam && (
            <button
              type="button"
              onClick={onAddNew}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Clear / New
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

const fieldSuffixActionClass =
  "inline-flex shrink-0 items-center justify-center border-l border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs font-medium leading-none text-zinc-800 no-underline hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-800";

const fieldInputRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const fieldInputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 placeholder:text-zinc-400 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

function Field({
  label,
  name,
  type = "text",
  required,
  value,
  onChange,
  step,
  maxLength,
  title,
  autoComplete,
  sanitize,
  suffix,
  inputMode,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  maxLength?: number;
  title?: string;
  autoComplete?: string;
  sanitize?: (raw: string) => string;
  suffix?: ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className={CLIENT_FIELD_LABEL_CLASS}>
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
            step={step}
            maxLength={maxLength}
            title={title}
            autoComplete={autoComplete}
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
          step={step}
          maxLength={maxLength}
          title={title}
          autoComplete={autoComplete}
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
