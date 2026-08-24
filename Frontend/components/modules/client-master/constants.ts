import type { ClientMasterRow } from "@backend/shared/types/client-master";
import { normalizeEmailInput } from "@backend/shared/validation/email";
import { normalizeGstInput } from "@backend/shared/validation/gst-india";

export const DEFAULT_COMPANY_TYPE = "Manufacturer" as const;
export const DEFAULT_COMPANY_SCALE = "Medium" as const;

export const COMPANY_TYPES = [
  "Manufacturer",
  "Service Provider",
  "Testing Laboratory",
  "Calibration Laboratory",
  "RMP",
  "PT Provider",
  "Other",
] as const;

export const SCALES = ["Large", "Medium", "Small", "Micro"] as const;
export const STATUSES = ["Active", "Inactive"] as const;
export const DEFAULT_COMPANY_STATUS = STATUSES[0];
export const BALANCE_TYPES = ["Dr", "Cr"] as const;

export const PAYMENT_TERMS = [
  { value: "100% Advance", label: "100 % Advance" },
  { value: "15 Days", label: "15 Days" },
  { value: "30 Days", label: "30 Days" },
] as const;

/** Stored value for `clients.payment_term` (label in UI may differ). */
export const DEFAULT_PAYMENT_TERM = PAYMENT_TERMS[0].value;

/** Default PIN code for new clients (Chhattisgarh Raipur area). */
export const DEFAULT_PIN_CODE = "493221" as const;

/** Default city for new clients. */
export const DEFAULT_CITY = "Raipur" as const;

/** Default state / province for new clients. */
export const DEFAULT_STATE = "Chhattisgarh" as const;

/** Default country for new clients. */
export const DEFAULT_COUNTRY = "India" as const;

/** Shared form / toolbar field label typography (client master). */
export const CLIENT_FIELD_LABEL_CLASS =
  "text-[4mm] font-medium leading-tight text-zinc-600 dark:text-zinc-400";

export const CLIENT_FIELD_LABEL_BLOCK_CLASS = `block ${CLIENT_FIELD_LABEL_CLASS}`;

/** Default notes when none are provided. */
export const DEFAULT_NOTES = "N/A" as const;

/** Fallback when `app_dropdown_options` has no rows for phone country codes. */
export const DEFAULT_PHONE_COUNTRY_CODES = [
  "+91",
  "+1",
  "+44",
  "+971",
  "+61",
  "+65",
  "+86",
  "+81",
  "+49",
  "+33",
  "+39",
  "+34",
  "+31",
  "+32",
  "+46",
  "+47",
  "+45",
  "+353",
  "+41",
  "+43",
  "+48",
  "+27",
  "+880",
  "+94",
  "+92",
  "+977",
  "+66",
  "+60",
  "+63",
  "+82",
  "+852",
  "+886",
  "+254",
  "+234",
  "+20",
  "+55",
  "+52",
  "+54",
  "+64",
] as const;

/** Display phone in tables / print (code + national). */
export function formatClientPhoneDisplay(c: ClientMasterRow): string {
  const num = (c.phone ?? "").trim();
  if (num.startsWith("+")) return num;
  const code = (c.phone_country_code ?? "").trim();
  if (code && num) return `${code} ${num}`;
  if (num) return num;
  return code;
}

function parseStoredPhone(c: ClientMasterRow): {
  phone_country_code: string;
  phone: string;
} {
  const raw = (c.phone ?? "").trim();
  if (raw.startsWith("+")) {
    const m = raw.match(/^(\+\d{1,4})(?:[\s\-]*)([\d\s\-]*)$/);
    if (m) {
      return {
        phone_country_code: m[1],
        phone: (m[2] ?? "").replace(/\D/g, ""),
      };
    }
  }
  const code = (c.phone_country_code ?? "+91").trim() || "+91";
  return { phone_country_code: code, phone: raw.replace(/\D/g, "") };
}

export function emptyForm(): Record<string, string> {
  return {
    id: "",
    gst_number: "",
    company_name: "",
    company_type: DEFAULT_COMPANY_TYPE,
    company_scale: DEFAULT_COMPANY_SCALE,
    company_status: DEFAULT_COMPANY_STATUS,
    contact_person_name: "",
    phone_country_code: "+91",
    phone: "",
    email: "",
    address: "",
    pin_code: DEFAULT_PIN_CODE,
    city: DEFAULT_CITY,
    state: DEFAULT_STATE,
    country: DEFAULT_COUNTRY,
    opening_balance: "0.00",
    balance_type: "Dr",
    payment_term: DEFAULT_PAYMENT_TERM,
    notes: DEFAULT_NOTES,
  };
}

export function rowToForm(c: ClientMasterRow): Record<string, string> {
  const { phone_country_code, phone } = parseStoredPhone(c);
  return {
    id: c.id,
    gst_number: normalizeGstInput(c.gst_number ?? ""),
    company_name: c.company_name ?? "",
    company_type:
      (c.company_type ?? "").trim() || DEFAULT_COMPANY_TYPE,
    company_scale:
      (c.company_scale ?? "").trim() || DEFAULT_COMPANY_SCALE,
    company_status:
      (c.company_status ?? "").trim() || DEFAULT_COMPANY_STATUS,
    contact_person_name: c.contact_person_name ?? "",
    phone_country_code,
    phone,
    email: normalizeEmailInput(c.email ?? ""),
    address: c.address ?? "",
    pin_code: (c.pin_code ?? "").trim() || DEFAULT_PIN_CODE,
    city: (c.city ?? "").trim() || DEFAULT_CITY,
    state: (c.state ?? "").trim() || DEFAULT_STATE,
    country: (c.country ?? "").trim() || DEFAULT_COUNTRY,
    opening_balance:
      c.opening_balance != null && Number.isFinite(Number(c.opening_balance))
        ? (Math.round(Number(c.opening_balance) * 100) / 100).toFixed(2)
        : "0.00",
    balance_type: c.balance_type ?? "Dr",
    payment_term:
      (c.payment_term ?? "").trim() || DEFAULT_PAYMENT_TERM,
    notes: (c.notes ?? "").trim() || DEFAULT_NOTES,
  };
}
