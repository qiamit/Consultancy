export const RAW_MATERIAL_ROWS_PER_PAGE = 9;

export const RAW_MATERIAL_BIS_MARK_OPTIONS = ["With", "Without"] as const;

export type RawMaterialStored = {
  raw_material: string;
  supplier_name: string;
  bis_certification_mark: string;
  test_certificate: string;
  batches_packaging: string;
};

export type RawMaterialRow = RawMaterialStored & { id: string };

export function defaultRawMaterialEntry(): RawMaterialStored {
  return {
    raw_material: "",
    supplier_name: "",
    bis_certification_mark: "",
    test_certificate: "",
    batches_packaging: "",
  };
}

let rawMaterialRowSeq = 0;

export function createRawMaterialRow(): RawMaterialRow {
  rawMaterialRowSeq += 1;
  return {
    id: `raw-mat-${Date.now()}-${rawMaterialRowSeq}`,
    ...defaultRawMaterialEntry(),
  };
}

export function defaultRawMaterialRows(): RawMaterialRow[] {
  return Array.from({ length: RAW_MATERIAL_ROWS_PER_PAGE }, () => createRawMaterialRow());
}

export function rowHasContent(row: RawMaterialStored): boolean {
  return (
    row.raw_material.trim().length > 0 ||
    row.supplier_name.trim().length > 0 ||
    row.bis_certification_mark.trim().length > 0 ||
    row.test_certificate.trim().length > 0 ||
    row.batches_packaging.trim().length > 0
  );
}

export function parseRawMaterialDetails(raw: unknown): RawMaterialStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      return {
        raw_material: String(r.raw_material ?? "").trim(),
        supplier_name: String(r.supplier_name ?? "").trim(),
        bis_certification_mark: String(r.bis_certification_mark ?? "").trim(),
        test_certificate: String(r.test_certificate ?? "").trim(),
        batches_packaging: String(r.batches_packaging ?? "").trim(),
      };
    })
    .filter((r): r is RawMaterialStored => r !== null);
}

export function editorRowsFromStored(stored: RawMaterialStored[]): RawMaterialRow[] {
  const rows = stored.filter(rowHasContent);
  if (rows.length === 0) return [];
  return rows.map((row, i) => ({
    id: `raw-mat-loaded-${i}`,
    ...row,
  }));
}

export function storedFromEditor(rows: RawMaterialRow[]): RawMaterialStored[] {
  return rows
    .map(
      ({
        raw_material,
        supplier_name,
        bis_certification_mark,
        test_certificate,
        batches_packaging,
      }) => ({
        raw_material,
        supplier_name,
        bis_certification_mark,
        test_certificate,
        batches_packaging,
      }),
    )
    .filter(rowHasContent);
}

export function paginateRawMaterialRows(
  rows: RawMaterialStored[],
  rowsPerPage = RAW_MATERIAL_ROWS_PER_PAGE,
): RawMaterialStored[][] {
  const visible = rows.filter(rowHasContent);
  if (visible.length === 0) {
    return [[]];
  }

  const pages: RawMaterialStored[][] = [];
  for (let i = 0; i < visible.length; i += rowsPerPage) {
    pages.push(visible.slice(i, i + rowsPerPage));
  }
  return pages;
}
