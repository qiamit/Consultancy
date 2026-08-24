import { unstable_cache } from "next/cache";
import { summarizeRegulatoryUpdates } from "./ai-summarize";
import { FALLBACK_UPDATES } from "./fallback-updates";
import { buildSourceDigest, fetchAllRegulatorySources } from "./fetch-sources";
import type { RegulatoryUpdate } from "./types";

export type RegulatoryUpdatesResult = {
  updates: RegulatoryUpdate[];
  automated: boolean;
  fetchedAt: string;
  sourcesOk: number;
  sourcesTotal: number;
  message?: string;
};

const CACHE_SECONDS = Number(process.env.REGULATORY_UPDATES_CACHE_HOURS ?? 6) * 3600;

function mergeWithFallback(
  primary: RegulatoryUpdate[],
  minCount = 6,
): RegulatoryUpdate[] {
  const seen = new Set(primary.map((u) => u.title.toLowerCase()));
  const merged = [...primary];

  for (const item of FALLBACK_UPDATES) {
    if (merged.length >= Math.max(minCount, 10)) break;
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

async function fetchRegulatoryUpdatesUncached(): Promise<RegulatoryUpdatesResult> {
  const fetchedAt = new Date().toISOString();
  const sources = await fetchAllRegulatorySources();
  const sourcesOk = sources.filter((s) => s.ok).length;
  const sourcesTotal = sources.length;

  if (sourcesOk === 0) {
    return {
      updates: FALLBACK_UPDATES,
      automated: false,
      fetchedAt,
      sourcesOk,
      sourcesTotal,
      message: "Could not reach regulatory websites — showing cached highlights",
    };
  }

  try {
    const digest = buildSourceDigest(sources);
    const aiUpdates = await summarizeRegulatoryUpdates(digest);
    const updates = mergeWithFallback(aiUpdates);

    return {
      updates,
      automated: true,
      fetchedAt,
      sourcesOk,
      sourcesTotal,
      message:
        sourcesOk < sourcesTotal
          ? `Live AI feed from ${sourcesOk}/${sourcesTotal} sources (${aiUpdates.length} fresh) — ISO site may block bots`
          : `Live AI summary — ${aiUpdates.length} fresh updates from official sources`,
    };
  } catch (err) {
    console.error("Regulatory updates AI error:", err);
    return {
      updates: FALLBACK_UPDATES,
      automated: false,
      fetchedAt,
      sourcesOk,
      sourcesTotal,
      message: "AI summarization unavailable — showing last known highlights",
    };
  }
}

export const getRegulatoryUpdates = unstable_cache(
  fetchRegulatoryUpdatesUncached,
  ["regulatory-updates-v4"],
  { revalidate: CACHE_SECONDS || 21_600 },
);
