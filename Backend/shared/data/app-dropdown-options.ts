import type { AppDbClient } from "@backend/db/client/types";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

export async function fetchAppDropdownOptions(
  supabase: AppDbClient,
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
