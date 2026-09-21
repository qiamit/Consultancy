export type OslSamplePriority = "Priority" | "Non Priority";

/** Where this sample is offered — OSL / FT / IT. */
export type OslSampleFor = "osl" | "ft" | "it";

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
  shelf_life: string;
  mode_of_disposal: string;
  testing_charges: string;
  test_required: string;
  /** OSL / FT / IT — used when lists share one UI. */
  sample_for: OslSampleFor;
  /**
   * When true, row appears in Sample Offer letter table
   * (print preview / print / Word / PDF). Default true.
   */
  include_in_print: boolean;
  /** Attached lab / factory test report file (`doc://…` storage ref). */
  test_report_ref?: string;
  /** Original file name shown on the sample card. */
  test_report_name?: string;
};

export type OslSampleRequirementRow = OslSampleRequirementStored & { id: string };

/** Local calendar date as YYYY-MM-DD (for date inputs). */
export function todayYmdLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseSampleFor(
  raw: unknown,
  fallback: OslSampleFor = "osl",
): OslSampleFor {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "ft" || v === "factory" || v === "factory_test") return "ft";
  if (
    v === "it" ||
    v === "pi" ||
    v === "inspection" ||
    v === "preliminary" ||
    v === "preliminary_inspection"
  ) {
    return "it";
  }
  if (v === "osl" || v === "outside" || v === "outside_lab") return "osl";
  return fallback;
}

export function sampleForLabel(value: OslSampleFor): string {
  if (value === "ft") return "FT";
  if (value === "it") return "IT";
  return "OSL";
}

export function defaultOslSampleRequirement(
  sampleFor: OslSampleFor = "osl",
): OslSampleRequirementStored {
  return {
    sample_description: "",
    declared_value: "",
    batch_number: "",
    date_of_manufacturing: todayYmdLocal(),
    sample_quantity: "1 Mtr X 2 Nos + 50 mm X 5 Nos",
    batch_quantity: "0.50 Tonne Approx",
    sample_code: "",
    qr_code: "",
    sample_type: "AS",
    priority: "Priority",
    laboratory_name: "",
    shelf_life: "Life Long",
    mode_of_disposal: "To be Disposed",
    testing_charges: "",
    test_required: "All Test",
    sample_for: sampleFor,
    include_in_print: true,
    test_report_ref: "",
    test_report_name: "",
  };
}

/** Missing / legacy rows count as included. */
export function isSampleIncludedInPrint(
  row: Pick<OslSampleRequirementStored, "include_in_print"> | { include_in_print?: boolean },
): boolean {
  return row.include_in_print !== false;
}

let oslRowSeq = 0;

export function createOslSampleRequirementRow(
  sampleFor: OslSampleFor = "osl",
): OslSampleRequirementRow {
  oslRowSeq += 1;
  return {
    id: `osl-row-${Date.now()}-${oslRowSeq}`,
    ...defaultOslSampleRequirement(sampleFor),
  };
}

export function defaultOslSampleRequirementRows(): OslSampleRequirementRow[] {
  return [createOslSampleRequirementRow()];
}

function parsePriority(raw: unknown): OslSamplePriority {
  const v = String(raw ?? "").trim();
  return v === "Non Priority" ? "Non Priority" : "Priority";
}

function mapRawSample(
  r: Record<string, unknown>,
  fallbackFor: OslSampleFor,
): OslSampleRequirementStored {
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
    shelf_life: String(r.shelf_life ?? "").trim(),
    mode_of_disposal: String(r.mode_of_disposal ?? "").trim(),
    testing_charges: String(r.testing_charges ?? "").trim(),
    test_required: String(r.test_required ?? "").trim(),
    sample_for: parseSampleFor(r.sample_for, fallbackFor),
    include_in_print: r.include_in_print !== false,
    test_report_ref: String(r.test_report_ref ?? "").trim(),
    test_report_name: String(r.test_report_name ?? "").trim(),
  };
}

export function parseOslSampleRequirements(
  raw: unknown,
  fallbackFor: OslSampleFor = "osl",
): OslSampleRequirementStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      return mapRawSample(item as Record<string, unknown>, fallbackFor);
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
    row.laboratory_name.trim().length > 0 ||
    row.shelf_life.trim().length > 0 ||
    row.mode_of_disposal.trim().length > 0 ||
    row.testing_charges.trim().length > 0 ||
    row.test_required.trim().length > 0
  );
}

export function documentHasContent(rows: OslSampleRequirementStored[]): boolean {
  return rows.some(rowHasContent);
}

export function editorRowsFromStored(
  stored: OslSampleRequirementStored[],
): OslSampleRequirementRow[] {
  if (stored.length === 0) return [];
  return stored.map((row, index) => ({
    id: `osl-row-${index}`,
    ...row,
    priority: parsePriority(row.priority),
    sample_for: parseSampleFor(row.sample_for),
    include_in_print: row.include_in_print !== false,
  }));
}

export function storedFromEditor(
  rows: OslSampleRequirementRow[],
): OslSampleRequirementStored[] {
  return rows
    .map(({ id: _id, ...rest }) => ({
      ...rest,
      priority: parsePriority(rest.priority),
      sample_for: parseSampleFor(rest.sample_for),
      include_in_print: rest.include_in_print !== false,
    }))
    .filter(rowHasContent);
}

/** Merge OSL + PI lists for the single Sample Requirements UI (OSL/FT first, then IT). */
export function combineOslAndPiSamples(
  osl: OslSampleRequirementStored[],
  pi: OslSampleRequirementStored[],
): OslSampleRequirementStored[] {
  return [
    ...osl.map((r) => ({ ...r, sample_for: parseSampleFor(r.sample_for, "osl") })),
    ...pi.map((r) => ({ ...r, sample_for: parseSampleFor(r.sample_for, "it") })),
  ];
}

/** Split combined editor rows back into OSL / PI storage buckets. */
export function splitOslAndPiSamples(rows: OslSampleRequirementStored[]): {
  osl: OslSampleRequirementStored[];
  pi: OslSampleRequirementStored[];
} {
  const osl: OslSampleRequirementStored[] = [];
  const pi: OslSampleRequirementStored[] = [];
  for (const row of rows) {
    if (!rowHasContent(row)) continue;
    const tagged = { ...row, sample_for: parseSampleFor(row.sample_for) };
    if (tagged.sample_for === "it") pi.push(tagged);
    else osl.push(tagged);
  }
  return { osl, pi };
}
