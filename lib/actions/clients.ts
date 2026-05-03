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

export async function createClientRecord(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = str(formData, "name");
  if (!name) redirect("/dashboard/clients/new?error=name");

  const { error } = await supabase.from("clients").insert({
    name,
    company_name: nullableStr(formData, "company_name"),
    email: nullableStr(formData, "email"),
    phone: nullableStr(formData, "phone"),
    address: nullableStr(formData, "address"),
    notes: nullableStr(formData, "notes"),
    created_by: user.id,
  });

  if (error) redirect("/dashboard/clients/new?error=db");
  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

export async function updateClientRecord(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = str(formData, "name");
  if (!name) redirect(`/dashboard/clients/${id}?error=name`);

  const { error } = await supabase
    .from("clients")
    .update({
      name,
      company_name: nullableStr(formData, "company_name"),
      email: nullableStr(formData, "email"),
      phone: nullableStr(formData, "phone"),
      address: nullableStr(formData, "address"),
      notes: nullableStr(formData, "notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect(`/dashboard/clients/${id}?error=db`);
  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);
}
