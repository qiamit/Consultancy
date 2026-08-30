"use server";

import { createClient } from "@backend/db/client/server";
import { loadClientMasterDropdownOptions } from "@backend/shared/data/client-master-dropdowns";
import type { ClientMasterDropdownOptions } from "@backend/shared/data/client-master-dropdowns";
import { fetchAppDropdownOptions } from "@backend/shared/data/app-dropdown-options";
import {
  DROPDOWN_KEY_PRODUCT_GST_RATE,
  DROPDOWN_KEY_PRODUCT_UNIT,
} from "@backend/shared/dropdown-keys";
import { DEFAULT_GST_RATE, DEFAULT_UNIT, GST_RATES, UNITS } from "@backend/shared/constants/product-master";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

export async function fetchClientFormOptions(): Promise<ClientMasterDropdownOptions> {
  const supabase = await createClient();
  return loadClientMasterDropdownOptions(supabase);
}

export async function fetchNextProductItemSuffix(
  category: "product" | "service",
): Promise<string> {
  const supabase = await createClient();
  const prefix = category === "service" ? "S" : "P";
  const { data } = await supabase
    .from("product_master_items")
    .select("item_code")
    .ilike("item_code", `${prefix}%`);

  let max = 0;
  for (const r of data ?? []) {
    const code = String((r as { item_code: string }).item_code ?? "").trim().toUpperCase();
    if (!code.startsWith(prefix)) continue;
    const suf = code.slice(1);
    if (/^\d+$/.test(suf)) {
      const n = parseInt(suf, 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  const next = max + 1;
  return next < 10000 ? String(next).padStart(4, "0") : String(next);
}

export async function fetchProductFormOptions(): Promise<{
  unitOptions: AppDropdownOptionRow[];
  gstRateOptions: AppDropdownOptionRow[];
}> {
  const supabase = await createClient();
  let unitOptions = await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_PRODUCT_UNIT);
  if (unitOptions.length === 0) {
    unitOptions = UNITS.map((value, i) => ({ id: `__u${i}`, value, label: null, canDelete: false }));
  }
  if (!unitOptions.some((o) => o.value === DEFAULT_UNIT)) {
    unitOptions = [{ id: "__u_default", value: DEFAULT_UNIT, label: null, canDelete: false }, ...unitOptions];
  }

  let gstRateOptions = await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_PRODUCT_GST_RATE);
  if (gstRateOptions.length === 0) {
    gstRateOptions = GST_RATES.map((value, i) => ({ id: `__g${i}`, value, label: null, canDelete: false }));
  }
  if (!gstRateOptions.some((o) => o.value === DEFAULT_GST_RATE)) {
    gstRateOptions = [{ id: "__g_default", value: DEFAULT_GST_RATE, label: null, canDelete: false }, ...gstRateOptions];
  }

  return { unitOptions, gstRateOptions };
}
