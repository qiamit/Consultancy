/** Canonical aspect values (must match `app_dropdown_options` seed). */
export const ASPECTS = [
  "Specification",
  "Test Method",
  "Code of Practice",
  "Others",
] as const;

export const DEFAULT_ASPECT_OF_IS = ASPECTS[0];

export const UNITS = [
  "Tonne",
  "Pcs",
  "Nos",
  "Kilo Litre",
  "Litre",
  "Kg",
] as const;

export const DEFAULT_UNIT = UNITS[0];

export const DEFAULT_SLAB_1_QTY = "All Quantities" as const;
export const DEFAULT_SLAB_2_QTY = "N/A" as const;
export const DEFAULT_SLAB_3_QTY = "N/A" as const;

/** Shown when amendment number is not set (form + load from null/blank). */
export const DEFAULT_AMENDMENT_NUMBER = "00" as const;

/** Default money inputs (testing charges, MMF, slab rates) in IS Code form. */
export const DEFAULT_MONEY_FIELD = "0.00" as const;
