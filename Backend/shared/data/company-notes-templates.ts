import { normalizeTemplateCode } from "@backend/shared/validation/template-code";
import { createClient } from "@backend/db/supabase/server";
import type { CompanyTextTemplateRow } from "@backend/shared/types/company-text-template";

export async function listCompanyNotesTemplates(): Promise<CompanyTextTemplateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_notes")
    .select("id, code, name, body, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as CompanyTextTemplateRow[];
}

export async function getCompanyNotesBodyByCode(
  code: string,
): Promise<string | null> {
  const normalized = normalizeTemplateCode(code);
  if (!normalized) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_notes")
    .select("body")
    .eq("code", normalized)
    .maybeSingle();
  if (error || !data) return null;
  const body = typeof data.body === "string" ? data.body : "";
  return body;
}
