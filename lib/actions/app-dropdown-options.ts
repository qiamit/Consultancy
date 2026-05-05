"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DROPDOWN_KEY_BIS_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY,
  DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND,
  DROPDOWN_KEY_BIS_PROJECT_KIND,
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

const BIS_PROJECTS_USAGE_COLUMN: Partial<Record<string, string>> = {
  [DROPDOWN_KEY_BIS_PROJECT_KIND]: "project_kind",
  [DROPDOWN_KEY_BIS_BILLING_FREQUENCY]: "billing_frequency",
};

const BIS_NEW_APPLICATIONS_USAGE_COLUMN: Partial<Record<string, string>> = {
  [DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND]: "project_kind",
  [DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY]: "billing_frequency",
};

/** Seeded BIS catalog values (keep in sync with `bis-projects-dropdowns` + migrations). */
const BIS_PROTECTED_SEEDED_PROJECT_KINDS = new Set([
  "new_license",
  "application",
  "inclusion",
  "renewal",
  "maintenance",
]);
const BIS_PROTECTED_SEEDED_BILLING = new Set([
  "Monthly",
  "Quarterly",
  "Half Yearly",
  "Yearly",
  "Based on Work",
]);

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
  if (
    optionKey === DROPDOWN_KEY_BIS_PROJECT_KIND ||
    optionKey === DROPDOWN_KEY_BIS_BILLING_FREQUENCY
  ) {
    revalidatePath("/dashboard/bis-projects");
  }
  if (
    optionKey === DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND ||
    optionKey === DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY
  ) {
    revalidatePath("/dashboard/bis-new-applications");
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

  const trimmedValue = value.trim();
  if (
    (optionKey === DROPDOWN_KEY_BIS_PROJECT_KIND ||
      optionKey === DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND) &&
    BIS_PROTECTED_SEEDED_PROJECT_KINDS.has(trimmedValue)
  ) {
    return {
      ok: false,
      error:
        "Built-in project types cannot be deleted. Add a new type instead of removing these.",
    };
  }
  if (
    (optionKey === DROPDOWN_KEY_BIS_BILLING_FREQUENCY ||
      optionKey === DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY) &&
    BIS_PROTECTED_SEEDED_BILLING.has(trimmedValue)
  ) {
    return {
      ok: false,
      error:
        "Built-in billing frequencies cannot be deleted. Add a custom option instead of removing these.",
    };
  }

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

  const bisCol = BIS_PROJECTS_USAGE_COLUMN[optionKey];
  if (bisCol) {
    const { count, error: bErr } = await supabase
      .from("bis_projects")
      .select("id", { count: "exact", head: true })
      .eq(bisCol, value);
    if (bErr) return { ok: false, error: bErr.message };
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: `Cannot delete "${value}" — it is used by one or more BIS projects. Update those projects first.`,
      };
    }
  }

  const bisNewCol = BIS_NEW_APPLICATIONS_USAGE_COLUMN[optionKey];
  if (bisNewCol) {
    const { count, error: bErr } = await supabase
      .from("bis_new_applications")
      .select("id", { count: "exact", head: true })
      .eq(bisNewCol, value);
    if (bErr) return { ok: false, error: bErr.message };
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: `Cannot delete "${value}" — it is used by one or more BIS new applications. Update those records first.`,
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
  if (
    optionKey === DROPDOWN_KEY_BIS_PROJECT_KIND ||
    optionKey === DROPDOWN_KEY_BIS_BILLING_FREQUENCY
  ) {
    revalidatePath("/dashboard/bis-projects");
  }
  if (
    optionKey === DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND ||
    optionKey === DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY
  ) {
    revalidatePath("/dashboard/bis-new-applications");
  }
  return { ok: true };
}
