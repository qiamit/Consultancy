"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@backend/db/client/server";

const BASE_PATH = "/dashboard/test-parameters";

function formReturnPath(formData: FormData): string {
  const id = nullableStr(formData, "id");
  const scopeIsCodeId = nullableStr(formData, "scope_is_code_id");
  const params = new URLSearchParams();
  if (scopeIsCodeId) params.set("is_code_id", scopeIsCodeId);
  if (id) params.set("id", id);
  else params.set("new", "1");
  return `${BASE_PATH}?${params.toString()}`;
}

function formSavedPath(formData: FormData): string {
  const scopeIsCodeId = nullableStr(formData, "scope_is_code_id");
  if (!scopeIsCodeId) return `${BASE_PATH}?saved=1`;
  return `${BASE_PATH}?is_code_id=${encodeURIComponent(scopeIsCodeId)}&saved=1`;
}

function nullableStr(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function rowFromForm(formData: FormData):
  | { payload: Record<string, string> }
  | { error: string } {
  const isCodeId = nullableStr(formData, "is_code_id");
  const scopeIsCodeId = nullableStr(formData, "scope_is_code_id");
  // Scoped IS sessions must never save under a different IS code.
  const lockedIsCodeId = scopeIsCodeId ?? isCodeId;
  const testName = nullableStr(formData, "test_name");
  const clauseNo = String(formData.get("clause_no") ?? "").trim();
  const testMethod = String(formData.get("test_method") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const specifiedValue = String(formData.get("specified_value") ?? "").trim();

  if (!lockedIsCodeId) return { error: "is_code_id" };
  if (!testName) return { error: "test_name" };

  return {
    payload: {
      is_code_id: lockedIsCodeId,
      test_name: testName,
      clause_no: clauseNo,
      test_method: testMethod,
      unit,
      specified_value: specifiedValue,
    },
  };
}

function errorToMessage(code: string): string {
  switch (code) {
    case "is_code_id":
      return "IS Code is required.";
    case "test_name":
      return "Name of the Test is required.";
    default:
      return "Could not save. Check your connection and try again.";
  }
}

export type ExecuteTestParameterSaveResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      redirectCode?: string;
      dbCode?: string;
      dbHint?: string;
    };

export async function executeSaveTestParameter(
  formData: FormData,
): Promise<ExecuteTestParameterSaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", redirectCode: "db" };
  }

  const id = nullableStr(formData, "id");
  const parsed = rowFromForm(formData);
  if ("error" in parsed) {
    return {
      ok: false,
      error: errorToMessage(parsed.error),
      redirectCode: parsed.error,
    };
  }

  const row = {
    ...parsed.payload,
    updated_at: new Date().toISOString(),
  };

  try {
    if (id) {
      const scopeIsCodeId = nullableStr(formData, "scope_is_code_id");
      let updateQuery = supabase
        .from("test_parameters")
        .update(row)
        .eq("id", id);
      // Scoped sessions can only update rows that already belong to that IS.
      if (scopeIsCodeId) {
        updateQuery = updateQuery.eq("is_code_id", scopeIsCodeId);
      }
      const { data: updated, error } = await updateQuery.select("id");
      if (error) {
        return {
          ok: false,
          error: (error.message ?? "Unknown error").slice(0, 280),
          redirectCode: "db",
          dbCode: error.code ?? undefined,
          dbHint: error.message,
        };
      }
      if (!updated?.length) {
        return {
          ok: false,
          error:
            "This test belongs to a different IS code and cannot be changed here.",
          redirectCode: "db",
          dbHint:
            "This test belongs to a different IS code and cannot be changed here.",
        };
      }
      revalidatePath(BASE_PATH);
      return { ok: true, id };
    }

    const { data: inserted, error } = await supabase
      .from("test_parameters")
      .insert({
        ...row,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (error) {
      return {
        ok: false,
        error: (error.message ?? "Unknown error").slice(0, 280),
        redirectCode: "db",
        dbCode: error.code ?? undefined,
        dbHint: error.message,
      };
    }
    revalidatePath(BASE_PATH);
    return { ok: true, id: (inserted as { id: string }).id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return {
      ok: false,
      error: msg.slice(0, 280),
      redirectCode: "db",
      dbHint: msg,
    };
  }
}

export async function saveTestParameter(formData: FormData) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");

  const r = await executeSaveTestParameter(formData);
  if (!r.ok) {
    const returnPath = formReturnPath(formData);
    if (r.redirectCode === "db" && (r.dbHint || r.dbCode)) {
      const hint = encodeURIComponent((r.dbHint ?? r.error).slice(0, 280));
      redirect(
        `${returnPath}&error=db&db_code=${encodeURIComponent(r.dbCode ?? "")}&db_hint=${hint}`,
      );
    }
    if (r.redirectCode) {
      redirect(
        `${returnPath}&error=${encodeURIComponent(r.redirectCode)}`,
      );
    }
    redirect(`${returnPath}&error=db`);
  }

  redirect(formSavedPath(formData));
}

function scopedListPath(scopeIsCodeId: string | null | undefined): string {
  const scope = scopeIsCodeId?.trim();
  if (!scope) return BASE_PATH;
  return `${BASE_PATH}?is_code_id=${encodeURIComponent(scope)}`;
}

function pathWithError(path: string, code: string): string {
  return path.includes("?") ? `${path}&error=${code}` : `${path}?error=${code}`;
}

export async function deleteTestParameter(
  id: string,
  scopeIsCodeId?: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const trimmed = id?.trim();
  const returnPath = scopedListPath(scopeIsCodeId);
  if (!trimmed) redirect(returnPath);

  let deleteQuery = supabase.from("test_parameters").delete().eq("id", trimmed);
  const scope = scopeIsCodeId?.trim();
  if (scope) {
    deleteQuery = deleteQuery.eq("is_code_id", scope);
  }
  const { error } = await deleteQuery;
  if (error) redirect(pathWithError(returnPath, "db"));

  revalidatePath(BASE_PATH);
  redirect(returnPath);
}

export async function deleteTestParameters(
  ids: string[],
  scopeIsCodeId?: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const returnPath = scopedListPath(scopeIsCodeId);
  const trimmed = [...new Set(ids.map((x) => x?.trim()).filter(Boolean))];
  if (trimmed.length === 0) redirect(returnPath);

  let deleteQuery = supabase.from("test_parameters").delete().in("id", trimmed);
  const scope = scopeIsCodeId?.trim();
  if (scope) {
    deleteQuery = deleteQuery.eq("is_code_id", scope);
  }
  const { error } = await deleteQuery;
  if (error) redirect(pathWithError(returnPath, "db"));

  revalidatePath(BASE_PATH);
  redirect(returnPath);
}

/** Inline table save — no redirect (caller refreshes). */
export async function saveTestParameterInline(input: {
  id?: string | null;
  scopeIsCodeId: string;
  test_name: string;
  clause_no?: string;
  test_method?: string;
  unit?: string;
  specified_value?: string;
}): Promise<ExecuteTestParameterSaveResult> {
  const fd = new FormData();
  if (input.id) fd.set("id", input.id);
  fd.set("scope_is_code_id", input.scopeIsCodeId);
  fd.set("is_code_id", input.scopeIsCodeId);
  fd.set("test_name", input.test_name);
  fd.set("clause_no", input.clause_no ?? "");
  fd.set("test_method", input.test_method ?? "");
  fd.set("unit", input.unit ?? "");
  fd.set("specified_value", input.specified_value ?? "");
  return executeSaveTestParameter(fd);
}

/** Inline table delete — no redirect. */
export async function deleteTestParameterInline(
  id: string,
  scopeIsCodeId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const trimmed = id?.trim();
  if (!trimmed) return { ok: false, error: "Missing id." };

  let deleteQuery = supabase.from("test_parameters").delete().eq("id", trimmed);
  const scope = scopeIsCodeId?.trim();
  if (scope) {
    deleteQuery = deleteQuery.eq("is_code_id", scope);
  }
  const { error } = await deleteQuery;
  if (error) {
    return { ok: false, error: (error.message ?? "Delete failed").slice(0, 280) };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}

export async function deleteTestParametersInline(
  ids: string[],
  scopeIsCodeId?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const trimmed = [...new Set(ids.map((x) => x?.trim()).filter(Boolean))];
  if (trimmed.length === 0) return { ok: true };

  let deleteQuery = supabase.from("test_parameters").delete().in("id", trimmed);
  const scope = scopeIsCodeId?.trim();
  if (scope) {
    deleteQuery = deleteQuery.eq("is_code_id", scope);
  }
  const { error } = await deleteQuery;
  if (error) {
    return { ok: false, error: (error.message ?? "Delete failed").slice(0, 280) };
  }
  revalidatePath(BASE_PATH);
  return { ok: true };
}
