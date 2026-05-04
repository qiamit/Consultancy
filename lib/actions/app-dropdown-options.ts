"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DROPDOWN_KEY_CLIENT_CITY,
  DROPDOWN_KEY_CLIENT_COMPANY_SCALE,
  DROPDOWN_KEY_CLIENT_COMPANY_STATUS,
  DROPDOWN_KEY_CLIENT_COMPANY_TYPE,
  DROPDOWN_KEY_CLIENT_COUNTRY,
  DROPDOWN_KEY_CLIENT_PAYMENT_TERM,
  DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE,
  DROPDOWN_KEY_CLIENT_PIN_CODE,
  DROPDOWN_KEY_CLIENT_STATE,
  DROPDOWN_KEY_IS_CODE_ASPECT,
  DROPDOWN_KEY_IS_CODE_UNIT,
  DROPDOWN_KEY_PRODUCT_GST_RATE,
  DROPDOWN_KEY_PRODUCT_UNIT,
} from "@/lib/dropdown-keys";

const CLIENT_USAGE_COLUMN: Partial<Record<string, string>> = {
  [DROPDOWN_KEY_CLIENT_COMPANY_TYPE]: "company_type",
  [DROPDOWN_KEY_CLIENT_COMPANY_SCALE]: "company_scale",
  [DROPDOWN_KEY_CLIENT_COMPANY_STATUS]: "company_status",
  [DROPDOWN_KEY_CLIENT_CITY]: "city",
  [DROPDOWN_KEY_CLIENT_PIN_CODE]: "pin_code",
  [DROPDOWN_KEY_CLIENT_STATE]: "state",
  [DROPDOWN_KEY_CLIENT_COUNTRY]: "country",
  [DROPDOWN_KEY_CLIENT_PAYMENT_TERM]: "payment_term",
  [DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE]: "phone_country_code",
};

const IS_CODE_USAGE_COLUMN: Partial<Record<string, string>> = {
  [DROPDOWN_KEY_IS_CODE_ASPECT]: "aspect_of_is",
  [DROPDOWN_KEY_IS_CODE_UNIT]: "unit_of_is",
};

const PRODUCT_USAGE_COLUMN: Partial<Record<string, string>> = {
  [DROPDOWN_KEY_PRODUCT_UNIT]: "unit_of_item",
  [DROPDOWN_KEY_PRODUCT_GST_RATE]: "gst_rate",
};

export async function addAppDropdownOption(
  optionKey: string,
  rawValue: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const value = rawValue.trim();
  if (!value) return { ok: false, error: "Please enter a value." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: last } = await supabase
    .from("app_dropdown_options")
    .select("sort_order")
    .eq("option_key", optionKey)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = (last?.sort_order ?? 0) + 10;

  const { error } = await supabase.from("app_dropdown_options").insert({
    option_key: optionKey,
    value,
    label: null,
    sort_order,
  });

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: "That value already exists." };
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/clients");
  if (optionKey.startsWith("is_code_master.")) {
    revalidatePath("/dashboard/is-code-master");
  }
  if (optionKey.startsWith("product_master.")) {
    revalidatePath("/dashboard/products");
  }
  return { ok: true };
}

export async function deleteAppDropdownOption(
  optionKey: string,
  id: string,
  value: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const column = CLIENT_USAGE_COLUMN[optionKey];
  if (column) {
    const { count, error: cErr } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq(column, value);
    if (cErr) return { ok: false, error: cErr.message };
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: `Cannot delete "${value}" — it is used by one or more clients. Change those clients first.`,
      };
    }
  }

  const isCol = IS_CODE_USAGE_COLUMN[optionKey];
  if (isCol) {
    const { count, error: iErr } = await supabase
      .from("is_codes")
      .select("id", { count: "exact", head: true })
      .eq(isCol, value);
    if (iErr) return { ok: false, error: iErr.message };
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: `Cannot delete "${value}" — it is used by one or more IS codes. Update those records first.`,
      };
    }
  }

  const prodCol = PRODUCT_USAGE_COLUMN[optionKey];
  if (prodCol) {
    const { count, error: pErr } = await supabase
      .from("product_master_items")
      .select("id", { count: "exact", head: true })
      .eq(prodCol, value);
    if (pErr) return { ok: false, error: pErr.message };
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: `Cannot delete "${value}" — it is used by one or more product or service items. Update those records first.`,
      };
    }
  }

  const { error } = await supabase
    .from("app_dropdown_options")
    .delete()
    .eq("id", id)
    .eq("option_key", optionKey);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/clients");
  if (optionKey.startsWith("is_code_master.")) {
    revalidatePath("/dashboard/is-code-master");
  }
  if (optionKey.startsWith("product_master.")) {
    revalidatePath("/dashboard/products");
  }
  return { ok: true };
}
