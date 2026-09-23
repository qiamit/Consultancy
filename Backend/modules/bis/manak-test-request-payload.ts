import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";

/** Clipboard tag so the Manak extension ignores unrelated copied text. */
export const MANAK_TEST_REQUEST_KIND = "QE_MANAK_TR_V1" as const;

/** Result written after Manak returns a Sample Code. */
export const MANAK_TEST_REQUEST_RESULT_KIND = "QE_MANAK_TR_RESULT_V1" as const;

export type ManakTestRequestApplication = {
  companyName: string;
  isNumber: string;
  isSearch: string;
  isTitle: string;
  applicationNumber: string;
  gstNumber: string;
  email: string;
  correspondenceAddress: string;
  manufacturingAddress: string;
  pinCode: string;
};

export type ManakTestRequestSample = {
  sample_description: string;
  grade_type_variety: string;
  declared_value: string;
  batch_number: string;
  date_of_manufacturing: string;
  sample_quantity: string;
  batch_quantity: string;
  sample_code: string;
  qr_code: string;
  sample_type: string;
  priority: string;
  laboratory_name: string;
  shelf_life: string;
  mode_of_disposal: string;
  testing_charges: string;
  test_required: string;
  serial_number: string;
  additional_information: string;
  destination_lab: string;
  payment_ref: string;
  payment_date: string;
  payment_mode: string;
};

export type ManakTestRequestPayload = {
  kind: typeof MANAK_TEST_REQUEST_KIND;
  copiedAt: number;
  sampleId: string;
  application: ManakTestRequestApplication;
  sample: ManakTestRequestSample;
  portalUserId?: string;
};

export type ManakTestRequestResult = {
  kind: typeof MANAK_TEST_REQUEST_RESULT_KIND;
  sampleId: string;
  sample_code: string;
  qr_code: string;
  filledAt: number;
  pdfBase64?: string;
  pdfName?: string;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

/** Manak Test Request date fields use `dd-mm-yyyy`. */
export function toManakDate(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return `${iso[3]}-${iso[2]}-${iso[1]}`;
  }
  const dmy = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (dmy) {
    return `${dmy[1].padStart(2, "0")}-${dmy[2].padStart(2, "0")}-${dmy[3]}`;
  }
  return raw;
}

/** Manak Indian Standards search needs `IS 11652`, not bare `11652`. */
export function manakIsSearchValue(isNumber: unknown): string {
  const raw = text(isNumber);
  const digits = raw.replace(/^IS\s*/i, "").match(/\d{3,7}/);
  if (!digits) return raw;
  return `IS ${digits[0]}`;
}

export function pinCodeFromAddress(address: unknown): string {
  const match = text(address).match(/\b(\d{6})\b/);
  return match ? match[1] : "";
}

export function buildManakTestRequestApplication(input: {
  companyName?: string | null;
  isNumber?: string | null;
  isTitle?: string | null;
  applicationNumber?: string | null;
  gstNumber?: string | null;
  email?: string | null;
  correspondenceAddress?: string | null;
  manufacturingAddress?: string | null;
  address?: string | null;
  pinCode?: string | null;
}): ManakTestRequestApplication {
  const address = text(input.correspondenceAddress ?? input.address);
  const manufacturing = text(input.manufacturingAddress) || address;
  return {
    companyName: text(input.companyName),
    isNumber: text(input.isNumber),
    isSearch: manakIsSearchValue(input.isNumber),
    isTitle: text(input.isTitle),
    applicationNumber: text(input.applicationNumber),
    gstNumber: text(input.gstNumber),
    email: text(input.email),
    correspondenceAddress: address,
    manufacturingAddress: manufacturing,
    pinCode: text(input.pinCode) || pinCodeFromAddress(address),
  };
}

