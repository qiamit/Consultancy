"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  COMPANY_TYPES,
  DEFAULT_COMPANY_SCALE,
  DEFAULT_COMPANY_STATUS,
  DEFAULT_COMPANY_TYPE,
  DEFAULT_PAYMENT_TERM,
  DEFAULT_CITY,
  DEFAULT_PIN_CODE,
  DEFAULT_STATE,
  DEFAULT_COUNTRY,
  DEFAULT_NOTES,
  DEFAULT_PHONE_COUNTRY_CODES,
  PAYMENT_TERMS,
  SCALES,
  STATUSES,
} from "@/components/modules/client-master/constants";
import { createClient } from "@/lib/supabase/server";
import {
  isValidEmailOrEmpty,
  normalizeEmailInput,
} from "@/lib/validation/email";
import {
  isValidGstinOrEmpty,
  normalizeGstInput,
} from "@/lib/validation/gst-india";
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
} from "@/lib/dropdown-keys";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableStr(formData: FormData, key: string) {
  const s = str(formData, key);
  return s ? s : null;
}

const BALANCE_TYPES = new Set(["Cr", "Dr"]);

/** Escape `\`, `%`, `_` so `.ilike()` matches the literal string (case-insensitive). */
function escapeIlikeLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function isDuplicateCompanyName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyName: string,
  excludeClientId: string | null,
): Promise<boolean> {
  const trimmed = companyName.trim();
  if (!trimmed) return false;
  const pattern = escapeIlikeLiteral(trimmed);
  let q = supabase.from("clients").select("id").ilike("company_name", pattern).limit(1);
  if (excludeClientId) q = q.neq("id", excludeClientId);
  const { data, error } = await q.maybeSingle();
  if (error) return false;
  return data != null;
}

async function loadCompanyTypeSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", DROPDOWN_KEY_CLIENT_COMPANY_TYPE);
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  for (const t of COMPANY_TYPES) s.add(t);
  return s;
}

async function loadCompanyScaleSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", DROPDOWN_KEY_CLIENT_COMPANY_SCALE);
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  for (const t of SCALES) s.add(t);
  return s;
}

async function loadCompanyStatusSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", DROPDOWN_KEY_CLIENT_COMPANY_STATUS);
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  for (const t of STATUSES) s.add(t);
  return s;
}

async function loadPaymentTermSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", DROPDOWN_KEY_CLIENT_PAYMENT_TERM);
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  for (const t of PAYMENT_TERMS) s.add(t.value);
  return s;
}

async function loadPhoneCountryCodeSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", DROPDOWN_KEY_CLIENT_PHONE_COUNTRY_CODE);
  const s = new Set<string>();
  for (const r of data ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  for (const c of DEFAULT_PHONE_COUNTRY_CODES) s.add(c);
  return s;
}

async function loadUnionDropdownSet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  optionKey: string,
  column: "city" | "state" | "country" | "pin_code",
  fallbackWhenEmpty: readonly string[] | null,
): Promise<Set<string>> {
  const { data: opts } = await supabase
    .from("app_dropdown_options")
    .select("value")
    .eq("option_key", optionKey);
  const s = new Set<string>();
  for (const r of opts ?? []) {
    const v = String((r as { value: string }).value ?? "").trim();
    if (v) s.add(v);
  }
  const { data: rows } = await supabase.from("clients").select(column);
  for (const r of rows ?? []) {
    const v = (r as Record<string, string | null>)[column];
    if (typeof v === "string" && v.trim()) s.add(v.trim());
  }
  if (s.size === 0 && fallbackWhenEmpty) {
    for (const v of fallbackWhenEmpty) s.add(v);
  }
  if (column === "city") s.add(DEFAULT_CITY);
  else if (column === "state") s.add(DEFAULT_STATE);
  else if (column === "pin_code") s.add(DEFAULT_PIN_CODE);
  else if (column === "country") s.add(DEFAULT_COUNTRY);
  return s;
}

type SaveCtx = {
  companyTypes: Set<string>;
  companyScales: Set<string>;
  companyStatuses: Set<string>;
  pinCodes: Set<string>;
  cities: Set<string>;
  states: Set<string>;
  countries: Set<string>;
  paymentTerms: Set<string>;
  phoneCountryCodes: Set<string>;
};

