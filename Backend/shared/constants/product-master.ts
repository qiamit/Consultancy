export const DEFAULT_CATEGORY: "product" | "service" = "service";

export const DEFAULT_UNIT = "Nos";

/** Default manufacturer / brand hint for new product & service rows. */
export const DEFAULT_MAKE = "QE";

/** Default HSN (digits only, max 8) for new product & service rows. */
export const DEFAULT_HSN_CODE = "998393";

export const DEFAULT_GST_RATE = "18%";

export const DEFAULT_MONEY_FIELD = "0.00";

export const UNITS = ["Tonne", "Pcs", "Nos"] as const;

export const GST_RATES = ["0%", "5%", "12%", "18%"] as const;
