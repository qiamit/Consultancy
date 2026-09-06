"use client";

import { saveBisProjectMaster } from "@backend/actions/bis-projects";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";
import {
  DROPDOWN_KEY_BIS_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_PROJECT_CLIENT,
} from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import {
  computeLicenseDisplayStatus,
} from "@backend/modules/bis/bis-project-license-status";
import { BIS_FIELD_LABEL_CLASS, DEFAULT_BILLING_FREQUENCY } from "./constants";
import { openManakEbisAssist } from "./manak-ebis-assist";
import { IsCodeCombobox, type IsCodeComboboxOption } from "./is-code-combobox";
import { LicenseScopeField, ScopeTypeSelect } from "./license-scope-field";
import type { LicenseScopeFormat } from "@backend/modules/bis/application-checklist-notes";
import {
  plainTextToScopeRows,
} from "@backend/modules/bis/bis-project-license-scope-notes";
import {
  serializeLicenseScopeText,
  storedRowsToEditorRows,
} from "@backend/modules/bis/license-scope-format";

const fieldInputRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const fieldInputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

function ManakOnlineSearchLink({
  userId,
  password,
}: {
  userId: string;
  password?: string;
}) {
  const suffixClass =
    "inline-flex shrink-0 items-center justify-center border-l border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-700 transition hover:bg-sky-50 hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-sky-500 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-sky-950/40 dark:hover:text-sky-300";
  return (
    <button
      type="button"
      onClick={() =>
        openManakEbisAssist({
          userId,
          password,
        })
      }
      className={suffixClass}
      aria-label="Open Manak Online BIS eBIS login in a new tab (User ID and password pre-filled when entered)"
      title="Open Manak Online — same login fill as Status / Apply for Renewal (User ID + password)"
    >
      <svg
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
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </button>
  );
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

const fieldInputClassBase =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-900";

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required,
  disabled,
  placeholder,
  maxLength,
  inputMode,
  autoComplete,
  hideLabel = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  /** Label is rendered outside (e.g. `lg` grid label row). */
  hideLabel?: boolean;
}) {
  const id = `${name}_bis_field`;
  const inputClass = hideLabel ? fieldInputClassBase : `mt-1 ${fieldInputClassBase}`;
  const inputEl = (
    <input
      id={id}
      name={name}
      type={type}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
  if (hideLabel) return inputEl;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={BIS_FIELD_LABEL_CLASS}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      {inputEl}
    </div>
  );
}

