export type OslSamplePriority = "Priority" | "Non Priority";

export type OslSampleRequirementStored = {
  sample_description: string;
  declared_value: string;
  batch_number: string;
  date_of_manufacturing: string;
  sample_quantity: string;
  batch_quantity: string;
  sample_code: string;
  qr_code: string;
  sample_type: string;
  priority: OslSamplePriority;
  laboratory_name: string;
};

export type OslSampleRequirementRow = OslSampleRequirementStored & { id: string };

export function defaultOslSampleRequirement(): OslSampleRequirementStored {
  return {
    sample_description: "",
    declared_value: "",
    batch_number: "",
    date_of_manufacturing: "",
    sample_quantity: "",
    batch_quantity: "",
    sample_code: "",
    qr_code: "",
    sample_type: "",
    priority: "Priority",
    laboratory_name: "",
  };
}

let oslRowSeq = 0;

export function createOslSampleRequirementRow(): OslSampleRequirementRow {
  oslRowSeq += 1;
  return {
    id: `osl-row-${Date.now()}-${oslRowSeq}`,
    ...defaultOslSampleRequirement(),
  };
}

export function defaultOslSampleRequirementRows(): OslSampleRequirementRow[] {
  return [createOslSampleRequirementRow()];
}

function parsePriority(raw: unknown): OslSamplePriority {
  const v = String(raw ?? "").trim();
  return v === "Non Priority" ? "Non Priority" : "Priority";
}

export function parseOslSampleRequirements(raw: unknown): OslSampleRequirementStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      return {
        sample_description: String(r.sample_description ?? "").trim(),
        declared_value: String(r.declared_value ?? "").trim(),
        batch_number: String(r.batch_number ?? "").trim(),
        date_of_manufacturing: String(r.date_of_manufacturing ?? "").trim(),
        sample_quantity: String(r.sample_quantity ?? "").trim(),
        batch_quantity: String(r.batch_quantity ?? "").trim(),
        sample_code: String(r.sample_code ?? "").trim(),
        qr_code: String(r.qr_code ?? "").trim(),
        sample_type: String(r.sample_type ?? "").trim(),
        priority: parsePriority(r.priority),
        laboratory_name: String(r.laboratory_name ?? "").trim(),
      };
    })
    .filter((r): r is OslSampleRequirementStored => r !== null);
}

export function rowHasContent(row: OslSampleRequirementStored): boolean {
  return (
    row.sample_description.trim().length > 0 ||
    row.declared_value.trim().length > 0 ||
    row.batch_number.trim().length > 0 ||
    row.date_of_manufacturing.trim().length > 0 ||
    row.sample_quantity.trim().length > 0 ||
    row.batch_quantity.trim().length > 0 ||
    row.sample_code.trim().length > 0 ||
    row.qr_code.trim().length > 0 ||
    row.sample_type.trim().length > 0 ||
    row.laboratory_name.trim().length > 0
  );
}

export function editorRowsFromStored(stored: OslSampleRequirementStored[]): OslSampleRequirementRow[] {
  if (stored.length === 0) return defaultOslSampleRequirementRows();
  return stored.map((row, index) => ({
    id: `osl-row-${index}`,
    ...row,
    priority: parsePriority(row.priority),
  }));
}

export function storedFromEditor(rows: OslSampleRequirementRow[]): OslSampleRequirementStored[] {
  return rows
    .map(({ id: _id, ...rest }) => ({
      ...rest,
      priority: parsePriority(rest.priority),
    }))
    .filter(rowHasContent);
}
