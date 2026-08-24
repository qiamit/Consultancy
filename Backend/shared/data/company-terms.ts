import { createClient } from "@backend/db/supabase/server";
import type { CompanyTermsRow } from "@backend/shared/types/company-terms";
import { normalizeTemplateCode } from "@backend/shared/validation/template-code";

export async function listCompanyTerms(): Promise<CompanyTermsRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_terms")
    .select("id, code, name, body, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as CompanyTermsRow[];
}

/** Resolved body for a template code, or null if missing. */
export async function getCompanyTermsBodyByCode(
  code: string,
): Promise<string | null> {
  const normalized = normalizeTemplateCode(code);
  if (!normalized) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_terms")
    .select("body")
    .eq("code", normalized)
    .maybeSingle();
  if (error || !data) return null;
  const body = typeof data.body === "string" ? data.body : "";
  return body;
}

/** @deprecated Use normalizeTemplateCode from @backend/shared/validation/template-code */
export const normalizeTermsCode = normalizeTemplateCode;
