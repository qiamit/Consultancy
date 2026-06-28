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
  return doc.separate_sheet_enclosed || doc.equipment.some(equipmentRowHasContent);
}

export function parseCmpf306(raw: unknown): Cmpf306Stored {
  if (Array.isArray(raw)) {
    return {
      separate_sheet_enclosed: false,
      equipment: parseCmpf306EquipmentList(raw),
    };
  }
  if (!raw || typeof raw !== "object") return defaultCmpf306Document();
  const r = raw as Record<string, unknown>;
  return {
    separate_sheet_enclosed: Boolean(r.separate_sheet_enclosed),
    equipment: parseCmpf306EquipmentList(r.equipment),
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

  while (equipIndex < visible.length || pages.length === 0) {
    const pageIndex = pages.length;
    const slots: Cmpf306PageSlot[] = [];

    for (let slotOnPage = 1; slotOnPage <= rowsPerPage; slotOnPage += 1) {
      if (pageIndex === 0 && separateSheetEnclosed && slotOnPage === 5) {
        slots.push({ kind: "separate_sheet", srNo: globalSr });
      } else if (equipIndex < visible.length) {
        slots.push({ kind: "equipment", row: visible[equipIndex]!, srNo: globalSr });
        equipIndex += 1;
      } else {
        slots.push({ kind: "empty", srNo: globalSr });
      }
      globalSr += 1;
    }

    pages.push(slots);
    if (equipIndex >= visible.length) break;
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
