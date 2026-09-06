"use server";

import { redirect } from "next/navigation";
import { createClient } from "@backend/db/client/server";
import { formatAuthError, isDatabaseConfigured } from "@backend/shared/env";

function loginRedirect(
  next: string,
  error: string,
) {
  const params = new URLSearchParams({ error, next });
  redirect(`/login?${params.toString()}`);
}

export async function loginAction(formData: FormData) {
  const nextRaw = String(formData.get("next") ?? "/dashboard");
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  if (!isDatabaseConfigured()) {
    loginRedirect(next, "config");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    loginRedirect(next, "missing");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    loginRedirect(next, formatAuthError(error.message));
  }

  redirect(next);
}
