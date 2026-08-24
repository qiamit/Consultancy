import type { SupabaseClient } from "@backend/db/supabase/types";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

export async function fetchAppDropdownOptions(
  supabase: SupabaseClient,
  optionKey: string,
): Promise<AppDropdownOptionRow[]> {
  const { data, error } = await supabase
    .from("app_dropdown_options")
    .select("id,value,label")
    .eq("option_key", optionKey)
    .order("sort_order", { ascending: true })
    .order("value", { ascending: true });

  if (error) return [];

  return (data ?? []) as AppDropdownOptionRow[];
}
