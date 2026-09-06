"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ASPECTS,
  DEFAULT_ASPECT_OF_IS,
  DEFAULT_SLAB_1_QTY,
  DEFAULT_SLAB_2_QTY,
  DEFAULT_SLAB_3_QTY,
  DEFAULT_UNIT,
  UNITS,
} from "@backend/shared/constants/is-code-master";
import {
  DROPDOWN_KEY_IS_CODE_ASPECT,
  DROPDOWN_KEY_IS_CODE_UNIT,
} from "@backend/shared/dropdown-keys";
import {
  IS_CODE_DOCUMENTS_BUCKET,
  isCodeDocumentStoragePath,
} from "@backend/modules/storage/is-code-documents";
import { createClient } from "@backend/db/client/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

function parseYearField(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{4}$/.test(t)) return null;
  const y = Number(t);
  if (!Number.isFinite(y) || y < 1000 || y > 9999) return null;
  return y;
}

function parseRequiredYear(raw: string): number | null {
  return parseYearField(raw);
}

function parseMoney(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === ".") return 0;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

async function loadAspectSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", DROPDOWN_KEY_IS_CODE_ASPECT);
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  for (const a of ASPECTS) s.add(a);
  return s;
}

async function loadUnitSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", DROPDOWN_KEY_IS_CODE_UNIT);
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  for (const u of UNITS) s.add(u);
  return s;
}

async function isDuplicateIsNumberRevision(
  supabase: Awaited<ReturnType<typeof createClient>>,
  isNumber: string,
  revisionYear: number,
  excludeId: string | null,
): Promise<boolean> {
  let q = supabase
    .from("is_codes")
    .select("id")
    .eq("is_number", isNumber.trim())
    .eq("revision_year", revisionYear)
    .limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q.maybeSingle();
  if (error) return false;
  return data != null;
}

type SaveCtx = { aspects: Set<string>; units: Set<string> };

function rowFromForm(formData: FormData, ctx: SaveCtx) {
  const is_number = str(formData, "is_number");
  if (!is_number) return { error: "is_number" as const };

  const revision_year = parseRequiredYear(str(formData, "revision_year"));
  if (revision_year == null) return { error: "year" as const };

  const reaffRaw = str(formData, "reaffirmation_year");
  const reaffirmation_year = reaffRaw
    ? parseYearField(reaffRaw)
    : null;
  if (reaffRaw && reaffirmation_year == null)
    return { error: "reaffirm_year" as const };

  const aspect_of_is =
    str(formData, "aspect_of_is") || DEFAULT_ASPECT_OF_IS;
  if (!ctx.aspects.has(aspect_of_is))
    return { error: "enum_aspect_of_is" as const };

  const unit_of_is = str(formData, "unit_of_is") || DEFAULT_UNIT;
  if (!ctx.units.has(unit_of_is))
    return { error: "enum_unit_of_is" as const };

  const is_code_title = str(formData, "is_code_title");
  if (!is_code_title) return { error: "title" as const };

  const moneyFields = [
    ["testing_charges", str(formData, "testing_charges")],
    ["mmf_large_scale", str(formData, "mmf_large_scale")],
    ["mmf_medium_scale", str(formData, "mmf_medium_scale")],
    ["mmf_small_scale", str(formData, "mmf_small_scale")],
    ["mmf_micro_scale", str(formData, "mmf_micro_scale")],
    ["slab_1_rate", str(formData, "slab_1_rate")],
    ["slab_2_rate", str(formData, "slab_2_rate")],
    ["slab_3_rate", str(formData, "slab_3_rate")],
  ] as const;
  const amounts: Record<string, number> = {};
  for (const [k, raw] of moneyFields) {
    const v = parseMoney(raw);
    if (v === null) return { error: "amount" as const };
    amounts[k] = v;
  }

  return {
    payload: {
      is_number,
      revision_year,
      reaffirmation_year,
      amendment_number: nullableStr(formData, "amendment_number"),
      aspect_of_is,
      product_manual_number: nullableStr(formData, "product_manual_number"),
      is_code_title,
      testing_charges: amounts.testing_charges,
      unit_of_is,
      mmf_large_scale: amounts.mmf_large_scale,
      mmf_medium_scale: amounts.mmf_medium_scale,
      mmf_small_scale: amounts.mmf_small_scale,
      mmf_micro_scale: amounts.mmf_micro_scale,
      slab_1_quantity:
        str(formData, "slab_1_quantity") || DEFAULT_SLAB_1_QTY,
      slab_1_rate: amounts.slab_1_rate,
      slab_2_quantity:
        str(formData, "slab_2_quantity") || DEFAULT_SLAB_2_QTY,
      slab_2_rate: amounts.slab_2_rate,
      slab_3_quantity:
        str(formData, "slab_3_quantity") || DEFAULT_SLAB_3_QTY,
      slab_3_rate: amounts.slab_3_rate,
    },
  };
}

