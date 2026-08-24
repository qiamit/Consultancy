"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@backend/db/supabase/server";

export type AiModelRow = {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  api_key: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type ActiveModelOption = { id: string; display_name: string; provider: string };

export async function fetchActiveAiModels(): Promise<ActiveModelOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_models")
    .select("id, display_name, provider")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as ActiveModelOption[];
}

export async function fetchAiModels(): Promise<AiModelRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_models")
    .select("id, provider, model_id, display_name, api_key, is_active, sort_order, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as AiModelRow[];
}

export async function addAiModel(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  function str(key: string) {
    return String(formData.get(key) ?? "").trim();
  }

  const provider = str("provider_custom") || str("provider");
  const modelId = str("model_id_custom") || str("model_id");
  const displayName = str("display_name") || modelId;
  const apiKey = str("api_key") || null;

  if (!provider) return { ok: false, error: "Provider is required." };
  if (!modelId) return { ok: false, error: "Model ID is required." };

  const { error } = await supabase.from("ai_models").insert({
    provider,
    model_id: modelId,
    display_name: displayName,
    api_key: apiKey,
    is_active: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/settings/app");
  return { ok: true };
}

export async function toggleAiModel(
  id: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_models")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/settings/app");
  return { ok: true };
}

export async function deleteAiModel(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_models").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/settings/app");
  return { ok: true };
}
