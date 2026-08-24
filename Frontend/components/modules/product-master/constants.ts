import type { ProductMasterRow } from "@backend/shared/types/product-master";
import {
  DEFAULT_CATEGORY,
  DEFAULT_GST_RATE,
  DEFAULT_HSN_CODE,
  DEFAULT_MAKE,
  DEFAULT_MONEY_FIELD,
  DEFAULT_UNIT,
} from "@backend/shared/constants/product-master";

export {
  DEFAULT_CATEGORY,
  DEFAULT_GST_RATE,
  DEFAULT_HSN_CODE,
  DEFAULT_MAKE,
  DEFAULT_MONEY_FIELD,
  DEFAULT_UNIT,
  GST_RATES,
  UNITS,
} from "@backend/shared/constants/product-master";

export const PRODUCT_FIELD_LABEL_CLASS =
  "text-[4mm] font-medium leading-tight text-zinc-600 dark:text-zinc-400";

function moneyToFormStr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return DEFAULT_MONEY_FIELD;
  return (Math.round(Number(n) * 100) / 100).toFixed(2);
}

function itemSuffixFromCode(code: string): string {
  const c = (code ?? "").trim().toUpperCase();
  if (c.startsWith("P") || c.startsWith("S")) return c.slice(1);
  return c;
}

/** Next numeric suffix (e.g. 0001) for the given category prefix (P / S), based on existing rows. */
export function nextNumericItemSuffix(
  rows: ProductMasterRow[],
  category: "product" | "service",
): string {
  const prefix = category === "service" ? "S" : "P";
  let max = 0;
  for (const r of rows) {
    const code = (r.item_code ?? "").trim().toUpperCase();
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

export function emptyForm(): Record<string, string> {
  return {
    id: "",
    category: DEFAULT_CATEGORY,
    item_code_suffix: "",
    name: "",
    description: "",
    make: DEFAULT_MAKE,
    unit_of_item: DEFAULT_UNIT,
    hsn_code: DEFAULT_HSN_CODE,
    gst_rate: DEFAULT_GST_RATE,
    mrp: DEFAULT_MONEY_FIELD,
    sale_price: DEFAULT_MONEY_FIELD,
    purchase_price: DEFAULT_MONEY_FIELD,
    opening_stock: "",
    low_stock_value: "",
  };
}

export function rowToForm(r: ProductMasterRow): Record<string, string> {
  const cat = r.category === "service" ? "service" : "product";
  return {
    id: r.id,
    category: cat,
    item_code_suffix: itemSuffixFromCode(r.item_code ?? ""),
    name: r.name ?? "",
    description: r.description ?? "",
    make: r.make ?? "",
    unit_of_item: (r.unit_of_item ?? "").trim() || DEFAULT_UNIT,
    hsn_code: r.hsn_code ?? "",
    gst_rate: (r.gst_rate ?? "").trim() || DEFAULT_GST_RATE,
    mrp: moneyToFormStr(r.mrp),
    sale_price: moneyToFormStr(r.sale_price),
    purchase_price: moneyToFormStr(r.purchase_price),
    opening_stock: r.opening_stock ?? "",
    low_stock_value: r.low_stock_value ?? "",
  };
}