async function loadClientFormValidationContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<SaveCtx> {
  const companyTypes = await loadCompanyTypeSet(supabase);
  const companyScales = await loadCompanyScaleSet(supabase);
  const companyStatuses = await loadCompanyStatusSet(supabase);
  const paymentTerms = await loadPaymentTermSet(supabase);
  const cities = await loadUnionDropdownSet(
    supabase,
    DROPDOWN_KEY_CLIENT_CITY,
    "city",
    null,
  );
  cities.add(DEFAULT_CITY);
  const states = await loadUnionDropdownSet(
    supabase,
    DROPDOWN_KEY_CLIENT_STATE,
    "state",
    null,
  );
  states.add(DEFAULT_STATE);
  const countries = await loadUnionDropdownSet(
    supabase,
    DROPDOWN_KEY_CLIENT_COUNTRY,
    "country",
    [DEFAULT_COUNTRY],
  );
  countries.add(DEFAULT_COUNTRY);
  const pinCodes = await loadUnionDropdownSet(
    supabase,
    DROPDOWN_KEY_CLIENT_PIN_CODE,
    "pin_code",
    null,
  );
  pinCodes.add(DEFAULT_PIN_CODE);
  const phoneCountryCodes = await loadPhoneCountryCodeSet(supabase);
  return {
    companyTypes,
    companyScales,
    companyStatuses,
    pinCodes,
    cities,
    states,
    countries,
    paymentTerms,
    phoneCountryCodes,
  };
}

function rowFromForm(formData: FormData, ctx: SaveCtx) {
  const company_name = str(formData, "company_name");
  const contact_person_name = nullableStr(formData, "contact_person_name");
  if (!company_name) return { error: "company" as const };

  const gst_normalized = normalizeGstInput(str(formData, "gst_number"));
  if (!isValidGstinOrEmpty(gst_normalized))
    return { error: "gst" as const };
  const gst_number = gst_normalized ? gst_normalized : null;

  const email_normalized = normalizeEmailInput(str(formData, "email"));
  if (!isValidEmailOrEmpty(email_normalized))
    return { error: "email" as const };
  const email = email_normalized ? email_normalized : null;

  const company_type =
    nullableStr(formData, "company_type") ?? DEFAULT_COMPANY_TYPE;
  if (!ctx.companyTypes.has(company_type))
    return { error: "enum_company_type" as const };

  const company_scale =
    nullableStr(formData, "company_scale") ?? DEFAULT_COMPANY_SCALE;
  if (!ctx.companyScales.has(company_scale))
    return { error: "enum_company_scale" as const };

  const company_status =
    str(formData, "company_status") || DEFAULT_COMPANY_STATUS;
  if (!ctx.companyStatuses.has(company_status))
    return { error: "enum_company_status" as const };

  const balance_type = str(formData, "balance_type") || "Dr";
  if (!BALANCE_TYPES.has(balance_type))
    return { error: "enum_balance_type" as const };

  const payment_term =
    nullableStr(formData, "payment_term") ?? DEFAULT_PAYMENT_TERM;
  if (!ctx.paymentTerms.has(payment_term))
    return { error: "enum_payment_term" as const };

  const openingRaw = str(formData, "opening_balance");
  const opening_balance =
    openingRaw === "" || openingRaw === undefined
      ? 0
      : Number(openingRaw);
  if (!Number.isFinite(opening_balance)) return { error: "amount" as const };

  const city = nullableStr(formData, "city") ?? DEFAULT_CITY;
  if (ctx.cities.size > 0 && !ctx.cities.has(city))
    return { error: "enum_city" as const };

  const state = nullableStr(formData, "state") ?? DEFAULT_STATE;
  if (ctx.states.size > 0 && !ctx.states.has(state))
    return { error: "enum_state" as const };

  const country = str(formData, "country") || DEFAULT_COUNTRY;
  if (!ctx.countries.has(country)) return { error: "enum_country" as const };

  const pin_code = nullableStr(formData, "pin_code") ?? DEFAULT_PIN_CODE;
  if (ctx.pinCodes.size > 0 && !ctx.pinCodes.has(pin_code))
    return { error: "enum_pin_code" as const };

  const phone_country_code = str(formData, "phone_country_code") || "+91";
  if (!ctx.phoneCountryCodes.has(phone_country_code))
    return { error: "enum_phone_country_code" as const };

  const phoneDigits = str(formData, "phone").replace(/\D/g, "");
  const phone = phoneDigits ? phoneDigits : null;

  const name = company_name || contact_person_name || "Client";

  return {
    payload: {
      name,
      company_name,
      gst_number,
      company_type,
      company_scale,
      company_status,
      contact_person_name,
      email,
      phone_country_code,
      phone,
      address: nullableStr(formData, "address"),
      pin_code,
      city,
      state,
      country,
      opening_balance,
      balance_type,
      payment_term,
      notes: nullableStr(formData, "notes") ?? DEFAULT_NOTES,
    },
  };
}

