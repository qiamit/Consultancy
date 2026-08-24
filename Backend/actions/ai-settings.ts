"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@backend/db/supabase/server";

export async function updateAiSettings(formData: FormData) {
  const supabase = await createClient();

  function str(key: string) {
    return String(formData.get(key) ?? "").trim();
  }
  function bool(key: string) {
    return formData.get(key) === "1";
  }

  const enabled = bool("ai_enabled");
  const provider = str("ai_provider") || null;
  const apiKey = str("ai_api_key") || null;
  const model = str("ai_model") || null;
  const customBaseUrl = str("ai_custom_base_url") || null;

  // Per-module toggles come in as "ai_module_<key>" = "1"
  const moduleKeys = [
    "bis_projects",
    "clients",
    "finance",
    "is_codes",
    "products",
  ];
  const enabledModules: Record<string, boolean> = {};
  for (const k of moduleKeys) {
    enabledModules[k] = formData.get(`ai_module_${k}`) === "1";
  }

  const { error } = await supabase
    .from("ai_provider_settings")
    .upsert({
      id: 1,
      enabled,
      provider,
      // Only overwrite the key if a new value was submitted
      ...(apiKey && apiKey !== "••••••••" ? { api_key: apiKey } : {}),
      model,
      custom_base_url: customBaseUrl,
      enabled_modules: enabledModules,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    redirect("/dashboard/settings/app?tab=ai&error=db");
  }

  revalidatePath("/dashboard/settings/app");
  redirect("/dashboard/settings/app?tab=ai&saved=1");
}
