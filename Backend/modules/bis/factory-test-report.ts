import { rowHasContent as oslRowHasContent, type OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";
import { toYmdDateString } from "@backend/shared/format-date";

export type FtrSampleSource = "osl" | "pi";

export type FtrTestRowStored = {
  row_type: "section" | "test";
  section_code: string;
  section_title: string;
  sr_no: string;
  test_name: string;
  unit: string;
  clause_no: string;
  test_method: string;
  is_reference: string;
  specified_requirements: string;
  observed_value: string;
  observed_decimals?: number;
  remark: string;
};

export type FactoryTestReportStored = {
  source: FtrSampleSource;
  source_index: number;
  sample_label: string;
  applicant_name: string;
  applicant_address: string;
  application_number: string;
  licence_number: string;
  product_title: string;
  grade_type: string;
  declared_values: string;
  other_information: string;
  is_code: string;
  batch_heat_number: string;
  date_of_application: string;
  date_of_inspection: string;
  date_of_manufacturing: string;
  date_of_testing_start: string;
  date_of_testing_completion: string;
  witnessed_by: string;
  tested_by: string;
  test_rows: FtrTestRowStored[];
};

export const FTR_REMARK_DEFAULT = "Confirm" as const;
export const FTR_REMARK_NOT_CONFIRM = "Not Confirm" as const;

/** Normalizes blank remarks to the default Confirm for display and print. */
export function normalizeFtrRemark(remark: string): string {
  return remark.trim() === FTR_REMARK_NOT_CONFIRM ? FTR_REMARK_NOT_CONFIRM : FTR_REMARK_DEFAULT;
}

export function ftrTestRowKey(row: Pick<FtrTestRowStored, "test_name" | "clause_no">): string {
  return `${row.test_name}|${row.clause_no}`;
}

export type FactoryTestReportRow = FactoryTestReportStored & { id: string };

export type FtrTestRow = FtrTestRowStored & { id: string };

export type FtrContext = {
  applicantName: string;
  applicantAddress: string;
  applicationNumber: string;
  licenceNumber: string;
  productTitle: string;
  isCode: string;
  dateOfApplication: string;
  dateOfInspection: string;
  inspectionOfficerName: string;
  inspectionOfficerDesignation: string;
  qualityControlInchargeName: string;
  qualityControlInchargeDesignation: string;
};

export type FtrTestParameterSeed = {
  id?: string;
  test_name: string;
  clause_no: string;
  unit: string;
  specified_value: string;
  test_method: string;
};

function defaultOtherInformation(): string {
  return "N/A";
}

export function defaultFtrTestingDate(): string {
  return toYmdDateString(new Date());
}

export function defaultFtrTestRow(type: FtrTestRowStored["row_type"] = "test"): FtrTestRowStored {
  if (type === "section") {
    return {
      row_type: "section",
      section_code: "A",
      section_title: "Dimensions and Weights",
      sr_no: "",
      test_name: "",
      unit: "",
      clause_no: "",
      test_method: "",
      is_reference: "",
      specified_requirements: "",
      observed_value: "",
      remark: "",
    };
  }
  return {
    row_type: "test",
    section_code: "",
    section_title: "",
    sr_no: "",
    test_name: "",
    unit: "",
    clause_no: "",
    test_method: "",
    is_reference: "",
    specified_requirements: "",
    observed_value: "",
    remark: "",
  };
}

export function ftrTestRowFromParameter(
  p: FtrTestParameterSeed,
  isReference: string,
  srNo?: string,
): FtrTestRowStored {
  return {
    ...defaultFtrTestRow("test"),
    sr_no: srNo ?? "",
    test_name: p.test_name,
    unit: p.unit || "—",
    clause_no: p.clause_no
      ? p.clause_no.trim().startsWith("Cl")
        ? p.clause_no.trim()
        : `Cl ${p.clause_no.trim()}`
      : "",
    test_method: p.test_method.trim(),
    is_reference: isReference,
    specified_requirements: p.specified_value,
    remark: FTR_REMARK_DEFAULT,
    observed_decimals: 2,
  };
}

export function testRowsFromParameters(
  params: FtrTestParameterSeed[],
  isReference: string,
): FtrTestRowStored[] {
  if (params.length === 0) {
    return [
      defaultFtrTestRow("section"),
      {
        ...defaultFtrTestRow("test"),
        test_name: "Freedom From Defects",
        unit: "---",
        clause_no: "Cl 7",
        is_reference: isReference,
        specified_requirements:
          "The Structural Product shall be Cleanly Finished & Reasonably Free from Scale.",
      },
    ];
  }

  const rows: FtrTestRowStored[] = [
    {
      ...defaultFtrTestRow("section"),
      section_code: "A",
      section_title: "Tests as per Indian Standard",
    },
  ];

  params.forEach((p, index) => {
    rows.push(ftrTestRowFromParameter(p, isReference, String(index + 1)));
  });

  return rows;
}

let ftrRowSeq = 0;

export function createFtrEditorRow(type: FtrTestRowStored["row_type"] = "test"): FtrTestRow {
  ftrRowSeq += 1;
  return {
    id: `ftr-test-${Date.now()}-${ftrRowSeq}`,
    ...defaultFtrTestRow(type),
  };
}

export function defaultFtrEditorTestRows(): FtrTestRow[] {
  return [createFtrEditorRow("section"), createFtrEditorRow("test")];
}

function sampleSourceKey(source: FtrSampleSource, index: number): string {
  return `${source}:${index}`;
}

function sampleLabel(source: FtrSampleSource, index: number, sample: OslSampleRequirementStored): string {
  const prefix = source === "osl" ? "OSL" : "PI";
  const desc = sample.sample_description.trim();
  return desc ? `${prefix} — ${desc}` : `${prefix} Sample ${String(index + 1).padStart(2, "0")}`;
}

function buildReportFromSample(
  source: FtrSampleSource,
  index: number,
  sample: OslSampleRequirementStored,
  existing: FactoryTestReportStored | undefined,
  ctx: FtrContext,
): FactoryTestReportStored {
  const headerFromSampleAndCtx = {
    sample_label: sampleLabel(source, index, sample),
    applicant_name: ctx.applicantName,
    applicant_address: ctx.applicantAddress,
    application_number: ctx.applicationNumber,
    licence_number: ctx.licenceNumber,
    product_title: ctx.productTitle,
    grade_type: sample.sample_description.trim(),
    declared_values: sample.declared_value.trim(),
    other_information: defaultOtherInformation(),
    is_code: ctx.isCode,
    batch_heat_number: sample.batch_number.trim(),
    date_of_application: ctx.dateOfApplication,
    date_of_inspection: ctx.dateOfInspection,
    date_of_manufacturing: sample.date_of_manufacturing.trim(),
  };

  return {
    source,
    source_index: index,
    ...headerFromSampleAndCtx,
    date_of_testing_start:
      existing?.date_of_testing_start?.trim() || defaultFtrTestingDate(),
    date_of_testing_completion:
      existing?.date_of_testing_completion?.trim() || defaultFtrTestingDate(),
    witnessed_by: ctx.inspectionOfficerName,
    tested_by: ctx.qualityControlInchargeName,
    test_rows:
      existing?.test_rows?.length &&
      existing.test_rows.some((r) => r.row_type === "test" && r.test_name.trim())
        ? existing.test_rows
        : [],
  };
}

export function syncFactoryTestReportsFromSamples(input: {
  oslSamples: OslSampleRequirementStored[];
  piSamples: OslSampleRequirementStored[];
  existing: FactoryTestReportStored[];
  ctx: FtrContext;
}): FactoryTestReportStored[] {
  const existingByKey = new Map(
    input.existing.map((r) => [sampleSourceKey(r.source, r.source_index), r]),
  );

  const reports: FactoryTestReportStored[] = [];

  input.oslSamples.forEach((sample, index) => {
    if (!oslRowHasContent(sample)) return;
    const key = sampleSourceKey("osl", index);
    reports.push(
      buildReportFromSample(
        "osl",
        index,
        sample,
        existingByKey.get(key),
        input.ctx,
      ),
    );
  });

  input.piSamples.forEach((sample, index) => {
    if (!oslRowHasContent(sample)) return;
    const key = sampleSourceKey("pi", index);
    reports.push(
      buildReportFromSample(
        "pi",
        index,
        sample,
        existingByKey.get(key),
        input.ctx,
      ),
    );
  });

  return reports;
}

export function parseFactoryTestReports(raw: unknown): FactoryTestReportStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const source = r.source === "pi" ? "pi" : "osl";
      const testRowsRaw = Array.isArray(r.test_rows) ? r.test_rows : [];
      const test_rows = testRowsRaw
        .map((row): FtrTestRowStored | null => {
          if (!row || typeof row !== "object") return null;
          const t = row as Record<string, unknown>;
          const rowType = t.row_type === "section" ? "section" : "test";
          return {
            row_type: rowType,
            section_code: String(t.section_code ?? "").trim(),
            section_title: String(t.section_title ?? "").trim(),
            sr_no: String(t.sr_no ?? "").trim(),
            test_name: String(t.test_name ?? "").trim(),
            unit: String(t.unit ?? "").trim(),
            clause_no: String(t.clause_no ?? "").trim(),
            test_method: String(t.test_method ?? "").trim(),
            is_reference: String(t.is_reference ?? "").trim(),
            specified_requirements: String(t.specified_requirements ?? "").trim(),
            observed_value: String(t.observed_value ?? "").trim(),
            observed_decimals:
              t.observed_decimals != null && Number.isFinite(Number(t.observed_decimals))
                ? Number(t.observed_decimals)
                : undefined,
            remark: String(t.remark ?? "").trim(),
          };
        })
        .filter((t): t is FtrTestRowStored => t !== null);

      return {
        source,
        source_index: Number.isFinite(Number(r.source_index)) ? Number(r.source_index) : 0,
        sample_label: String(r.sample_label ?? "").trim(),
        applicant_name: String(r.applicant_name ?? "").trim(),
        applicant_address: String(r.applicant_address ?? "").trim(),
        application_number: String(r.application_number ?? "").trim(),
        licence_number: String(r.licence_number ?? "").trim(),
        product_title: String(r.product_title ?? "").trim(),
        grade_type: String(r.grade_type ?? "").trim(),
        declared_values: String(r.declared_values ?? "").trim(),
        other_information: String(r.other_information ?? "").trim(),
        is_code: String(r.is_code ?? "").trim(),
        batch_heat_number: String(r.batch_heat_number ?? "").trim(),
        date_of_application: String(r.date_of_application ?? "").trim(),
        date_of_inspection: String(r.date_of_inspection ?? "").trim(),
        date_of_manufacturing: String(r.date_of_manufacturing ?? "").trim(),
        date_of_testing_start: String(r.date_of_testing_start ?? "").trim(),
        date_of_testing_completion: String(r.date_of_testing_completion ?? "").trim(),
        witnessed_by: String(r.witnessed_by ?? "").trim(),
        tested_by: String(r.tested_by ?? "").trim(),
        test_rows,
      };
    })
    .filter((r): r is FactoryTestReportStored => r !== null);
}

