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

/** Finance quotations — options come from `clients` table on the page (not app_dropdown). */
export const DROPDOWN_KEY_FINANCE_QUOTATION_CLIENT =
  "finance_quotations.client" as const;

/** Client picker on BIS Projects (options come from `clients` rows on the page). */
export const DROPDOWN_KEY_BIS_PROJECT_CLIENT =
  "bis_projects.client" as const;

/** BIS Projects form — `app_dropdown_options` catalog for `bis_projects.project_kind` (text). */
export const DROPDOWN_KEY_BIS_PROJECT_KIND =
  "bis_projects.project_kind_catalog" as const;

/** BIS Projects form — `app_dropdown_options` catalog for `bis_projects.billing_frequency`. */
export const DROPDOWN_KEY_BIS_BILLING_FREQUENCY =
  "bis_projects.billing_frequency_catalog" as const;

/** Client picker on BIS New Applications (options from `clients` on the page). */
export const DROPDOWN_KEY_BIS_NEW_APPLICATION_CLIENT =
  "bis_new_applications.client" as const;

/** BIS New Applications — `app_dropdown_options` for `bis_new_applications.project_kind`. */
export const DROPDOWN_KEY_BIS_NEW_APPLICATION_KIND =
  "bis_new_applications.project_kind_catalog" as const;

/** BIS New Applications — `app_dropdown_options` for `bis_new_applications.billing_frequency`. */
export const DROPDOWN_KEY_BIS_NEW_APPLICATION_BILLING_FREQUENCY =
  "bis_new_applications.billing_frequency_catalog" as const;