function Simp(r: Record<string, string>, key: string) {
  return String(r[key] ?? "").trim();
}

function Nimp(r: Record<string, string>, key: string) {
  const s = Simp(r, key);
  return s ? s : null;
}

function rowFromImportRecord(r: Record<string, string>, ctx: SaveCtx) {
  const is_number = Simp(r, "is_number");
  if (!is_number) return { error: "IS number is required." };

  const revision_year = parseRequiredYear(Simp(r, "revision_year"));
  if (revision_year == null)
    return { error: "Revision year must be a 4-digit year (1000–9999)." };

  const reaffRaw = Simp(r, "reaffirmation_year");
  const reaffirmation_year = reaffRaw
    ? parseYearField(reaffRaw)
    : null;
  if (reaffRaw && reaffirmation_year == null)
    return { error: "Reaffirmation year must be a 4-digit year or blank." };

  const aspect_of_is = Nimp(r, "aspect_of_is") ?? DEFAULT_ASPECT_OF_IS;
  if (!ctx.aspects.has(aspect_of_is))
    return { error: `Invalid aspect of IS: ${aspect_of_is}` };

  const unit_of_is = Nimp(r, "unit_of_is") ?? DEFAULT_UNIT;
  if (!ctx.units.has(unit_of_is))
    return { error: `Invalid unit: ${unit_of_is}` };

  const is_code_title = Simp(r, "is_code_title");
  if (!is_code_title) return { error: "IS code title is required." };

  const money = (key: string, def = "0") => {
    const raw = Simp(r, key) || def;
    const v = parseMoney(raw);
    if (v === null) return null as number | null;
    return v;
  };

  const testing_charges = money("testing_charges");
  if (testing_charges === null) return { error: "testing_charges must be a number." };
  const mmfL = money("mmf_large_scale");
  const mmfM = money("mmf_medium_scale");
  const mmfS = money("mmf_small_scale");
  const mmfMi = money("mmf_micro_scale");
  const s1r = money("slab_1_rate");
  const s2r = money("slab_2_rate");
  const s3r = money("slab_3_rate");
  if (
    mmfL === null ||
    mmfM === null ||
    mmfS === null ||
    mmfMi === null ||
    s1r === null ||
    s2r === null ||
    s3r === null
  ) {
    return { error: "MMF and slab rate fields must be valid numbers." };
  }

  return {
    payload: {
      is_number,
      revision_year,
      reaffirmation_year,
      amendment_number: Nimp(r, "amendment_number"),
      aspect_of_is,
      product_manual_number: Nimp(r, "product_manual_number"),
      is_code_title,
      testing_charges,
      unit_of_is,
      mmf_large_scale: mmfL,
      mmf_medium_scale: mmfM,
      mmf_small_scale: mmfS,
      mmf_micro_scale: mmfMi,
      slab_1_quantity: Nimp(r, "slab_1_quantity") ?? DEFAULT_SLAB_1_QTY,
      slab_1_rate: s1r,
      slab_2_quantity: Nimp(r, "slab_2_quantity") ?? DEFAULT_SLAB_2_QTY,
      slab_2_rate: s2r,
      slab_3_quantity: Nimp(r, "slab_3_quantity") ?? DEFAULT_SLAB_3_QTY,
      slab_3_rate: s3r,
    },
  };
}

