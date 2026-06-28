export const CMPF307_ROWS_PER_PAGE = 9;

export const CMPF307_OWNED_BY_OPTIONS = ["Self", "Others"] as const;
export const CMPF307_REGISTRATION_OPTIONS = ["Registered", "Unregistered"] as const;

export type Cmpf307BrandStored = {
  brand_name: string;
  owned_by: string;
  registered_status: string;
  registration_date: string;
};

export type Cmpf307BrandRow = Cmpf307BrandStored & { id: string };

export type Cmpf307Stored = {
  brands_without_mark_reasons: string;
  brands: Cmpf307BrandStored[];
};

export function defaultCmpf307BrandEntry(): Cmpf307BrandStored {
  return {
    brand_name: "",
    owned_by: "",
    registered_status: "",
    registration_date: "",
  };
}

export function defaultCmpf307Document(): Cmpf307Stored {
  return {
    brands_without_mark_reasons: "",
    brands: [],
  };
}

let cmpf307RowSeq = 0;

export function createCmpf307BrandRow(): Cmpf307BrandRow {
  cmpf307RowSeq += 1;
  return {
    id: `cmpf307-${Date.now()}-${cmpf307RowSeq}`,
    ...defaultCmpf307BrandEntry(),
  };
}

export function defaultCmpf307BrandRows(): Cmpf307BrandRow[] {
  return Array.from({ length: CMPF307_ROWS_PER_PAGE }, () => createCmpf307BrandRow());
}

export function brandRowHasContent(row: Cmpf307BrandStored): boolean {
  return (
    row.brand_name.trim().length > 0 ||
    row.owned_by.trim().length > 0 ||
    row.registered_status.trim().length > 0 ||
    row.registration_date.trim().length > 0
  );
}

export function documentHasContent(doc: Cmpf307Stored): boolean {
  return (
    doc.brands_without_mark_reasons.trim().length > 0 ||
    doc.brands.some(brandRowHasContent)
  );
}

export function parseCmpf307(raw: unknown): Cmpf307Stored {
  if (Array.isArray(raw)) {
    return {
      brands_without_mark_reasons: "",
      brands: parseCmpf307BrandList(raw),
    };
  }
  if (!raw || typeof raw !== "object") return defaultCmpf307Document();
  const r = raw as Record<string, unknown>;
  return {
    brands_without_mark_reasons: String(r.brands_without_mark_reasons ?? "").trim(),
    brands: parseCmpf307BrandList(r.brands),
  };
}

function parseCmpf307BrandList(raw: unknown): Cmpf307BrandStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        brand_name: String(row.brand_name ?? "").trim(),
        owned_by: String(row.owned_by ?? "").trim(),
        registered_status: String(row.registered_status ?? "").trim(),
        registration_date: String(row.registration_date ?? "").trim(),
      };
    })
    .filter((row): row is Cmpf307BrandStored => row !== null);
}

export function editorRowsFromStored(stored: Cmpf307Stored): Cmpf307BrandRow[] {
  const rows = stored.brands.filter(brandRowHasContent);
  if (rows.length === 0) return [];
  return rows.map((row, i) => ({
    id: `cmpf307-loaded-${i}`,
    ...row,
  }));
}

export function storedFromEditor(
  rows: Cmpf307BrandRow[],
  brandsWithoutMarkReasons: string,
): Cmpf307Stored {
  return {
    brands_without_mark_reasons: brandsWithoutMarkReasons.trim(),
    brands: rows
      .map(({ brand_name, owned_by, registered_status, registration_date }) => ({
        brand_name,
        owned_by,
        registered_status,
        registration_date,
      }))
      .filter(brandRowHasContent),
  };
}

export function paginateBrandRows(
  brands: Cmpf307BrandStored[],
  rowsPerPage = CMPF307_ROWS_PER_PAGE,
): Cmpf307BrandStored[][] {
  const visible = brands.filter(brandRowHasContent);
  if (visible.length === 0) {
    return [Array.from({ length: rowsPerPage }, () => defaultCmpf307BrandEntry())];
  }

  const pages: Cmpf307BrandStored[][] = [];
  for (let i = 0; i < visible.length; i += rowsPerPage) {
    const slice = visible.slice(i, i + rowsPerPage);
    while (slice.length < rowsPerPage) {
      slice.push(defaultCmpf307BrandEntry());
    }
    pages.push(slice);
  }
  return pages;
}
