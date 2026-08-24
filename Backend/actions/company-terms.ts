"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeTemplateCode } from "@backend/shared/validation/template-code";
import { createClient } from "@backend/db/supabase/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectForTermsDbError(code: string | undefined) {
  if (code === "23505") {
    redirect("/dashboard/settings/company?error=terms_duplicate");
  }
  if (code === "42P01" || code === "42703") {
    redirect("/dashboard/settings/company?error=terms_schema");
  }
  if (code === "42501") {
    redirect("/dashboard/settings/company?error=terms_rls");
  }
  redirect("/dashboard/settings/company?error=terms_db");
}

async function syncLegacyCompanyTermsColumn(supabase: Awaited<ReturnType<typeof createClient>>, body: string) {
  await supabase
    .from("company_settings")
    .update({
      company_terms_text: body || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
}

export async function createCompanyTerm(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const codeRaw = str(formData, "code");
  const name = str(formData, "name");
  const body = String(formData.get("body") ?? "");
  const code = normalizeTemplateCode(codeRaw);

  if (!code || !name) {
    redirect("/dashboard/settings/company?error=terms_validate");
  }

  const { data: maxRow } = await supabase
    .from("company_terms")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder =
    typeof maxRow?.sort_order === "number" ? maxRow.sort_order + 1 : 0;

  const { error } = await supabase.from("company_terms").insert({
    code,
    name,
    body,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  });

  if (error) redirectForTermsDbError(error.code);

  if (code === "default") {
    await syncLegacyCompanyTermsColumn(supabase, body);
  }

  revalidatePath("/dashboard/settings/company");
  revalidatePath("/dashboard/finance", "layout");
  redirect("/dashboard/settings/company");
}

export async function updateCompanyTerm(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  const name = str(formData, "name");
  const body = String(formData.get("body") ?? "");

  if (!id || !name) {
    redirect("/dashboard/settings/company?error=terms_validate");
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("company_terms")
    .select("code")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing?.code) {
    redirect("/dashboard/settings/company?error=terms_not_found");
  }

  const { error } = await supabase
    .from("company_terms")
    .update({
      name,
      body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirectForTermsDbError(error.code);

  if (existing.code === "default") {
    await syncLegacyCompanyTermsColumn(supabase, body);
  }

  revalidatePath("/dashboard/settings/company");
  revalidatePath("/dashboard/finance", "layout");
  redirect("/dashboard/settings/company");
}

export async function deleteCompanyTerm(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect("/dashboard/settings/company?error=terms_validate");

  const { data: row } = await supabase
    .from("company_terms")
    .select("code")
    .eq("id", id)
    .maybeSingle();

  if (!row?.code) redirect("/dashboard/settings/company?error=terms_not_found");
  if (row.code === "default") {
    redirect("/dashboard/settings/company?error=terms_default_delete");
  }

  const { error } = await supabase.from("company_terms").delete().eq("id", id);

  if (error) redirectForTermsDbError(error.code);

  revalidatePath("/dashboard/settings/company");
  revalidatePath("/dashboard/finance", "layout");
  redirect("/dashboard/settings/company");
}
