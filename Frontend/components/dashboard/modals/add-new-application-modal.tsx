"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@backend/db/client/client";
import { createPendingApplication } from "@backend/actions/bis-projects";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { ClientMasterEmbedModal } from "@/components/modules/finance/client-master-embed-modal";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";
import { IsCodeMasterEmbedModal } from "@/components/modules/is-code-master/is-code-master-embed-modal";
import {
  DROPDOWN_KEY_BIS_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_PROJECT_CLIENT,
} from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import {
  BIS_FIELD_LABEL_CLASS,
  BILLING_FREQUENCIES,
  DEFAULT_BILLING_AMOUNT,
  DEFAULT_BILLING_FREQUENCY,
  DEFAULT_CASE_HANDLED_BY,
  DEFAULT_CASE_REFERRED_BY,
} from "@/components/modules/bis-projects/constants";
import {
  LicenseScopeField,
  ScopeTypeSelect,
} from "@/components/modules/bis-projects/license-scope-field";
import { openManakEbisAssist } from "@/components/modules/bis-projects/manak-ebis-assist";
import { useSidebarLayout } from "@/components/dashboard/sidebar-layout-context";
import {
  IsCodeCombobox,
  type IsCodeComboboxOption,
} from "@/components/modules/bis-projects/is-code-combobox";
import type { LicenseScopeFormat } from "@backend/modules/bis/application-checklist-notes";
import { plainTextToScopeRows } from "@backend/modules/bis/bis-project-license-scope-notes";
import {
  serializeLicenseScopeText,
  storedRowsToEditorRows,
} from "@backend/modules/bis/license-scope-format";

const fieldInputRowShellClass =
  "flex overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950";

const fieldInputInnerClass =
  "min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-2 text-sm text-zinc-900 outline-none ring-0 focus:ring-0 dark:bg-transparent dark:text-zinc-100";