async function uploadNewFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isCodeId: string,
  formData: FormData,
) {
  const list = formData.getAll("is_code_files");
  for (const item of list) {
    if (!(item instanceof File) || item.size === 0) continue;
    const path = isCodeDocumentStoragePath(userId, isCodeId, item.name);
    const { error: upErr } = await supabase.storage
      .from(IS_CODE_DOCUMENTS_BUCKET)
      .upload(path, item, { upsert: false });
    if (upErr) throw new Error(upErr.message);
    const { error: insErr } = await supabase.from("is_code_files").insert({
      is_code_id: isCodeId,
      storage_path: path,
      file_name: item.name,
      created_by: userId,
    });
    if (insErr) throw new Error(insErr.message);
  }
}

function isCodeRowFormErrorToMessage(code: string): string {
  const messages: Record<string, string> = {
    is_number: "IS number is required.",
    year: "Revision year must be a 4-digit year (1000–9999).",
    reaffirm_year: "Reaffirmation year must be a 4-digit year or blank.",
    enum_aspect_of_is: "Aspect of IS is not in the allowed list.",
    enum_unit_of_is: "Unit is not in the allowed list.",
    title: "IS code title is required.",
    amount: "Charges and slab amounts must be valid numbers.",
  };
  return messages[code] ?? "Could not validate the IS code form.";
}

export type ExecuteIsCodeSaveResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      redirectCode?: string;
      dbCode?: string;
      dbHint?: string;
    };

/** Save (with file uploads) without redirect — for IS Code form embedded in BIS. */
export async function executeSaveIsCodeMaster(
  formData: FormData,
): Promise<ExecuteIsCodeSaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", redirectCode: "db" };
  }

  const id = nullableStr(formData, "id");
  const aspects = await loadAspectSet(supabase);
  const units = await loadUnitSet(supabase);
  const parsed = rowFromForm(formData, { aspects, units });
  if ("error" in parsed) {
    const code = String(parsed.error ?? "");
    return {
      ok: false,
      error: isCodeRowFormErrorToMessage(code),
      redirectCode: code,
    };
  }

  const { payload } = parsed;
  const row = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (
    await isDuplicateIsNumberRevision(
      supabase,
      row.is_number as string,
      row.revision_year as number,
      id,
    )
  ) {
    return {
      ok: false,
      error: "An IS code with this number and revision year already exists.",
      redirectCode: "duplicate",
    };
  }

  try {
    if (id) {
      const { error } = await supabase.from("is_codes").update(row).eq("id", id);
      if (error) {
        if (error.code === "23505") {
          return {
            ok: false,
            error: "An IS code with this number and revision year already exists.",
            redirectCode: "duplicate",
          };
        }
        return {
          ok: false,
          error: (error.message ?? "Unknown error").slice(0, 280),
          redirectCode: "db",
          dbCode: error.code ?? undefined,
          dbHint: error.message,
        };
      }
      await uploadNewFiles(supabase, user.id, id, formData);
      revalidatePath("/dashboard/is-code-master");
      revalidatePath("/dashboard/bis-projects");
      revalidatePath("/dashboard/bis-new-applications");
      return { ok: true, id };
    }

    const { data: inserted, error } = await supabase
      .from("is_codes")
      .insert({
        ...row,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          error: "An IS code with this number and revision year already exists.",
          redirectCode: "duplicate",
        };
      }
      return {
        ok: false,
        error: (error.message ?? "Unknown error").slice(0, 280),
        redirectCode: "db",
        dbCode: error.code ?? undefined,
        dbHint: error.message,
      };
    }
    const newId = inserted?.id as string | undefined;
    if (!newId) {
      return {
        ok: false,
        error: "Save succeeded but no id was returned.",
        redirectCode: "db",
      };
    }
    await uploadNewFiles(supabase, user.id, newId, formData);
    revalidatePath("/dashboard/is-code-master");
    revalidatePath("/dashboard/bis-projects");
    revalidatePath("/dashboard/bis-new-applications");
    return { ok: true, id: newId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload or save failed.";
    return {
      ok: false,
      error: msg.slice(0, 280),
      redirectCode: "db",
      dbHint: msg,
    };
  }
}

