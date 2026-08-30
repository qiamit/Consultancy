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

export function isLicenseProjectKind(value: string | null | undefined): boolean {
  const raw = (value ?? "").trim();
  if (!raw) return false;
  const key = normalizeProjectKindKey(raw);
  return key === "license" || key === "new_license";
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
  return isApplicationProjectKind(projectKind) ? "CM/A" : "CM/L";
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