function Simp(r: Record<string, string>, key: string) {
  return String(r[key] ?? "").trim();
}

function Nimp(r: Record<string, string>, key: string) {
  const s = Simp(r, key);
  return s ? s : null;
}

/** Same rules as `rowFromForm`, for CSV import rows. */
function rowFromImportRecord(r: Record<string, string>, ctx: SaveCtx) {
  const company_name = Simp(r, "company_name");
  const contact_person_name = Nimp(r, "contact_person_name");
  if (!company_name) return { error: "Company name is required." };

  const gst_normalized = normalizeGstInput(Simp(r, "gst_number"));
  if (!isValidGstinOrEmpty(gst_normalized))
    return {
      error:
        "Invalid GST number: use 15-character GSTIN (state code + PAN + entity + type + check digit), or leave blank.",
    };
  const gst_number = gst_normalized ? gst_normalized : null;

  const email_normalized = normalizeEmailInput(Simp(r, "email"));
  if (!isValidEmailOrEmpty(email_normalized))
    return {
      error:
        "Invalid email address. Leave blank or use a valid address (e.g. name@company.com).",
    };
  const email = email_normalized ? email_normalized : null;

  const company_type = Nimp(r, "company_type") ?? DEFAULT_COMPANY_TYPE;
  if (!ctx.companyTypes.has(company_type))
    return { error: `Invalid company type: ${company_type}` };

  const company_scale = Nimp(r, "company_scale") ?? DEFAULT_COMPANY_SCALE;
  if (!ctx.companyScales.has(company_scale))
    return { error: `Invalid company scale: ${company_scale}` };

  const company_status = Simp(r, "company_status") || DEFAULT_COMPANY_STATUS;
  if (!ctx.companyStatuses.has(company_status))
    return { error: `Invalid company status: ${company_status}` };

  const balance_type = Simp(r, "balance_type") || "Dr";
  if (!BALANCE_TYPES.has(balance_type))
    return { error: `Invalid balance type: ${balance_type}` };

  const payment_term = Nimp(r, "payment_term") ?? DEFAULT_PAYMENT_TERM;
  if (!ctx.paymentTerms.has(payment_term))
    return { error: `Invalid payment term: ${payment_term}` };

  const city = Nimp(r, "city") ?? DEFAULT_CITY;
  if (ctx.cities.size > 0 && !ctx.cities.has(city))
    return { error: `Invalid city: ${city}` };

  const state = Nimp(r, "state") ?? DEFAULT_STATE;
  if (ctx.states.size > 0 && !ctx.states.has(state))
    return { error: `Invalid state: ${state}` };

  const country = Simp(r, "country") || DEFAULT_COUNTRY;
  if (!ctx.countries.has(country))
    return { error: `Invalid country: ${country}` };

  const pin_code = Nimp(r, "pin_code") ?? DEFAULT_PIN_CODE;
  if (ctx.pinCodes.size > 0 && !ctx.pinCodes.has(pin_code))
    return { error: `Invalid PIN code: ${pin_code}` };

  let phone_country_code = Simp(r, "phone_country_code") || "+91";
  let phoneRaw = Simp(r, "phone");
  if (
    phoneRaw.startsWith("+") &&
    !Simp(r, "phone_country_code")
  ) {
    const m = phoneRaw.match(/^(\+\d{1,4})(?:[\s\-]*)([\d\s\-]*)$/);
    if (m) {
      phone_country_code = m[1];
      phoneRaw = m[2] ?? "";
    }
  }
  if (!ctx.phoneCountryCodes.has(phone_country_code))
    return {
      error: `Invalid phone country code: ${phone_country_code}`,
    };

  const phoneDigits = phoneRaw.replace(/\D/g, "");
  const phone = phoneDigits ? phoneDigits : null;

  const openingRaw = Simp(r, "opening_balance");
  const opening_balance =
    openingRaw === "" ? 0 : Number(openingRaw);
  if (!Number.isFinite(opening_balance))
    return { error: "Opening balance must be a valid number." };

  const name = company_name || contact_person_name || "Client";

  return {
    payload: {
      name,
      company_name,
      gst_number,
      company_type,
      company_scale,
      company_status,
      contact_person_name,
      email,
      phone_country_code,
      phone,
      address: Nimp(r, "address"),
      pin_code,
      city,
      state,
      country,
      opening_balance,
      balance_type,
      payment_term,
      notes: Nimp(r, "notes") ?? DEFAULT_NOTES,
    },
  };
}

