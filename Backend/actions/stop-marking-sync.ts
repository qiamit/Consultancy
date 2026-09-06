"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@backend/db/client/server";
import {
  applicationProjectKindDbValues,
  isApplicationProjectKind,
} from "@backend/modules/bis/bis-project-kind";
import {
  cmlMatchKeys,
  normalizeCmlDigits,
} from "@backend/modules/bis/manak-online-portal";
import { extractCmlNumbersFromManakExcel } from "@backend/modules/bis/manak-stop-marking-excel";
import { canApplyStopMarking } from "@backend/modules/bis/bis-project-license-status";

export type ImportStopMarkingResult =
  | {
      ok: true;
      manakCount: number;
      matched: number;
      added: number;
      alreadyMarked: number;
      skippedExpired: number;
      notInDbCount: number;
      notInDbSample: string[];
    }
  | {
      ok: false;
      error: string;
    };

export type StopMarkingCmlLookup =
  | {
      ok: true;
      projectId: string;
      cm_l_digits: string;
      client_name: string;
      is_number: string | null;
      is_revision_year: number | null;
      is_code_title: string | null;
      alreadyStopMarking: boolean;
    }
  | { ok: false; error: string };

const MAX_EXCEL_BYTES = 12 * 1024 * 1024;

type Proj = {
  id: string;
  cm_l_digits: string | null;
  status: string | null;
  project_kind: string | null;
  license_validity_date: string | null;
};

async function loadLicenceProjectsByCml(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ byKey: Map<string, Proj[]>; error: string | null }> {
  const applicationKinds = await applicationProjectKindDbValues(supabase);
  const appKindSet = new Set(
    applicationKinds.map((k) => k.trim().toLowerCase()),
  );

  const { data: projectRows, error: loadErr } = await supabase
    .from("bis_projects")
    .select("id, cm_l_digits, status, project_kind, license_validity_date")
    .not("cm_l_digits", "is", null);

  if (loadErr) {
    return { byKey: new Map(), error: loadErr.message };
  }

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
  return { byKey, error: null };
}

function findProjectsForCml(
  byKey: Map<string, Proj[]>,
  manakCml: string,
): Proj[] {
  for (const key of cmlMatchKeys(manakCml)) {
    const hits = byKey.get(key);
    if (hits?.length) return hits;
  }
  return [];
}

/**
 * Import Manak Stop Marking Excel (ReportExcel.xlsx), match CM/L to `bis_projects`,
 * and set matching licence rows to `status = stop_marking`.
 * Client / IS come from existing DB rows (not from Excel firm/standard columns).
 */
export async function importStopMarkingFromManakExcel(
  formData: FormData,
): Promise<ImportStopMarkingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to import." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose a Manak Excel file (.xlsx) to import." };
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xlsm")) {
    return {
      ok: false,
      error: "Only Excel files (.xlsx) are supported. Export ReportExcel.xlsx from Manak.",
    };
  }
  if (file.size <= 0) {
    return { ok: false, error: "The uploaded Excel file is empty." };
  }
  if (file.size > MAX_EXCEL_BYTES) {
    return { ok: false, error: "Excel file is too large (max 12 MB)." };
  }

  let manakCmls: string[];
  try {
    manakCmls = await extractCmlNumbersFromManakExcel(await file.arrayBuffer());
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unable to read Excel file.",
    };
  }

  if (manakCmls.length === 0) {
    return {
      ok: false,
      error:
        "No CML numbers found in the Excel file. Check that column “CML No” is present.",
    };
  }

  const { byKey, error: loadErr } = await loadLicenceProjectsByCml(supabase);
  if (loadErr) {
    return { ok: false, error: loadErr };
  }

  const matchedIds = new Set<string>();
  const toUpdateIds: string[] = [];
  let alreadyMarked = 0;
  let skippedExpired = 0;
  const notInDb: string[] = [];

  for (const manakCml of manakCmls) {
    const hits = findProjectsForCml(byKey, manakCml);
    if (!hits.length) {
      notInDb.push(manakCml);
      continue;
    }
    for (const p of hits) {
      if (matchedIds.has(p.id)) continue;
      matchedIds.add(p.id);
      const eligible = canApplyStopMarking(
        p.project_kind ?? "licence",
        p.license_validity_date,
      );
      if (!eligible) {
        skippedExpired += 1;
        continue;
      }
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
        return { ok: false, error: upErr.message };
      }
      added += chunk.length;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/license-stop-marking");

  return {
    ok: true,
    manakCount: manakCmls.length,
    matched: matchedIds.size,
    added,
    alreadyMarked,
    skippedExpired,
    notInDbCount: notInDb.length,
    notInDbSample: notInDb.slice(0, 12),
  };
}

/** Lookup a licence project by CM/L for Add to Stop Marking autofill. */
export async function lookupStopMarkingProjectByCml(
  cmlInput: string,
): Promise<StopMarkingCmlLookup> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const digits = normalizeCmlDigits(cmlInput);
  if (digits.length < 5) {
    return { ok: false, error: "Enter a valid CM/L number (at least 5 digits)." };
  }

  const { byKey, error: loadErr } = await loadLicenceProjectsByCml(supabase);
  if (loadErr) {
    return { ok: false, error: loadErr };
  }

  const hits = findProjectsForCml(byKey, digits);
  if (!hits.length) {
    return {
      ok: false,
      error: "No matching licence found in your database for this CM/L number.",
    };
  }

  const project = hits[0]!;
  const { data: detail, error: detailErr } = await supabase
    .from("bis_projects")
    .select(
      "id, cm_l_digits, status, project_kind, license_validity_date, clients(name, company_name), is_codes(is_number, revision_year, is_code_title)",
    )
    .eq("id", project.id)
    .maybeSingle();

  if (detailErr || !detail) {
    return {
      ok: false,
      error: detailErr?.message ?? "Could not load licence details.",
    };
  }

  if (
    !canApplyStopMarking(
      (detail.project_kind as string | null) ?? "licence",
      detail.license_validity_date as string | null,
    )
  ) {
    return {
      ok: false,
      error:
        "Expired licences cannot be put on Stop Marking. Start a new application instead.",
    };
  }

  const client = Array.isArray(detail.clients)
    ? detail.clients[0]
    : (detail.clients as { name?: string | null; company_name?: string | null } | null);
  const isCode = Array.isArray(detail.is_codes)
    ? detail.is_codes[0]
    : (detail.is_codes as {
        is_number?: string | null;
        revision_year?: number | null;
        is_code_title?: string | null;
      } | null);

  const clientName =
    (client?.company_name ?? "").trim() ||
    (client?.name ?? "").trim() ||
    "—";

  return {
    ok: true,
    projectId: detail.id as string,
    cm_l_digits: normalizeCmlDigits(detail.cm_l_digits as string | null) || digits,
    client_name: clientName,
    is_number: isCode?.is_number ?? null,
    is_revision_year: isCode?.revision_year ?? null,
    is_code_title: isCode?.is_code_title ?? null,
    alreadyStopMarking: (detail.status as string | null)?.trim() === "stop_marking",
  };
}

export async function markProjectStopMarking(
  projectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }
  if (!projectId.trim()) {
    return { ok: false, error: "Missing project." };
  }

  const { error } = await supabase
    .from("bis_projects")
    .update({ status: "stop_marking", updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/license-stop-marking");
  return { ok: true };
}
