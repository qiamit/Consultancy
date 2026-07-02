import {
  createCertifiedReferenceMaterialRow,
  defaultCertifiedReferenceMaterialEntry,
  rowHasContent,
  type CertifiedReferenceMaterialRow,
  type CertifiedReferenceMaterialStored,
} from "@/lib/certified-reference-materials";

export type CrmFormEntry = {
  crmName: string;
  supplierName: string;
  accreditedRmp: string;
  certificateLotNo: string;
  validityPeriod: string;
};

export type CrmAddFormValues = {
  materialEntries: CrmFormEntry[];
};

export function defaultCrmFormEntry(): CrmFormEntry {
  return {
    crmName: "",
    supplierName: "",
    accreditedRmp: "",
    certificateLotNo: "",
    validityPeriod: "",
  };
}

export function defaultCrmAddFormValues(): CrmAddFormValues {
  return {
    materialEntries: [defaultCrmFormEntry()],
  };
}

function entryHasContent(entry: CrmFormEntry): boolean {
  return (
    entry.crmName.trim().length > 0 ||
    entry.supplierName.trim().length > 0 ||
    entry.accreditedRmp.trim().length > 0 ||
    entry.certificateLotNo.trim().length > 0 ||
    entry.validityPeriod.trim().length > 0
  );
}

function rowFromEntry(entry: CrmFormEntry): CertifiedReferenceMaterialStored {
  return {
    ...defaultCertifiedReferenceMaterialEntry(),
    crm_name: entry.crmName.trim(),
    supplier_name: entry.supplierName.trim(),
    accredited_rmp: entry.accreditedRmp.trim(),
    certificate_lot_no: entry.certificateLotNo.trim(),
    validity_period: entry.validityPeriod.trim(),
  };
}

export function formEntryFromEditorRow(row: CertifiedReferenceMaterialRow): CrmFormEntry {
  return {
    crmName: row.crm_name,
    supplierName: row.supplier_name,
    accreditedRmp: row.accredited_rmp,
    certificateLotNo: row.certificate_lot_no,
    validityPeriod: row.validity_period,
  };
}

export function formEntriesFromEditorRows(rows: CertifiedReferenceMaterialRow[]): CrmFormEntry[] {
  const entries = rows.filter(rowHasContent).map(formEntryFromEditorRow);
  return entries.length > 0 ? entries : [defaultCrmFormEntry()];
}

export function editorRowsFromFormEntries(
  entries: CrmFormEntry[],
  previousRows: CertifiedReferenceMaterialRow[] = [],
): CertifiedReferenceMaterialRow[] {
  return entries
    .filter(entryHasContent)
    .map((entry, index) => ({
      id: previousRows[index]?.id ?? createCertifiedReferenceMaterialRow().id,
      ...rowFromEntry(entry),
    }));
}