export function ftrReportHasContent(report: FactoryTestReportStored): boolean {
  return (
    report.sample_label.trim().length > 0 ||
    report.product_title.trim().length > 0 ||
    report.batch_heat_number.trim().length > 0 ||
    report.test_rows.some(
      (r) =>
        r.row_type === "section"
          ? r.section_code.trim() || r.section_title.trim()
          : r.test_name.trim() ||
            r.specified_requirements.trim() ||
            r.observed_value.trim(),
    )
  );
}

export function editorReportsFromStored(stored: FactoryTestReportStored[]): FactoryTestReportRow[] {
  if (stored.length === 0) return [];
  const today = defaultFtrTestingDate();
  return stored.map((report, index) => ({
    id: `ftr-report-${index}`,
    ...report,
    date_of_testing_start: report.date_of_testing_start.trim() || today,
    date_of_testing_completion: report.date_of_testing_completion.trim() || today,
    test_rows: report.test_rows ?? [],
  }));
}

export function editorTestRowsFromStored(rows: FtrTestRowStored[]): FtrTestRow[] {
  if (rows.length === 0) return [];
  return rows.map((row, index) => ({
    id: `ftr-test-${index}`,
    ...row,
    row_type: row.row_type === "section" ? "section" : "test",
  }));
}

export function storedTestRowsFromEditor(rows: FtrTestRow[]): FtrTestRowStored[] {
  return rows
    .map(({ id: _id, ...rest }) => ({
      ...rest,
      row_type: rest.row_type === "section" ? ("section" as const) : ("test" as const),
    }))
    .filter(
      (r) =>
        r.row_type === "section"
          ? r.section_code.trim() || r.section_title.trim()
          : r.test_name.trim() ||
            r.specified_requirements.trim() ||
            r.observed_value.trim() ||
            r.remark.trim(),
    );
}

