"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const BASE_PATH = "/dashboard/test-parameters";

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
  const testName = nullableStr(formData, "test_name");
  const clauseNo = String(formData.get("clause_no") ?? "").trim();
  const testMethod = String(formData.get("test_method") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const specifiedValue = String(formData.get("specified_value") ?? "").trim();

  if (!isCodeId) return { error: "is_code_id" };
  if (!testName) return { error: "test_name" };

  return {
    payload: {
      is_code_id: isCodeId,
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
      const { error } = await supabase
        .from("test_parameters")
        .update(row)
        .eq("id", id);
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
    if (r.redirectCode === "db" && (r.dbHint || r.dbCode)) {
      const hint = encodeURIComponent((r.dbHint ?? r.error).slice(0, 280));
      redirect(
        `${BASE_PATH}?error=db&db_code=${encodeURIComponent(r.dbCode ?? "")}&db_hint=${hint}`,
      );
    }
    if (r.redirectCode) {
      redirect(
        `${BASE_PATH}?error=${encodeURIComponent(r.redirectCode)}`,
      );
    }
    redirect(`${BASE_PATH}?error=db`);
  }

  redirect(BASE_PATH);
}

export async function deleteTestParameter(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const trimmed = id?.trim();
  if (!trimmed) redirect(BASE_PATH);

  const { error } = await supabase
    .from("test_parameters")
    .delete()
    .eq("id", trimmed);
  if (error) redirect(`${BASE_PATH}?error=db`);

  revalidatePath(BASE_PATH);
  redirect(BASE_PATH);
}

export async function deleteTestParameters(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = [...new Set(ids.map((x) => x?.trim()).filter(Boolean))];
  if (trimmed.length === 0) redirect(BASE_PATH);

  const { error } = await supabase
    .from("test_parameters")
    .delete()
    .in("id", trimmed);
  if (error) redirect(`${BASE_PATH}?error=db`);

  revalidatePath(BASE_PATH);
  redirect(BASE_PATH);
}
