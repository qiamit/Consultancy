"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DEFAULT_CATEGORY,
  DEFAULT_GST_RATE,
  DEFAULT_UNIT,
  GST_RATES,
  UNITS,
} from "@backend/shared/constants/product-master";
import {
  DROPDOWN_KEY_PRODUCT_GST_RATE,
  DROPDOWN_KEY_PRODUCT_UNIT,
} from "@backend/shared/dropdown-keys";
import { createClient } from "@backend/db/client/server";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string) {
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

function normalizeSuffix(raw: string): string {
  let s = raw.trim().toUpperCase();
  if (s.startsWith("P") || s.startsWith("S")) {
    s = s.slice(1).trim().toUpperCase();
  }
  return s.replace(/[^A-Z0-9\-]/g, "");
}

function itemPrefix(category: string): "P" | "S" {
  return category === "service" ? "S" : "P";
}

function buildItemCode(category: string, suffixRaw: string): string | null {
  const suffix = normalizeSuffix(suffixRaw);
  if (!suffix) return null;
  const full = `${itemPrefix(category)}${suffix}`;
  if (full.length > 40) return null;
  return full;
}

function parseHsn(raw: string): { ok: true; value: string | null } | { ok: false } {
  const t = raw.trim();
  if (!t) return { ok: true, value: null };
  if (!/^\d{1,8}$/.test(t)) return { ok: false };
  return { ok: true, value: t };
}

async function loadUnitSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", DROPDOWN_KEY_PRODUCT_UNIT);
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  for (const u of UNITS) s.add(u);
  return s;
}

async function loadGstSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", DROPDOWN_KEY_PRODUCT_GST_RATE);
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  for (const g of GST_RATES) s.add(g);
  return s;
}

async function isDuplicateItemCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  itemCode: string,
  excludeId: string | null,
): Promise<boolean> {
  let q = supabase
    .from("product_master_items")
    .select("id")
    .eq("item_code", itemCode)
    .limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q.maybeSingle();
  if (error) return false;
  return data != null;
}

type SaveCtx = { units: Set<string>; gsts: Set<string> };

function rowFromForm(formData: FormData, ctx: SaveCtx) {
  const catRaw = str(formData, "category").toLowerCase();
  const category =
    catRaw === "service" ? "service" : catRaw === "product" ? "product" : null;
  if (!category) return { error: "category" as const };

  const item_code = buildItemCode(category, str(formData, "item_code_suffix"));
  if (!item_code) return { error: "item_suffix" as const };

  const name = str(formData, "name");
  if (!name) return { error: "name" as const };

  const unit_of_item = str(formData, "unit_of_item") || DEFAULT_UNIT;
  if (!ctx.units.has(unit_of_item))
    return { error: "enum_unit" as const };

  const gst_rate = str(formData, "gst_rate") || DEFAULT_GST_RATE;
  if (!ctx.gsts.has(gst_rate)) return { error: "enum_gst" as const };

  const hsnParsed = parseHsn(str(formData, "hsn_code"));
  if (!hsnParsed.ok) return { error: "hsn" as const };

  const mrp = parseMoney(str(formData, "mrp"));
  const sale_price = parseMoney(str(formData, "sale_price"));
  if (mrp === null || sale_price === null) return { error: "amount" as const };

  let purchase_price: number | null = parseMoney(str(formData, "purchase_price"));
  let opening_stock: string | null = nullableStr(formData, "opening_stock");
  let low_stock_value: string | null = nullableStr(formData, "low_stock_value");

  if (category === "service") {
    purchase_price = null;
    opening_stock = null;
    low_stock_value = null;
  } else {
    if (purchase_price === null) return { error: "amount" as const };
  }

  return {
    payload: {
      category,
      item_code,
      name,
      description: nullableStr(formData, "description"),
      make: nullableStr(formData, "make"),
      unit_of_item,
      hsn_code: hsnParsed.value,
      gst_rate,
      mrp,
      sale_price,
      purchase_price,
      opening_stock,
      low_stock_value,
    },
  };
}

export type ExecuteProductSaveResult =
  | { ok: true; id: string; name: string; unit_of_item: string; sale_price: number; gst_rate: string }
  | { ok: false; error: string };

