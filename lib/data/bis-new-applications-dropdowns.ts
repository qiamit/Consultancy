import {
  BILLING_FREQUENCIES,
} from "@/components/modules/bis-new-applications/constants";
import { fetchAppDropdownOptions } from "@/lib/data/app-dropdown-options";
import {
  DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND,
} from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type BisNewApplicationsFormDropdownOptions = {
  projectKindOptions: AppDropdownOptionRow[];
  billingFrequencyOptions: AppDropdownOptionRow[];
};

/** Seeded billing labels — not removable (matches migration seed). */
const PROTECTED_BILLING_FREQUENCY_VALUES = new Set<string>(
  BILLING_FREQUENCIES.map((f) => String(f)),
);

export async function loadBisNewApplicationsFormDropdownOptions(
  supabase: Supabase,
): Promise<BisNewApplicationsFormDropdownOptions> {
  const projectKindOptions: AppDropdownOptionRow[] = (
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND)
  ).map((row) => ({
    ...row,
    label: row.label ?? row.value,
    filterText: row.filterText ?? `${row.label ?? row.value} ${row.value}`,
    canDelete: true,
  }));

  let billingFrequencyOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY,
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