export async function saveIsCodeMaster(formData: FormData) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");

  const r = await executeSaveIsCodeMaster(formData);
  if (!r.ok) {
    if (r.redirectCode === "db" && (r.dbHint || r.dbCode)) {
      const hint = encodeURIComponent(
        (r.dbHint ?? r.error).slice(0, 280),
      );
      redirect(
        `/dashboard/is-code-master?error=db&db_code=${encodeURIComponent(r.dbCode ?? "")}&db_hint=${hint}`,
      );
    }
    if (r.redirectCode) {
      redirect(
        `/dashboard/is-code-master?error=${encodeURIComponent(r.redirectCode)}`,
      );
    }
    redirect("/dashboard/is-code-master?error=db");
  }

  redirect("/dashboard/is-code-master");
}

export async function deleteIsCodeMaster(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const trimmed = id?.trim();
  if (!trimmed) redirect("/dashboard/is-code-master");

  const { data: files } = await supabase
    .from("is_code_files")
    .select("storage_path")
    .eq("is_code_id", trimmed);
  const paths = (files ?? [])
    .map((f: { storage_path: string }) => f.storage_path)
    .filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(IS_CODE_DOCUMENTS_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("is_codes").delete().eq("id", trimmed);
  if (error) redirect("/dashboard/is-code-master?error=db");

  revalidatePath("/dashboard/is-code-master");
  redirect("/dashboard/is-code-master");
}

export async function deleteIsCodesMaster(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = [...new Set(ids.map((x) => x?.trim()).filter(Boolean))];
  if (trimmed.length === 0) redirect("/dashboard/is-code-master");

  const { data: files } = await supabase
    .from("is_code_files")
    .select("storage_path")
    .in("is_code_id", trimmed);
  const paths = (files ?? [])
    .map((f: { storage_path: string }) => f.storage_path)
    .filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from(IS_CODE_DOCUMENTS_BUCKET).remove(paths);
  }

  const { error } = await supabase.from("is_codes").delete().in("id", trimmed);
  if (error) redirect("/dashboard/is-code-master?error=db");

  revalidatePath("/dashboard/is-code-master");
  redirect("/dashboard/is-code-master");
}

export async function addIsCodeFiles(
  isCodeId: string,
  formData: FormData,
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const id = isCodeId?.trim();
  if (!id) return { ok: false, error: "Invalid IS code id." };

  const list = formData.getAll("files");
  let added = 0;
  for (const item of list) {
    if (!(item instanceof File) || item.size === 0) continue;
    const path = isCodeDocumentStoragePath(user.id, id, item.name);
    const { error: upErr } = await supabase.storage
      .from(IS_CODE_DOCUMENTS_BUCKET)
      .upload(path, item, { upsert: false });
    if (upErr) return { ok: false, error: upErr.message };
    const { error: insErr } = await supabase.from("is_code_files").insert({
      is_code_id: id,
      storage_path: path,
      file_name: item.name,
      created_by: user.id,
    });
    if (insErr) return { ok: false, error: insErr.message };
    added++;
  }

  revalidatePath("/dashboard/is-code-master");
  return { ok: true, added };
}

