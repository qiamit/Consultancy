"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useState } from "react";
import { saveBisProjectMaster } from "@/lib/actions/bis-projects";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";
import {
  DROPDOWN_KEY_BIS_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_PROJECT_CLIENT,
  DROPDOWN_KEY_BIS_PROJECT_KIND,
} from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import {
  computeLicenseDisplayStatus,
  cmPrefixForProjectKind,
} from "@/lib/bis-project-license-status";
import {
  BILLING_FREQUENCIES,
  BIS_FIELD_LABEL_CLASS,
  DEFAULT_BILLING_FREQUENCY,
  PROJECT_KIND_OPTIONS,
} from "./constants";
import { manakOnlineEbisLoginHref } from "@/lib/manak-online-portal";
import { IsCodeCombobox, type IsCodeComboboxOption } from "./is-code-combobox";

const fieldInputRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const fieldInputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

const PROJECT_KIND_HELP_LINES: { value: string; hint: string }[] = [
  {
    value: "new_license",
    hint: "New licence matter; add CM/L and licence end date when you have them (both optional until known).",
  },
  {
    value: "application",
    hint: "Manak application — CM/A prefix. Leave licence validity blank.",
  },
  {
    value: "inclusion",
    hint: "Inclusion on an existing licence; CM/L and licence end date when known (optional if pending).",
  },
  {
    value: "renewal",
    hint: "Renewal-style case (legacy label); CM/L and licence end date when known (optional if pending).",
  },
  {
    value: "maintenance",
    hint: "Maintenance-style case (legacy label); CM/L and licence end date when known (optional if pending).",
  },
];

const BILLING_FREQUENCY_HELP_LINES: { value: string; hint: string }[] = [
  {
    value: "Monthly",
    hint: "Bill or accrue consultancy fees every month for this project.",
  },
  {
    value: "Quarterly",
    hint: "Every three months (four cycles per year).",
  },
  {
    value: "Half Yearly",
    hint: "Twice per year (six-month cycles).",
  },
  {
    value: "Yearly",
    hint: "Once per year; common for annual retainers or licence-year alignment.",
  },
  {
    value: "Based on Work",
    hint: "Invoice when agreed milestones, deliverables, or effort units are completed.",
  },
];

function ManakOnlineSearchLink({ userId }: { userId: string }) {
  const suffixClass =
    "inline-flex shrink-0 items-center justify-center border-l border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-700 transition hover:bg-sky-50 hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-sky-500 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:bg-sky-950/40 dark:hover:text-sky-300";
  return (
    <a
      href={manakOnlineEbisLoginHref(userId)}
      target="_blank"
      rel="noopener noreferrer"
      className={suffixClass}
      aria-label="Open Manak Online BIS eBIS login in a new tab (User ID passed as userId= when entered)"
      title="Open Manak Online — User ID is added to the link when the field is filled"
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
    </a>
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
}) {
  const id = `${name}_bis_field`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={BIS_FIELD_LABEL_CLASS}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
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
        className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-900"
      />
    </div>
  );
}

