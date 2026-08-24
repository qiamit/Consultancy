import {
  createRawMaterialRow,
  defaultRawMaterialEntry,
  rowHasContent,
  type RawMaterialRow,
  type RawMaterialStored,
} from "@backend/modules/bis/raw-material-details";

export type RawMaterialFormEntry = {
  rawMaterial: string;
  supplierName: string;
  bisCertificationMark: string;
  testCertificate: string;
  batchesPackaging: string;
};

export type RawMaterialAddFormValues = {
  materialEntries: RawMaterialFormEntry[];
};

export function defaultRawMaterialFormEntry(): RawMaterialFormEntry {
  return {
    rawMaterial: "",
    supplierName: "",
    bisCertificationMark: "",
    testCertificate: "",
    batchesPackaging: "",
  };
}

export function defaultRawMaterialAddFormValues(): RawMaterialAddFormValues {
  return {
    materialEntries: [defaultRawMaterialFormEntry()],
  };
}

function entryHasContent(entry: RawMaterialFormEntry): boolean {
  return (
    entry.rawMaterial.trim().length > 0 ||
    entry.supplierName.trim().length > 0 ||
    entry.bisCertificationMark.trim().length > 0 ||
    entry.testCertificate.trim().length > 0 ||
    entry.batchesPackaging.trim().length > 0
  );
}

function rowFromEntry(entry: RawMaterialFormEntry): RawMaterialStored {
  return {
    ...defaultRawMaterialEntry(),
    raw_material: entry.rawMaterial.trim(),
    supplier_name: entry.supplierName.trim(),
    bis_certification_mark: entry.bisCertificationMark.trim(),
    test_certificate: entry.testCertificate.trim(),
    batches_packaging: entry.batchesPackaging.trim(),
  };
}

export function formEntryFromEditorRow(row: RawMaterialRow): RawMaterialFormEntry {
  return {
    rawMaterial: row.raw_material,
    supplierName: row.supplier_name,
    bisCertificationMark: row.bis_certification_mark,
    testCertificate: row.test_certificate,
    batchesPackaging: row.batches_packaging,
  };
}

export function formEntriesFromEditorRows(rows: RawMaterialRow[]): RawMaterialFormEntry[] {
  const entries = rows.filter(rowHasContent).map(formEntryFromEditorRow);
  return entries.length > 0 ? entries : [defaultRawMaterialFormEntry()];
}

export function editorRowsFromFormEntries(
  entries: RawMaterialFormEntry[],
  previousRows: RawMaterialRow[] = [],
): RawMaterialRow[] {
  return entries
    .filter(entryHasContent)
    .map((entry, index) => ({
      id: previousRows[index]?.id ?? createRawMaterialRow().id,
      ...rowFromEntry(entry),
    }));
}
