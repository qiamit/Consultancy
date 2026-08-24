export const CMPF306_ROWS_PER_PAGE = 9;

export const CMPF306_SEPARATE_SHEET_LABEL = "Saparate Sheet Enclosed" as const;

export type Cmpf306EquipmentStored = {
  equipment_name: string;
  make: string;
  least_count: string;
  range: string;
  calibration_details: string;
  clause_number: string;
  test_method: string;
  remarks: string;
  quantity: string;
};

export type Cmpf306EquipmentRow = Cmpf306EquipmentStored & { id: string };

export type Cmpf306Stored = {
  separate_sheet_enclosed: boolean;
  equipment: Cmpf306EquipmentStored[];
  calibration_certificates: string[];
  consent_letters: string[];
};

export function defaultCmpf306EquipmentEntry(): Cmpf306EquipmentStored {
  return {
    equipment_name: "",
    make: "",
    least_count: "",
    range: "",
    calibration_details: "",
    clause_number: "",
    test_method: "",
    remarks: "",
    quantity: "",
  };
}

export function defaultCmpf306Document(): Cmpf306Stored {
  return {
    separate_sheet_enclosed: false,
    equipment: [],
    calibration_certificates: [],
    consent_letters: [],
  };
}

let cmpf306RowSeq = 0;

export function createCmpf306EquipmentRow(): Cmpf306EquipmentRow {
  cmpf306RowSeq += 1;
  return {
    id: `cmpf306-${Date.now()}-${cmpf306RowSeq}`,
    ...defaultCmpf306EquipmentEntry(),
  };
}

export function defaultCmpf306EquipmentRows(): Cmpf306EquipmentRow[] {
  return Array.from({ length: CMPF306_ROWS_PER_PAGE }, () => createCmpf306EquipmentRow());
}

export function equipmentRowHasContent(row: Cmpf306EquipmentStored): boolean {
  return (
    row.equipment_name.trim().length > 0 ||
    row.make.trim().length > 0 ||
    row.least_count.trim().length > 0 ||
    row.range.trim().length > 0 ||
    row.calibration_details.trim().length > 0 ||
    row.clause_number.trim().length > 0 ||
    row.test_method.trim().length > 0 ||
    row.remarks.trim().length > 0 ||
    row.quantity.trim().length > 0
  );
}

export function documentHasContent(doc: Cmpf306Stored): boolean {
  return (
    doc.separate_sheet_enclosed ||
    doc.equipment.some(equipmentRowHasContent) ||
    doc.calibration_certificates.length > 0 ||
    doc.consent_letters.length > 0
  );
}

function parseStoredDocumentRefList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
}

export function parseCmpf306(raw: unknown): Cmpf306Stored {
  if (Array.isArray(raw)) {
    return {
      separate_sheet_enclosed: false,
      equipment: parseCmpf306EquipmentList(raw),
      calibration_certificates: [],
      consent_letters: [],
    };
  }
  if (!raw || typeof raw !== "object") return defaultCmpf306Document();
  const r = raw as Record<string, unknown>;
  return {
    separate_sheet_enclosed: Boolean(r.separate_sheet_enclosed),
    equipment: parseCmpf306EquipmentList(r.equipment),
    calibration_certificates: parseStoredDocumentRefList(r.calibration_certificates),
    consent_letters: parseStoredDocumentRefList(r.consent_letters),
  };
}

function parseLegacyQuantityFromMake(rawMake: string): { make: string; quantity: string } {
  const make = rawMake.trim();
  if (!make) return { make: "", quantity: "" };
  if (/^\d+\s*(nos|no\.?|pcs|units?)?$/i.test(make)) {
    return { make: "", quantity: make };
  }
  return { make, quantity: "" };
}

function parseCmpf306EquipmentList(raw: unknown): Cmpf306EquipmentStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const rawMake = String(row.make ?? "").trim();
      const hasQuantityField = "quantity" in row || "qty" in row;
      const parsedQuantity = String(row.quantity ?? row.qty ?? "").trim();
      const legacy = !hasQuantityField && !parsedQuantity
        ? parseLegacyQuantityFromMake(rawMake)
        : { make: rawMake, quantity: parsedQuantity };

      return {
        equipment_name: String(row.equipment_name ?? "").trim(),
        make: legacy.make,
        least_count: String(row.least_count ?? "").trim(),
        range: String(row.range ?? "").trim(),
        calibration_details: String(row.calibration_details ?? "").trim(),
        clause_number: String(row.clause_number ?? "").trim(),
        test_method: String(row.test_method ?? "").trim(),
        remarks: String(row.remarks ?? "").trim(),
        quantity: legacy.quantity,
      };
    })
    .filter((row): row is Cmpf306EquipmentStored => row !== null);
}

export function editorRowsFromStored(stored: Cmpf306Stored): Cmpf306EquipmentRow[] {
  const rows = stored.equipment.filter(equipmentRowHasContent);
  if (rows.length === 0) return [];
  return rows.map((row, i) => ({
    id: `cmpf306-loaded-${i}`,
    ...row,
  }));
}

