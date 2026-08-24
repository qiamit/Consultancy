"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bisIsCodeDisplayLabel } from "@backend/modules/bis/bis-project-is-code-label";
import { buildBisProjectTitle } from "@backend/modules/bis/bis-project-scope-label";
import {
  DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND,
} from "@backend/shared/dropdown-keys";
import {
  isApplicationProjectKind,
  licenseProjectKindDbValue,
} from "@backend/modules/bis/bis-project-kind";
import { createClient } from "@backend/db/supabase/server";

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
    fallback: fallback || "BIS new application",
  });
}

export async function saveBisNewApplicationMaster(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = nullableStr(formData, "id");
  const project_kind = str(formData, "project_kind");
  const [allowedKinds, allowedBilling] = await Promise.all([
    allowedDropdownValues(supabase, DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND, KINDS),
    allowedDropdownValues(supabase, DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY, BILLING),
  ]);
  if (id) {
    const { data: existing } = await supabase
      .from("bis_new_applications")
      .select("project_kind")
      .eq("id", id)
      .maybeSingle();
    const existingKind = (existing?.project_kind ?? "").trim();
    if (existingKind) allowedKinds.add(existingKind);
  }
  if (!allowedKinds.has(project_kind))
    redirect(`/dashboard/bis-new-applications?error=${encodeURIComponent("kind")}`);

  const client_id = nullableStr(formData, "client_id");
  if (!client_id)
    redirect(`/dashboard/bis-new-applications?error=${encodeURIComponent("client")}`);

  const is_code_id = nullableStr(formData, "is_code_id");
  if (!is_code_id)
    redirect(`/dashboard/bis-new-applications?error=${encodeURIComponent("is_code")}`);

  const cmDigits = str(formData, "cm_l_digits").replace(/\D/g, "");
  if (cmDigits.length > 0 && cmDigits.length !== 10)
    redirect(`/dashboard/bis-new-applications?error=${encodeURIComponent("cm_digits")}`);
  const cm_l_digits = cmDigits.length === 10 ? cmDigits : null;

  const validityRaw = dateOrNull(formData, "license_validity_date");
  if (project_kind === "application") {
    if (validityRaw)
      redirect(`/dashboard/bis-new-applications?error=${encodeURIComponent("validity_na")}`);
  }

  const case_handled_by = str(formData, "case_handled_by") || "Amit Kumar";
  const case_referred_by = str(formData, "case_referred_by") || "QE";

  const billing_frequency = str(formData, "billing_frequency") || "Yearly";
  if (!allowedBilling.has(billing_frequency))
    redirect(`/dashboard/bis-new-applications?error=${encodeURIComponent("billing_freq")}`);

  const billing = parseMoney(str(formData, "billing_amount"));
  if (billing === null)
    redirect(`/dashboard/bis-new-applications?error=${encodeURIComponent("billing_amount")}`);

  const portal_user_id = nullableStr(formData, "portal_user_id");
  const portal_password = nullableStr(formData, "portal_password");

  const status = str(formData, "status") || "in_progress";
  if (!STATUSES.has(status))
    redirect(`/dashboard/bis-new-applications?error=${encodeURIComponent("status")}`);

  const notes = nullableStr(formData, "notes");
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
      | "cancelled",
    client_id,
    is_code_id,
    cm_l_digits,
    license_validity_date: project_kind === "application" ? null : validityRaw,
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
    updated_at: new Date().toISOString(),
  };

  try {
    if (id) {
      const { error } = await supabase
        .from("bis_new_applications")
        .update(row)
        .eq("id", id);
      if (error) {
        const hint = encodeURIComponent((error.message ?? "").slice(0, 280));
        redirect(
          `/dashboard/bis-new-applications?error=db&db_code=${encodeURIComponent(error.code ?? "")}&db_hint=${hint}`,
        );
      }
    } else {
      const { error } = await supabase.from("bis_new_applications").insert({
        ...row,
        created_by: user.id,
      });
      if (error) {
        const hint = encodeURIComponent((error.message ?? "").slice(0, 280));
        redirect(
          `/dashboard/bis-new-applications?error=db&db_code=${encodeURIComponent(error.code ?? "")}&db_hint=${hint}`,
        );
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed.";
    redirect(
      `/dashboard/bis-new-applications?error=db&db_hint=${encodeURIComponent(msg.slice(0, 280))}`,
    );
  }

  revalidatePath("/dashboard/bis-new-applications");
  redirect("/dashboard/bis-new-applications");
}

export async function deleteBisNewApplication(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const trimmed = id?.trim();
  if (!trimmed) redirect("/dashboard/bis-new-applications");

  const { error } = await supabase.from("bis_new_applications").delete().eq("id", trimmed);
  if (error) redirect("/dashboard/bis-new-applications?error=db");

  revalidatePath("/dashboard/bis-new-applications");
  redirect("/dashboard/bis-new-applications");
}

export async function deleteBisNewApplications(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = [...new Set(ids.map((x) => x?.trim()).filter(Boolean))];
  if (trimmed.length === 0) redirect("/dashboard/bis-new-applications");

  const { error } = await supabase.from("bis_new_applications").delete().in("id", trimmed);
  if (error) redirect("/dashboard/bis-new-applications?error=db");

  revalidatePath("/dashboard/bis-new-applications");
  redirect("/dashboard/bis-new-applications");
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
  projectKind: string,
  cmDisplay: string,
):
  | { ok: true; digits: string }
  | { ok: false; error: string } {
  const raw = cmDisplay.trim();
  const m = raw.match(/^CM\/([LA])(\d{10})$/i);
  if (!m) {
    return {
      ok: false,
      error: `Invalid CM/L or CM/A value "${raw}" (expected e.g. CM/L1234567890).`,
    };
  }
  const kindChar = m[1]!.toUpperCase();
  const digits = m[2]!;
  const want = projectKind === "application" ? "A" : "L";
  if (kindChar !== want) {
    return {
      ok: false,
      error: `CM/${kindChar} does not match project kind "${projectKind}" (use CM/A for Application, CM/L otherwise).`,
    };
  }
  return { ok: true, digits };
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
    allowedDropdownValues(ctx.supabase, DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND, KINDS),
    allowedDropdownValues(ctx.supabase, DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY, BILLING),
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

export async function importBisNewApplicationsMaster(
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

  const { error } = await supabase.from("bis_new_applications").insert(builtRows);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/bis-new-applications");
  return { ok: true, inserted: builtRows.length };
}

export async function updateBisNewApplicationNotes(
  applicationId: string,
  notes: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmedId = applicationId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid application" };

  const { error } = await supabase
    .from("bis_new_applications")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", trimmedId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateBisNewApplicationTargetDate(
  applicationId: string,
  targetDate: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmedId = applicationId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid application" };

  const trimmedDate = targetDate?.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return { ok: false, error: "Invalid date" };
  }

  const { error } = await supabase
    .from("bis_new_applications")
    .update({ target_date: trimmedDate, updated_at: new Date().toISOString() })
    .eq("id", trimmedId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function convertBisNewApplicationToLicense(
  applicationId: string,
  cmLDigits: string,
  licenseValidityDate: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const trimmedId = applicationId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid application" };

  const cmDigits = (cmLDigits ?? "").replace(/\D/g, "");
  if (cmDigits.length !== 10) {
    return { ok: false, error: "CM/L number must be exactly 10 digits." };
  }

  const trimmedDate = licenseValidityDate?.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return { ok: false, error: "Pick a valid license validity date." };
  }

  const { data: app, error: fetchError } = await supabase
    .from("bis_new_applications")
    .select("*")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!app) return { ok: false, error: "Application not found." };
  if (!isApplicationProjectKind(app.project_kind)) {
    return { ok: false, error: "Only pending applications can be converted to a license." };
  }

  const licenseKind = await licenseProjectKindDbValue(supabase);

  const { error: insertError } = await supabase.from("bis_projects").insert({
    client_id: app.client_id,
    project_kind: licenseKind,
    title: app.title,
    status: app.status,
    license_number: app.license_number,
    start_date: app.start_date,
    target_date: app.target_date,
    notes: app.notes,
    is_code_id: app.is_code_id,
    cm_l_digits: cmDigits,
    license_validity_date: trimmedDate,
    case_handled_by: app.case_handled_by,
    case_referred_by: app.case_referred_by,
    billing_amount: app.billing_amount,
    billing_frequency: app.billing_frequency,
    portal_user_id: app.portal_user_id,
    portal_password: app.portal_password,
    created_by: app.created_by ?? user.id,
  });

  if (insertError) return { ok: false, error: insertError.message };

  const { error: deleteError } = await supabase
    .from("bis_new_applications")
    .delete()
    .eq("id", trimmedId);

  if (deleteError) return { ok: false, error: deleteError.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bis-projects");
  revalidatePath("/dashboard/bis-new-applications");
  return { ok: true };
}