function clientRowFormErrorToMessage(code: string): string {
  const messages: Record<string, string> = {
    company: "Company name is required.",
    gst: "Invalid GST number. Leave blank or enter a valid 15-character GSTIN.",
    email: "Invalid email. Leave blank or enter a valid address.",
    enum_company_type:
      "Company type is not allowed. Pick a value from Client Master defaults.",
    enum_company_scale:
      "Company scale is not allowed. Pick a value from Client Master defaults.",
    enum_company_status: "Company status must be Active or Inactive.",
    enum_balance_type: "Balance type must be Dr or Cr.",
    enum_payment_term:
      "Payment term is not allowed. Pick a value from Client Master defaults.",
    enum_city:
      "City is not in the allowed list. Add it in Client Master or use a listed city.",
    enum_state:
      "State is not in the allowed list. Add it in Client Master or use a listed state.",
    enum_country:
      "Country is not in the allowed list. Add it in Client Master or use a listed country.",
    enum_pin_code:
      "PIN code is not in the allowed list. Add it in Client Master or use a listed PIN.",
    enum_phone_country_code:
      "Phone country code is not allowed. Pick from the Client Master list.",
    amount: "Opening balance must be a valid number.",
  };
  return messages[code] ?? "Could not validate the client form.";
}

export type ExecuteClientSaveResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      redirectCode?: string;
      dbCode?: string;
      dbHint?: string;
    };

/** Save without redirect (e.g. Client Master form embedded in BIS). Revalidates clients + bis-projects on success. */
export async function executeSaveClientMaster(
  formData: FormData,
): Promise<ExecuteClientSaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in.", redirectCode: "db" };
  }

  const id = nullableStr(formData, "id");
  const ctx = await loadClientFormValidationContext(supabase);
  const parsed = rowFromForm(formData, ctx);
  if ("error" in parsed) {
    const code = String(parsed.error ?? "");
    return {
      ok: false,
      error: clientRowFormErrorToMessage(code),
      redirectCode: code,
    };
  }

  const { payload } = parsed;
  const row = {
    ...payload,
    updated_at: new Date().toISOString(),
  };

  if (await isDuplicateCompanyName(supabase, row.company_name as string, id)) {
    return {
      ok: false,
      error: "A client with this company name already exists.",
      redirectCode: "duplicate",
    };
  }

  if (id) {
    const { error } = await supabase.from("clients").update(row).eq("id", id);
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          error: "A client with this company name already exists.",
          redirectCode: "duplicate",
        };
      }
      return {
        ok: false,
        error: (error.message ?? "Unknown error").slice(0, 280),
        redirectCode: "db",
        dbCode: error.code ?? undefined,
        dbHint: error.message,
      };
    }
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/bis-projects");
    return { ok: true, id };
  }

  const { data: inserted, error } = await supabase
    .from("clients")
    .insert({
      ...row,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "A client with this company name already exists.",
        redirectCode: "duplicate",
      };
    }
    return {
      ok: false,
      error: (error.message ?? "Unknown error").slice(0, 280),
      redirectCode: "db",
      dbCode: error.code ?? undefined,
      dbHint: error.message,
    };
  }

  const newId = inserted?.id as string | undefined;
  if (!newId) {
    return {
      ok: false,
      error: "Save succeeded but no id was returned.",
      redirectCode: "db",
    };
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/bis-projects");
  return { ok: true, id: newId };
}

