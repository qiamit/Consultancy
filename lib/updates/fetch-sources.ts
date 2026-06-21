import { UPDATE_SOURCES } from "./sources";

const FETCH_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
};

const MAX_CHARS_PER_SOURCE = 3_500;
const MAX_DIGEST_CHARS = 18_000;

export type FetchedSourcePayload = {
  id: string;
  name: string;
  homepage: string;
  url: string;
  ok: boolean;
  text: string;
  error?: string;
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSnippets(text: string): string {
  const lines = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40 && s.length <= 500);

  const keywords =
    /BIS|NABL|ISO|QCO|accreditation|certification|laborator|standard|mandatory|QCI|QAI|IQAS|training|notification|announcement|Posted on|Quality Control/i;

  const matched = lines.filter((l) => keywords.test(l));
  const pool = matched.length >= 8 ? matched : lines;
  return pool.slice(0, 40).join("\n");
}

async function fetchUrl(url: string): Promise<{ ok: boolean; text: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(20_000),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return { ok: false, text: "", error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const plain = htmlToText(html);
    const snippet = extractSnippets(plain).slice(0, MAX_CHARS_PER_SOURCE);

    if (snippet.length < 80) {
      return { ok: false, text: "", error: "Insufficient extractable content" };
    }

    return { ok: true, text: snippet };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return { ok: false, text: "", error: message };
  }
}

export async function fetchAllRegulatorySources(): Promise<FetchedSourcePayload[]> {
  const results = await Promise.all(
    UPDATE_SOURCES.map(async (source) => {
      for (const url of source.urls) {
        const result = await fetchUrl(url);
        if (result.ok) {
          return {
            id: source.id,
            name: source.name,
            homepage: source.homepage,
            url,
            ok: true,
            text: result.text,
          } satisfies FetchedSourcePayload;
        }
      }

      return {
        id: source.id,
        name: source.name,
        homepage: source.homepage,
        url: source.urls[0],
        ok: false,
        text: "",
        error: "All URLs failed",
      } satisfies FetchedSourcePayload;
    }),
  );

  return results;
}

export function buildSourceDigest(sources: FetchedSourcePayload[]): string {
  const body = sources
    .map((s) => {
      if (!s.ok) {
        return `=== ${s.id} (${s.name}) ===\n[Source unavailable: ${s.error ?? "unknown"}]\nURL: ${s.url}`;
      }
      return `=== ${s.id} (${s.name}) ===\nURL: ${s.url}\n${s.text}`;
    })
    .join("\n\n");

  return body.length > MAX_DIGEST_CHARS
    ? `${body.slice(0, MAX_DIGEST_CHARS)}\n\n[Digest truncated for AI processing]`
    : body;
}