export async function executeSaveProductMasterFull(
  formData: FormData,
): Promise<ExecuteProductSaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const id = nullableStr(formData, "id");
  const units = await loadUnitSet(supabase);
  const gsts = await loadGstSet(supabase);
  const parsed = rowFromForm(formData, { units, gsts });
  if ("error" in parsed) return { ok: false, error: String(parsed.error) };

  const { payload } = parsed;
  const row = { ...payload, updated_at: new Date().toISOString() };

  if (await isDuplicateItemCode(supabase, row.item_code as string, id)) {
    return { ok: false, error: "Duplicate item code." };
  }

  try {
    if (id) {
      const { error } = await supabase.from("product_master_items").update(row).eq("id", id);
      if (error) return { ok: false, error: error.message };
      revalidatePath("/dashboard/products");
      return {
        ok: true,
        id,
        name: String(payload.name),
        unit_of_item: String(payload.unit_of_item),
        sale_price: Number(payload.sale_price),
        gst_rate: String(payload.gst_rate),
      };
    } else {
      const { data, error } = await supabase
        .from("product_master_items")
        .insert({ ...row, created_by: user.id })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      revalidatePath("/dashboard/products");
      return {
        ok: true,
        id: (data as { id: string }).id,
        name: String(payload.name),
        unit_of_item: String(payload.unit_of_item),
        sale_price: Number(payload.sale_price),
        gst_rate: String(payload.gst_rate),
      };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
}

export async function saveProductMaster(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = nullableStr(formData, "id");
  const units = await loadUnitSet(supabase);
  const gsts = await loadGstSet(supabase);
  const parsed = rowFromForm(formData, { units, gsts });
  if ("error" in parsed) {
    redirect(
      `/dashboard/products?error=${encodeURIComponent(String(parsed.error))}`,
    );
  }

  const { payload } = parsed;
  const row = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (await isDuplicateItemCode(supabase, row.item_code as string, id)) {
    redirect("/dashboard/products?error=duplicate_item_code");
  }

  try {
    if (id) {
      const { error } = await supabase
        .from("product_master_items")
        .update(row)
        .eq("id", id);
      if (error) {
        if (error.code === "23505")
          redirect("/dashboard/products?error=duplicate_item_code");
        const hint = encodeURIComponent(
          (error.message ?? "unknown error").slice(0, 280),
        );
        redirect(
          `/dashboard/products?error=db&db_code=${encodeURIComponent(error.code ?? "")}&db_hint=${hint}`,
        );
      }
    } else {
      const { error } = await supabase.from("product_master_items").insert({
        ...row,
        created_by: user.id,
      });
      if (error) {
        if (error.code === "23505")
          redirect("/dashboard/products?error=duplicate_item_code");
        const hint = encodeURIComponent(
          (error.message ?? "unknown error").slice(0, 280),
        );
        redirect(
          `/dashboard/products?error=db&db_code=${encodeURIComponent(error.code ?? "")}&db_hint=${hint}`,
        );
      }
    }
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Save failed.";
    redirect(
      `/dashboard/products?error=db&db_hint=${encodeURIComponent(msg.slice(0, 280))}`,
    );
  }

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function deleteProductMaster(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const trimmed = id?.trim();
  if (!trimmed) redirect("/dashboard/products");

  const { error } = await supabase
    .from("product_master_items")
    .delete()
    .eq("id", trimmed);
  if (error) redirect("/dashboard/products?error=db");

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

export async function executeQuickSaveProduct(
  name: string,
  category: "product" | "service",
  gst_rate: string,
  sale_price: number,
): Promise<
  | { ok: true; id: string; name: string; unit_of_item: string; sale_price: number; gst_rate: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  const item_code = `${category === "service" ? "S" : "P"}${suffix}`;

  const row = {
    category,
    item_code,
    name: name.trim(),
    unit_of_item: DEFAULT_UNIT,
    gst_rate,
    mrp: sale_price,
    sale_price,
    purchase_price: category === "product" ? 0 : null,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("product_master_items")
    .insert(row)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/products");
  return {
    ok: true,
    id: (data as { id: string }).id,
    name: name.trim(),
    unit_of_item: DEFAULT_UNIT,
    sale_price,
    gst_rate,
  };
}

export async function deleteProductsMaster(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = [...new Set(ids.map((x) => x?.trim()).filter(Boolean))];
  if (trimmed.length === 0) redirect("/dashboard/products");

  const { error } = await supabase
    .from("product_master_items")
    .delete()
    .in("id", trimmed);
  if (error) redirect("/dashboard/products?error=db");

  revalidatePath("/dashboard/products");
  redirect("/dashboard/products");
}

function Simp(r: Record<string, string>, key: string): string {
  return String(r[key] ?? "").trim();
}

function Nimp(r: Record<string, string>, key: string): string | null {
  const s = Simp(r, key);
  return s ? s : null;
}

function rowFromImportRecord(
  r: Record<string, string>,
  ctx: SaveCtx,
):
  | { payload: Record<string, string | number | null> }
  | { error: string } {
  const catRaw = Simp(r, "category").toLowerCase();
  const category =
    catRaw === "service" ? "service" : catRaw === "product" ? "product" : null;
  if (!category) return { error: "category must be product or service." };

  const item_code = Simp(r, "item_code").toUpperCase();
  if (!item_code) return { error: "item_code is required." };
  const expectedPrefix = itemPrefix(category);
  if (!item_code.startsWith(expectedPrefix)) {
    return {
      error: `item_code must start with "${expectedPrefix}" for category "${category}".`,
    };
  }
  if (item_code.length < 2 || item_code.length > 40) {
    return { error: "item_code length invalid." };
  }

  const name = Simp(r, "name");
  if (!name) return { error: "name is required." };

  const unit_of_item = Simp(r, "unit_of_item") || DEFAULT_UNIT;
  if (!ctx.units.has(unit_of_item))
    return { error: `Unknown unit: ${unit_of_item}` };

  const gst_rate = Simp(r, "gst_rate") || DEFAULT_GST_RATE;
  if (!ctx.gsts.has(gst_rate)) return { error: `Unknown GST rate: ${gst_rate}` };

  const hsnRaw = Simp(r, "hsn_code");
  const hsnParsed = parseHsn(hsnRaw);
  if (!hsnParsed.ok) return { error: "hsn_code must be at most 8 digits." };

  const m = parseMoney(Simp(r, "mrp") || "0");
  const s = parseMoney(Simp(r, "sale_price") || "0");
  if (m === null || s === null) return { error: "mrp and sale_price must be numbers." };

  let purchase_price: number | null = parseMoney(Simp(r, "purchase_price") || "0");
  let opening_stock: string | null = Nimp(r, "opening_stock");
  let low_stock_value: string | null = Nimp(r, "low_stock_value");

  if (category === "service") {
    purchase_price = null;
    opening_stock = null;
    low_stock_value = null;
  } else if (purchase_price === null) {
    return { error: "purchase_price must be a number for products." };
  }

  return {
    payload: {
      category,
      item_code,
      name,
      description: Nimp(r, "description"),
      make: Nimp(r, "make"),
      unit_of_item,
      hsn_code: hsnParsed.value,
      gst_rate,
      mrp: m,
      sale_price: s,
      purchase_price,
      opening_stock,
      low_stock_value,
    },
  };
}

export async function importProductsMaster(
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

  const units = await loadUnitSet(supabase);
  const gsts = await loadGstSet(supabase);
  const ctx: SaveCtx = { units, gsts };

  const { data: existing } = await supabase
    .from("product_master_items")
    .select("item_code");
  const seen = new Set<string>();
  for (const r of existing ?? []) {
    const code = String((r as { item_code: string }).item_code ?? "")
      .trim()
      .toUpperCase();
    if (code) seen.add(code);
  }

  const now = new Date().toISOString();
  const payloads: Array<
    Record<string, string | number | null> & {
      created_by: string;
      updated_at: string;
    }
  > = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = rowFromImportRecord(rows[i], ctx);
    if ("error" in parsed) {
      return {
        ok: false,
        error: `Row ${i + 2} (after header): ${parsed.error}`,
      };
    }
    const code = String(parsed.payload.item_code).trim().toUpperCase();
    if (seen.has(code)) {
      return {
        ok: false,
        error: `Row ${i + 2}: duplicate item_code “${code}” in database or file.`,
      };
    }
    seen.add(code);
    payloads.push({
      ...parsed.payload,
      created_by: user.id,
      updated_at: now,
    });
  }

  const { error } = await supabase.from("product_master_items").insert(payloads);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error:
          "Import failed: duplicate item code for one or more rows.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/products");
  return { ok: true, inserted: payloads.length };
}
