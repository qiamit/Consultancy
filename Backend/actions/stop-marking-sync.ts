"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@backend/db/client/server";
import {
  applicationProjectKindDbValues,
  isApplicationProjectKind,
} from "@backend/modules/bis/bis-project-kind";
import {
  MANAK_STOP_MARKING_REPORT_URL,
  cmlMatchKeys,
  extractCmlNumbersFromManakHtml,
  normalizeCmlDigits,
} from "@backend/modules/bis/manak-online-portal";

export type SyncStopMarkingResult =
  | {
      ok: true;
      manakCount: number;
      matched: number;
      added: number;
      alreadyMarked: number;
      notInDbCount: number;
      notInDbSample: string[];
      reportUrl: string;
    }
  | {
      ok: false;
      error: string;
      reportUrl: string;
    };

const MANAK_FETCH_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  Referer: "https://www.manakonline.in/",
};

/**
 * Fetch Manak “Licences Under Suspension”, match CM/L to `bis_projects`,
 * and set matching rows to `status = stop_marking`.
 */
export async function syncStopMarkingFromManak(): Promise<SyncStopMarkingResult> {
  const reportUrl = MANAK_STOP_MARKING_REPORT_URL;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to sync.", reportUrl };
  }

  let html: string;
  try {
    const cookie = (process.env.MANAK_COOKIE ?? "").trim();
    const res = await fetch(reportUrl, {
      method: "GET",
      headers: {
        ...MANAK_FETCH_HEADERS,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `Manak report returned HTTP ${res.status}. Sign in on Manak, open the suspension report, or set MANAK_COOKIE on the app service — or use Add to Stop Marking manually.`,
        reportUrl,
      };
    }
    html = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return {
      ok: false,
      error: `Could not reach Manak: ${msg}`,
      reportUrl,
    };
  }

  if (!html || html.length < 200) {
    return {
      ok: false,
      error:
        "Manak returned an empty page (login/session may be required). Open the report in your browser, or add licenses manually.",
      reportUrl,
    };
  }

  const manakCmls = extractCmlNumbersFromManakHtml(html);
  if (manakCmls.length === 0) {
    return {
      ok: false,
      error:
        "No CML numbers found in the Manak HTML. The report may require a logged-in Manak session, or the page layout changed.",
      reportUrl,
    };
  }

  const applicationKinds = await applicationProjectKindDbValues(supabase);
  const appKindSet = new Set(
    applicationKinds.map((k) => k.trim().toLowerCase()),
  );

  const { data: projectRows, error: loadErr } = await supabase
    .from("bis_projects")
    .select("id, cm_l_digits, status, project_kind")
    .not("cm_l_digits", "is", null);

  if (loadErr) {
    return { ok: false, error: loadErr.message, reportUrl };
  }

  type Proj = {
    id: string;
    cm_l_digits: string | null;
    status: string | null;
    project_kind: string | null;
  };

  const candidates = ((projectRows ?? []) as Proj[]).filter((p) => {
    const kind = (p.project_kind ?? "").trim();
    if (!kind) return true;
    if (isApplicationProjectKind(kind)) return false;
    if (appKindSet.has(kind.toLowerCase())) return false;
    return Boolean(normalizeCmlDigits(p.cm_l_digits));
  });

  const byKey = new Map<string, Proj[]>();
  for (const p of candidates) {
    for (const key of cmlMatchKeys(p.cm_l_digits)) {
      const list = byKey.get(key);
      if (list) list.push(p);
      else byKey.set(key, [p]);
    }
  }

  const matchedIds = new Set<string>();
  const toUpdateIds: string[] = [];
  let alreadyMarked = 0;
  const notInDb: string[] = [];

  for (const manakCml of manakCmls) {
    let hits: Proj[] | undefined;
    for (const key of cmlMatchKeys(manakCml)) {
      hits = byKey.get(key);
      if (hits?.length) break;
    }
    if (!hits?.length) {
      notInDb.push(manakCml);
      continue;
    }
    for (const p of hits) {
      if (matchedIds.has(p.id)) continue;
      matchedIds.add(p.id);
      if ((p.status ?? "").trim() === "stop_marking") {
        alreadyMarked += 1;
      } else {
        toUpdateIds.push(p.id);
      }
    }
  }

  let added = 0;
  if (toUpdateIds.length > 0) {
    const now = new Date().toISOString();
    const chunkSize = 100;
    for (let i = 0; i < toUpdateIds.length; i += chunkSize) {
      const chunk = toUpdateIds.slice(i, i + chunkSize);
      const { error: upErr } = await supabase
        .from("bis_projects")
        .update({ status: "stop_marking", updated_at: now })
        .in("id", chunk);
      if (upErr) {
        return { ok: false, error: upErr.message, reportUrl };
      }
      added += chunk.length;
    }
  }

  revalidatePath("/dashboard");

  return {
    ok: true,
    manakCount: manakCmls.length,
    matched: matchedIds.size,
    added,
    alreadyMarked,
    notInDbCount: notInDb.length,
    notInDbSample: notInDb.slice(0, 12),
    reportUrl,
  };
}
