import type { ProductMasterRow } from "@backend/shared/types/product-master";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function haystack(r: ProductMasterRow): string {
  const money = (n: number | null | undefined) =>
    n != null && Number.isFinite(Number(n)) ? String(n) : "";
  return [
    r.category,
    r.item_code,
    r.name,
    r.description,
    r.make,
    r.unit_of_item,
    r.hsn_code,
    r.gst_rate,
    money(r.mrp),
    money(r.sale_price),
    money(r.purchase_price),
    r.opening_stock,
    r.low_stock_value,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterProductsBySearch(
  rows: ProductMasterRow[],
  q: string,
): ProductMasterRow[] {
  const t = q.trim().toLowerCase();
  if (!t) return rows;
  return rows.filter((r) => haystack(r).includes(t));
}