export function buildManakTestRequestSample(
  row: Partial<OslSampleRequirementStored> | null | undefined,
): ManakTestRequestSample {
  const src = row ?? {};
  return {
    sample_description: text(src.sample_description),
    grade_type_variety: text(src.grade_type_variety),
    declared_value: text(src.declared_value),
    batch_number: text(src.batch_number),
    date_of_manufacturing: toManakDate(src.date_of_manufacturing),
    sample_quantity: text(src.sample_quantity),
    batch_quantity: text(src.batch_quantity),
    sample_code: text(src.sample_code),
    qr_code: text(src.qr_code),
    sample_type: text(src.sample_type),
    priority: text(src.priority),
    laboratory_name: text(src.laboratory_name),
    shelf_life: text(src.shelf_life),
    mode_of_disposal: text(src.mode_of_disposal),
    testing_charges: text(src.testing_charges),
    test_required: text(src.test_required),
    serial_number: text(src.serial_number),
    additional_information: text(src.additional_information),
    destination_lab: text(src.destination_lab),
    payment_ref: text(src.payment_ref),
    payment_date: toManakDate(src.payment_date),
    payment_mode: text(src.payment_mode),
  };
}

export function buildManakTestRequestPayload(
  row: Partial<OslSampleRequirementStored> & { id?: string },
  application: Parameters<typeof buildManakTestRequestApplication>[0],
  copiedAt = Date.now(),
): ManakTestRequestPayload {
  return {
    kind: MANAK_TEST_REQUEST_KIND,
    copiedAt,
    sampleId: text(row.id),
    application: buildManakTestRequestApplication(application),
    sample: buildManakTestRequestSample(row),
  };
}

export function stringifyManakTestRequestPayload(
  payload: ManakTestRequestPayload,
): string {
  return JSON.stringify(payload);
}

export function parseManakTestRequestPayload(
  raw: string | null | undefined,
): ManakTestRequestPayload | null {
  const textValue = String(raw ?? "").trim();
  if (!textValue) return null;

  const jsonStart = textValue.indexOf("{");
  const jsonEnd = textValue.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;

  try {
    const parsed = JSON.parse(textValue.slice(jsonStart, jsonEnd + 1)) as Partial<
      ManakTestRequestPayload
    >;
    if (!parsed || parsed.kind !== MANAK_TEST_REQUEST_KIND) return null;
    if (!parsed.application || !parsed.sample) return null;
    return buildManakTestRequestPayload(
      { ...parsed.sample, id: parsed.sampleId },
      parsed.application,
      Number(parsed.copiedAt) || 0,
    );
  } catch {
    return null;
  }
}

export function isLikelyManakSampleCode(value: string): boolean {
  const v = text(value);
  if (!v || v.length < 4 || v.length > 48 || /\s/.test(v)) return false;
  if (/laboratory|laboratories|gravitas|limited|private/i.test(v)) return false;
  return /^[A-Z0-9][A-Z0-9/._-]+$/i.test(v);
}

export function parseManakTestRequestResult(
  raw: string | null | undefined,
): ManakTestRequestResult | null {
  const textValue = String(raw ?? "").trim();
  if (!textValue) return null;
  const jsonStart = textValue.indexOf("{");
  const jsonEnd = textValue.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
  try {
    const parsed = JSON.parse(textValue.slice(jsonStart, jsonEnd + 1)) as Partial<
      ManakTestRequestResult
    >;
    if (!parsed || parsed.kind !== MANAK_TEST_REQUEST_RESULT_KIND) return null;
    const sampleCode = isLikelyManakSampleCode(text(parsed.sample_code))
      ? text(parsed.sample_code)
      : "";
    const pdfBase64 = text(parsed.pdfBase64);
    if (!sampleCode && !pdfBase64) return null;
    return {
      kind: MANAK_TEST_REQUEST_RESULT_KIND,
      sampleId: text(parsed.sampleId),
      sample_code: sampleCode,
      qr_code: text(parsed.qr_code),
      filledAt: Number(parsed.filledAt) || Date.now(),
      pdfBase64: pdfBase64 || undefined,
      pdfName: text(parsed.pdfName) || undefined,
    };
  } catch {
    return null;
  }
}
