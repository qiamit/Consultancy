"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bisIsCodeDisplayLabel } from "@backend/modules/bis/bis-project-is-code-label";
import { buildBisProjectTitle } from "@backend/modules/bis/bis-project-scope-label";
import {
  buildBisProjectLicenseScopeNotes,
} from "@backend/modules/bis/bis-project-license-scope-notes";
import type { LicenseScopeTableRow } from "@backend/modules/bis/application-checklist-notes";
import {
  DROPDOWN_KEY_BIS_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_PROJECT_KIND,
} from "@backend/shared/dropdown-keys";
import {
  isApplicationProjectKind,
  isLicenseProjectKind,
  licenseProjectKindDbValue,
  applicationProjectKindDbValue,
} from "@backend/modules/bis/bis-project-kind";
import {
  DEFAULT_BIS_APPLICATION_STAGE,
  isBisApplicationStage,
  type BisApplicationStage,
} from "@backend/modules/bis/application-stage";
import { requireAdminProfile } from "@backend/modules/auth/profile";
import { createClient } from "@backend/db/client/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

function dateOrNull(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

function parseMoney(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return 0;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

const KINDS = new Set<string>();

const STATUSES = new Set([
  "lead",
  "in_progress",
  "submitted",
  "completed",
  "on_hold",
  "stop_marking",
  "cancelled",
]);

const BILLING = new Set([
  "Monthly",
  "Quarterly",
  "Half Yearly",
  "Yearly",
  "Based on Work",
]);

async function allowedDropdownValues(
  supabase: Awaited<ReturnType<typeof createClient>>,
  optionKey: string,
  legacyFallback: Set<string>,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", optionKey);
  if (error || !data?.length) return legacyFallback;
  const next = new Set(
    data
      .map((r: { value: string }) => (r.value ?? "").trim())
      .filter((v): v is string => Boolean(v)),
  );
  return next.size > 0 ? next : legacyFallback;
}

async function buildTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string | null,
  isCodeId: string | null,
  fallback: string,
): Promise<string> {
  let clientName: string | null = null;
  let companyName: string | null = null;
  let isNumber: string | null = null;
  let revisionYear: number | null = null;
  let isCodeTitle: string | null = null;

  if (clientId) {
    const { data: c } = await supabase
      .from("clients")
      .select("name,company_name")
      .eq("id", clientId)
      .maybeSingle();
    if (c) {
      const row = c as { name: string; company_name: string | null };
      clientName = row.name;
      companyName = row.company_name;
    }
  }
  if (isCodeId) {
    const { data: i } = await supabase
      .from("is_codes")
      .select("is_number,is_code_title,revision_year")
      .eq("id", isCodeId)
      .maybeSingle();
    if (i) {
      const row = i as {
        is_number: string;
        is_code_title: string;
        revision_year: number | null;
      };
      isNumber = row.is_number;
      revisionYear = row.revision_year;
      isCodeTitle = row.is_code_title;
    }
  }

  return buildBisProjectTitle({
    clientName,
    companyName,
    isNumber,
    revisionYear,
    isCodeTitle,
    fallback: fallback || "BIS project",
  });
}

export async function saveBisProjectMaster(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listPathRaw = str(formData, "list_path");
  const listPath =
    listPathRaw === "/dashboard/our-bis-licenses"
      ? "/dashboard/our-bis-licenses"
      : "/dashboard/bis-projects";

  const id = nullableStr(formData, "id");
  let project_kind = str(formData, "project_kind");
  const [allowedKinds, allowedBilling] = await Promise.all([
    allowedDropdownValues(supabase, DROPDOWN_KEY_BIS_PROJECT_KIND, KINDS),
    allowedDropdownValues(supabase, DROPDOWN_KEY_BIS_BILLING_FREQUENCY, BILLING),
  ]);
  if (id) {
    const { data: existing } = await supabase
      .from("bis_projects")
      .select("project_kind")
      .eq("id", id)
      .maybeSingle();
    const existingKind = (existing?.project_kind ?? "").trim();
    if (existingKind) allowedKinds.add(existingKind);
  }
  // BIS License Operative is license-only (applications live under BIS New Applications).
  if (!project_kind || isApplicationProjectKind(project_kind) || !allowedKinds.has(project_kind)) {
    project_kind = await licenseProjectKindDbValue(supabase);
  }
  if (!allowedKinds.has(project_kind)) allowedKinds.add(project_kind);

  const client_id = nullableStr(formData, "client_id");
  if (!client_id)
    redirect(`${listPath}?error=${encodeURIComponent("client")}`);

  const is_code_id = nullableStr(formData, "is_code_id");
  if (!is_code_id)
    redirect(`${listPath}?error=${encodeURIComponent("is_code")}`);

  const cmDigits = str(formData, "cm_l_digits").replace(/\D/g, "");
  if (cmDigits.length !== 10)
    redirect(`${listPath}?error=${encodeURIComponent("cm_digits")}`);
  const cm_l_digits = cmDigits;

  const validityRaw = dateOrNull(formData, "license_validity_date");
  if (!validityRaw)
    redirect(`${listPath}?error=${encodeURIComponent("validity")}`);

  const case_handled_by = str(formData, "case_handled_by") || "Amit Kumar";
  const case_referred_by = str(formData, "case_referred_by") || "QE";

  const billing_frequency = str(formData, "billing_frequency") || "Yearly";
  if (!allowedBilling.has(billing_frequency))
    redirect(`${listPath}?error=${encodeURIComponent("billing_freq")}`);

  const billing = parseMoney(str(formData, "billing_amount"));
  if (billing === null)
    redirect(`${listPath}?error=${encodeURIComponent("billing_amount")}`);

  const portal_user_id = nullableStr(formData, "portal_user_id");
  const portal_password = nullableStr(formData, "portal_password");

  const status = str(formData, "status") || "in_progress";
  if (!STATUSES.has(status))
    redirect(`${listPath}?error=${encodeURIComponent("status")}`);

  const notes = await (async () => {
    const scopeFormat = str(formData, "license_scope_format") === "table" ? "table" : "plain";
    const scopePlain = str(formData, "license_scope_plain");
    let scopeRows: LicenseScopeTableRow[] = [];
    try {
      const rawRows = str(formData, "license_scope_rows");
      if (rawRows) {
        const parsed = JSON.parse(rawRows) as unknown;
        if (Array.isArray(parsed)) {
          scopeRows = parsed
            .map((row) => {
              if (!row || typeof row !== "object") return null;
              const r = row as Record<string, unknown>;
              return {
                component: String(r.component ?? "").trim(),
                value: String(r.value ?? "").trim(),
              };
            })
            .filter((r): r is LicenseScopeTableRow => r !== null);
        }
      }
    } catch {
      scopeRows = [];
    }

    let existingNotes: string | null = null;
    if (id) {
      const { data: existing } = await supabase
        .from("bis_projects")
        .select("notes")
        .eq("id", id)
        .maybeSingle();
      existingNotes = existing?.notes ?? null;
    }

    const built = buildBisProjectLicenseScopeNotes(existingNotes, {
      scopeType: scopeFormat,
      plainText: scopePlain,
      rows: scopeRows,
    });
    return built.trim() ? built : null;
  })();
  const title = await buildTitle(
    supabase,
    client_id,
    is_code_id,
    str(formData, "title"),
  );

  const row = {
    title,
    project_kind,
    status: status as
      | "lead"
      | "in_progress"
      | "submitted"
      | "completed"
      | "on_hold"
      | "stop_marking"
      | "cancelled",
    client_id,
    is_code_id,
    cm_l_digits,
    license_validity_date: validityRaw,
    case_handled_by,
    case_referred_by,
    billing_amount: billing,
    billing_frequency,
    portal_user_id,
    portal_password,
    license_number: nullableStr(formData, "license_number"),
    start_date: dateOrNull(formData, "start_date"),
    target_date: dateOrNull(formData, "target_date"),
    notes,
    is_qe_managed: str(formData, "is_qe_managed") === "1",
    updated_at: new Date().toISOString(),
  };

  try {
    if (id) {
      const { error } = await supabase
        .from("bis_projects")
        .update(row)
        .eq("id", id);
      if (error) {
        const hint = encodeURIComponent((error.message ?? "").slice(0, 280));
        redirect(
          `${listPath}?error=db&db_code=${encodeURIComponent(error.code ?? "")}&db_hint=${hint}`,
        );
      }
    } else {
      const { error } = await supabase.from("bis_projects").insert({
        ...row,
        created_by: user.id,
      });
      if (error) {
        const hint = encodeURIComponent((error.message ?? "").slice(0, 280));
        redirect(
          `${listPath}?error=db&db_code=${encodeURIComponent(error.code ?? "")}&db_hint=${hint}`,
        );
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed.";
    redirect(
      `${listPath}?error=db&db_hint=${encodeURIComponent(msg.slice(0, 280))}`,
    );
  }

  revalidatePath("/dashboard/bis-projects");
  revalidatePath("/dashboard/our-bis-licenses");
  redirect(listPath);
}

export async function deleteBisProject(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const trimmed = id?.trim();
  if (!trimmed) redirect("/dashboard/bis-projects");

  const { error } = await supabase.from("bis_projects").delete().eq("id", trimmed);
  if (error) redirect("/dashboard/bis-projects?error=db");

  revalidatePath("/dashboard/bis-projects");
  revalidatePath("/dashboard/our-bis-licenses");
  redirect("/dashboard/bis-projects");
}

export async function deleteBisProjects(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = [...new Set(ids.map((x) => x?.trim()).filter(Boolean))];
  if (trimmed.length === 0) redirect("/dashboard/bis-projects");

  const { error } = await supabase.from("bis_projects").delete().in("id", trimmed);
  if (error) redirect("/dashboard/bis-projects?error=db");

  revalidatePath("/dashboard/bis-projects");
  revalidatePath("/dashboard/our-bis-licenses");
  redirect("/dashboard/bis-projects");
}

/** Mark / unmark licences as QE managed (Our BIS License portfolio). */
export async function setBisProjectsQeManaged(
  ids: string[],
  managed: boolean,
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const trimmed = [
      ...new Set(ids.map((x) => String(x ?? "").trim()).filter(Boolean)),
    ];
    if (trimmed.length === 0) {
      return { ok: false, error: "No licenses selected." };
    }

    // Chunk updates so large selections stay reliable.
    const CHUNK = 200;
    for (let i = 0; i < trimmed.length; i += CHUNK) {
      const chunk = trimmed.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("bis_projects")
        .update({
          is_qe_managed: managed,
          updated_at: new Date().toISOString(),
        })
        .in("id", chunk);
      if (error) return { ok: false, error: error.message };
    }

    // Do not revalidate the full Existing Licenses page (~30k rows) — that
    // times out the server-action flight ("Failed to fetch"). Our module is small.
    revalidatePath("/dashboard/our-bis-licenses");
    return { ok: true, updated: trimmed.length };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update Our Work flag.",
    };
  }
}

/** Super-admin only: delete pending application rows (dashboard list, no redirect). */
export async function deletePendingApplicationsAsAdmin(
  ids: string[],
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  try {
    await requireAdminProfile(supabase);
  } catch {
    return { ok: false, error: "Only Super Admin can delete applications." };
  }

  const trimmed = [...new Set(ids.map((x) => String(x ?? "").trim()).filter(Boolean))];
  if (trimmed.length === 0) {
    return { ok: false, error: "Select at least one application to delete." };
  }

  const { error, count } = await supabase
    .from("bis_projects")
    .delete({ count: "exact" })
    .in("id", trimmed);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bis-projects");
  revalidatePath("/dashboard/bis-new-applications");
  revalidatePath("/dashboard/expired-licenses");
  return { ok: true, deleted: count ?? trimmed.length };
}

type ClientRef = { id: string; name: string; company_name: string | null };
type IsCodeRef = {
  id: string;
  is_number: string;
  is_code_title: string | null;
  revision_year: number | null;
};

function resolveClientId(label: string, clients: ClientRef[]): string | null {
  const t = label.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const c of clients) {
    const cn = (c.company_name ?? "").trim();
    if (cn && cn === t) return c.id;
  }
  for (const c of clients) {
    const cn = (c.company_name ?? "").trim();
    if (cn && cn.toLowerCase() === lower) return c.id;
  }
  for (const c of clients) {
    if (c.name.trim() === t) return c.id;
  }
  for (const c of clients) {
    if (c.name.trim().toLowerCase() === lower) return c.id;
  }
  return null;
}