export async function deleteIsCodeFile(fileId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const fid = fileId?.trim();
  if (!fid) redirect("/dashboard/is-code-master");

  const { data: row, error: selErr } = await supabase
    .from("is_code_files")
    .select("id, is_code_id, storage_path")
    .eq("id", fid)
    .maybeSingle();
  if (selErr || !row) redirect("/dashboard/is-code-master?error=db");

  await supabase.storage
    .from(IS_CODE_DOCUMENTS_BUCKET)
    .remove([(row as { storage_path: string }).storage_path]);

  const { error } = await supabase.from("is_code_files").delete().eq("id", fid);
  if (error) redirect("/dashboard/is-code-master?error=db");

  const isCodeId = (row as { is_code_id: string }).is_code_id;
  revalidatePath("/dashboard/is-code-master");
  redirect(`/dashboard/is-code-master?id=${encodeURIComponent(isCodeId)}`);
}

/** Delete an IS code file without redirect (for modals). */
export async function removeIsCodeFile(
  fileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const fid = fileId?.trim();
  if (!fid) return { ok: false, error: "Invalid file." };

  const { data: row, error: selErr } = await supabase
    .from("is_code_files")
    .select("id, is_code_id, storage_path")
    .eq("id", fid)
    .maybeSingle();
  if (selErr) return { ok: false, error: selErr.message };
  if (!row) return { ok: false, error: "File not found." };

  const storagePath = (row as { storage_path: string }).storage_path;
  await supabase.storage.from(IS_CODE_DOCUMENTS_BUCKET).remove([storagePath]);

  const { error } = await supabase.from("is_code_files").delete().eq("id", fid);
  if (error) return { ok: false, error: error.message };

  const isCodeId = (row as { is_code_id: string }).is_code_id;
  revalidatePath("/dashboard/is-code-master");
  revalidatePath(`/dashboard/is-code-master?id=${encodeURIComponent(isCodeId)}`);
  return { ok: true };
}

export async function signIsCodeFileDownload(
  fileId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row, error } = await supabase
    .from("is_code_files")
    .select("storage_path")
    .eq("id", fileId.trim())
    .maybeSingle();
  if (error || !row) return { ok: false, error: "File not found." };

  const { data: signed, error: signErr } = await supabase.storage
    .from(IS_CODE_DOCUMENTS_BUCKET)
    .createSignedUrl((row as { storage_path: string }).storage_path, 3600);
  if (signErr || !signed?.signedUrl)
    return { ok: false, error: signErr?.message ?? "Could not sign URL." };
  return { ok: true, url: signed.signedUrl };
}

export async function importIsCodesMaster(
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

  const aspects = await loadAspectSet(supabase);
  const units = await loadUnitSet(supabase);

  const { data: existing } = await supabase
    .from("is_codes")
    .select("is_number, revision_year");
  const seen = new Set<string>();
  for (const r of existing ?? []) {
    const rec = r as { is_number: string; revision_year: number };
    seen.add(`${rec.is_number.trim().toLowerCase()}|${rec.revision_year}`);
  }

  const now = new Date().toISOString();
  const payloads: Array<
    Record<string, string | number | null> & {
      created_by: string;
      updated_at: string;
    }
  > = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = rowFromImportRecord(rows[i], { aspects, units });
    if ("error" in parsed) {
      return {
        ok: false,
        error: `Row ${i + 2} (after header): ${parsed.error}`,
      };
    }
    const key = `${String(parsed.payload.is_number).trim().toLowerCase()}|${parsed.payload.revision_year}`;
    if (seen.has(key)) {
      return {
        ok: false,
        error: `Row ${i + 2}: duplicate IS number and revision year (“${parsed.payload.is_number}” / ${parsed.payload.revision_year}) in database or file.`,
      };
    }
    seen.add(key);
    payloads.push({
      ...parsed.payload,
      created_by: user.id,
      updated_at: now,
    });
  }

  const { error } = await supabase.from("is_codes").insert(payloads);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error:
          "Import failed: duplicate IS number and revision year for one or more rows.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/is-code-master");
  return { ok: true, inserted: payloads.length };
}
