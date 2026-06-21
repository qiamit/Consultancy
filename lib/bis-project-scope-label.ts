export function bisClientScopeLabel(
  name: string | null | undefined,
  companyName: string | null | undefined,
): string {
  const company = (companyName ?? "").trim();
  const person = (name ?? "").trim();
  if (company) return company;
  return person;
}

export function bisIsScopeLabel(input: {
  isNumber?: string | null;
  revisionYear?: number | null;
  isCodeTitle?: string | null;
}): string {
  const num = (input.isNumber ?? "").trim();
  if (!num) return "";

  const year = input.revisionYear;
  if (year != null && Number.isFinite(Number(year))) {
    return `${num}: ${year}`;
  }

  const title = (input.isCodeTitle ?? "").trim();
  if (title) return `${num} — ${title}`;
  return num;
}

export function bisLicenseScopeLabel(clientPart: string, isPart: string): string {
  const parts = [clientPart, isPart].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "—";
}

export function buildBisProjectTitle(parts: {
  clientName?: string | null;
  companyName?: string | null;
  isNumber?: string | null;
  revisionYear?: number | null;
  isCodeTitle?: string | null;
  fallback?: string;
}): string {
  const clientPart = bisClientScopeLabel(parts.clientName, parts.companyName);
  const isPart = bisIsScopeLabel({
    isNumber: parts.isNumber,
    revisionYear: parts.revisionYear,
    isCodeTitle: parts.isCodeTitle,
  });
  const joined = bisLicenseScopeLabel(clientPart, isPart);
  if (joined === "—") return parts.fallback || "BIS project";
  return joined.length > 500 ? `${joined.slice(0, 497)}…` : joined;
}

export function resolveBisLicenseScope(input: {
  clientName?: string | null;
  companyName?: string | null;
  clientNameFallback?: string | null;
  isNumber?: string | null;
  revisionYear?: number | null;
  isCodeTitle?: string | null;
}): string {
  const clientPart =
    bisClientScopeLabel(input.clientName, input.companyName) ||
    (input.clientNameFallback ?? "").trim();
  const isPart = bisIsScopeLabel({
    isNumber: input.isNumber,
    revisionYear: input.revisionYear,
    isCodeTitle: input.isCodeTitle,
  });
  return bisLicenseScopeLabel(clientPart, isPart);
}

/** Plain-text Licence Scope saved on `bis_projects.notes` (ignores checklist JSON). */
export function bisProjectSavedLicenseScope(notes: string | null | undefined): string {
  const raw = (notes ?? "").trim();
  if (!raw) return "";

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { type?: string; license_scope?: string };
      if (parsed.type === "application_checklist" || parsed.type === "bis_license_scope") {
        return (parsed.license_scope ?? "").trim();
      }
    } catch {
      // fall through — treat as plain text
    }
  }

  return raw;
}