const fieldInputClassBase =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-900";

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
      aria-label="Open Manak Online BIS eBIS login in a new tab"
      title="Open Manak Online with User ID and password"
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

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  hideLabel = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hideLabel?: boolean;
}) {
  const id = `${name}_new_app_field`;
  return (
    <div className="min-w-0">
      {!hideLabel ? (
        <label htmlFor={id} className={BIS_FIELD_LABEL_CLASS}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={hideLabel ? fieldInputClassBase : `mt-1 ${fieldInputClassBase}`}
      />
    </div>
  );
}

export function AddNewApplicationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { open: sidebarOpen } = useSidebarLayout();
  const [clientId, setClientId] = useState("");
  const [isCodeId, setIsCodeId] = useState("");
  const [portalUserId, setPortalUserId] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [caseHandledBy, setCaseHandledBy] = useState(DEFAULT_CASE_HANDLED_BY);
  const [caseReferredBy, setCaseReferredBy] = useState(DEFAULT_CASE_REFERRED_BY);
  const [billingAmount, setBillingAmount] = useState(DEFAULT_BILLING_AMOUNT);
  const [billingFrequency, setBillingFrequency] = useState(
    DEFAULT_BILLING_FREQUENCY,
  );
  const [targetDate, setTargetDate] = useState("");
  const [isQeManaged, setIsQeManaged] = useState<"1" | "0">("1");
  const [scopeType, setScopeType] = useState<LicenseScopeFormat>("plain");
  const [scopePlain, setScopePlain] = useState("");
  const [scopeRowsJson, setScopeRowsJson] = useState("[]");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddIsCode, setShowAddIsCode] = useState(false);

  const [clientOptions, setClientOptions] = useState<AppDropdownOptionRow[]>([]);
  const [isCodeOptions, setIsCodeOptions] = useState<IsCodeComboboxOption[]>([]);
  const [billingFrequencyOptions, setBillingFrequencyOptions] = useState<
    AppDropdownOptionRow[]
  >([]);

  async function refreshClientOption(clientId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("clients")
      .select("id, name, company_name")
      .eq("id", clientId)
      .maybeSingle();
    if (!data) return;
    const company = (data.company_name ?? "").trim();
    const option: AppDropdownOptionRow = {
      id: data.id,
      value: data.id,
      label: company || data.name,
      filterText: [data.name, data.company_name].filter(Boolean).join(" ") || null,
      canDelete: false,
    };
    setClientOptions((prev) => {
      if (prev.some((o) => o.id === option.id || o.value === option.value)) {
        return prev.map((o) =>
          o.id === option.id || o.value === option.value ? option : o,
        );
      }
      return [option, ...prev];
    });
    setClientId(data.id);
  }

  async function refreshIsCodeOption(isCodeId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("is_codes")
      .select("id, is_number, is_code_title, revision_year")
      .eq("id", isCodeId)
      .maybeSingle();
    if (!data) return;
    const option: IsCodeComboboxOption = {
      id: data.id,
      label: `${data.is_number}: ${data.revision_year}`,
      filterText: `${data.is_number} ${data.revision_year} ${data.is_code_title ?? ""}`,
    };
    setIsCodeOptions((prev) => {
      if (prev.some((o) => o.id === option.id)) {
        return prev.map((o) => (o.id === option.id ? option : o));
      }
      return [option, ...prev];
    });
    setIsCodeId(data.id);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingOptions(true);
      const supabase = createClient();
      const [{ data: clients }, { data: codes }] = await Promise.all([
        supabase
          .from("clients")
          .select("id, name, company_name")
          .order("name", { ascending: true }),
        supabase
          .from("is_codes")
          .select("id, is_number, is_code_title, revision_year")
          .order("is_number", { ascending: true }),
      ]);
      if (cancelled) return;

      setClientOptions(
        (clients ?? []).map((c) => {
          const company = (c.company_name ?? "").trim();
          return {
            id: c.id,
            value: c.id,
            label: company || c.name,
            filterText: [c.name, c.company_name].filter(Boolean).join(" ") || null,
            canDelete: false,
          };
        }),
      );
      setIsCodeOptions(
        (codes ?? []).map((r) => ({
          id: r.id,
          label: `${r.is_number}: ${r.revision_year}`,
          filterText: `${r.is_number} ${r.revision_year} ${r.is_code_title ?? ""}`,
        })),
      );
      setBillingFrequencyOptions(
        BILLING_FREQUENCIES.map((f) => ({
          id: f,
          value: f,
          label: f,
          filterText: f,
          canDelete: false,
        })),
      );
      setLoadingOptions(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = Boolean(clientId && isCodeId) && !saving && !loadingOptions;

  function handleScopeTypeChange(next: LicenseScopeFormat) {
    if (next === scopeType) return;
    if (next === "table") {
      const rows = plainTextToScopeRows(scopePlain);
      setScopeRowsJson(JSON.stringify(rows.length > 0 ? rows : []));
      setScopeType(next);
      return;
    }
    let tableRows = storedRowsToEditorRows([]);
    try {
      const parsed = JSON.parse(scopeRowsJson || "[]") as {
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
    setScopePlain(serializeLicenseScopeText("table", scopePlain, tableRows));
    setScopeType(next);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !isCodeId) return;
    setError(null);
    startSave(async () => {
      const res = await createPendingApplication({
        clientId,
        isCodeId,
        targetDate: targetDate || null,
        portalUserId,
        portalPassword,
        caseHandledBy,
        caseReferredBy,
        billingAmount,
        billingFrequency,
        licenseScopeFormat: scopeType,
        licenseScopePlain: scopePlain,
        licenseScopeRowsJson: scopeRowsJson,
        isQeManaged: isQeManaged === "1",
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated();
      onClose();
    });
  }

  return (
    <>
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-zinc-950/50 p-4 dark:bg-black/55 ${
        sidebarOpen ? "lg:left-64" : "lg:left-0"
      }`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-new-application-title"
        className="my-auto w-full max-w-5xl rounded-none border-[2mm] border-zinc-300 bg-zinc-50 shadow-2xl dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pb-5 pt-0">
          <div className="-mx-4 mb-4 flex items-center justify-between gap-3 border-b border-zinc-700 bg-zinc-800 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-800">
            <h2
              id="add-new-application-title"
              className="text-sm font-semibold text-zinc-50"
            >
              New BIS Application
            </h2>
            <DialogCloseXButton
              onClick={onClose}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-transparent text-zinc-100 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            />
          </div>

          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="min-w-0 sm:col-span-2 lg:col-span-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto] lg:gap-x-4 lg:gap-y-2">
                <div className="flex min-w-0 flex-col gap-1 sm:col-span-2 lg:col-span-1 lg:contents">
                  <label
                    htmlFor="client_id_input"
                    className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-1 lg:row-start-1`}
                  >
                    Name of Client<span className="text-red-500"> *</span>
                  </label>
                  <div className="min-w-0 w-full sm:col-span-2 lg:col-span-1 lg:col-start-1 lg:row-start-2">
                    <ClientDropdownField
                      hideLabel
                      optionKey={DROPDOWN_KEY_BIS_PROJECT_CLIENT}
                      name="client_id"
                      label="Name of Client"
                      dialogTitle="Clients"
                      addPlaceholder="New client label"
                      manageAriaLabel="Add new client"
                      value={clientId}
                      onChange={setClientId}
                      options={clientOptions}
                      selectedValue={clientId}
                      onClearSelection={() => setClientId("")}
                      includeEmptyOption={false}
                      searchPlaceholder="Search Client Name…"
                      overlayZIndexClass="z-[310]"
                      listZIndexClass="z-[310]"
                      onSuffixButtonClick={() => setShowAddClient(true)}
                    />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-1 lg:contents">
                  <label
                    htmlFor="bis_is_code_input"
                    className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-2 lg:row-start-1`}
                  >
                    IS Code<span className="text-red-500"> *</span>
                  </label>
                  <div className="min-w-0 w-full lg:col-start-2 lg:row-start-2">
                    <IsCodeCombobox
                      name="is_code_id"
                      label="IS Code"
                      hideLabel
                      inputId="bis_is_code_input"
                      value={isCodeId}
                      onChange={setIsCodeId}
                      options={isCodeOptions}
                      listZIndexClass="z-[310]"
                      onAddClick={() => setShowAddIsCode(true)}
                    />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-1 lg:contents">
                  <label
                    htmlFor="new_app_target_date"
                    className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-3 lg:row-start-1`}
                  >
                    Target Date
                  </label>
                  <div className="min-w-0 w-full lg:col-start-3 lg:row-start-2">
                    <input
                      id="new_app_target_date"
                      name="target_date"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className={fieldInputClassBase}
                    />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-1 lg:contents">
                  <label
                    htmlFor="new_app_qe_managed"
                    className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-4 lg:row-start-1`}
                  >
                    QE Management
                  </label>
                  <div className="min-w-0 w-full lg:col-start-4 lg:row-start-2">
                    <select
                      id="new_app_qe_managed"
                      name="is_qe_managed"
                      value={isQeManaged}
                      onChange={(e) =>
                        setIsQeManaged(e.target.value === "0" ? "0" : "1")
                      }
                      className={fieldInputClassBase}
                    >
                      <option value="1">Managed by QE</option>
                      <option value="0">Not Managed by QE</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 sm:col-span-2 lg:col-span-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:gap-x-4 lg:gap-y-2">
                <div className="flex min-w-0 flex-col gap-1 lg:contents">
                  <label
                    htmlFor="portal_user_id_new_app"
                    className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-1 lg:row-start-1`}
                  >
                    User ID
                  </label>
                  <div className="min-w-0 w-full lg:col-start-1 lg:row-start-2">
                    <div className={fieldInputRowShellClass}>
                      <input
                        id="portal_user_id_new_app"
                        name="portal_user_id"
                        type="text"
                        autoComplete="off"
                        value={portalUserId}
                        onChange={(e) => setPortalUserId(e.target.value)}
                        className={fieldInputInnerClass}
                      />
                      <ManakOnlineSearchLink
                        userId={portalUserId}
                        password={portalPassword}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1 lg:contents">
                  <label
                    htmlFor="portal_password_new_app"
                    className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-2 lg:row-start-1`}
                  >
                    Password
                  </label>
                  <div className="min-w-0 w-full lg:col-start-2 lg:row-start-2">
                    <input
                      id="portal_password_new_app"
                      name="portal_password"
                      type="password"
                      autoComplete="new-password"
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
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
                    htmlFor="case_handled_by_new_app_field"
                    className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-1 lg:row-start-1`}
                  >
                    Case Handled By
                  </label>
                  <div className="min-w-0 w-full lg:col-start-1 lg:row-start-2">
                    <Field
                      hideLabel
                      label="Case Handled By"
                      name="case_handled_by"
                      value={caseHandledBy}
                      onChange={setCaseHandledBy}
                    />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1 lg:contents">
                  <label
                    htmlFor="case_referred_by_new_app_field"
                    className={`${BIS_FIELD_LABEL_CLASS} lg:col-start-2 lg:row-start-1`}
                  >
                    Case Referred By
                  </label>
                  <div className="min-w-0 w-full lg:col-start-2 lg:row-start-2">
                    <Field
                      hideLabel
                      label="Case Referred By"
                      name="case_referred_by"
                      value={caseReferredBy}
                      onChange={setCaseReferredBy}
                    />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-1 lg:contents">
                  <label
                    htmlFor="billing_amount_new_app"
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
                        id="billing_amount_new_app"
                        name="billing_amount"
                        inputMode="decimal"
                        autoComplete="off"
                        value={billingAmount}
                        onChange={(e) =>
                          setBillingAmount(sanitizeCurrency(e.target.value))
                        }
                        className={`${fieldInputInnerClass} tabular-nums`}
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
                      value={billingFrequency}
                      onChange={setBillingFrequency}
                      options={billingFrequencyOptions}
                      selectedValue={billingFrequency}
                      onClearSelection={() =>
                        setBillingFrequency(DEFAULT_BILLING_FREQUENCY)
                      }
                      includeEmptyOption={false}
                      searchPlaceholder="Search billing frequency…"
                      overlayZIndexClass="z-[310]"
                      listZIndexClass="z-[310]"
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
              key={scopeType}
              scopeType={scopeType}
              plainText={scopePlain}
              rowsJson={scopeRowsJson}
              onPlainTextChange={setScopePlain}
              onRowsJsonChange={setScopeRowsJson}
            />

            {error ? (
              <p className="text-xs text-red-600 dark:text-red-400 sm:col-span-2 lg:col-span-4">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 sm:col-span-2 lg:col-span-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Creating…" : "Create Application"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    {showAddClient ? (
      <ClientMasterEmbedModal
        onClose={() => setShowAddClient(false)}
        onSuccess={async (id) => {
          setShowAddClient(false);
          await refreshClientOption(id);
        }}
      />
    ) : null}

    {showAddIsCode ? (
      <IsCodeMasterEmbedModal
        onClose={() => setShowAddIsCode(false)}
        onSuccess={async (id) => {
          setShowAddIsCode(false);
          await refreshIsCodeOption(id);
        }}
      />
    ) : null}
    </>
  );
}
