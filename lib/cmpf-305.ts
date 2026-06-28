export const CMPF305_ROWS_PER_PAGE = 9;

export type Cmpf305MachineryStored = {
  machinery_name: string;
  make: string;
  production_capacity_per_day: string;
  number: string;
  remarks: string;
};

export type Cmpf305MachineryRow = Cmpf305MachineryStored & { id: string };

export function defaultCmpf305MachineryEntry(): Cmpf305MachineryStored {
  return {
    machinery_name: "",
    make: "",
    production_capacity_per_day: "",
    number: "",
    remarks: "",
  };
}

let cmpf305RowSeq = 0;

export function createCmpf305MachineryRow(): Cmpf305MachineryRow {
  cmpf305RowSeq += 1;
  return {
    id: `cmpf305-${Date.now()}-${cmpf305RowSeq}`,
    ...defaultCmpf305MachineryEntry(),
  };
}

export function defaultCmpf305MachineryRows(): Cmpf305MachineryRow[] {
  return Array.from({ length: CMPF305_ROWS_PER_PAGE }, () => createCmpf305MachineryRow());
}

export function rowHasContent(row: Cmpf305MachineryStored): boolean {
  return (
    row.machinery_name.trim().length > 0 ||
    row.make.trim().length > 0 ||
    row.production_capacity_per_day.trim().length > 0 ||
    row.number.trim().length > 0 ||
    row.remarks.trim().length > 0
  );
}

export function parseCmpf305Machinery(raw: unknown): Cmpf305MachineryStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      return {
        machinery_name: String(r.machinery_name ?? "").trim(),
        make: String(r.make ?? "").trim(),
        production_capacity_per_day: String(r.production_capacity_per_day ?? "").trim(),
        number: String(r.number ?? "").trim(),
        remarks: String(r.remarks ?? "").trim(),
      };
    })
    .filter((r): r is Cmpf305MachineryStored => r !== null);
}

export function editorRowsFromStored(stored: Cmpf305MachineryStored[]): Cmpf305MachineryRow[] {
  const rows = stored.filter(rowHasContent);
  if (rows.length === 0) return defaultCmpf305MachineryRows();
  return rows.map((r, i) => ({
    id: `cmpf305-loaded-${i}`,
    ...r,
  }));
}

export function storedFromEditor(rows: Cmpf305MachineryRow[]): Cmpf305MachineryStored[] {
  return rows
    .map(({ machinery_name, make, production_capacity_per_day, number, remarks }) => ({
      machinery_name,
      make,
      production_capacity_per_day,
      number,
      remarks,
    }))
    .filter(rowHasContent);
}

export function paginateMachineryRows(
  rows: Cmpf305MachineryStored[],
  rowsPerPage = CMPF305_ROWS_PER_PAGE,
): Cmpf305MachineryStored[][] {
  const visible = rows.filter(rowHasContent);
  if (visible.length === 0) {
    return [Array.from({ length: rowsPerPage }, () => defaultCmpf305MachineryEntry())];
  }

  const pages: Cmpf305MachineryStored[][] = [];
  for (let i = 0; i < visible.length; i += rowsPerPage) {
    const slice = visible.slice(i, i + rowsPerPage);
    while (slice.length < rowsPerPage) {
      slice.push(defaultCmpf305MachineryEntry());
    }
    pages.push(slice);
  }
  return pages;
}