export function storedFromEditor(
  rows: Cmpf306EquipmentRow[],
  separateSheetEnclosed: boolean,
  attachments?: {
    calibrationCertificates?: string[];
    consentLetters?: string[];
  },
): Cmpf306Stored {
  return {
    separate_sheet_enclosed: separateSheetEnclosed,
    equipment: rows
      .map(
        ({
          equipment_name,
          make,
          least_count,
          range,
          calibration_details,
          clause_number,
          test_method,
          remarks,
          quantity,
        }) => ({
          equipment_name,
          make,
          least_count,
          range,
          calibration_details,
          clause_number,
          test_method,
          remarks,
          quantity,
        }),
      )
      .filter(equipmentRowHasContent),
    calibration_certificates: (attachments?.calibrationCertificates ?? []).filter(
      (ref) => ref.trim().length > 0,
    ),
    consent_letters: (attachments?.consentLetters ?? []).filter((ref) => ref.trim().length > 0),
  };
}

export type Cmpf306PageSlot =
  | { kind: "equipment"; row: Cmpf306EquipmentStored; srNo: number }
  | { kind: "separate_sheet"; srNo: number }
  | { kind: "empty"; srNo: number };

export function buildPageSlots(
  equipment: Cmpf306EquipmentStored[],
  separateSheetEnclosed: boolean,
  rowsPerPage = CMPF306_ROWS_PER_PAGE,
): Cmpf306PageSlot[][] {
  const visible = equipment.filter(equipmentRowHasContent);
  const pages: Cmpf306PageSlot[][] = [];
  let equipIndex = 0;
  let globalSr = 1;

  const firstPageEquipBeforeSeparate = separateSheetEnclosed ? 4 : rowsPerPage;
  const firstPageEquipAfterSeparate = separateSheetEnclosed ? 4 : 0;

  const firstPage: Cmpf306PageSlot[] = [];

  for (let i = 0; i < firstPageEquipBeforeSeparate && equipIndex < visible.length; i += 1) {
    firstPage.push({ kind: "equipment", row: visible[equipIndex]!, srNo: globalSr });
    equipIndex += 1;
    globalSr += 1;
  }

  if (separateSheetEnclosed) {
    firstPage.push({ kind: "separate_sheet", srNo: globalSr });
    globalSr += 1;
  }

  for (let i = 0; i < firstPageEquipAfterSeparate && equipIndex < visible.length; i += 1) {
    firstPage.push({ kind: "equipment", row: visible[equipIndex]!, srNo: globalSr });
    equipIndex += 1;
    globalSr += 1;
  }

  if (firstPage.length > 0) {
    pages.push(firstPage);
  }

  while (equipIndex < visible.length) {
    const page: Cmpf306PageSlot[] = [];
    for (let i = 0; i < rowsPerPage && equipIndex < visible.length; i += 1) {
      page.push({ kind: "equipment", row: visible[equipIndex]!, srNo: globalSr });
      equipIndex += 1;
      globalSr += 1;
    }
    pages.push(page);
  }

  if (pages.length === 0) {
    return [[]];
  }

  return pages;
}

export function cmpf306TestParameterKey(row: Cmpf306EquipmentStored): string {
  return `${row.remarks.trim().toLowerCase()}|${row.clause_number.trim().toLowerCase()}|${row.test_method.trim().toLowerCase()}`;
}

export function cmpf306TestParameterHasContent(row: Cmpf306EquipmentStored): boolean {
  return (
    row.remarks.trim().length > 0 ||
    row.clause_number.trim().length > 0 ||
    row.test_method.trim().length > 0
  );
}

export function formatCmpf306TestParameterLines(row: Cmpf306EquipmentStored): string[] {
  const lines: string[] = [];
  const name = row.remarks.trim();
  const clause = row.clause_number.trim();
  const method = row.test_method.trim();
  if (name) lines.push(name);
  if (clause) lines.push(`Cl. ${clause}`);
  if (method) lines.push(method);
  return lines;
}

export type Cmpf306TestParameterGroupInfo = {
  groupStart: number;
  groupSize: number;
  showCell: boolean;
  rowSpan: number;
};

export function computeCmpf306TestParameterGroups(
  rows: Cmpf306EquipmentStored[],
): Cmpf306TestParameterGroupInfo[] {
  const result: Cmpf306TestParameterGroupInfo[] = [];

  let index = 0;
  while (index < rows.length) {
    const row = rows[index]!;
    const key = cmpf306TestParameterKey(row);
    let end = index + 1;
    while (end < rows.length && cmpf306TestParameterKey(rows[end]!) === key) {
      end += 1;
    }

    const groupSize = end - index;
    const shouldMerge = groupSize > 1 && cmpf306TestParameterHasContent(row);

    for (let offset = 0; offset < groupSize; offset += 1) {
      result[index + offset] = {
        groupStart: index,
        groupSize,
        showCell: offset === 0,
        rowSpan: shouldMerge ? groupSize : 1,
      };
    }

    index = end;
  }

  return result;
}
