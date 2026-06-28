import type { TopManagementStored } from "@/lib/top-management";
import { resolvePrimaryTopManagementPerson } from "@/lib/top-management";

export type UndertakingOption2Stored = {
  declarant_name: string;
  product_for_mark: string;
  is_standard: string;
  factory_address: string;
  signatory_name: string;
  signatory_designation: string;
};

export function defaultUndertakingOption2Document(): UndertakingOption2Stored {
  return {
    declarant_name: "",
    product_for_mark: "",
    is_standard: "",
    factory_address: "",
    signatory_name: "",
    signatory_designation: "",
  };
}

export function documentHasContent(doc: UndertakingOption2Stored): boolean {
  return (
    doc.declarant_name.trim().length > 0 ||
    doc.product_for_mark.trim().length > 0 ||
    doc.is_standard.trim().length > 0 ||
    doc.factory_address.trim().length > 0 ||
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0
  );
}

export function parseUndertakingOption2(raw: unknown): UndertakingOption2Stored {
  if (!raw || typeof raw !== "object") return defaultUndertakingOption2Document();
  const r = raw as Record<string, unknown>;
  return {
    declarant_name: String(r.declarant_name ?? "").trim(),
    product_for_mark: String(r.product_for_mark ?? "").trim(),
    is_standard: String(r.is_standard ?? "").trim(),
    factory_address: String(r.factory_address ?? "").trim(),
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
  };
}

export function resolveUndertakingOption2Defaults(input: {
  companyName: string | null;
  contactPerson: string | null;
  isNumber: string | null;
  isTitle: string | null;
  factoryAddress: string | null;
  isCodeTitle: string | null;
  topManagement?: TopManagementStored[];
}): Partial<UndertakingOption2Stored> {
  const num = (input.isNumber ?? "").trim();
  const title = (input.isTitle ?? "").trim();
  let isStandard = num;
  if (num && title) isStandard = `${num} — ${title}`;
  else if (!num && title) isStandard = title;

  const primary = resolvePrimaryTopManagementPerson(input.topManagement ?? []);
  const declarant =
    primary.person_name ||
    (input.contactPerson ?? "").trim() ||
    (input.companyName ?? "").trim();

  return {
    declarant_name: declarant,
    product_for_mark: (input.isCodeTitle ?? title).trim(),
    is_standard: isStandard,
    factory_address: (input.factoryAddress ?? "").trim(),
    signatory_name: declarant,
    signatory_designation: primary.designation,
  };
}

/** Build undertaking document entirely from application and client data. */
export function resolveUndertakingOption2Document(input: {
  companyName: string | null;
  contactPerson: string | null;
  isNumber: string | null;
  isTitle: string | null;
  factoryAddress: string | null;
  isCodeTitle: string | null;
  topManagement: TopManagementStored[];
}): UndertakingOption2Stored {
  const defaults = resolveUndertakingOption2Defaults(input);
  return {
    declarant_name: defaults.declarant_name ?? "",
    product_for_mark: defaults.product_for_mark ?? "",
    is_standard: defaults.is_standard ?? "",
    factory_address: defaults.factory_address ?? "",
    signatory_name: defaults.signatory_name ?? "",
    signatory_designation: defaults.signatory_designation ?? "",
  };
}

export function mergeUndertakingOption2WithDefaults(
  stored: UndertakingOption2Stored,
  defaults: Partial<UndertakingOption2Stored>,
): UndertakingOption2Stored {
  return {
    declarant_name: stored.declarant_name || defaults.declarant_name || "",
    product_for_mark: stored.product_for_mark || defaults.product_for_mark || "",
    is_standard: stored.is_standard || defaults.is_standard || "",
    factory_address: stored.factory_address || defaults.factory_address || "",
    signatory_name: stored.signatory_name || defaults.signatory_name || "",
    signatory_designation: stored.signatory_designation || defaults.signatory_designation || "",
  };
}
