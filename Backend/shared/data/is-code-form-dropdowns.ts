import {
  ASPECTS,
  DEFAULT_ASPECT_OF_IS,
  DEFAULT_UNIT,
  UNITS,
} from "@backend/shared/constants/is-code-master";
import { fetchAppDropdownOptions } from "@backend/shared/data/app-dropdown-options";
import {
  DROPDOWN_KEY_IS_CODE_ASPECT,
  DROPDOWN_KEY_IS_CODE_UNIT,
} from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { createClient } from "@backend/db/client/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type IsCodeFormDropdownOptions = {
  aspectOptions: AppDropdownOptionRow[];
  unitOptions: AppDropdownOptionRow[];
};

export async function loadIsCodeFormDropdownOptions(
  supabase: Supabase,
): Promise<IsCodeFormDropdownOptions> {
  let aspectOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_IS_CODE_ASPECT,
  );
  if (aspectOptions.length === 0) {
    aspectOptions = ASPECTS.map((value, i) => ({
      id: `__static_aspect__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }
  if (!aspectOptions.some((o) => o.value === DEFAULT_ASPECT_OF_IS)) {
    aspectOptions = [
      {
        id: "__static_aspect_default__",
        value: DEFAULT_ASPECT_OF_IS,
        label: null,
        canDelete: false,
      },
      ...aspectOptions,
    ];
  }

  let unitOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_IS_CODE_UNIT,
  );
  if (unitOptions.length === 0) {
    unitOptions = UNITS.map((value, i) => ({
      id: `__static_unit__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }
  if (!unitOptions.some((o) => o.value === DEFAULT_UNIT)) {
    unitOptions = [
      {
        id: "__static_unit_default__",
        value: DEFAULT_UNIT,
        label: null,
        canDelete: false,
      },
      ...unitOptions,
    ];
  }

  return { aspectOptions, unitOptions };
}
