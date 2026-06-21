import { callLlmText } from "@/lib/ai/call-llm";
import { UPDATE_SOURCES } from "./sources";
import type { RegulatoryUpdate, RegulatoryUpdateSource, RegulatoryUpdateTag } from "./types";
import { withTagColors } from "./types";

const SOURCE_HOMEPAGES = Object.fromEntries(
  UPDATE_SOURCES.map((s) => [s.id, s.homepage]),
) as Record<RegulatoryUpdateSource, string>;

const SYSTEM_PROMPT = `You are a regulatory intelligence assistant for Quality Engineering, a BIS/NABL/ISO consultancy in India.

Read scraped text from official websites and return a JSON array of recent business-relevant updates.

Rules:
- ONLY include updates clearly supported by the source text
- Do NOT invent dates, IS codes, or policies
- tag: "QCO Alert" | "BIS" | "NABL" | "ISO" | "QCI" | "QAI" | "IQAS" | "Important"
- source: exactly one of BIS, ISO, NABL, QCI, QAI, IQAS (matching the section header)
- date: "Mon YYYY" or "Recent"
- title: max 90 chars
- desc: max 140 chars
- sourceUrl: URL from digest
- Return 5 to 8 concise items, newest first
- Output ONLY a JSON array`;

type RawAiUpdate = {
  tag?: string;
  date?: string;
  title?: string;
  desc?: string;
  description?: string;
  source?: string;
  sourceUrl?: string;
};

const VALID_TAGS = new Set<RegulatoryUpdateTag>([
  "QCO Alert",
  "BIS",
  "NABL",
  "ISO",
  "QCI",
  "QAI",
  "IQAS",
  "Important",
]);

const VALID_SOURCES = new Set<RegulatoryUpdateSource>([
  "BIS",
  "ISO",
  "NABL",
  "QCI",
  "QAI",
  "IQAS",
]);

function normalizeSource(raw: string | undefined): RegulatoryUpdateSource | null {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("BIS")) return "BIS";
  if (s.includes("NABL")) return "NABL";
  if (s.includes("ISO")) return "ISO";
  if (s.includes("QCI") || s.includes("QCI")) return "QCI";
  if (s.includes("QAI")) return "QAI";
  if (s.includes("IQAS")) return "IQAS";
  if (VALID_SOURCES.has(s as RegulatoryUpdateSource)) return s as RegulatoryUpdateSource;
  return null;
}

function normalizeTag(tag: string | undefined, source: RegulatoryUpdateSource): RegulatoryUpdateTag {
  const t = (tag ?? "").trim();
  if (VALID_TAGS.has(t as RegulatoryUpdateTag)) return t as RegulatoryUpdateTag;
  if (/qco|quality control/i.test(t)) return "QCO Alert";
  if (/important|alert|urgent/i.test(t)) return "Important";
  return source;
}

function extractJsonObjects(text: string): RawAiUpdate[] {
  const objects: RawAiUpdate[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          const obj = JSON.parse(text.slice(start, i + 1)) as RawAiUpdate;
          if (obj.title) objects.push(obj);
        } catch {
          // skip malformed object
        }
        start = -1;
      }
    }
  }

  return objects;
}

function parseAiJson(raw: string): RawAiUpdate[] {
  const trimmed = raw.trim();
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]) as unknown;
      if (Array.isArray(parsed)) return parsed as RawAiUpdate[];
    } catch {
      // fall through to object-by-object recovery
    }
  }

  return extractJsonObjects(trimmed);
}

function sanitizeUpdates(items: RawAiUpdate[]): Omit<RegulatoryUpdate, "tagColor">[] {
  const seen = new Set<string>();
  const out: Omit<RegulatoryUpdate, "tagColor">[] = [];

  for (const item of items) {
    const title = item.title?.trim();
    const desc = (item.desc ?? item.description)?.trim();
    const source = normalizeSource(item.source);

    if (!title || !desc || !source) continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      tag: normalizeTag(item.tag, source),
      date: item.date?.trim() || "Recent",
      title: title.slice(0, 90),
      desc: desc.slice(0, 140),
      source,
      sourceUrl: item.sourceUrl?.trim() || SOURCE_HOMEPAGES[source],
    });

    if (out.length >= 12) break;
  }

  return out;
}

export async function summarizeRegulatoryUpdates(
  sourceDigest: string,
): Promise<RegulatoryUpdate[]> {
  const userPrompt = `Extract regulatory updates from this digest:\n\n${sourceDigest}`;

  const raw = await callLlmText(SYSTEM_PROMPT, userPrompt, 4096);
  const parsed = sanitizeUpdates(parseAiJson(raw));

  if (parsed.length < 1) {
    console.error("Regulatory updates AI parse failed. Raw preview:", raw.slice(0, 500));
    throw new Error("AI returned too few valid updates");
  }

  return withTagColors(parsed);
}
