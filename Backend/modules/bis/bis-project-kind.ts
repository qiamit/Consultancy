import type { AppDbClient } from "@backend/db/client/types";
import { DROPDOWN_KEY_BIS_PROJECT_KIND } from "@backend/shared/dropdown-keys";

/** Legacy slug stored before custom project-type labels were introduced. */
export const LEGACY_APPLICATION_KIND = "application";
export const LEGACY_LICENSE_KIND = "new_license";

export function normalizeProjectKindKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function isApplicationProjectKind(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;
  return normalizeProjectKindKey(raw) === "application";
}

export function isInclusionProjectKind(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;
  const key = normalizeProjectKindKey(raw);
  return key === "inclusion" || key === "new_inclusion" || key === "bis_inclusion";
}

export function isLicenseProjectKind(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;
  const key = normalizeProjectKindKey(raw);
  return key === "license" || key === "licence" || key === "new_license";
}

/** Distinct `project_kind` values that mean “application” (for query filters). */
export async function applicationProjectKindDbValues(
  supabase: AppDbClient,
  optionKey: string = DROPDOWN_KEY_BIS_PROJECT_KIND,
): Promise<string[]> {
  const values = new Set<string>([LEGACY_APPLICATION_KIND, "Application"]);
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value, label")
    .eq("option_key", optionKey);

  for (const row of data ?? []) {
    const v = String(row.value ?? "").trim();
    const label = String(row.label ?? "").trim();
    if (v && isApplicationProjectKind(v)) values.add(v);
    if (v && label && isApplicationProjectKind(label)) values.add(v);
  }

  return Array.from(values);
}

/** Format for `.in()` / `.not(..., "in", ...)` filters. */
export function inFilter(values: string[]): string {
  return `(${values.map((v) => `"${v.replace(/"/g, '\\"')}"`).join(",")})`;
}

export function isPendingApplicationRow(row: {
  project_kind: string;
  license_validity_date?: string | null;
}): boolean {
  return (
    isApplicationProjectKind(row.project_kind) &&
    !(row.license_validity_date ?? "").trim()
  );
}

export function cmPrefixForProjectKind(projectKind: string): "CM/L" | "CM/A" {
  if (isApplicationProjectKind(projectKind)) return "CM/A";
  return "CM/L";
}

/** Distinct `project_kind` values that mean “inclusion” (for query filters). */
export async function inclusionProjectKindDbValues(
  supabase: AppDbClient,
  optionKey: string = DROPDOWN_KEY_BIS_PROJECT_KIND,
): Promise<string[]> {
  const values = new Set<string>(["Inclusion", "inclusion", "New Inclusion"]);
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value, label")
    .eq("option_key", optionKey);

  for (const row of data ?? []) {
    const v = String(row.value ?? "").trim();
    const label = String(row.label ?? "").trim();
    if (v && isInclusionProjectKind(v)) values.add(v);
    if (v && label && isInclusionProjectKind(label)) values.add(v);
  }

  return Array.from(values);
}

/** Preferred `project_kind` value for an inclusion case on an existing license. */
export async function inclusionProjectKindDbValue(
  supabase: AppDbClient,
  optionKey: string = DROPDOWN_KEY_BIS_PROJECT_KIND,
): Promise<string> {
  const values = await inclusionProjectKindDbValues(supabase, optionKey);
  for (const v of values) {
    if (normalizeProjectKindKey(v) === "inclusion") return v;
  }
  return "Inclusion";
}

export function isPendingInclusionRow(row: {
  project_kind: string;
  license_validity_date?: string | null;
  status?: string | null;
}): boolean {
  if (!isInclusionProjectKind(row.project_kind)) return false;
  // Finished inclusions must not reappear as pending (or as licenses).
  if ((row.license_validity_date ?? "").trim()) return false;
  const status = (row.status ?? "").trim().toLowerCase();
  if (status === "completed" || status === "cancelled") return false;
  return true;
}

/** Inclusion row finished (scope merged) — still listed under New Inclusion, last. */
export function isCompletedInclusionRow(row: {
  project_kind: string;
  license_validity_date?: string | null;
  status?: string | null;
}): boolean {
  if (!isInclusionProjectKind(row.project_kind)) return false;
  const status = (row.status ?? "").trim().toLowerCase();
  if (status === "completed") return true;
  // Legacy finish set a validity date on the inclusion case.
  return Boolean((row.license_validity_date ?? "").trim());
}

/** Pending + completed inclusion cases for the New Inclusion list (not cancelled). */
export function isInclusionCaseListRow(row: {
  project_kind: string;
  status?: string | null;
}): boolean {
  if (!isInclusionProjectKind(row.project_kind)) return false;
  const status = (row.status ?? "").trim().toLowerCase();
  return status !== "cancelled";
}

/** Pending first (newest), then completed last (newest within group). */
export function compareInclusionListRows(
  a: {
    created_at?: string | null;
    updated_at?: string | null;
    license_validity_date?: string | null;
    status?: string | null;
    project_kind: string;
  },
  b: {
    created_at?: string | null;
    updated_at?: string | null;
    license_validity_date?: string | null;
    status?: string | null;
    project_kind: string;
  },
): number {
  const aDone = isCompletedInclusionRow(a);
  const bDone = isCompletedInclusionRow(b);
  if (aDone !== bDone) return aDone ? 1 : -1;
  const aTime = aDone
    ? Date.parse(String(a.updated_at ?? a.created_at ?? "")) || 0
    : Date.parse(String(a.created_at ?? "")) || 0;
  const bTime = bDone
    ? Date.parse(String(b.updated_at ?? b.created_at ?? "")) || 0
    : Date.parse(String(b.created_at ?? "")) || 0;
  return bTime - aTime;
}

/**
 * project_kind values that are cases / workflows — not operative licenses.
 * Use to keep Inclusion (and Application) rows out of All / Our BIS Licenses.
 */
export async function nonLicenseProjectKindDbValues(
  supabase: AppDbClient,
  optionKey: string = DROPDOWN_KEY_BIS_PROJECT_KIND,
): Promise<string[]> {
  const [applications, inclusions] = await Promise.all([
    applicationProjectKindDbValues(supabase, optionKey),
    inclusionProjectKindDbValues(supabase, optionKey),
  ]);
  return Array.from(new Set([...applications, ...inclusions]));
}

/** Preferred `project_kind` value for a converted / renewed license row. */
export async function licenseProjectKindDbValue(
  supabase: AppDbClient,
  optionKey: string = DROPDOWN_KEY_BIS_PROJECT_KIND,
): Promise<string> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value, label")
    .eq("option_key", optionKey);

  for (const row of data ?? []) {
    const v = String(row.value ?? "").trim();
    const label = String(row.label ?? "").trim();
    if (v && isLicenseProjectKind(v)) return v;
    if (label && isLicenseProjectKind(label)) return v || label;
  }

  return "License";
}

/** Preferred `project_kind` value for a new / converted application row. */
export async function applicationProjectKindDbValue(
  supabase: AppDbClient,
  optionKey: string = DROPDOWN_KEY_BIS_PROJECT_KIND,
): Promise<string> {
  const values = await applicationProjectKindDbValues(supabase, optionKey);
  for (const v of values) {
    if (normalizeProjectKindKey(v) === "application") return v;
  }
  return LEGACY_APPLICATION_KIND;
}

export type BisApplicationSource = "bis_projects" | "bis_new_applications";
