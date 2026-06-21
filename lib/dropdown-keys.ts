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

export const DROPDOWN_KEY_TEST_PARAMETER_TEST_METHOD =
  "test_parameter_master.test_method" as const;

export const DROPDOWN_KEY_PRODUCT_UNIT = "product_master.unit" as const;

export const DROPDOWN_KEY_PRODUCT_GST_RATE = "product_master.gst_rate" as const;

/** Finance quotations — options come from `clients` table on the page (not app_dropdown). */
export const DROPDOWN_KEY_FINANCE_QUOTATION_CLIENT =
  "finance_quotations.client" as const;

/** Finance sales orders — options come from `clients` table on the page. */
export const DROPDOWN_KEY_FINANCE_SALES_ORDER_CLIENT =
  "finance_sales_orders.client" as const;

/** Finance proforma invoices — options come from `clients` table on the page. */
export const DROPDOWN_KEY_FINANCE_PROFORMA_INVOICE_CLIENT =
  "finance_proforma_invoices.client" as const;

/** Finance tax invoices — options come from `clients` table on the page. */
export const DROPDOWN_KEY_FINANCE_TAX_INVOICE_CLIENT =
  "finance_tax_invoices.client" as const;

/** Finance credit notes — options come from `clients` table on the page. */
export const DROPDOWN_KEY_FINANCE_CREDIT_NOTE_CLIENT =
  "finance_credit_notes.client" as const;

/** Finance customer statements — options come from `clients` table on the page. */
export const DROPDOWN_KEY_FINANCE_CUSTOMER_STATEMENT_CLIENT =
  "finance_customer_statements.client" as const;

/** Finance payment-in — options come from `clients` table on the page. */
export const DROPDOWN_KEY_FINANCE_PAYMENT_IN_CLIENT =
  "finance_payment_in.client" as const;

/** Finance payment-out — options come from `clients` table on the page. */
export const DROPDOWN_KEY_FINANCE_PAYMENT_OUT_CLIENT =
  "finance_payment_out.client" as const;

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

/** BIS Application checklist — managed dropdown catalogs. */
export const DROPDOWN_KEY_BIS_APPLICATION_BRANCH =
  "bis_application.bis_branch_name" as const;

export const DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_NAME =
  "bis_application.dealing_officer_name" as const;

export const DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_DESIGNATION =
  "bis_application.dealing_officer_designation" as const;

export const DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_NAME =
  "bis_application.inspection_officer_name" as const;

export const DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_DESIGNATION =
  "bis_application.inspection_officer_designation" as const;

export const DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_NAME =
  "bis_application.branch_head_name" as const;

export const DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_DESIGNATION =
  "bis_application.branch_head_designation" as const;

export const DROPDOWN_KEY_BIS_APPLICATION_NATURE_OF_INSPECTION =
  "bis_application.nature_of_inspection" as const;

export const DROPDOWN_KEY_BIS_APPLICATION_MARKING_CLAUSE =
  "bis_application.marking_clause" as const;

export const DROPDOWN_KEY_BIS_APPLICATION_PACKAGING_CLAUSE =
  "bis_application.packaging_clause" as const;

/** Technical Staff form — managed dropdown catalogs. */
export const DROPDOWN_KEY_TECHNICAL_STAFF_DESIGNATION =
  "technical_staff.designation" as const;

export const DROPDOWN_KEY_TECHNICAL_STAFF_QUALIFICATION =
  "technical_staff.educational_qualification" as const;

export const DROPDOWN_KEY_TECHNICAL_STAFF_EXPERIENCE =
  "technical_staff.experience_years" as const;

export const BIS_APPLICATION_DROPDOWN_KEYS = [
  DROPDOWN_KEY_BIS_APPLICATION_BRANCH,
  DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_NAME,
  DROPDOWN_KEY_BIS_APPLICATION_DEALING_OFFICER_DESIGNATION,
  DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_NAME,
  DROPDOWN_KEY_BIS_APPLICATION_INSPECTION_OFFICER_DESIGNATION,
  DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_NAME,
  DROPDOWN_KEY_BIS_APPLICATION_BRANCH_HEAD_DESIGNATION,
  DROPDOWN_KEY_BIS_APPLICATION_NATURE_OF_INSPECTION,
  DROPDOWN_KEY_BIS_APPLICATION_MARKING_CLAUSE,
  DROPDOWN_KEY_BIS_APPLICATION_PACKAGING_CLAUSE,
] as const;

export const TECHNICAL_STAFF_DROPDOWN_KEYS = [
  DROPDOWN_KEY_TECHNICAL_STAFF_DESIGNATION,
  DROPDOWN_KEY_TECHNICAL_STAFF_QUALIFICATION,
  DROPDOWN_KEY_TECHNICAL_STAFF_EXPERIENCE,
] as const;
