/** Namespaced keys for `public.app_dropdown_options.option_key`. */
export const DROPDOWN_KEY_CLIENT_COMPANY_TYPE =
  "client_master.company_type" as const;

export const DROPDOWN_KEY_CLIENT_COMPANY_SCALE =
  "client_master.company_scale" as const;

export const DROPDOWN_KEY_CLIENT_COMPANY_STATUS =
  "client_master.company_status" as const;

export const DROPDOWN_KEY_CLIENT_CITY = "client_master.city" as const;

export const DROPDOWN_KEY_CLIENT_PIN_CODE = "client_master.pin_code" as const;

export const DROPDOWN_KEY_CLIENT_STATE = "client_master.state" as const;

export const DROPDOWN_KEY_CLIENT_COUNTRY = "client_master.country" as const;

export const DROPDOWN_KEY_CLIENT_PAYMENT_TERM =
  "client_master.payment_term" as const;

export const DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE =
  "client_master.phone_country_code" as const;

export const DROPDOWN_KEY_IS_CODE_ASPECT = "is_code_master.aspect_of_is" as const;

export const DROPDOWN_KEY_IS_CODE_UNIT = "is_code_master.unit" as const;

export const DROPDOWN_KEY_PRODUCT_UNIT = "product_master.unit" as const;

export const DROPDOWN_KEY_PRODUCT_GST_RATE = "product_master.gst_rate" as const;

/** Client picker on BIS Projects (options come from `clients` rows on the page). */
export const DROPDOWN_KEY_BIS_PROJECT_CLIENT =
  "bis_projects.client" as const;

/** BIS form catalog only (+ opens in-form help); not used for `app_dropdown_options` seed. */
export const DROPDOWN_KEY_BIS_PROJECT_KIND =
  "bis_projects.project_kind_catalog" as const;

/** BIS form catalog only (+ opens in-form help); not used for `app_dropdown_options` seed. */
export const DROPDOWN_KEY_BIS_BILLING_FREQUENCY =
  "bis_projects.billing_frequency_catalog" as const;