function resolveClientIdForImport(
  r: Record<string, string>,
  clients: ClientRef[],
): string | null {
  const cid = (r.client_id ?? "").trim();
  if (cid && clients.some((c) => c.id === cid)) return cid;
  return resolveClientId(r.client_name ?? "", clients);
}

function resolveIsCodeIdForImport(
  r: Record<string, string>,
  codes: IsCodeRef[],
): string | null {
  const iid = (r.is_code_id ?? "").trim();
  if (iid && codes.some((c) => c.id === iid)) return iid;
  return resolveIsCodeId(r.is_number ?? "", codes);
}

function parseCmDigitsForImport(
  projectKind: string,
  r: Record<string, string>,
):
  | { ok: true; digits: string | null }
  | { ok: false; error: string } {
  const digits = (r.cm_l_digits ?? "").replace(/\D/g, "");
  if (digits.length === 10) {
    return { ok: true, digits };
  }
  if (digits.length > 0) {
    return {
      ok: false,
      error: "CM/L number must be exactly 10 digits or left blank.",
    };
  }
  const cmDisplay = (r.cm_display ?? "").trim();
  if (!cmDisplay) {
    return { ok: true, digits: null };
  }
  const parsed = parseCmDigits(projectKind, cmDisplay);
  if (!parsed.ok) return parsed;
  return { ok: true, digits: parsed.digits };
}

