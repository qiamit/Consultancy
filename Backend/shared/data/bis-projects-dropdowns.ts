import { fetchAppDropdownOptions } from "@backend/shared/data/app-dropdown-options";
import {
  DROPDOWN_KEY_BIS_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_PROJECT_KIND,
} from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { createClient } from "@backend/db/supabase/server";
import {
  BILLING_FREQUENCIES,
} from "@/components/modules/bis-projects/constants";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type BisProjectsFormDropdownOptions = {
  projectKindOptions: AppDropdownOptionRow[];
  billingFrequencyOptions: AppDropdownOptionRow[];
};

/** Seeded billing labels — not removable (matches migration seed). */
const PROTECTED_BILLING_FREQUENCY_VALUES = new Set<string>(
  BILLING_FREQUENCIES.map((f) => String(f)),
);

export async function loadBisProjectsFormDropdownOptions(
  supabase: Supabase,
): Promise<BisProjectsFormDropdownOptions> {
  const projectKindOptions: AppDropdownOptionRow[] = (
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_BIS_PROJECT_KIND)
  ).map((row) => ({
    ...row,
    label: row.label ?? row.value,
    filterText: row.filterText ?? `${row.label ?? row.value} ${row.value}`,
    canDelete: true,
  }));

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