export function BisProjectsMasterForm({
  visible,
  overlay,
  formValues,
  isNewParam,
  idParam,
  clientOptions,
  isCodeOptions,
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
  clientOptions: AppDropdownOptionRow[];
  isCodeOptions: IsCodeComboboxOption[];
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (key: string, value: string) => void;
  onRequestQuickAddClient?: () => void;
  onRequestQuickAddIsCode?: () => void;
}) {
  const [projectKindHelpOpen, setProjectKindHelpOpen] = useState(false);
  const [billingFreqHelpOpen, setBillingFreqHelpOpen] = useState(false);
  const projectKindHelpTitleId = useId();
  const billingFreqHelpTitleId = useId();
  const isApplication = formValues.project_kind === "application";
  const licenseStatus = computeLicenseDisplayStatus(
    formValues.project_kind,
    formValues.license_validity_date,
  );

  useEffect(() => {
    if (!projectKindHelpOpen && !billingFreqHelpOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProjectKindHelpOpen(false);
        setBillingFreqHelpOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectKindHelpOpen, billingFreqHelpOpen]);

  const projectKindComboboxOptions = useMemo(
    (): AppDropdownOptionRow[] =>
      PROJECT_KIND_OPTIONS.map((o) => ({
        id: `__bis_kind__${o.value}`,
        value: o.value,
        label: o.label,
        canDelete: false,
        filterText: `${o.label} ${o.value.replace(/_/g, " ")}`,
      })),
    [],
  );

  const billingFrequencyComboboxOptions = useMemo(
    (): AppDropdownOptionRow[] =>
      BILLING_FREQUENCIES.map((f) => ({
        id: `__bis_billfreq__${f}`,
        value: f,
        label: f,
        canDelete: false,
      })),
    [],
  );

  if (!visible) return null;

  const rootClass = overlay
    ? "px-4 py-5"
    : "border-t border-zinc-200 bg-zinc-50/50 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/50";

  return (
    <div className={rootClass}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          id="bis-projects-master-form-title"
          className="inline-flex items-center rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
        >
          {isNewParam ? "New BIS Project" : idParam ? "Edit BIS Project" : "BIS Project"}
        </h2>
        <DialogCloseXButton onClick={onClose} />
      </div>

      <form
        id="bis-projects-master-save-form"
        action={saveBisProjectMaster}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <input type="hidden" name="id" value={formValues.id} />
        <input type="hidden" name="title" value={formValues.title} />
        <input type="hidden" name="status" value={formValues.status} />
        <input type="hidden" name="license_number" value={formValues.license_number} />
        <input type="hidden" name="start_date" value={formValues.start_date} />
        <input type="hidden" name="target_date" value={formValues.target_date} />

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <div className="min-w-0">
              <label htmlFor="project_kind_input" className={BIS_FIELD_LABEL_CLASS}>
                Project Type<span className="text-red-500"> *</span>
              </label>
              <div className="mt-1">
                <ClientDropdownField
                  hideLabel
                  inputRowShellClassName={fieldInputRowShellClass}
                  optionKey={DROPDOWN_KEY_BIS_PROJECT_KIND}
                  name="project_kind"
                  label="Project Type"
                  dialogTitle="Project types"
                  addPlaceholder=""
                  manageAriaLabel="Project type help"
                  value={formValues.project_kind}
                  onChange={(v) => {
                    onUpdateField("project_kind", v);
                    if (v === "application") onUpdateField("license_validity_date", "");
                  }}
                  options={projectKindComboboxOptions}
                  selectedValue={formValues.project_kind}
                  onClearSelection={() => onUpdateField("project_kind", "new_license")}
                  includeEmptyOption={false}
                  searchPlaceholder="Search project type…"
                  overlayZIndexClass="z-[119]"
                  listZIndexClass="z-[119]"
                  onSuffixButtonClick={() => {
                    setBillingFreqHelpOpen(false);
                    setProjectKindHelpOpen(true);
                  }}
                />
              </div>
              {projectKindHelpOpen
                ? createPortal(
                    <div
                      className="fixed inset-0 z-[119] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
                      role="presentation"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setProjectKindHelpOpen(false);
                      }}
                    >
                      <div
                        id="bis-project-kind-help-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={projectKindHelpTitleId}
                        className="mb-10 w-full max-w-md rounded-xl border-2 border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                          <h2
                            id={projectKindHelpTitleId}
                            className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                          >
                            Project types
                          </h2>
                          <DialogCloseXButton onClick={() => setProjectKindHelpOpen(false)} />
                        </div>
                        <div className="space-y-3 px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            These values are fixed in the database for BIS workflows. Pick the
                            closest match; use Application when the Manak number is CM/A.
                          </p>
                          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-700 dark:border-zinc-600 dark:bg-zinc-950/60">
                            {PROJECT_KIND_OPTIONS.map((o) => {
                              const hint =
                                PROJECT_KIND_HELP_LINES.find((h) => h.value === o.value)
                                  ?.hint ?? "";
                              return (
                                <li
                                  key={o.value}
                                  className="px-3 py-2.5 text-left text-zinc-800 dark:text-zinc-100"
                                >
                                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                                    {o.label}
                                  </div>
                                  {hint ? (
                                    <p className="mt-0.5 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                                      {hint}
                                    </p>
                                  ) : null}
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

            <div className="min-w-0">
              <label htmlFor="bis_cm_digits" className={BIS_FIELD_LABEL_CLASS}>
                CM/L Number
              </label>
              <div className={fieldInputRowShellClass}>
                <span
                  className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold tabular-nums text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200"
                  aria-hidden
                >
                  {cmPrefixForProjectKind(formValues.project_kind)}
                </span>
                <input
                  id="bis_cm_digits"
                  name="cm_l_digits"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={10}
                  title="Leave blank or enter exactly 10 digits"
                  value={formValues.cm_l_digits}
                  onChange={(e) =>
                    onUpdateField(
                      "cm_l_digits",
                      e.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  className={`${fieldInputInnerClass} font-mono tabular-nums`}
                  placeholder="Optional — 10 digits"
                />
              </div>
            </div>

            <div className="min-w-0">
              <label htmlFor="bis_validity" className={BIS_FIELD_LABEL_CLASS}>
                Licence Validity
              </label>
              {isApplication ? (
                <>
                  <input type="hidden" name="license_validity_date" value="" />
                  <input
                    id="bis_validity"
                    type="date"
                    disabled
                    readOnly
                    value=""
                    className="mt-1 block w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                    title="Not applicable for Application (CM/A) type"
                  />
                </>
              ) : (
                <input
                  id="bis_validity"
                  name="license_validity_date"
                  type="date"
                  value={formValues.license_validity_date}
                  onChange={(e) =>
                    onUpdateField("license_validity_date", e.target.value)
                  }
                  title="Optional — end date of licence validity when known"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              )}
            </div>

            <div className="min-w-0">
              <span className={BIS_FIELD_LABEL_CLASS}>License Status</span>
              <div className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100">
                {licenseStatus}
              </div>
            </div>

            <div className="min-w-0 sm:col-span-2 md:col-span-1 lg:col-span-1">
              <IsCodeCombobox
                name="is_code_id"
                label="IS Code"
                value={formValues.is_code_id}
                onChange={(id) => onUpdateField("is_code_id", id)}
                options={isCodeOptions}
                listZIndexClass="z-[119]"
                onAddClick={onRequestQuickAddIsCode}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <ClientDropdownField
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
            <div className="min-w-0">
              <div className="space-y-1">
                <label htmlFor="portal_user_id_bis_field" className={BIS_FIELD_LABEL_CLASS}>
                  User ID
                </label>
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
                  <ManakOnlineSearchLink userId={formValues.portal_user_id} />
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <label htmlFor="bis_portal_password" className={BIS_FIELD_LABEL_CLASS}>
                Password
              </label>
              <input
                id="bis_portal_password"
                name="portal_password"
                type="password"
                autoComplete="new-password"
                value={formValues.portal_password}
                onChange={(e) => onUpdateField("portal_password", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <Field
                label="Case Handled By"
                name="case_handled_by"
                value={formValues.case_handled_by}
                onChange={(v) => onUpdateField("case_handled_by", v)}
              />
            </div>
            <div className="min-w-0">
              <Field
                label="Case Referred By"
                name="case_referred_by"
                value={formValues.case_referred_by}
                onChange={(v) => onUpdateField("case_referred_by", v)}
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="bis_billing_amount" className={BIS_FIELD_LABEL_CLASS}>
                Billing Amount
              </label>
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
            <div className="min-w-0">
              <label htmlFor="billing_frequency_input" className={BIS_FIELD_LABEL_CLASS}>
                Billing Frequency
              </label>
              <div className="mt-1">
                <ClientDropdownField
                  hideLabel
                  inputRowShellClassName={fieldInputRowShellClass}
                  optionKey={DROPDOWN_KEY_BIS_BILLING_FREQUENCY}
                  name="billing_frequency"
                  label="Billing Frequency"
                  dialogTitle="Billing frequency"
                  addPlaceholder=""
                  manageAriaLabel="Billing frequency help"
                  value={formValues.billing_frequency}
                  onChange={(v) => onUpdateField("billing_frequency", v)}
                  options={billingFrequencyComboboxOptions}
                  selectedValue={formValues.billing_frequency}
                  onClearSelection={() =>
                    onUpdateField("billing_frequency", DEFAULT_BILLING_FREQUENCY)
                  }
                  includeEmptyOption={false}
                  searchPlaceholder="Search billing frequency…"
                  overlayZIndexClass="z-[119]"
                  listZIndexClass="z-[119]"
                  onSuffixButtonClick={() => {
                    setProjectKindHelpOpen(false);
                    setBillingFreqHelpOpen(true);
                  }}
                />
              </div>
              {billingFreqHelpOpen
                ? createPortal(
                    <div
                      className="fixed inset-0 z-[119] flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-10 sm:pt-16 dark:bg-black/55"
                      role="presentation"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) setBillingFreqHelpOpen(false);
                      }}
                    >
                      <div
                        id="bis-billing-frequency-help-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={billingFreqHelpTitleId}
                        className="mb-10 w-full max-w-md rounded-xl border-2 border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                          <h2
                            id={billingFreqHelpTitleId}
                            className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                          >
                            Billing frequency
                          </h2>
                          <DialogCloseXButton onClick={() => setBillingFreqHelpOpen(false)} />
                        </div>
                        <div className="space-y-3 px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            These options are fixed for reporting and exports. Choose the cycle
                            that matches your agreement with the client.
                          </p>
                          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-700 dark:border-zinc-600 dark:bg-zinc-950/60">
                            {BILLING_FREQUENCIES.map((f) => {
                              const hint =
                                BILLING_FREQUENCY_HELP_LINES.find((h) => h.value === f)
                                  ?.hint ?? "";
                              return (
                                <li
                                  key={f}
                                  className="px-3 py-2.5 text-left text-zinc-800 dark:text-zinc-100"
                                >
                                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                                    {f}
                                  </div>
                                  {hint ? (
                                    <p className="mt-0.5 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                                      {hint}
                                    </p>
                                  ) : null}
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
          </div>
        </div>

        <div className="min-w-0 sm:col-span-2 lg:col-span-4">
          <label htmlFor="bis_license_scope" className={BIS_FIELD_LABEL_CLASS}>
            Licence Scope
          </label>
          <textarea
            id="bis_license_scope"
            name="notes"
            rows={3}
            value={formValues.notes}
            onChange={(e) => onUpdateField("notes", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>

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
