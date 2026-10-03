import {
  COMPANY_TYPES,
  DEFAULT_PHONE_COUNTRY_CODES,
  DEFAULT_CITY,
  DEFAULT_PIN_CODE,
  DEFAULT_STATE,
  DEFAULT_COUNTRY,
  PAYMENT_TERMS,
  SCALES,
  STATUSES,
} from "@/components/modules/client-master/constants";
import { fetchAppDropdownOptions } from "@backend/shared/data/app-dropdown-options";
import {
  DROPDOWN_KEY_CLIENT_CITY,
  DROPDOWN_KEY_CLIENT_COMPANY_SCALE,
  DROPDOWN_KEY_CLIENT_COMPANY_STATUS,
  DROPDOWN_KEY_CLIENT_COMPANY_TYPE,
  DROPDOWN_KEY_CLIENT_COUNTRY,
  DROPDOWN_KEY_CLIENT_PAYMENT_TERM,
  DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE,
  DROPDOWN_KEY_CLIENT_PIN_CODE,
  DROPDOWN_KEY_CLIENT_STATE,
} from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import { createClient } from "@backend/db/client/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ClientMasterDropdownOptions = {
  companyTypeOptions: AppDropdownOptionRow[];
  companyScaleOptions: AppDropdownOptionRow[];
  companyStatusOptions: AppDropdownOptionRow[];
  pinCodeOptions: AppDropdownOptionRow[];
  cityOptions: AppDropdownOptionRow[];
  stateOptions: AppDropdownOptionRow[];
  countryOptions: AppDropdownOptionRow[];
  paymentTermOptions: AppDropdownOptionRow[];
  phoneCountryCodeOptions: AppDropdownOptionRow[];
};

function withDefault(
  options: AppDropdownOptionRow[],
  value: string,
  idPrefix: string,
): AppDropdownOptionRow[] {
  if (options.some((o) => o.value === value)) return options;
  return [
    {
      id: `${idPrefix}${value}`,
      value,
      label: null,
      canDelete: false,
    },
    ...options,
  ];
}

export async function loadClientMasterDropdownOptions(
  supabase: Supabase,
): Promise<ClientMasterDropdownOptions> {
  const [
    companyTypeRaw,
    companyScaleRaw,
    companyStatusRaw,
    pinCodeRaw,
    cityRaw,
    stateRaw,
    countryRaw,
    paymentTermRaw,
    phoneCountryCodeRaw,
  ] = await Promise.all([
    fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_COMPANY_TYPE),
    fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_COMPANY_SCALE),
    fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_COMPANY_STATUS),
    fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_PIN_CODE),
    fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_CITY),
    fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_STATE),
    fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_COUNTRY),
    fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_PAYMENT_TERM),
    fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE),
  ]);

  const companyTypeOptions =
    companyTypeRaw.length > 0
      ? companyTypeRaw
      : COMPANY_TYPES.map((value, i) => ({
          id: `__static__${i}`,
          value,
          label: null,
          canDelete: false,
        }));

  const companyScaleOptions =
    companyScaleRaw.length > 0
      ? companyScaleRaw
      : SCALES.map((value, i) => ({
          id: `__static_scale__${i}`,
          value,
          label: null,
          canDelete: false,
        }));

  const companyStatusOptions =
    companyStatusRaw.length > 0
      ? companyStatusRaw
      : STATUSES.map((value, i) => ({
          id: `__static_status__${i}`,
          value,
          label: null,
          canDelete: false,
        }));

  const pinCodeOptions = withDefault(
    pinCodeRaw,
    DEFAULT_PIN_CODE,
    "__static_pin__",
  );
  const cityOptions = withDefault(cityRaw, DEFAULT_CITY, "__static_city__");
  const stateOptions = withDefault(stateRaw, DEFAULT_STATE, "__static_state__");
  const countryOptions = withDefault(
    countryRaw,
    DEFAULT_COUNTRY,
    "__static_country__",
  );

  const paymentTermOptions =
    paymentTermRaw.length > 0
      ? paymentTermRaw
      : PAYMENT_TERMS.map((t, i) => ({
          id: `__static_payment__${i}`,
          value: t.value,
          label: t.label,
          canDelete: false,
        }));

  const phoneCountryCodeOptions =
    phoneCountryCodeRaw.length > 0
      ? phoneCountryCodeRaw
      : DEFAULT_PHONE_COUNTRY_CODES.map((value, i) => ({
          id: `__static_phone_cc__${i}`,
          value,
          label: null,
          canDelete: false,
        }));

  return {
    companyTypeOptions,
    companyScaleOptions,
    companyStatusOptions,
    pinCodeOptions,
    cityOptions,
    stateOptions,
    countryOptions,
    paymentTermOptions,
    phoneCountryCodeOptions,
  };
}
