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

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const amountRaw = str(formData, "amount");
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount)) redirect("/dashboard/finance?error=amount");

  const txn_date = str(formData, "txn_date") || new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from("transactions").insert({
    amount,
    currency: str(formData, "currency") || "INR",
    txn_date,
    status: str(formData, "status") || "pending",
    description: nullableStr(formData, "description"),
    notes: nullableStr(formData, "notes"),
    client_id: nullableStr(formData, "client_id"),
    created_by: user.id,
  });

  if (error) redirect("/dashboard/finance?error=db");
  revalidatePath("/dashboard/finance");
  redirect("/dashboard/finance");
}
