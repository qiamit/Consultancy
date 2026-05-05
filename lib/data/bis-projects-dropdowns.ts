import {
  BILLING_FREQUENCIES,
  PROJECT_KIND_OPTIONS,
} from "@/components/modules/bis-projects/constants";
import { fetchAppDropdownOptions } from "@/lib/data/app-dropdown-options";
import {
  DROPDOWN_KEY_BIS_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_PROJECT_KIND,
} from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type BisProjectsFormDropdownOptions = {
  projectKindOptions: AppDropdownOptionRow[];
  billingFrequencyOptions: AppDropdownOptionRow[];
};

/** Seeded / built-in kinds — not removable from the manage dialog (matches migration seed). */
const PROTECTED_PROJECT_KIND_VALUES = new Set(
  PROJECT_KIND_OPTIONS.map((o) => o.value),
);

/** Seeded billing labels — not removable (matches migration seed). */
const PROTECTED_BILLING_FREQUENCY_VALUES = new Set<string>(
  BILLING_FREQUENCIES.map((f) => String(f)),
);

export async function loadBisProjectsFormDropdownOptions(
  supabase: Supabase,
): Promise<BisProjectsFormDropdownOptions> {
  let projectKindOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_BIS_PROJECT_KIND,
  );
  if (projectKindOptions.length === 0) {
    projectKindOptions = PROJECT_KIND_OPTIONS.map((o, i) => ({
      id: `__static_bis_kind__${i}`,
      value: o.value,
      label: o.label,
      canDelete: false,
      filterText: `${o.label} ${o.value.replace(/_/g, " ")}`,
    }));
  } else {
    projectKindOptions = projectKindOptions.map((row) => {
      const v = row.value.trim();
      const fromCatalog = PROJECT_KIND_OPTIONS.find((o) => o.value === v);
      const label = fromCatalog?.label ?? row.label ?? row.value;
      const filterText =
        fromCatalog != null
          ? `${label} ${v.replace(/_/g, " ")}`
          : (row.filterText ?? `${label} ${v}`);
      return {
        ...row,
        label,
        filterText,
        canDelete: PROTECTED_PROJECT_KIND_VALUES.has(v) ? false : true,
      };
    });
  }

  let billingFrequencyOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_BIS_BILLING_FREQUENCY,
  );
  if (billingFrequencyOptions.length === 0) {
    billingFrequencyOptions = BILLING_FREQUENCIES.map((f, i) => ({
      id: `__static_bis_billfreq__${i}`,
      value: f,
      label: f,
      canDelete: false,
    }));
  } else {
    billingFrequencyOptions = billingFrequencyOptions.map((row) => ({
      ...row,
      canDelete: PROTECTED_BILLING_FREQUENCY_VALUES.has(row.value.trim())
        ? false
        : true,
    }));
  }

  return { projectKindOptions, billingFrequencyOptions };
}
