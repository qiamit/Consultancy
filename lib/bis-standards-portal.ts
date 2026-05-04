/**
 * [Know Your Standards](https://standards.bis.gov.in/website/know-your-standards) on the
 * [BIS portal](https://standards.bis.gov.in/website); pre-fills search via `searchTerm`.
 */
export const BIS_KNOW_YOUR_STANDARDS_URL =
  "https://standards.bis.gov.in/website/know-your-standards";

export function bisStandardsWebsiteSearchUrl(text: string): string {
  const term = text.trim();
  if (!term) return BIS_KNOW_YOUR_STANDARDS_URL;
  return `${BIS_KNOW_YOUR_STANDARDS_URL}?searchTerm=${encodeURIComponent(term)}`;
}