function ymdOrNullImported(
  raw: string,
  fieldLabel: string,
):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  const s = raw.trim();
  if (!s) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return {
      ok: false,
      error: `Invalid ${fieldLabel} "${raw}" (use YYYY-MM-DD or leave blank).`,
    };
  }
  return { ok: true, value: s };
}

function resolveIsCodeId(label: string, codes: IsCodeRef[]): string | null {
  const s = label.trim();
  if (!s) return null;

  const mColon = s.match(/^(.+?)\s*:\s*(\d{4})\s*$/);
  if (mColon) {
    const isNum = mColon[1]!.trim();
    const year = Number(mColon[2]);
    const hit = codes.find(
      (c) =>
        c.is_number.trim() === isNum &&
        c.revision_year != null &&
        Number(c.revision_year) === year,
    );
    if (hit) return hit.id;
  }

  const emParts = s.split(/\s+\u2014\s+/);
  if (emParts.length >= 2) {
    const isNum = emParts[0]!.trim();
    const titlePart = emParts.slice(1).join(" \u2014 ").trim();
    const candidates = codes.filter((c) => c.is_number.trim() === isNum);
    if (candidates.length === 1) return candidates[0]!.id;
    const byTitle = candidates.find(
      (c) =>
        (c.is_code_title ?? "").trim().toLowerCase() === titlePart.toLowerCase(),
    );
    if (byTitle) return byTitle.id;
  }

  for (const c of codes) {
    const synthetic = bisIsCodeDisplayLabel({
      is_number: c.is_number,
      is_code_title: c.is_code_title ?? "",
      revision_year: c.revision_year,
    });
    if (synthetic === s) return c.id;
  }
  return null;
}

