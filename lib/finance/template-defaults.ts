import type { CompanyTextTemplateRow } from "@/lib/types/company-text-template";

export const FINANCE_DOC_TEMPLATE_MATCHERS = {
  notes: ["quotation_notes", "quotation notes"],
  terms: ["quotation_term_condition", "quotation term & condition"],
  scope: ["quotation_scope_of_work", "quotation scope of work"],
} as const;

export function pickDefaultTemplate(
  templates: CompanyTextTemplateRow[],
  exactMatches: string[],
): CompanyTextTemplateRow | null {
  if (!templates.length) return null;
  const exact = templates.find((t) => {
    const code = t.code.trim().toLowerCase();
    const name = t.name.trim().toLowerCase();
    return exactMatches.includes(code) || exactMatches.includes(name);
  });
  if (exact) return exact;
  const byDefault = templates.find((t) => {
    const code = t.code.trim().toLowerCase();
    const name = t.name.trim().toLowerCase();
    return code.includes("default") || name.includes("default");
  });
  if (byDefault) return byDefault;
  return templates.length === 1 ? templates[0] : null;
}

export function newFormTextTemplateBodies(
  notesTemplates: CompanyTextTemplateRow[],
  termsTemplates: CompanyTextTemplateRow[],
  scopeTemplates: CompanyTextTemplateRow[],
): {
  notes: string;
  terms_and_conditions: string;
  scope_of_work: string;
} {
  const notes = pickDefaultTemplate(notesTemplates, [...FINANCE_DOC_TEMPLATE_MATCHERS.notes]);
  const terms = pickDefaultTemplate(termsTemplates, [...FINANCE_DOC_TEMPLATE_MATCHERS.terms]);
  const scope = pickDefaultTemplate(scopeTemplates, [...FINANCE_DOC_TEMPLATE_MATCHERS.scope]);
  return {
    notes: notes?.body ?? "",
    terms_and_conditions: terms?.body ?? "",
    scope_of_work: scope?.body ?? "",
  };
}

export function applyDefaultTemplateBodies<
  T extends {
    notes: string;
    terms_and_conditions: string;
    scope_of_work: string;
  },
>(
  form: T,
  notesTemplates: CompanyTextTemplateRow[],
  termsTemplates: CompanyTextTemplateRow[],
  scopeTemplates: CompanyTextTemplateRow[],
): T {
  const defaults = newFormTextTemplateBodies(notesTemplates, termsTemplates, scopeTemplates);
  return {
    ...form,
    notes: form.notes.trim() ? form.notes : defaults.notes,
    terms_and_conditions: form.terms_and_conditions.trim()
      ? form.terms_and_conditions
      : defaults.terms_and_conditions,
    scope_of_work: form.scope_of_work.trim() ? form.scope_of_work : defaults.scope_of_work,
  };
}
