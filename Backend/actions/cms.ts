"use server";

import { createClient } from "@backend/db/client/server";
import { revalidatePath } from "next/cache";

// --- Services ---

export async function addCmsService(data: { title: string; description: string; icon_name?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("website_services").insert([data]);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/cms/services");
  return { success: true };
}

export async function updateCmsService(id: string, data: { title?: string; description?: string; icon_name?: string; is_active?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase.from("website_services").update(data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/cms/services");
  return { success: true };
}

export async function deleteCmsService(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("website_services").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/cms/services");
  return { success: true };
}

// --- News ---

export async function addCmsNews(data: { title: string; content: string; image_url?: string; published_date?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("website_news").insert([data]);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/cms/news");
  return { success: true };
}

export async function updateCmsNews(id: string, data: { title?: string; content?: string; image_url?: string; published_date?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("website_news").update(data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/cms/news");
  return { success: true };
}

export async function deleteCmsNews(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("website_news").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/cms/news");
  return { success: true };
}

// --- Settings ---

export async function updateCmsSettings(data: {
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  about_text?: string;
  facebook_url?: string;
  linkedin_url?: string;
  instagram_url?: string;
  twitter_url?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("website_settings").update({ ...data, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/cms/settings");
  return { success: true };
}