function parseCmDigits(
  _projectKind: string,
  cmDisplay: string,
):
  | { ok: true; digits: string }
  | { ok: false; error: string } {
  const raw = cmDisplay.trim();
  const m = raw.match(/^CM\/L(\d{10})$/i);
  if (!m) {
    return {
      ok: false,
      error: `Invalid CM/L value "${raw}" (expected e.g. CM/L1234567890 — exactly 10 digits).`,
    };
  }
  return { ok: true, digits: m[1]! };
}

async function buildBisImportPayload(
  r: Record<string, string>,
  ctx: {
    clients: ClientRef[];
    isCodes: IsCodeRef[];
    supabase: Awaited<ReturnType<typeof createClient>>;
  },
): Promise<
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; error: string }
> {
  const [allowedKinds, allowedBilling] = await Promise.all([
    allowedDropdownValues(ctx.supabase, DROPDOWN_KEY_BIS_PROJECT_KIND, KINDS),
    allowedDropdownValues(ctx.supabase, DROPDOWN_KEY_BIS_BILLING_FREQUENCY, BILLING),
  ]);

  const project_kind = (r.project_kind ?? "").trim();
  if (!allowedKinds.has(project_kind)) {
    return { ok: false, error: `Invalid project_kind "${project_kind}".` };
  }

  const client_id = resolveClientIdForImport(r, ctx.clients);
  if (!client_id) {
    return {
      ok: false,
      error: `Unknown client (set client_id to a valid UUID from Export, or client_name to match company/contact name from Clients master).`,
    };
  }

  const is_code_id = resolveIsCodeIdForImport(r, ctx.isCodes);
  if (!is_code_id) {
    return {
      ok: false,
      error: `Unknown IS code (set is_code_id from Export, or is_number to the same text as Export, e.g. IS 1786: 2008).`,
    };
  }

  const cm = parseCmDigitsForImport(project_kind, r);
  if (!cm.ok) return { ok: false, error: cm.error };
  const cmDigitsStored = cm.digits;

  const validityRaw = (r.license_validity_date ?? "").trim();
  if (project_kind === "application") {
    if (validityRaw) {
      return {
        ok: false,
        error: "Licence validity must be blank for Application type.",
      };
    }
  }

  let licenseValidityDate: string | null = null;
  if (project_kind !== "application") {
    if (validityRaw) {
      const vd = ymdOrNullImported(validityRaw, "license_validity_date");
      if (!vd.ok) return { ok: false, error: vd.error };
      licenseValidityDate = vd.value;
    }
  }

  const case_handled_by =
    (r.case_handled_by ?? "").trim() || "Amit Kumar";
  const case_referred_by =
    (r.case_referred_by ?? "").trim() || "QE";

  const billing_frequency = (r.billing_frequency ?? "").trim() || "Yearly";
  if (!allowedBilling.has(billing_frequency)) {
    return { ok: false, error: `Invalid billing_frequency "${billing_frequency}".` };
  }

  const billing = parseMoney(r.billing_amount ?? "");
  if (billing === null) {
    return { ok: false, error: "Invalid billing_amount." };
  }

  const portal_user_id = (r.portal_user_id ?? "").trim() || null;
  const portal_password = (r.portal_password ?? "").trim() || null;

  const status = (r.status ?? "").trim() || "in_progress";
  if (!STATUSES.has(status)) {
    return { ok: false, error: `Invalid status "${status}".` };
  }

  const sd = ymdOrNullImported(r.start_date ?? "", "start_date");
  if (!sd.ok) return { ok: false, error: sd.error };
  const td = ymdOrNullImported(r.target_date ?? "", "target_date");
  if (!td.ok) return { ok: false, error: td.error };

  const title = await buildTitle(
    ctx.supabase,
    client_id,
    is_code_id,
    (r.title ?? "").trim(),
  );

  const row = {
    title,
    project_kind,
    status: status as
      | "lead"
      | "in_progress"
      | "submitted"
      | "completed"
      | "on_hold"
      | "stop_marking"
      | "cancelled",
    client_id,
    is_code_id,
    cm_l_digits: cmDigitsStored,
    license_validity_date: licenseValidityDate,
    case_handled_by,
    case_referred_by,
    billing_amount: billing,
    billing_frequency,
    portal_user_id,
    portal_password,
    license_number: (r.license_number ?? "").trim() || null,
    start_date: sd.value,
    target_date: td.value,
    notes: (r.notes ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  return { ok: true, row };
}

export async function importBisProjectsMaster(
  rows: Record<string, string>[],
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  if (rows.length === 0) {
    return { ok: false, error: "No rows to import." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: clientData, error: clientErr } = await supabase
    .from("clients")
    .select("id,name,company_name");
  if (clientErr) return { ok: false, error: clientErr.message };
  const clients = (clientData ?? []) as ClientRef[];

  const { data: isData, error: isErr } = await supabase
    .from("is_codes")
    .select("id,is_number,is_code_title,revision_year");
  if (isErr) return { ok: false, error: isErr.message };
  const isCodes = (isData ?? []) as IsCodeRef[];

  const ctx = { clients, isCodes, supabase };

  type BisImportInsertRow = Extract<
    Awaited<ReturnType<typeof buildBisImportPayload>>,
    { ok: true }
  >["row"] & { created_by: string };
  const builtRows: BisImportInsertRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const built = await buildBisImportPayload(rows[i]!, ctx);
    if (!built.ok) {
      return {
        ok: false,
        error: `Row ${i + 2} (after header): ${built.error}`,
      };
    }
    builtRows.push({ ...built.row, created_by: user.id });
  }

  const { error } = await supabase.from("bis_projects").insert(builtRows);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/bis-projects");
  return { ok: true, inserted: builtRows.length };
}

export async function updateBisProjectTargetDate(
  projectId: string,
  targetDate: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmedId = projectId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid project" };

  const trimmedDate = targetDate?.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return { ok: false, error: "Invalid date" };
  }

  const { error } = await supabase
    .from("bis_projects")
    .update({ target_date: trimmedDate, updated_at: new Date().toISOString() })
    .eq("id", trimmedId);

  if (error) return { ok: false, error: error.message };

  // Target date is edited inline; avoid revalidating the whole dashboard.
  return { ok: true };
}

export async function updateBisProjectApplicationStage(
  projectId: string,
  stage: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmedId = projectId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid project" };

  const trimmedStage = String(stage ?? "").trim();
  if (!isBisApplicationStage(trimmedStage)) {
    return { ok: false, error: "Invalid application status." };
  }

  const { error } = await supabase
    .from("bis_projects")
    .update({
      application_stage: trimmedStage as BisApplicationStage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trimmedId);

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function updateBisProjectNotes(
  projectId: string,
  notes: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmedId = projectId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid project" };

  const { error } = await supabase
    .from("bis_projects")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", trimmedId);

  if (error) return { ok: false, error: error.message };

  // Notes are saved frequently from the application checklist modal; skip
  // revalidatePath so the dashboard and open modals are not refreshed.
  return { ok: true };
}

export async function convertApplicationToLicense(
  projectId: string,
  cmLDigits: string,
  licenseValidityDate: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmedId = projectId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid project" };

  const cmDigits = (cmLDigits ?? "").replace(/\D/g, "");
  if (cmDigits.length !== 10) {
    return { ok: false, error: "CM/L number must be exactly 10 digits." };
  }

  const trimmedDate = licenseValidityDate?.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return { ok: false, error: "Pick a valid license validity date." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("bis_projects")
    .select("project_kind, is_qe_managed")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!existing) return { ok: false, error: "Project not found." };
  if (!isApplicationProjectKind(existing.project_kind)) {
    return { ok: false, error: "Only pending applications can be converted to a license." };
  }

  const licenseKind = await licenseProjectKindDbValue(supabase);

  const { error } = await supabase
    .from("bis_projects")
    .update({
      project_kind: licenseKind,
      cm_l_digits: cmDigits,
      license_validity_date: trimmedDate,
      application_stage: "License Granted",
      is_qe_managed: existing.is_qe_managed !== false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trimmedId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bis-projects");
  revalidatePath("/dashboard/our-bis-licenses");
  revalidatePath("/dashboard/bis-new-applications");
  return { ok: true };
}

/** Update CM/L and validity on an existing license (e.g. after re-application on expired row). */
export async function updateBisProjectLicenseDetails(
  projectId: string,
  cmLDigits: string,
  licenseValidityDate: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmedId = projectId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid project" };

  const cmDigits = (cmLDigits ?? "").replace(/\D/g, "");
  if (cmDigits.length !== 10) {
    return { ok: false, error: "CM/L number must be exactly 10 digits." };
  }

  const trimmedDate = licenseValidityDate?.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return { ok: false, error: "Pick a valid license validity date." };
  }

  const { error } = await supabase
    .from("bis_projects")
    .update({
      cm_l_digits: cmDigits,
      license_validity_date: trimmedDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trimmedId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bis-projects");
  revalidatePath("/dashboard/bis-new-applications");
  return { ok: true };
}

/** Create a fresh pending BIS application (no CM/L / validity yet). */
export async function createPendingApplication(input: {
  clientId: string;
  isCodeId: string;
  targetDate?: string | null;
  portalUserId?: string | null;
  portalPassword?: string | null;
  caseHandledBy?: string | null;
  caseReferredBy?: string | null;
  billingAmount?: string | number | null;
  billingFrequency?: string | null;
  licenseScopeFormat?: "plain" | "table";
  licenseScopePlain?: string | null;
  licenseScopeRowsJson?: string | null;
  isQeManaged?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const clientId = input.clientId?.trim();
  const isCodeId = input.isCodeId?.trim();
  if (!clientId) return { ok: false, error: "Select a client." };
  if (!isCodeId) return { ok: false, error: "Select an IS code." };

  const targetRaw = (input.targetDate ?? "").trim();
  const target_date =
    targetRaw && /^\d{4}-\d{2}-\d{2}$/.test(targetRaw) ? targetRaw : null;

  const [{ data: client }, { data: isCode }] = await Promise.all([
    supabase.from("clients").select("id").eq("id", clientId).maybeSingle(),
    supabase.from("is_codes").select("id").eq("id", isCodeId).maybeSingle(),
  ]);
  if (!client) return { ok: false, error: "Client not found." };
  if (!isCode) return { ok: false, error: "IS code not found." };

  const project_kind = await applicationProjectKindDbValue(supabase);
  const title = await buildTitle(supabase, clientId, isCodeId, "BIS application");
  const today = new Date().toISOString().split("T")[0]!;

  const billingRaw = String(input.billingAmount ?? "").trim().replace(/,/g, "");
  let billing_amount = 0;
  if (billingRaw) {
    const n = Number(billingRaw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "Billing amount must be a valid number." };
    }
    billing_amount = Math.round(n * 100) / 100;
  }

  const billing_frequency =
    String(input.billingFrequency ?? "").trim() || "Yearly";
  const case_handled_by =
    String(input.caseHandledBy ?? "").trim() || "Amit Kumar";
  const case_referred_by =
    String(input.caseReferredBy ?? "").trim() || "QE";
  const portal_user_id = String(input.portalUserId ?? "").trim() || null;
  const portal_password = String(input.portalPassword ?? "").trim() || null;

  const scopeFormat =
    input.licenseScopeFormat === "table" ? "table" : "plain";
  let scopeRows: LicenseScopeTableRow[] = [];
  try {
    const rawRows = String(input.licenseScopeRowsJson ?? "").trim();
    if (rawRows) {
      const parsed = JSON.parse(rawRows) as unknown;
      if (Array.isArray(parsed)) {
        scopeRows = parsed
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            return {
              component: String(r.component ?? "").trim(),
              value: String(r.value ?? "").trim(),
            };
          })
          .filter((r): r is LicenseScopeTableRow => r !== null);
      }
    }
  } catch {
    scopeRows = [];
  }
  const notesBuilt = buildBisProjectLicenseScopeNotes(null, {
    scopeType: scopeFormat,
    plainText: String(input.licenseScopePlain ?? ""),
    rows: scopeRows,
  });
  const notes = notesBuilt.trim() ? notesBuilt : null;
  const is_qe_managed = input.isQeManaged !== false;

  const { data, error } = await supabase
    .from("bis_projects")
    .insert({
      title,
      project_kind,
      status: "in_progress",
      client_id: clientId,
      is_code_id: isCodeId,
      cm_l_digits: null,
      license_validity_date: null,
      license_number: null,
      start_date: today,
      target_date,
      case_handled_by,
      case_referred_by,
      billing_amount,
      billing_frequency,
      portal_user_id,
      portal_password,
      application_stage: DEFAULT_BIS_APPLICATION_STAGE,
      notes,
      is_qe_managed,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  if (!data?.id) return { ok: false, error: "Failed to create application." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bis-new-applications");
  revalidatePath("/dashboard/bis-projects");
  return { ok: true, id: data.id as string };
}

/** Create a fresh BIS New Application from an expired / existing license, then archive the license. */
export async function convertLicenseToApplication(
  projectId: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmedId = projectId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid project" };

  const { data: existing, error: fetchError } = await supabase
    .from("bis_projects")
    .select(
      "id, title, project_kind, status, client_id, is_code_id, portal_user_id, portal_password, case_handled_by, case_referred_by, billing_amount, billing_frequency, target_date, cm_l_digits, license_number, notes",
    )
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!existing) return { ok: false, error: "Project not found." };
  if (isApplicationProjectKind(existing.project_kind)) {
    return { ok: false, error: "This record is already an application." };
  }

  const clientId = (existing.client_id as string | null)?.trim() ?? "";
  const isCodeId = (existing.is_code_id as string | null)?.trim() ?? "";
  if (!clientId) return { ok: false, error: "Client is missing on this license." };
  if (!isCodeId) return { ok: false, error: "IS code is missing on this license." };

  const applicationKind = await applicationProjectKindDbValue(supabase);
  const title = await buildTitle(supabase, clientId, isCodeId, "BIS application");
  const today = new Date().toISOString().split("T")[0]!;
  const now = new Date().toISOString();

  const targetRaw = String(existing.target_date ?? "").trim();
  const target_date =
    targetRaw && /^\d{4}-\d{2}-\d{2}$/.test(targetRaw) ? targetRaw : null;

  const cmDigits = String(existing.cm_l_digits ?? "").replace(/\D/g, "");
  const licenseNo = String(existing.license_number ?? "").trim();
  const archiveNoteParts = [
    "Converted to new application from expired license.",
    cmDigits ? `Previous CM/L: ${cmDigits}` : null,
    licenseNo ? `Previous license no: ${licenseNo}` : null,
  ].filter(Boolean);

  const { data: created, error: insertError } = await supabase
    .from("bis_projects")
    .insert({
      title,
      project_kind: applicationKind,
      status: "in_progress",
      client_id: clientId,
      is_code_id: isCodeId,
      cm_l_digits: null,
      license_validity_date: null,
      license_number: null,
      start_date: today,
      target_date,
      case_handled_by:
        String(existing.case_handled_by ?? "").trim() || "Amit Kumar",
      case_referred_by: String(existing.case_referred_by ?? "").trim() || "QE",
      billing_amount: existing.billing_amount ?? 0,
      billing_frequency:
        String(existing.billing_frequency ?? "").trim() || "Yearly",
      portal_user_id: (existing.portal_user_id as string | null)?.trim() || null,
      portal_password:
        (existing.portal_password as string | null)?.trim() || null,
      application_stage: DEFAULT_BIS_APPLICATION_STAGE,
      notes: archiveNoteParts.join(" "),
      created_by: user.id,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insertError) return { ok: false, error: insertError.message };
  if (!created?.id) return { ok: false, error: "Failed to create application." };

  const { error: archiveError } = await supabase
    .from("bis_projects")
    .update({
      status: "completed",
      notes: [
        String(existing.notes ?? "").trim(),
        `${archiveNoteParts.join(" ")} New application id: ${created.id}.`,
      ]
        .filter(Boolean)
        .join("\n"),
      updated_at: now,
    })
    .eq("id", trimmedId);

  if (archiveError) {
    // Application was created; surface archive issue but still return success id.
    console.error("convertLicenseToApplication archive failed:", archiveError.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bis-projects");
  revalidatePath("/dashboard/bis-new-applications");
  revalidatePath("/dashboard/expired-licenses");
  revalidatePath("/dashboard/bis-license-renewals");
  return { ok: true, id: created.id as string };
}
