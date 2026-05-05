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

function safeFinanceRedirect(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s.startsWith("/dashboard/finance")) {
    return "/dashboard/finance/sales/payment-in";
  }
  if (s.includes("..") || s.includes("\n") || s.includes("\r")) {
    return "/dashboard/finance/sales/payment-in";
  }
  return s;
}

function redirectWithQuery(path: string, key: string, value: string) {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${key}=${encodeURIComponent(value)}`);
}

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const redirectPath = safeFinanceRedirect(String(formData.get("redirect_path")));

  const amountRaw = str(formData, "amount");
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount)) {
    redirectWithQuery(redirectPath, "error", "amount");
  }

  const txn_date = str(formData, "txn_date") || new Date().toISOString().slice(0, 10);

  const paymentFlowRaw = str(formData, "payment_flow");
  const payment_flow = paymentFlowRaw === "out" ? "out" : "in";

  const { error } = await supabase.from("transactions").insert({
    amount,
    currency: str(formData, "currency") || "INR",
    txn_date,
    status: str(formData, "status") || "pending",
    description: nullableStr(formData, "description"),
    notes: nullableStr(formData, "notes"),
    client_id: nullableStr(formData, "client_id"),
    payment_flow,
    created_by: user.id,
  });

  if (error) redirectWithQuery(redirectPath, "error", "db");

  revalidatePath("/dashboard/finance", "layout");
  redirect(redirectPath);
}
