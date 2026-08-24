/** Normalizes and validates link codes for company text templates (terms, scope, notes). */
export function normalizeTemplateCode(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/-+/g, "_");
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(s)) return null;
  return s;
}