export function BisProjectsMasterForm({
  visible,
  overlay,
  formValues,
  isNewParam,
  idParam,
  listPath = "/dashboard/bis-projects",
  clientOptions,
  isCodeOptions,
  billingFrequencyOptions,
  onClose,
  onAddNew,
  onUpdateField,
  onRequestQuickAddClient,
  onRequestQuickAddIsCode,
}: {
  visible: boolean;
  overlay?: boolean;
  formValues: Record<string, string>;
  isNewParam: boolean;
  idParam: string | null;
  /** Where to return after save (Existing vs Our BIS License). */
  listPath?: "/dashboard/bis-projects" | "/dashboard/our-bis-licenses";
  clientOptions: AppDropdownOptionRow[];
  isCodeOptions: IsCodeComboboxOption[];
  billingFrequencyOptions: AppDropdownOptionRow[];
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (key: string, value: string) => void;
  onRequestQuickAddClient?: () => void;
  onRequestQuickAddIsCode?: () => void;
}) {
  const licenseStatus = computeLicenseDisplayStatus(
    formValues.project_kind || "licence",
    formValues.license_validity_date,
    formValues.status,
  );
  const scopeType = (formValues.scope_type === "table" ? "table" : "plain") as LicenseScopeFormat;

  function handleScopeTypeChange(next: LicenseScopeFormat) {
    if (next === scopeType) return;
    if (next === "table") {
      const rows = plainTextToScopeRows(formValues.notes);
      onUpdateField("license_scope_rows", JSON.stringify(rows.length > 0 ? rows : []));
      onUpdateField("scope_type", next);
      return;
    }
    let tableRows = storedRowsToEditorRows([]);
    try {
      const parsed = JSON.parse(formValues.license_scope_rows || "[]") as {
        component?: string;
        value?: string;
      }[];
      if (Array.isArray(parsed)) {
        tableRows = storedRowsToEditorRows(
          parsed.map((r) => ({
            component: String(r.component ?? ""),
            value: String(r.value ?? ""),
          })),
        );
      }
    } catch {
      // ignore
    }
    onUpdateField("notes", serializeLicenseScopeText("table", formValues.notes, tableRows));
    onUpdateField("scope_type", next);
  }

  if (!visible) return null;

  const rootClass = overlay
    ? "px-4 pb-5 pt-0"
    : "border-t border-zinc-200 bg-zinc-50/50 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/50";

  return (
    <div className={rootClass}>
      <div className="-mx-4 mb-4 flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800">
        <h2
          id="bis-projects-master-form-title"
          className="text-sm font-semibold text-zinc-50"
        >
          {isNewParam ? "New BIS License" : idParam ? "Edit BIS License" : "BIS License"}
        </h2>
        <DialogCloseXButton
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-transparent text-zinc-100 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
        />
      </div>

      <form
        id="bis-projects-master-save-form"
        action={saveBisProjectMaster}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input type="hidden" name="id" value={formValues.id} />
        <input type="hidden" name="title" value={formValues.title} />
        <input type="hidden" name="list_path" value={listPath} />
        <input type="hidden" name="project_kind" value={formValues.project_kind || "licence"} />
        <input type="hidden" name="license_number" value={formValues.license_number} />
        <input type="hidden" name="start_date" value={formValues.start_date} />
        <input type="hidden" name="target_date" value={formValues.target_date} />

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:grid-rows-[auto_auto] lg:gap-x-4 lg:gap-y-2">
            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="bis_qe_managed"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-1 lg:row-start-1`}
              >
                QE Management
              </label>
              <div className="min-w-0 w-full lg:col-start-1 lg:row-start-2">
                <select
                  id="bis_qe_managed"
                  name="is_qe_managed"
                  value={formValues.is_qe_managed === "0" ? "0" : "1"}
                  onChange={(e) => onUpdateField("is_qe_managed", e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="1">Managed by QE</option>
                  <option value="0">Not Managed By QE</option>
                </select>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="bis_is_code_input"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-2 lg:row-start-1`}
              >
                IS Code
              </label>
              <div className="min-w-0 w-full lg:col-start-2 lg:row-start-2">
                <IsCodeCombobox
                  name="is_code_id"
                  label="IS Code"
                  hideLabel
                  inputId="bis_is_code_input"
                  value={formValues.is_code_id}
                  onChange={(id) => onUpdateField("is_code_id", id)}
                  options={isCodeOptions}
                  listZIndexClass="z-[119]"
                  onAddClick={onRequestQuickAddIsCode}
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="bis_cm_digits"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-3 lg:row-start-1`}
              >
                CM/L Number<span className="text-red-500"> *</span>
              </label>
              <div className={`min-w-0 w-full lg:col-start-3 lg:row-start-2 ${fieldInputRowShellClass}`}>
                <span
                  className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold tabular-nums text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200"
                  aria-hidden
                >
                  CM/L
                </span>
                <input
                  id="bis_cm_digits"
                  name="cm_l_digits"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  required
                  title="Enter exactly 10 digits"
                  value={formValues.cm_l_digits}
                  onChange={(e) =>
                    onUpdateField(
                      "cm_l_digits",
                      e.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  className={`${fieldInputInnerClass} font-mono tabular-nums`}
                  placeholder="0000000000"
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="bis_validity"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-4 lg:row-start-1`}
              >
                Licence Validity<span className="text-red-500"> *</span>
              </label>
              <div className="min-w-0 w-full lg:col-start-4 lg:row-start-2">
                <input
                  id="bis_validity"
                  name="license_validity_date"
                  type="date"
                  required
                  value={formValues.license_validity_date}
                  onChange={(e) =>
                    onUpdateField("license_validity_date", e.target.value)
                  }
                  title="End date of licence validity"
                  className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <span className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-5 lg:row-start-1`}>
                License Status
              </span>
              <div className="min-w-0 w-full lg:col-start-5 lg:row-start-2 space-y-1.5">
                <input type="hidden" name="status" value={formValues.status} />
                <div className={`rounded-md px-3 py-2 text-xs font-bold text-center tracking-wide ${
                  licenseStatus === "Operative"    ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" :
                  licenseStatus === "Deferred"     ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" :
                  licenseStatus === "Expired"      ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" :
                  licenseStatus === "Stop Marking" ? "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800" :
                  "bg-zinc-50 text-zinc-400 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700"
                }`}>
                  {licenseStatus}
                </div>
                {formValues.status !== "in_progress" && (
                  <div className="text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                    Override: {formValues.status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_auto] lg:gap-x-4 lg:gap-y-2">
            <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-span-1 lg:contents">
              <label
                htmlFor="client_id_input"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-1 lg:row-start-1`}
              >
                Name of Client
              </label>
              <div className="min-w-0 w-full sm:col-span-2 lg:col-span-1 lg:col-start-1 lg:row-start-2">
                <ClientDropdownField
                  hideLabel
                  optionKey={DROPDOWN_KEY_BIS_PROJECT_CLIENT}
                  name="client_id"
                  label="Name of Client"
                  dialogTitle="Clients"
                  addPlaceholder="New client label"
                  manageAriaLabel={
                    onRequestQuickAddClient
                      ? "Add new client"
                      : "Add or remove client picker labels"
                  }
                  value={formValues.client_id}
                  onChange={(v) => onUpdateField("client_id", v)}
                  options={clientOptions}
                  selectedValue={formValues.client_id}
                  onClearSelection={() => onUpdateField("client_id", "")}
                  includeEmptyOption={false}
                  searchPlaceholder="Search Client Name…"
                  overlayZIndexClass="z-[119]"
                  onSuffixButtonClick={onRequestQuickAddClient}
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="portal_user_id_bis_field"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-2 lg:row-start-1`}
              >
                User ID
              </label>
              <div className="min-w-0 w-full lg:col-start-2 lg:row-start-2">
                <div className={fieldInputRowShellClass}>
                  <input
                    id="portal_user_id_bis_field"
                    name="portal_user_id"
                    type="text"
                    autoComplete="off"
                    value={formValues.portal_user_id}
                    onChange={(e) => onUpdateField("portal_user_id", e.target.value)}
                    className={fieldInputInnerClass}
                  />
                  <ManakOnlineSearchLink
                    userId={formValues.portal_user_id}
                    password={formValues.portal_password}
                  />
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="bis_portal_password"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-3 lg:row-start-1`}
              >
                Password
              </label>
              <div className="min-w-0 w-full lg:col-start-3 lg:row-start-2">
                <input
                  id="bis_portal_password"
                  name="portal_password"
                  type="password"
                  autoComplete="new-password"
                  value={formValues.portal_password}
                  onChange={(e) => onUpdateField("portal_password", e.target.value)}
                  className={fieldInputClassBase}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:grid-rows-[auto_auto] lg:gap-x-4 lg:gap-y-2">
            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="case_handled_by_bis_field"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-1 lg:row-start-1`}
              >
                Case Handled By
              </label>
              <div className="min-w-0 w-full lg:col-start-1 lg:row-start-2">
                <Field
                  hideLabel
                  label="Case Handled By"
                  name="case_handled_by"
                  value={formValues.case_handled_by}
                  onChange={(v) => onUpdateField("case_handled_by", v)}
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="case_referred_by_bis_field"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-2 lg:row-start-1`}
              >
                Case Referred By
              </label>
              <div className="min-w-0 w-full lg:col-start-2 lg:row-start-2">
                <Field
                  hideLabel
                  label="Case Referred By"
                  name="case_referred_by"
                  value={formValues.case_referred_by}
                  onChange={(v) => onUpdateField("case_referred_by", v)}
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="bis_billing_amount"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-3 lg:row-start-1`}
              >
                Billing Amount
              </label>
              <div className="min-w-0 w-full lg:col-start-3 lg:row-start-2">
                <div className={fieldInputRowShellClass}>
                  <span
                    className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200"
                    aria-hidden
                  >
                    ₹
                  </span>
                  <input
                    id="bis_billing_amount"
                    name="billing_amount"
                    inputMode="decimal"
                    autoComplete="off"
                    value={formValues.billing_amount}
                    onChange={(e) =>
                      onUpdateField("billing_amount", sanitizeCurrency(e.target.value))
                    }
                    className={`${fieldInputInnerClass} tabular-nums`}
                    title="Optional — leave blank to save as ₹0"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="billing_frequency_input"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-4 lg:row-start-1`}
              >
                Billing Frequency
              </label>
              <div className="min-w-0 w-full lg:col-start-4 lg:row-start-2">
                <ClientDropdownField
                  hideLabel
                  inputRowShellClassName={fieldInputRowShellClass}
                  optionKey={DROPDOWN_KEY_BIS_BILLING_FREQUENCY}
                  name="billing_frequency"
                  label="Billing Frequency"
                  dialogTitle="Billing frequency"
                  addPlaceholder="Label as stored (e.g. Monthly, Yearly)"
                  manageAriaLabel="Add or remove billing frequencies"
                  value={formValues.billing_frequency}
                  onChange={(v) => onUpdateField("billing_frequency", v)}
                  options={billingFrequencyOptions}
                  selectedValue={formValues.billing_frequency}
                  onClearSelection={() =>
                    onUpdateField("billing_frequency", DEFAULT_BILLING_FREQUENCY)
                  }
                  includeEmptyOption={false}
                  searchPlaceholder="Search billing frequency…"
                  overlayZIndexClass="z-[119]"
                  listZIndexClass="z-[119]"
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 lg:contents">
              <label
                htmlFor="scope_type_bis_field"
                className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-5 lg:row-start-1`}
              >
                Scope Type
              </label>
              <div className="min-w-0 w-full lg:col-start-5 lg:row-start-2">
                <ScopeTypeSelect
                  hideLabel
                  value={scopeType}
                  onChange={handleScopeTypeChange}
                />
              </div>
            </div>
          </div>
        </div>

        <LicenseScopeField
          key={`${formValues.id}-${scopeType}`}
          scopeType={scopeType}
          plainText={formValues.notes}
          rowsJson={formValues.license_scope_rows}
          onPlainTextChange={(v) => onUpdateField("notes", v)}
          onRowsJsonChange={(v) => onUpdateField("license_scope_rows", v)}
        />

        <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
          >
            {idParam && !isNewParam ? "Update Project" : "Save Project"}
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
