"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { settingsRedirect } from "@backend/shared/settings-tab-redirect";
import { normalizeTemplateCode } from "@backend/shared/validation/template-code";
import { createClient } from "@backend/db/client/server";

const TAB = "scope";
const BASE = "/dashboard/settings/company";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectForScopeDbError(code: string | undefined): never {
  if (code === "23505") {
    redirect(settingsRedirect(BASE, TAB, { error: "scope_duplicate" }));
  }
  if (code === "42P01" || code === "42703") {
    redirect(settingsRedirect(BASE, TAB, { error: "scope_schema" }));
  }
  if (code === "42501") {
    redirect(settingsRedirect(BASE, TAB, { error: "scope_rls" }));
  }
  redirect(settingsRedirect(BASE, TAB, { error: "scope_db" }));
}

export async function createCompanyScopeTemplate(formData: FormData) {
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
    redirect(settingsRedirect(BASE, TAB, { error: "scope_validate" }));
  }

  const { data: maxRow } = await supabase
    .from("company_scope_of_work")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder =
    typeof maxRow?.sort_order === "number" ? maxRow.sort_order + 1 : 0;

  const { error } = await supabase.from("company_scope_of_work").insert({
    code,
    name,
    body,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  });

  if (error) redirectForScopeDbError(error.code);

  revalidatePath(BASE);
  revalidatePath("/dashboard/finance", "layout");
  redirect(settingsRedirect(BASE, TAB, { saved: true }));
}

export async function updateCompanyScopeTemplate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  const name = str(formData, "name");
  const body = String(formData.get("body") ?? "");

  if (!id || !name) {
    redirect(settingsRedirect(BASE, TAB, { error: "scope_validate" }));
  }

  const { data: existing, error: fetchErr } = await supabase
    .from("company_scope_of_work")
    .select("code")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing?.code) {
    redirect(settingsRedirect(BASE, TAB, { error: "scope_not_found" }));
  }

  const { error } = await supabase
    .from("company_scope_of_work")
    .update({
      name,
      body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirectForScopeDbError(error.code);

  revalidatePath(BASE);
  revalidatePath("/dashboard/finance", "layout");
  redirect(settingsRedirect(BASE, TAB, { saved: true }));
}

export async function deleteCompanyScopeTemplate(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect(settingsRedirect(BASE, TAB, { error: "scope_validate" }));

  const { data: row } = await supabase
    .from("company_scope_of_work")
    .select("code")
    .eq("id", id)
    .maybeSingle();

  if (!row?.code) {
    redirect(settingsRedirect(BASE, TAB, { error: "scope_not_found" }));
  }
  if (row.code === "default") {
    redirect(settingsRedirect(BASE, TAB, { error: "scope_default_delete" }));
  }

  const { error } = await supabase
    .from("company_scope_of_work")
    .delete()
    .eq("id", id);

  if (error) redirectForScopeDbError(error.code);

  revalidatePath(BASE);
  revalidatePath("/dashboard/finance", "layout");
  redirect(settingsRedirect(BASE, TAB, { saved: true }));
}
