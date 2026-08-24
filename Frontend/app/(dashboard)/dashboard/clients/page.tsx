import { Suspense } from "react";
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
import { ClientMaster } from "@/components/modules/client-master";
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
import { createClient } from "@backend/db/supabase/server";
import type { ClientMasterRow } from "@backend/shared/types/client-master";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";

function MasterFallback() {
  return (
    <div className="w-full max-w-none animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading Client Master…
    </div>
  );
}

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (clients ?? []) as unknown as ClientMasterRow[];

  let companyTypeOptions: AppDropdownOptionRow[] =
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_COMPANY_TYPE);
  if (companyTypeOptions.length === 0) {
    companyTypeOptions = COMPANY_TYPES.map((value, i) => ({
      id: `__static__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }

  let companyScaleOptions: AppDropdownOptionRow[] =
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_COMPANY_SCALE);
  if (companyScaleOptions.length === 0) {
    companyScaleOptions = SCALES.map((value, i) => ({
      id: `__static_scale__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }

  let companyStatusOptions: AppDropdownOptionRow[] =
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_COMPANY_STATUS);
  if (companyStatusOptions.length === 0) {
    companyStatusOptions = STATUSES.map((value, i) => ({
      id: `__static_status__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }

  let pinCodeOptions: AppDropdownOptionRow[] =
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_PIN_CODE);
  if (!pinCodeOptions.some((o) => o.value === DEFAULT_PIN_CODE)) {
    pinCodeOptions = [
      {
        id: `__static_pin__${DEFAULT_PIN_CODE}`,
        value: DEFAULT_PIN_CODE,
        label: null,
        canDelete: false,
      },
      ...pinCodeOptions,
    ];
  }

  let cityOptions: AppDropdownOptionRow[] =
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_CITY);
  if (!cityOptions.some((o) => o.value === DEFAULT_CITY)) {
    cityOptions = [
      {
        id: `__static_city__${DEFAULT_CITY}`,
        value: DEFAULT_CITY,
        label: null,
        canDelete: false,
      },
      ...cityOptions,
    ];
  }

  let stateOptions: AppDropdownOptionRow[] =
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_STATE);
  if (!stateOptions.some((o) => o.value === DEFAULT_STATE)) {
    stateOptions = [
      {
        id: `__static_state__${DEFAULT_STATE}`,
        value: DEFAULT_STATE,
        label: null,
        canDelete: false,
      },
      ...stateOptions,
    ];
  }

  let countryOptions: AppDropdownOptionRow[] =
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_COUNTRY);
  if (!countryOptions.some((o) => o.value === DEFAULT_COUNTRY)) {
    countryOptions = [
      {
        id: `__static_country__${DEFAULT_COUNTRY}`,
        value: DEFAULT_COUNTRY,
        label: null,
        canDelete: false,
      },
      ...countryOptions,
    ];
  }

  let paymentTermOptions: AppDropdownOptionRow[] =
    await fetchAppDropdownOptions(supabase, DROPDOWN_KEY_CLIENT_PAYMENT_TERM);
  if (paymentTermOptions.length === 0) {
    paymentTermOptions = PAYMENT_TERMS.map((t, i) => ({
      id: `__static_payment__${i}`,
      value: t.value,
      label: t.label,
      canDelete: false,
    }));
  }

  let phoneCountryCodeOptions: AppDropdownOptionRow[] =
    await fetchAppDropdownOptions(
      supabase,
      DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE,
    );
  if (phoneCountryCodeOptions.length === 0) {
    phoneCountryCodeOptions = DEFAULT_PHONE_COUNTRY_CODES.map((value, i) => ({
      id: `__static_phone_cc__${i}`,
      value,
      label: null,
      canDelete: false,
    }));
  }

  return (
    <Suspense fallback={<MasterFallback />}>
      <ClientMaster
        initialClients={rows}
        fetchError={error?.message ?? null}
        queryError={firstSearchParam(sp, "error")}
        dbErrorCode={firstSearchParam(sp, "db_code")}
        dbErrorHint={firstSearchParam(sp, "db_hint")}
        returnToAfterSave={firstSearchParam(sp, "return_to")}
        companyTypeOptions={companyTypeOptions}
        companyScaleOptions={companyScaleOptions}
        companyStatusOptions={companyStatusOptions}
        pinCodeOptions={pinCodeOptions}
        cityOptions={cityOptions}
        stateOptions={stateOptions}
        countryOptions={countryOptions}
        paymentTermOptions={paymentTermOptions}
        phoneCountryCodeOptions={phoneCountryCodeOptions}
      />
    </Suspense>
  );
}
