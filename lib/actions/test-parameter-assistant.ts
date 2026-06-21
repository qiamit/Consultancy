"use server";

import { formatIsCodeRevisionLabel } from "@/components/modules/test-parameter-master/constants";
import type { IsCodeComboboxOption } from "@/components/modules/bis-projects/is-code-combobox";
import { loadIsCodeFormDropdownOptions } from "@/lib/data/is-code-form-dropdowns";
import { createClient } from "@/lib/supabase/server";

export async function loadTestParameterAssistantData(): Promise<{
  isCodeOptions: IsCodeComboboxOption[];
  isCodeFormDropdowns: Awaited<
    ReturnType<typeof loadIsCodeFormDropdownOptions>
  >;
}> {
  const supabase = await createClient();
  const [{ data: codes }, isCodeFormDropdowns] = await Promise.all([
    supabase
      .from("is_codes")
      .select("id, is_number, revision_year, is_code_title")
      .order("is_number", { ascending: true }),
    loadIsCodeFormDropdownOptions(supabase),
  ]);

  const isCodeOptions: IsCodeComboboxOption[] = (codes ?? []).map((c) => ({
    id: c.id,
    label: formatIsCodeRevisionLabel(c.is_number, c.revision_year),
    filterText: `${c.is_number} ${c.is_code_title ?? ""}`,
  }));

  return { isCodeOptions, isCodeFormDropdowns };
}