export function clauseSortKey(clauseNo: string): number {
  const m = (clauseNo ?? "").trim().match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : Number.MAX_SAFE_INTEGER;
}

/** Test rows only, sorted ascending by clause number. */
export function sortFtrTestRowsByClause(rows: FtrTestRowStored[]): FtrTestRowStored[] {
  return rows
    .filter((r) => r.row_type === "test")
    .sort((a, b) => {
      const diff = clauseSortKey(a.clause_no) - clauseSortKey(b.clause_no);
      if (diff !== 0) return diff;
      return a.test_name.localeCompare(b.test_name);
    });
}

/** Options for estimating how many test rows fit on each printed page. */
export type FtrPrintPaginationOptions = {
  showLetterhead: boolean;
  showWitnessedBy: boolean;
  showTestedBy: boolean;
  marginTopMm: number;
  marginBottomMm: number;
};

export const DEFAULT_FTR_PRINT_PAGINATION_OPTIONS: FtrPrintPaginationOptions = {
  showLetterhead: true,
  showWitnessedBy: true,
  showTestedBy: true,
  marginTopMm: 20,
  marginBottomMm: 20,
};

const A4_HEIGHT_MM = 297;

function pageContentHeightMm(marginTopMm: number, marginBottomMm: number): number {
  return A4_HEIGHT_MM - marginTopMm - marginBottomMm;
}

