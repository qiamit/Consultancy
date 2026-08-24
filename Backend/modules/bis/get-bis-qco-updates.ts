import { unstable_cache } from "next/cache";
import { callLlmText } from "@backend/modules/ai/call-llm";

export type BisQcoUpdate = {
  isCode: string;
  product: string;
  status: "NEW" | "HOT" | "UPD" | "ENF";
  summary: string;
  effectiveDate: string;
  sourceUrl: string;
};

const FETCH_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
};

// Primary: specific BIS compulsory certification pages
const BIS_QCO_SOURCES = [
  "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en",
  "https://www.bis.gov.in/upcoming-qcos-notified-and-due-for-implementation/?lang=en",
  "https://www.bis.gov.in/index.php/news",
];

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRelevant(text: string): string {
  const keywords =
    /IS\s*\d+|QCO|mandatory|compulsory|ISI|CRS|FMCS|scheme|quality control order|certification|notification|effective|enforcement|upcoming/i;
  const lines = text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20 && s.length <= 500 && keywords.test(s));
  return lines.slice(0, 60).join("\n");
}

async function fetchUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(18_000),
      next: { revalidate: 0 },
    });
    if (!res.ok) return "";
    const html = await res.text();
    const text = htmlToText(html);
    return extractRelevant(text).slice(0, 4000);
  } catch {
    return "";
  }
}

async function fetchBisSources(): Promise<string> {
  const results = await Promise.allSettled(
    BIS_QCO_SOURCES.map((url) => fetchUrl(url)),
  );

  const parts = results
    .map((r, i) => {
      const text = r.status === "fulfilled" ? r.value : "";
      return text.length > 80
        ? `=== SOURCE: ${BIS_QCO_SOURCES[i]} ===\n${text}`
        : null;
    })
    .filter(Boolean);

  return parts.join("\n\n").slice(0, 14_000);
}

const SYSTEM_PROMPT = `You are a BIS regulatory intelligence assistant for an Indian certification consultancy.

Read scraped content from bis.gov.in (mandatory/compulsory certification pages) and extract the TOP 10 most trending/urgent mandatory IS certification items.

Return a JSON array of exactly 10 objects:
{
  "isCode": "IS XXXX / QCO or CRS or ISI",
  "product": "Product category name (max 35 chars)",
  "status": "NEW" | "HOT" | "UPD" | "ENF",
  "summary": "Why it's trending / what changed (max 85 chars)",
  "effectiveDate": "Mon YYYY or FY YYYY-YY or Soon or Recent",
  "sourceUrl": "https://www.bis.gov.in/..."
}

Status guide:
- NEW = freshly notified QCO
- HOT = enforcement started or deadline approaching
- UPD = IS standard revised or amended
- ENF = active enforcement/penalty actions

If the scraped text is insufficient, use your knowledge of 2024-2025 BIS QCO notifications (ACs, LED, helmets, toys, steel, power banks, pressure cookers, cables, switches, cement, etc.).

Prioritise by urgency. Output ONLY a valid JSON array of 10 items.`;

const FALLBACK_UPDATES: BisQcoUpdate[] = [
  { isCode: "IS 1651 / QCO",   product: "Air Conditioners",         status: "HOT", summary: "Mandatory BIS licence — enforcement active from Jan 2025",       effectiveDate: "Jan 2025",    sourceUrl: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en" },
  { isCode: "IS 13252 / CRS",  product: "Power Banks & Chargers",   status: "HOT", summary: "CRS mandatory for power banks, laptop chargers & USB adaptors",  effectiveDate: "Apr 2025",    sourceUrl: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-ii-registration-scheme/?lang=en" },
  { isCode: "IS 4151 / QCO",   product: "Protective Helmets",       status: "ENF", summary: "BIS raids on non-ISI helmets — enforcement tightened",           effectiveDate: "FY 2025–26",  sourceUrl: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en" },
  { isCode: "IS 9873 / QCO",   product: "Toys & Baby Products",     status: "HOT", summary: "Toy QCO enforced — imports blocked without BIS licence",         effectiveDate: "Sep 2024",    sourceUrl: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en" },
  { isCode: "IS 2062 / QCO",   product: "Structural Steel",         status: "UPD", summary: "Steel QCO extended to 28 categories — ISI mark mandatory",       effectiveDate: "2024",        sourceUrl: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en" },
  { isCode: "IS 16046 / CRS",  product: "LED Lamps & Luminaires",   status: "UPD", summary: "CRS updated to new IS version — all LEDs must re-comply",        effectiveDate: "2025",        sourceUrl: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-ii-registration-scheme/?lang=en" },
  { isCode: "IS 302 / QCO",    product: "Household Appliances",     status: "NEW", summary: "New QCO covers irons, mixers, geysers under ISI scheme",         effectiveDate: "2025",        sourceUrl: "https://www.bis.gov.in/upcoming-qcos-notified-and-due-for-implementation/?lang=en" },
  { isCode: "IS 1580 / QCO",   product: "Pressure Cookers",         status: "ENF", summary: "Active enforcement — non-ISI pressure cookers seized in raids",  effectiveDate: "FY 2025–26",  sourceUrl: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en" },
  { isCode: "IS 694 / QCO",    product: "PVC Insulated Cables",     status: "HOT", summary: "Cable QCO strictly enforced at ports & markets",                 effectiveDate: "2024",        sourceUrl: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en" },
  { isCode: "IS 8395 / QCO",   product: "Switches & Socket Outlets",status: "UPD", summary: "IS 8395 revised — manufacturers must update BIS licence scope",  effectiveDate: "2025",        sourceUrl: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en" },
];

async function fetchBisQcoUpdatesUncached(): Promise<BisQcoUpdate[]> {
  try {
    const digest = await fetchBisSources();

    if (digest.length < 100) return FALLBACK_UPDATES;

    const raw = await callLlmText(
      SYSTEM_PROMPT,
      `Extract top 10 trending mandatory BIS/QCO certifications from this content:\n\n${digest}`,
      2000,
    );

    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return FALLBACK_UPDATES;

    const parsed = JSON.parse(arrayMatch[0]) as BisQcoUpdate[];
    if (!Array.isArray(parsed) || parsed.length < 5) return FALLBACK_UPDATES;

    return parsed.slice(0, 10);
  } catch {
    return FALLBACK_UPDATES;
  }
}

// Daily revalidation (24 hours)
export const getBisQcoUpdates = unstable_cache(
  fetchBisQcoUpdatesUncached,
  ["bis-qco-updates-v2"],
  { revalidate: 86_400 },
);
