import type { TopManagementStored } from "@backend/modules/bis/top-management";
import { resolvePrimaryTopManagementPerson } from "@backend/modules/bis/top-management";

export type AuthorizationLetterStored = {
  authorized_name: string;
  authorized_designation: string;
  signatory_name: string;
  signatory_designation: string;
};

export function defaultAuthorizationLetterDocument(): AuthorizationLetterStored {
  return {
    authorized_name: "",
    authorized_designation: "",
    signatory_name: "",
    signatory_designation: "",
  };
}

export function documentHasContent(doc: AuthorizationLetterStored): boolean {
  return (
    doc.authorized_name.trim().length > 0 ||
    doc.authorized_designation.trim().length > 0 ||
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0
  );
}

export function parseAuthorizationLetter(raw: unknown): AuthorizationLetterStored {
  if (!raw || typeof raw !== "object") return defaultAuthorizationLetterDocument();
  const r = raw as Record<string, unknown>;
  return {
    authorized_name: String(r.authorized_name ?? "").trim(),
    authorized_designation: String(r.authorized_designation ?? "").trim(),
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
  };
}

export function resolveAuthorizationLetterDefaults(input: {
  contactPerson: string | null;
  topManagement?: TopManagementStored[];
}): Partial<AuthorizationLetterStored> {
  const primary = resolvePrimaryTopManagementPerson(input.topManagement ?? []);
  const name =
    primary.person_name || (input.contactPerson ?? "").trim();
  const designation = primary.designation;

  return {
    authorized_name: name,
    authorized_designation: designation,
    signatory_name: name,
    signatory_designation: designation,
  };
}

export function resolveAuthorizationLetterDocument(input: {
  contactPerson: string | null;
  topManagement: TopManagementStored[];
}): AuthorizationLetterStored {
  const defaults = resolveAuthorizationLetterDefaults(input);
  return {
    authorized_name: defaults.authorized_name ?? "",
    authorized_designation: defaults.authorized_designation ?? "",
    signatory_name: defaults.signatory_name ?? "",
    signatory_designation: defaults.signatory_designation ?? "",
  };
}

export function mergeAuthorizationLetterWithDefaults(
  stored: AuthorizationLetterStored,
  defaults: Partial<AuthorizationLetterStored>,
): AuthorizationLetterStored {
  return {
    authorized_name: stored.authorized_name || defaults.authorized_name || "",
    authorized_designation:
      stored.authorized_designation || defaults.authorized_designation || "",
    signatory_name: stored.signatory_name || defaults.signatory_name || "",
    signatory_designation:
      stored.signatory_designation || defaults.signatory_designation || "",
  };
}

/** Elaborated authorization powers paragraph for print and export. */
export const AUTH_LETTER_REPRESENTATION_PARAGRAPH =
  "The said authorized representative is duly empowered to submit all requisite documents and correspondence, furnish complete and truthful information as may be required by the Bureau of Indian Standards, attend meetings and discussions with BIS officials, offer product samples for verification and independent testing, and to affix signature on behalf of the firm in respect of all matters pertaining to the above application, licence grant proceedings, factory inspection, surveillance visits, and related compliance requirements under the BIS Conformity Assessment Scheme.";

/** Elaborated undertaking and validity paragraph for print and export. */
export const AUTH_LETTER_RESPONSIBILITY_PARAGRAPH =
  "We hereby undertake full and unconditional responsibility for all acts, submissions, declarations, representations, and communications made by the authorized representative on our behalf in connection with the aforesaid application. This authorization shall remain in full force and effect unless and until expressly revoked by us by a written communication addressed to the concerned office of the Bureau of Indian Standards.";