export async function saveClientMaster(formData: FormData) {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) redirect("/login");

  const r = await executeSaveClientMaster(formData);
  if (!r.ok) {
    if (r.redirectCode === "db" && (r.dbHint || r.dbCode)) {
      const hint = encodeURIComponent(
        (r.dbHint ?? r.error).slice(0, 280),
      );
      redirect(
        `/dashboard/clients?error=db&db_code=${encodeURIComponent(r.dbCode ?? "")}&db_hint=${hint}`,
      );
    }
    if (r.redirectCode) {
      redirect(
        `/dashboard/clients?error=${encodeURIComponent(r.redirectCode)}`,
      );
    }
    redirect("/dashboard/clients?error=db");
  }

  redirect("/dashboard/clients");
}

/** Legacy: detail/new pages if still linked */
export async function createClientRecord(formData: FormData) {
  await saveClientMaster(formData);
}

export async function updateClientRecord(id: string, formData: FormData) {
  const copy = new FormData();
  for (const [k, v] of formData.entries()) {
    if (k === "id") continue;
    copy.append(k, v);
  }
  copy.set("id", id);
  await saveClientMaster(copy);
}

export async function deleteClientMaster(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const trimmed = id?.trim();
  if (!trimmed) redirect("/dashboard/clients");

  const { error } = await supabase.from("clients").delete().eq("id", trimmed);
  if (error) redirect("/dashboard/clients?error=db");

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

/** Deletes many clients in one request (footer bulk delete). Single redirect/revalidate. */
export async function deleteClientsMaster(ids: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = [...new Set(ids.map((id) => id?.trim()).filter(Boolean))];
  if (trimmed.length === 0) redirect("/dashboard/clients");

  const { error } = await supabase.from("clients").delete().in("id", trimmed);
  if (error) redirect("/dashboard/clients?error=db");

  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

export async function importClientsMaster(
  rows: Record<string, string>[],
): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  if (rows.length === 0) {
    return { ok: false, error: "No rows to import." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const {
    companyTypes,
    companyScales,
    companyStatuses,
    pinCodes,
    cities,
    states,
    countries,
    paymentTerms,
    phoneCountryCodes,
  } = await loadClientFormValidationContext(supabase);

  const { data: existingNames } = await supabase
    .from("clients")
    .select("company_name");
  const seenCompanyLower = new Set(
    (existingNames ?? [])
      .map((r: { company_name: string | null }) =>
        (r.company_name ?? "").trim().toLowerCase(),
      )
      .filter(Boolean),
  );

  const now = new Date().toISOString();
  const payloads: Array<
    Record<string, string | number | null> & {
      created_by: string;
      updated_at: string;
    }
  > = [];

  for (let i = 0; i < rows.length; i++) {
    const parsed = rowFromImportRecord(rows[i], {
      companyTypes,
      companyScales,
      companyStatuses,
      pinCodes,
      cities,
      states,
      countries,
      paymentTerms,
      phoneCountryCodes,
    });
    if ("error" in parsed) {
      return {
        ok: false,
        error: `Row ${i + 2} (after header): ${parsed.error}`,
      };
    }
    const cn = String(parsed.payload.company_name ?? "").trim();
    const key = cn.toLowerCase();
    if (seenCompanyLower.has(key)) {
      return {
        ok: false,
        error: `Row ${i + 2} (after header): duplicate company name “${cn}” (already in the database or repeated in this file).`,
      };
    }
    seenCompanyLower.add(key);
    payloads.push({
      ...parsed.payload,
      created_by: user.id,
      updated_at: now,
    });
  }

  const { error } = await supabase.from("clients").insert(payloads);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error:
          "Import failed: a company name matches an existing client (names must be unique).",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/clients");
  return { ok: true, inserted: payloads.length };
}
