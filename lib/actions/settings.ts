"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

export async function updateCompanySettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("company_settings").upsert(
    {
      id: 1,
      company_name: nullableStr(formData, "company_name"),
      address: nullableStr(formData, "address"),
      gst_number: nullableStr(formData, "gst_number"),
      phone: nullableStr(formData, "phone"),
      email: nullableStr(formData, "email"),
      logo_path: nullableStr(formData, "logo_path"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) redirect("/dashboard/settings/company?error=db");
  revalidatePath("/dashboard/settings/company");
}

export async function updateAppSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const site_title = str(formData, "site_title") || "Technical Consultancy";

  const { error } = await supabase.from("app_settings").upsert(
    {
      id: 1,
      site_title,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) redirect("/dashboard/settings/app?error=db");
  revalidatePath("/dashboard/settings/app");
}

export async function updateServiceOffering(
  id: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = str(formData, "name");
  if (!name) redirect("/dashboard/products?error=name");

  const { error } = await supabase
    .from("service_offerings")
    .update({
      name,
      category: nullableStr(formData, "category"),
      description: nullableStr(formData, "description"),
      is_active: formData.get("is_active") === "on",
      sort_order: Number(str(formData, "sort_order")) || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect("/dashboard/products?error=db");
  revalidatePath("/dashboard/products");
}
