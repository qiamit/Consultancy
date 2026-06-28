import type { FtrTestParameterSeed } from "@/lib/factory-test-report";

export const SUBCONTRACTED_LAB_ACCREDITATION_DEFAULT =
  "BIS Recognized / ISO/IEC 17025" as const;

export type SubcontractedTestsDocumentStored = {
  signatory_name: string;
  signatory_designation: string;
};

export type SubcontractedTestStored = {
  test_name: string;
  clause_no: string;
  test_method: string;
  unit: string;
  specified_value: string;
  laboratory_name: string;
  laboratory_address: string;
  accreditation: string;
  remarks: string;
};

export type SubcontractedTestRow = SubcontractedTestStored & { id: string };

export function defaultSubcontractedTestsDocument(): SubcontractedTestsDocumentStored {
  return {
    signatory_name: "",
    signatory_designation: "",
  };
}

export function documentHasContent(doc: SubcontractedTestsDocumentStored): boolean {
  return (
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0
  );
}

export function parseSubcontractedTestsDocument(raw: unknown): SubcontractedTestsDocumentStored {
  if (!raw || typeof raw !== "object") return defaultSubcontractedTestsDocument();
  const r = raw as Record<string, unknown>;
  return {
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
  };
}

export function mergeSubcontractedTestsDocumentWithDefaults(
  stored: SubcontractedTestsDocumentStored,
  contactPerson: string,
): SubcontractedTestsDocumentStored {
  return {
    signatory_name: stored.signatory_name || contactPerson.trim(),
    signatory_designation: stored.signatory_designation,
  };
}

export function defaultSubcontractedTestEntry(): SubcontractedTestStored {
  return {
    test_name: "",
    clause_no: "",
    test_method: "",
    unit: "",
    specified_value: "",
    laboratory_name: "",
    laboratory_address: "",
    accreditation: SUBCONTRACTED_LAB_ACCREDITATION_DEFAULT,
    remarks: "",
  };
}

let subcontractedRowSeq = 0;

export function createSubcontractedTestRow(): SubcontractedTestRow {
  subcontractedRowSeq += 1;
  return {
    id: `sub-test-${Date.now()}-${subcontractedRowSeq}`,
    ...defaultSubcontractedTestEntry(),
  };
}

export function defaultSubcontractedTestRows(): SubcontractedTestRow[] {
  return [createSubcontractedTestRow()];
}

export function rowHasContent(row: SubcontractedTestStored): boolean {
  return (
    row.test_name.trim().length > 0 ||
    row.clause_no.trim().length > 0 ||
    row.test_method.trim().length > 0 ||
    row.unit.trim().length > 0 ||
    row.specified_value.trim().length > 0 ||
    row.laboratory_name.trim().length > 0 ||
    row.laboratory_address.trim().length > 0 ||
    row.remarks.trim().length > 0
  );
}

export function parseSubcontractedTests(raw: unknown): SubcontractedTestStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const accreditation = String(r.accreditation ?? "").trim();
      return {
        test_name: String(r.test_name ?? "").trim(),
        clause_no: String(r.clause_no ?? "").trim(),
        test_method: String(r.test_method ?? "").trim(),
        unit: String(r.unit ?? "").trim(),
        specified_value: String(r.specified_value ?? "").trim(),
        laboratory_name: String(r.laboratory_name ?? "").trim(),
        laboratory_address: String(r.laboratory_address ?? "").trim(),
        accreditation: accreditation || SUBCONTRACTED_LAB_ACCREDITATION_DEFAULT,
        remarks: String(r.remarks ?? "").trim(),
      };
    })
    .filter((r): r is SubcontractedTestStored => r !== null);
}

export function editorRowsFromStored(stored: SubcontractedTestStored[]): SubcontractedTestRow[] {
  const rows = stored.filter(rowHasContent);
  if (rows.length === 0) return defaultSubcontractedTestRows();
  return rows.map((r, i) => ({
    id: `sub-test-loaded-${i}`,
    ...r,
  }));
}

export function storedFromEditor(rows: SubcontractedTestRow[]): SubcontractedTestStored[] {
  return rows
    .map(
      ({
        test_name,
        clause_no,
        test_method,
        unit,
        specified_value,
        laboratory_name,
        laboratory_address,
        accreditation,
        remarks,
      }) => ({
        test_name,
        clause_no,
        test_method,
        unit,
        specified_value,
        laboratory_name,
        laboratory_address,
        accreditation: accreditation.trim() || SUBCONTRACTED_LAB_ACCREDITATION_DEFAULT,
        remarks,
      }),
    )
    .filter(rowHasContent);
}

function subcontractedTestKey(row: Pick<SubcontractedTestStored, "test_name" | "clause_no">): string {
  return `${row.test_name.trim().toLowerCase()}|${row.clause_no.trim().toLowerCase()}`;
}

export function mergeTestParametersIntoSubcontractedRows(
  existing: SubcontractedTestRow[],
  params: FtrTestParameterSeed[],
): SubcontractedTestRow[] {
  const merged = [...existing];
  const existingKeys = new Set(
    merged.filter((r) => rowHasContent(r)).map((r) => subcontractedTestKey(r)),
  );

  for (const p of params) {
    const key = subcontractedTestKey({
      test_name: p.test_name,
      clause_no: p.clause_no,
    });
    if (existingKeys.has(key)) continue;
    merged.push({
      id: `sub-test-${Date.now()}-${++subcontractedRowSeq}`,
      test_name: p.test_name,
      clause_no: p.clause_no,
      test_method: p.test_method ?? "",
      unit: p.unit ?? "",
      specified_value: p.specified_value ?? "",
      laboratory_name: "",
      laboratory_address: "",
      accreditation: SUBCONTRACTED_LAB_ACCREDITATION_DEFAULT,
      remarks: "",
    });
    existingKeys.add(key);
  }

  const contentRows = merged.filter((r) => rowHasContent(r));
  return contentRows.length > 0 ? contentRows : defaultSubcontractedTestRows();
}
