/** Known company / common domain → expected mail provider */
const DOMAIN_PROVIDER_HINTS: Record<string, "gmail" | "zoho" | "outlook"> = {
  "qengineering.in": "zoho",
  "gmail.com": "gmail",
  "googlemail.com": "gmail",
};

const COMMON_EMAIL_TYPOS: Record<string, string> = {
  "qenginerring.in": "qengineering.in",
};

export function emailDomain(address: string): string {
  return address.trim().toLowerCase().split("@")[1] ?? "";
}

export function suggestEmailTypoFix(address: string): string | null {
  const domain = emailDomain(address);
  const corrected = COMMON_EMAIL_TYPOS[domain];
  if (!corrected) return null;
  const local = address.trim().toLowerCase().split("@")[0] ?? "";
  return `${local}@${corrected}`;
}

export function expectedProviderForEmail(address: string): "gmail" | "zoho" | "outlook" | null {
  return DOMAIN_PROVIDER_HINTS[emailDomain(address)] ?? null;
}

export function providerMismatchMessage(
  address: string,
  provider: string,
): string | null {
  const typoFix = suggestEmailTypoFix(address);
  if (typoFix) {
    return `Email looks misspelled. Did you mean ${typoFix}? Use @qengineering.in (Zoho for inbox; Resend for sending).`;
  }

  const expected = expectedProviderForEmail(address);
  if (!expected || expected === provider) return null;

  const labels: Record<string, string> = {
    gmail: "Gmail / Google Workspace",
    zoho: "Zoho Mail",
    outlook: "Outlook / Microsoft 365",
  };

  return `${address} is hosted on ${labels[expected] ?? expected}, not ${labels[provider] ?? provider}. Change Provider to "${labels[expected]}" for IMAP inbox sync. Outbound mail for @qengineering.in uses Resend when RESEND_API_KEY is set.`;
}
