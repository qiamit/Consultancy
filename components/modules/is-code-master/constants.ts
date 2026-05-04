import type { IsCodeMasterRow } from "@/lib/types/is-code-master";
import {
  DEFAULT_AMENDMENT_NUMBER,
  DEFAULT_ASPECT_OF_IS,
  DEFAULT_MONEY_FIELD,
  DEFAULT_SLAB_1_QTY,
  DEFAULT_SLAB_2_QTY,
  DEFAULT_SLAB_3_QTY,
  DEFAULT_UNIT,
} from "@/lib/constants/is-code-master";

export {
  ASPECTS,
  DEFAULT_AMENDMENT_NUMBER,
  DEFAULT_ASPECT_OF_IS,
  DEFAULT_MONEY_FIELD,
  DEFAULT_SLAB_1_QTY,
  DEFAULT_SLAB_2_QTY,
  DEFAULT_SLAB_3_QTY,
  DEFAULT_UNIT,
  UNITS,
} from "@/lib/constants/is-code-master";

export const IS_FIELD_LABEL_CLASS =
  "text-[4mm] font-medium leading-tight text-zinc-600 dark:text-zinc-400";

export const IS_FIELD_LABEL_BLOCK_CLASS = `block ${IS_FIELD_LABEL_CLASS}`;

function numToStr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return String(n);
}

function moneyToFormStr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return DEFAULT_MONEY_FIELD;
  return (Math.round(Number(n) * 100) / 100).toFixed(2);
}

export function emptyForm(): Record<string, string> {
  return {
    id: "",
    is_number: "",
    revision_year: "",
    reaffirmation_year: "",
    amendment_number: DEFAULT_AMENDMENT_NUMBER,
    aspect_of_is: DEFAULT_ASPECT_OF_IS,
    product_manual_number: "",
    is_code_title: "",
    testing_charges: DEFAULT_MONEY_FIELD,
    unit_of_is: DEFAULT_UNIT,
    mmf_large_scale: DEFAULT_MONEY_FIELD,
    mmf_medium_scale: DEFAULT_MONEY_FIELD,
    mmf_small_scale: DEFAULT_MONEY_FIELD,
    mmf_micro_scale: DEFAULT_MONEY_FIELD,
    slab_1_quantity: DEFAULT_SLAB_1_QTY,
    slab_1_rate: DEFAULT_MONEY_FIELD,
    slab_2_quantity: DEFAULT_SLAB_2_QTY,
    slab_2_rate: DEFAULT_MONEY_FIELD,
    slab_3_quantity: DEFAULT_SLAB_3_QTY,
    slab_3_rate: DEFAULT_MONEY_FIELD,
  };
}

export function rowToForm(r: IsCodeMasterRow): Record<string, string> {
  return {
    id: r.id,
    is_number: r.is_number ?? "",
    revision_year: numToStr(r.revision_year) || "",
    reaffirmation_year:
      r.reaffirmation_year != null ? String(r.reaffirmation_year) : "",
    amendment_number:
      (r.amendment_number ?? "").trim() || DEFAULT_AMENDMENT_NUMBER,
    aspect_of_is: (r.aspect_of_is ?? "").trim() || DEFAULT_ASPECT_OF_IS,
    product_manual_number: r.product_manual_number ?? "",
    is_code_title: r.is_code_title ?? "",
    testing_charges: moneyToFormStr(r.testing_charges),
    unit_of_is: (r.unit_of_is ?? "").trim() || DEFAULT_UNIT,
    mmf_large_scale: moneyToFormStr(r.mmf_large_scale),
    mmf_medium_scale: moneyToFormStr(r.mmf_medium_scale),
    mmf_small_scale: moneyToFormStr(r.mmf_small_scale),
    mmf_micro_scale: moneyToFormStr(r.mmf_micro_scale),
    slab_1_quantity: (r.slab_1_quantity ?? "").trim() || DEFAULT_SLAB_1_QTY,
    slab_1_rate: moneyToFormStr(r.slab_1_rate),
    slab_2_quantity: (r.slab_2_quantity ?? "").trim() || DEFAULT_SLAB_2_QTY,
    slab_2_rate: moneyToFormStr(r.slab_2_rate),
    slab_3_quantity: (r.slab_3_quantity ?? "").trim() || DEFAULT_SLAB_3_QTY,
    slab_3_rate: moneyToFormStr(r.slab_3_rate),
  };
}

/** Table / print: RA prefix + year when set. */
export function formatReaffirmationDisplay(
  year: number | null | undefined,
): string {
  if (year == null || !Number.isFinite(year)) return "—";
  return `RA ${year}`;
}
