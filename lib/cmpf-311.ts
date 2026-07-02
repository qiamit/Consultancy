import type { TopManagementStored } from "@/lib/top-management";
import { resolvePrimaryTopManagementPerson } from "@/lib/top-management";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";

export type Cmpf311Stored = {
  reference_letter_no: string;
  reference_letter_date: string;
  licence_for_standard: string;
  sit_document_ref: string;
  signatory_name: string;
  signatory_designation: string;
};

export function defaultCmpf311Document(): Cmpf311Stored {
  return {
    reference_letter_no: "",
    reference_letter_date: "",
    licence_for_standard: "",
    sit_document_ref: "",
    signatory_name: "",
    signatory_designation: "",
  };
}

export function documentHasContent(doc: Cmpf311Stored): boolean {
  return (
    doc.reference_letter_no.trim().length > 0 ||
    doc.reference_letter_date.trim().length > 0 ||
    doc.licence_for_standard.trim().length > 0 ||
    doc.sit_document_ref.trim().length > 0 ||
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0
  );
}

export function parseCmpf311(raw: unknown): Cmpf311Stored {
  if (!raw || typeof raw !== "object") return defaultCmpf311Document();
  const r = raw as Record<string, unknown>;
  return {
    reference_letter_no: String(r.reference_letter_no ?? "").trim(),
    reference_letter_date: String(r.reference_letter_date ?? "").trim(),
    licence_for_standard: String(r.licence_for_standard ?? "").trim(),
    sit_document_ref: String(r.sit_document_ref ?? "").trim(),
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
  };
}

export function resolveCmpf311Defaults(input: {
  isNumber: string | null;
  isTitle: string | null;
  contactPerson: string | null;
  topManagement?: TopManagementStored[];
}): Partial<Cmpf311Stored> {
  const num = (input.isNumber ?? "").trim();
  const title = (input.isTitle ?? "").trim();
  let licenceFor = num;
  if (num && title) licenceFor = `${num} — ${title}`;
  else if (!num && title) licenceFor = title;

  const primary = resolvePrimaryTopManagementPerson(input.topManagement ?? []);

  return {
    licence_for_standard: licenceFor,
    signatory_name: primary.person_name || (input.contactPerson ?? "").trim(),
    signatory_designation: primary.designation,
  };
}

/** Build CMPF 311 document from application, IS Code, and top management data. */
export function resolveCmpf311Document(input: {
  isNumber: string | null;
  isTitle: string | null;
  contactPerson: string | null;
  topManagement: TopManagementStored[];
  applicationNumber: string;
  dateOfApplication: string;
  productManualNumber: string;
}): Cmpf311Stored {
  const defaults = resolveCmpf311Defaults(input);
  const appNo = input.applicationNumber.trim();
  return {
    reference_letter_no: appNo ? formatApplicationNumberDisplay(appNo) : "",
    reference_letter_date: input.dateOfApplication.trim(),
    licence_for_standard: defaults.licence_for_standard ?? "",
    sit_document_ref: input.productManualNumber.trim(),
    signatory_name: defaults.signatory_name ?? "",
    signatory_designation: defaults.signatory_designation ?? "",
  };
}

export function mergeCmpf311WithDefaults(
  stored: Cmpf311Stored,
  defaults: Partial<Cmpf311Stored>,
): Cmpf311Stored {
  return {
    reference_letter_no: stored.reference_letter_no || defaults.reference_letter_no || "",
    reference_letter_date: stored.reference_letter_date || defaults.reference_letter_date || "",
    licence_for_standard: stored.licence_for_standard || defaults.licence_for_standard || "",
    sit_document_ref: stored.sit_document_ref || defaults.sit_document_ref || "",
    signatory_name: stored.signatory_name || defaults.signatory_name || "",
    signatory_designation: stored.signatory_designation || defaults.signatory_designation || "",
  };
}
