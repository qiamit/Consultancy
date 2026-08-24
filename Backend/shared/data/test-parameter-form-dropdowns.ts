import {
  DEFAULT_TEST_METHOD,
  TEST_METHODS,
} from "@backend/shared/constants/test-parameter-master";
import { fetchAppDropdownOptions } from "@backend/shared/data/app-dropdown-options";
import { DROPDOWN_KEY_TEST_PARAMETER_TEST_METHOD } from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { createClient } from "@backend/db/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function loadTestParameterTestMethodOptions(
  supabase: Supabase,
): Promise<AppDropdownOptionRow[]> {
  let testMethodOptions: AppDropdownOptionRow[] = await fetchAppDropdownOptions(
    supabase,
    DROPDOWN_KEY_TEST_PARAMETER_TEST_METHOD,
  );
  if (testMethodOptions.length === 0) {
    testMethodOptions = TEST_METHODS.map((value, i) => ({
      id: `__static_test_method__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }
  if (!testMethodOptions.some((o) => o.value === DEFAULT_TEST_METHOD)) {
    testMethodOptions = [
      {
        id: "__static_test_method_default__",
        value: DEFAULT_TEST_METHOD,
        label: null,
        canDelete: false,
      },
      ...testMethodOptions,
    ];
  }
  return testMethodOptions;
}
