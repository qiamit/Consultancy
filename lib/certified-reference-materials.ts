export const CRM_ROWS_PER_PAGE = 9;

export const CRM_ACCREDITED_RMP_OPTIONS = ["Yes", "No"] as const;

export type CertifiedReferenceMaterialStored = {
  crm_name: string;
  supplier_name: string;
  accredited_rmp: string;
  certificate_lot_no: string;
  validity_period: string;
};

export type CertifiedReferenceMaterialRow = CertifiedReferenceMaterialStored & { id: string };

export function defaultCertifiedReferenceMaterialEntry(): CertifiedReferenceMaterialStored {
  return {
    crm_name: "",
    supplier_name: "",
    accredited_rmp: "",
    certificate_lot_no: "",
    validity_period: "",
  };
}

let crmRowSeq = 0;

export function createCertifiedReferenceMaterialRow(): CertifiedReferenceMaterialRow {
  crmRowSeq += 1;
  return {
    id: `crm-${Date.now()}-${crmRowSeq}`,
    ...defaultCertifiedReferenceMaterialEntry(),
  };
}

export function defaultCertifiedReferenceMaterialRows(): CertifiedReferenceMaterialRow[] {
  return Array.from({ length: CRM_ROWS_PER_PAGE }, () => createCertifiedReferenceMaterialRow());
}

export function rowHasContent(row: CertifiedReferenceMaterialStored): boolean {
  return (
    row.crm_name.trim().length > 0 ||
    row.supplier_name.trim().length > 0 ||
    row.accredited_rmp.trim().length > 0 ||
    row.certificate_lot_no.trim().length > 0 ||
    row.validity_period.trim().length > 0
  );
}

export function parseCertifiedReferenceMaterials(raw: unknown): CertifiedReferenceMaterialStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      return {
        crm_name: String(r.crm_name ?? "").trim(),
        supplier_name: String(r.supplier_name ?? "").trim(),
        accredited_rmp: String(r.accredited_rmp ?? "").trim(),
        certificate_lot_no: String(r.certificate_lot_no ?? "").trim(),
        validity_period: String(r.validity_period ?? "").trim(),
      };
    })
    .filter((r): r is CertifiedReferenceMaterialStored => r !== null);
}

export function editorRowsFromStored(
  stored: CertifiedReferenceMaterialStored[],
): CertifiedReferenceMaterialRow[] {
  const rows = stored.filter(rowHasContent);
  if (rows.length === 0) return [];
  return rows.map((row, i) => ({
    id: `crm-loaded-${i}`,
    ...row,
  }));
}

export function storedFromEditor(rows: CertifiedReferenceMaterialRow[]): CertifiedReferenceMaterialStored[] {
  return rows
    .map(({ crm_name, supplier_name, accredited_rmp, certificate_lot_no, validity_period }) => ({
      crm_name,
      supplier_name,
      accredited_rmp,
      certificate_lot_no,
      validity_period,
    }))
    .filter(rowHasContent);
}

export function paginateCertifiedReferenceMaterialRows(
  rows: CertifiedReferenceMaterialStored[],
  rowsPerPage = CRM_ROWS_PER_PAGE,
): CertifiedReferenceMaterialStored[][] {
  const visible = rows.filter(rowHasContent);
  if (visible.length === 0) {
    return [[]];
  }

  const pages: CertifiedReferenceMaterialStored[][] = [];
  for (let i = 0; i < visible.length; i += rowsPerPage) {
    pages.push(visible.slice(i, i + rowsPerPage));
  }
  return pages;
}
