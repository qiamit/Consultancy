import type { BisNewApplicationMasterRow } from "@/lib/types/bis-new-application-master";

export const BIS_FIELD_LABEL_CLASS =
  "text-[4mm] font-medium leading-tight text-zinc-600 dark:text-zinc-400";

export const DEFAULT_CASE_HANDLED_BY = "Amit Kumar";
export const DEFAULT_CASE_REFERRED_BY = "QE";
export const DEFAULT_BILLING_FREQUENCY = "Yearly";
export const DEFAULT_BILLING_AMOUNT = "0.00";

export const BILLING_FREQUENCIES = [
  "Monthly",
  "Quarterly",
  "Half Yearly",
  "Yearly",
  "Based on Work",
] as const;

/** No built-in project kinds — manage via dropdown (+). */
export const PROJECT_KIND_OPTIONS: { value: string; label: string }[] = [];

export function projectKindLabel(value: string): string {
  return (
    PROJECT_KIND_OPTIONS.find((o) => o.value === value)?.label ??
    value.replace(/_/g, " ")
  );
}

export function emptyForm(): Record<string, string> {
  return {
    id: "",
    project_kind: "",
    client_id: "",
    is_code_id: "",
    cm_l_digits: "",
    license_validity_date: "",
    case_handled_by: DEFAULT_CASE_HANDLED_BY,
    case_referred_by: DEFAULT_CASE_REFERRED_BY,
    billing_amount: DEFAULT_BILLING_AMOUNT,
    billing_frequency: DEFAULT_BILLING_FREQUENCY,
    portal_user_id: "",
    portal_password: "",
    status: "in_progress",
    license_number: "",
    start_date: "",
    target_date: "",
    notes: "",
    title: "",
  };
}

export function rowToForm(r: BisNewApplicationMasterRow): Record<string, string> {
  return {
    id: r.id,
    project_kind: r.project_kind ?? "",
    client_id: r.client_id ?? "",
    is_code_id: r.is_code_id ?? "",
    cm_l_digits: r.cm_l_digits ?? "",
    license_validity_date: r.license_validity_date ?? "",
    case_handled_by: r.case_handled_by ?? DEFAULT_CASE_HANDLED_BY,
    case_referred_by: r.case_referred_by ?? DEFAULT_CASE_REFERRED_BY,
    billing_amount:
      r.billing_amount != null && Number.isFinite(Number(r.billing_amount))
        ? (Math.round(Number(r.billing_amount) * 100) / 100).toFixed(2)
        : DEFAULT_BILLING_AMOUNT,
    billing_frequency: r.billing_frequency ?? DEFAULT_BILLING_FREQUENCY,
    portal_user_id: r.portal_user_id ?? "",
    portal_password: r.portal_password ?? "",
    status: r.status ?? "in_progress",
    license_number: r.license_number ?? "",
    start_date: r.start_date ?? "",
    target_date: r.target_date ?? "",
    notes: r.notes ?? "",
    title: r.title ?? "",
  };
}