function signaturesOverheadMm(options: FtrPrintPaginationOptions): number {
  return options.showWitnessedBy || options.showTestedBy ? 26 : 0;
}

function firstPageOverheadMm(options: FtrPrintPaginationOptions): number {
  let overhead = 7 + 40 + 11 + 4 + signaturesOverheadMm(options);
  if (options.showLetterhead) overhead += 30;
  return overhead;
}

function continuationPageOverheadMm(options: FtrPrintPaginationOptions): number {
  let overhead = 11 + 4 + signaturesOverheadMm(options);
  if (options.showLetterhead) overhead += 30;
  return overhead;
}

function estimateRowHeightMm(row: FtrTestRowStored): number {
  const lineMm = 3.4;
  const paddingMm = 2;
  let lines = 1;

  // Merged first column: Test Name + Clause No · IS Reference
  const testName = row.test_name ?? "";
  lines = Math.max(lines, Math.ceil(testName.length / 32));

  const meta = [row.clause_no, row.is_reference]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" · ");
  if (meta) lines = Math.max(lines, 2);

  const spec = row.specified_requirements ?? "";
  lines = Math.max(lines, Math.ceil(spec.length / 40));

  return paddingMm + lines * lineMm;
}

export function paginateFtrPrintTestRows(
  rows: FtrTestRowStored[],
  options: FtrPrintPaginationOptions = DEFAULT_FTR_PRINT_PAGINATION_OPTIONS,
): FtrTestRowStored[][] {
  const tests = sortFtrTestRowsByClause(rows);
  if (tests.length === 0) return [[]];

  const pageHeightMm = pageContentHeightMm(options.marginTopMm, options.marginBottomMm);
  const pages: FtrTestRowStored[][] = [];
  let index = 0;
  let isFirstPage = true;

  while (index < tests.length) {
    const overheadMm = isFirstPage
      ? firstPageOverheadMm(options)
      : continuationPageOverheadMm(options);
    let remainingMm = pageHeightMm - overheadMm;
    const pageRows: FtrTestRowStored[] = [];

    while (index < tests.length) {
      const rowMm = estimateRowHeightMm(tests[index]!);
      if (pageRows.length > 0 && rowMm > remainingMm) break;
      pageRows.push(tests[index]!);
      remainingMm -= rowMm;
      index++;
    }

    pages.push(pageRows);
    isFirstPage = false;
  }

  return pages;
}

