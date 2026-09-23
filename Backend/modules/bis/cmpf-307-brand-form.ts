import {
  createCmpf307BrandRow,
  defaultCmpf307BrandEntry,
  brandRowHasContent,
  type Cmpf307BrandRow,
  type Cmpf307BrandStored,
} from "@backend/modules/bis/cmpf-307";

export type Cmpf307BrandFormEntry = {
  brandName: string;
  ownedBy: string;
  registeredStatus: string;
  registrationDate: string;
  agreementCopyRef: string;
  agreementCopyName: string;
  trademarkCertificateRef: string;
  trademarkCertificateName: string;
};

export type Cmpf307AddBrandFormValues = {
  brandEntries: Cmpf307BrandFormEntry[];
};

export function defaultCmpf307BrandFormEntry(): Cmpf307BrandFormEntry {
  return {
    brandName: "",
    ownedBy: "",
    registeredStatus: "",
    registrationDate: "",
    agreementCopyRef: "",
    agreementCopyName: "",
    trademarkCertificateRef: "",
    trademarkCertificateName: "",
  };
}

export function defaultCmpf307AddBrandFormValues(): Cmpf307AddBrandFormValues {
  return {
    brandEntries: [defaultCmpf307BrandFormEntry()],
  };
}

function entryHasContent(entry: Cmpf307BrandFormEntry): boolean {
  return (
    entry.brandName.trim().length > 0 ||
    entry.ownedBy.trim().length > 0 ||
    entry.registeredStatus.trim().length > 0 ||
    entry.registrationDate.trim().length > 0 ||
    entry.agreementCopyRef.trim().length > 0 ||
    entry.trademarkCertificateRef.trim().length > 0
  );
}

function rowFromEntry(entry: Cmpf307BrandFormEntry): Cmpf307BrandStored {
  return {
    ...defaultCmpf307BrandEntry(),
    brand_name: entry.brandName.trim(),
    owned_by: entry.ownedBy.trim(),
    registered_status: entry.registeredStatus.trim(),
    registration_date: entry.registrationDate.trim(),
    agreement_copy_ref: entry.agreementCopyRef.trim(),
    agreement_copy_name: entry.agreementCopyName.trim(),
    trademark_certificate_ref: entry.trademarkCertificateRef.trim(),
    trademark_certificate_name: entry.trademarkCertificateName.trim(),
  };
}

export function formEntryFromEditorRow(row: Cmpf307BrandRow): Cmpf307BrandFormEntry {
  return {
    brandName: row.brand_name,
    ownedBy: row.owned_by,
    registeredStatus: row.registered_status,
    registrationDate: row.registration_date,
    agreementCopyRef: row.agreement_copy_ref ?? "",
    agreementCopyName: row.agreement_copy_name ?? "",
    trademarkCertificateRef: row.trademark_certificate_ref ?? "",
    trademarkCertificateName: row.trademark_certificate_name ?? "",
  };
}

export function formEntriesFromEditorRows(rows: Cmpf307BrandRow[]): Cmpf307BrandFormEntry[] {
  const entries = rows.filter(brandRowHasContent).map(formEntryFromEditorRow);
  return entries.length > 0 ? entries : [defaultCmpf307BrandFormEntry()];
}

export function editorRowsFromFormEntries(
  entries: Cmpf307BrandFormEntry[],
  previousRows: Cmpf307BrandRow[] = [],
): Cmpf307BrandRow[] {
  return entries
    .filter(entryHasContent)
    .map((entry, index) => ({
      id: previousRows[index]?.id ?? createCmpf307BrandRow().id,
      ...rowFromEntry(entry),
    }));
}
