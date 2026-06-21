"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const LIST_PATH = "/dashboard/finance/purchase/payment-out";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}
function nullableStr(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

export async function saveFinancePaymentOut(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = nullableStr(formData, "id");
  const amount = Number(str(formData, "amount"));
  const txn_date = str(formData, "txn_date");
  const status = str(formData, "status") || "pending";
  if (!Number.isFinite(amount)) redirect(`${LIST_PATH}?error=amount`);
  if (!txn_date) redirect(`${LIST_PATH}?error=dates`);

  const payload = {
    payment_flow: "out" as const,
    client_id: nullableStr(formData, "client_id"),
    amount,
    currency: str(formData, "currency") || "INR",
    mode_of_payment: str(formData, "mode_of_payment") || "bank",
    txn_date,
    status,
    description: nullableStr(formData, "description"),
    notes: nullableStr(formData, "notes"),
  };

  if (id) {
    const { error } = await supabase.from("transactions").update(payload).eq("id", id);
    if (error) redirect(`${LIST_PATH}?error=db`);
    revalidatePath(LIST_PATH, "layout");
    redirect(`${LIST_PATH}?id=${encodeURIComponent(id)}`);
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...payload, created_by: user.id })
    .select("id")
    .single();
  if (error || !data?.id) redirect(`${LIST_PATH}?error=db`);
  revalidatePath(LIST_PATH, "layout");
  redirect(`${LIST_PATH}?id=${encodeURIComponent(data.id as string)}`);
}

export async function deleteFinancePaymentOut(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("payment_flow", "out");
  if (error) return;
  revalidatePath(LIST_PATH, "layout");
  redirect(LIST_PATH);
}

export async function deleteFinancePaymentOutForm(formData: FormData) {
  const id = str(formData, "id");
  if (!id) return;
  await deleteFinancePaymentOut(id);
}

export async function deleteFinancePaymentOuts(ids: string[]) {
  const uniq = Array.from(new Set(ids.map((x) => x.trim()).filter(Boolean)));
  if (uniq.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", uniq)
    .eq("payment_flow", "out");
  if (error) return;
  revalidatePath(LIST_PATH, "layout");
}