export function ftrPrintPageCount(
  testRows: FtrTestRowStored[],
  options: FtrPrintPaginationOptions = DEFAULT_FTR_PRINT_PAGINATION_OPTIONS,
): number {
  return paginateFtrPrintTestRows(testRows, options).length;
}

export function refreshReportHeadersFromSample(
  report: FactoryTestReportStored,
  sample: OslSampleRequirementStored | undefined,
  ctx: FtrContext,
): Partial<FactoryTestReportStored> {
  if (!sample) return {};
  return {
    sample_label: sampleLabel(report.source, report.source_index, sample),
    applicant_name: ctx.applicantName,
    applicant_address: ctx.applicantAddress,
    application_number: ctx.applicationNumber,
    licence_number: ctx.licenceNumber,
    product_title: ctx.productTitle,
    grade_type: sample.sample_description.trim(),
    declared_values: sample.declared_value.trim(),
    is_code: ctx.isCode,
    batch_heat_number: sample.batch_number.trim(),
    date_of_application: ctx.dateOfApplication,
    date_of_inspection: ctx.dateOfInspection,
    date_of_manufacturing: sample.date_of_manufacturing.trim(),
    witnessed_by: ctx.inspectionOfficerName,
    tested_by: ctx.qualityControlInchargeName,
  };
}

export function mergeTestParametersIntoRows(
  existing: FtrTestRowStored[],
  params: FtrTestParameterSeed[],
  isReference: string,
): FtrTestRowStored[] {
  const merged = [...existing];
  const existingKeys = new Set(
    merged
      .filter((r) => r.row_type === "test")
      .map((r) => `${r.test_name.trim().toLowerCase()}|${r.clause_no.trim().toLowerCase()}`),
  );

  let nextSr =
    merged.filter((r) => r.row_type === "test").length +
    1;

  for (const p of params) {
    const key = `${p.test_name.trim().toLowerCase()}|${(p.clause_no.trim().startsWith("Cl") ? p.clause_no.trim() : `Cl ${p.clause_no.trim()}`).toLowerCase()}`;
    if (existingKeys.has(key)) continue;
    merged.push(ftrTestRowFromParameter(p, isReference, String(nextSr)));
    existingKeys.add(key);
    nextSr += 1;
  }

  return merged;
}

export function storedReportsFromEditor(rows: FactoryTestReportRow[]): FactoryTestReportStored[] {
  return rows
    .map(({ id: _id, ...rest }) => ({
      ...rest,
      test_rows: rest.test_rows ?? [],
    }))
    .filter(ftrReportHasContent);
}
