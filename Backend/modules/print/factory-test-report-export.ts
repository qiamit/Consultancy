import ExcelJS from "exceljs";
import {
  AlignmentType,
  BorderStyle,
  Document,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { FactoryTestReportStored, FtrTestRowStored } from "@backend/modules/bis/factory-test-report";
import { normalizeFtrRemark, sortFtrTestRowsByClause } from "@backend/modules/bis/factory-test-report";
import {
  buildFactoryTestReportCompany,
  factoryTestReportLetterheadSettings,
  type FactoryTestReportLetterData,
  type FactoryTestReportPrintAssets,
  type FactoryTestReportPrintSettings,
} from "@backend/modules/print/factory-test-report";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  contentWidthTwip,
  DOCX_LETTERHEAD_FONT,
  pageMarginsFromSettings,
  pageSizeTwipFromSettings,
} from "@backend/modules/print/docx-letterhead";
import { formatFtrObservedForDisplay } from "@backend/modules/bis/ftr-observed-formula";
import { formatDisplayDate } from "@backend/shared/format-date";
import {
  addSheetFromAoa,
  cloneWorksheet,
  copyRowFormat,
  downloadWorkbook,
  loadWorkbookFromArrayBuffer,
  setCellAddress,
} from "@backend/shared/spreadsheet/excel";

const FTR_TEST_START_ROW = 17;
const FTR_TEST_SLOT_COUNT = 8;
const FTR_SIGNATURE_BLOCK_ROW = 25;
const FTR_SECTION_TEMPLATE_ROW = 17;
const FTR_TEST_TEMPLATE_ROW = 18;
const FTR_COL_COUNT = 36;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function formatDatePlain(raw: string): string {
  return formatDisplayDate(raw, "");
}

function witnessedSignatureText(data: FactoryTestReportLetterData): string {
  return [data.inspectionOfficerName.trim(), data.inspectionOfficerDesignation.trim()]
    .filter(Boolean)
    .join("\n");
}

function testedSignatureText(data: FactoryTestReportLetterData): string {
  return [
    data.qualityControlInchargeName.trim(),
    data.qualityControlInchargeDesignation.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

function clearRowValues(worksheet: ExcelJS.Worksheet, rowNum: number): void {
  const row = worksheet.getRow(rowNum);
  for (let col = 1; col <= FTR_COL_COUNT; col++) {
    row.getCell(col).value = null;
  }
}

function ensureRowFormat(
  worksheet: ExcelJS.Worksheet,
  rowNum: number,
  rowType: FtrTestRowStored["row_type"],
): void {
  if (rowNum <= FTR_SIGNATURE_BLOCK_ROW - 1) return;
  copyRowFormat(
    worksheet,
    rowType === "section" ? FTR_SECTION_TEMPLATE_ROW : FTR_TEST_TEMPLATE_ROW,
    rowNum,
    FTR_COL_COUNT,
  );
}

function fillReportHeader(
  worksheet: ExcelJS.Worksheet,
  report: FactoryTestReportStored,
): void {
  setCellAddress(worksheet, "J4", report.applicant_name);
  setCellAddress(worksheet, "J5", report.applicant_address);
  setCellAddress(worksheet, "J6", report.application_number);
  setCellAddress(worksheet, "AB6", formatDatePlain(report.date_of_application));
  setCellAddress(worksheet, "J7", report.licence_number);
  setCellAddress(worksheet, "AB7", formatDatePlain(report.date_of_inspection));
  setCellAddress(worksheet, "J8", report.product_title);
  setCellAddress(worksheet, "J9", report.grade_type);
  setCellAddress(worksheet, "J10", report.declared_values);
  setCellAddress(worksheet, "J11", report.other_information || "N/A");
  setCellAddress(worksheet, "AB11", report.is_code);
  setCellAddress(worksheet, "J12", report.batch_heat_number);
  setCellAddress(worksheet, "AB12", formatDatePlain(report.date_of_manufacturing));
  setCellAddress(worksheet, "J13", formatDatePlain(report.date_of_testing_start));
  setCellAddress(worksheet, "AB13", formatDatePlain(report.date_of_testing_completion));
}

function fillReportSheet(
  worksheet: ExcelJS.Worksheet,
  report: FactoryTestReportStored,
  data: FactoryTestReportLetterData,
) {
  fillReportHeader(worksheet, report);

  const tableRows = report.test_rows;
  const extraRows = Math.max(0, tableRows.length - FTR_TEST_SLOT_COUNT);
  if (extraRows > 0) {
    const blankRows = Array.from({ length: extraRows }, () => []);
    worksheet.spliceRows(FTR_SIGNATURE_BLOCK_ROW, 0, ...blankRows);
    for (let i = 0; i < extraRows; i++) {
      copyRowFormat(
        worksheet,
        FTR_TEST_TEMPLATE_ROW,
        FTR_SIGNATURE_BLOCK_ROW + i,
        FTR_COL_COUNT,
      );
    }
  }

  const signatureOffset = extraRows;
  const lastTableRow = FTR_TEST_START_ROW + tableRows.length - 1;
  for (let rowNum = FTR_TEST_START_ROW; rowNum <= lastTableRow; rowNum++) {
    clearRowValues(worksheet, rowNum);
  }

  let excelRow = FTR_TEST_START_ROW;
  let testSr = 0;

  for (const row of tableRows) {
    ensureRowFormat(worksheet, excelRow, row.row_type);

    if (row.row_type === "section") {
      setCellAddress(worksheet, `A${excelRow}`, row.section_code || "A");
      setCellAddress(worksheet, `C${excelRow}`, row.section_title);
      excelRow += 1;
      continue;
    }

    testSr += 1;
    const sr = row.sr_no.trim() || String(testSr);
    setCellAddress(worksheet, `A${excelRow}`, sr);
    setCellAddress(worksheet, `C${excelRow}`, row.test_name);
    setCellAddress(worksheet, `J${excelRow}`, row.unit);
    setCellAddress(worksheet, `M${excelRow}`, row.clause_no);
    setCellAddress(worksheet, `P${excelRow}`, row.is_reference);
    setCellAddress(worksheet, `S${excelRow}`, row.specified_requirements);
    setCellAddress(
      worksheet,
      `AC${excelRow}`,
      formatFtrObservedForDisplay(row.observed_value, row.observed_decimals),
    );
    setCellAddress(worksheet, `AH${excelRow}`, normalizeFtrRemark(row.remark));
    excelRow += 1;
  }

  const witnessedRow = 26 + signatureOffset;
  const testedRow = 26 + signatureOffset;
  const companyRow = 28 + signatureOffset;

  const witnessed = witnessedSignatureText(data);
  if (witnessed) setCellAddress(worksheet, `A${witnessedRow}`, witnessed);

  const tested = testedSignatureText(data);
  if (tested) setCellAddress(worksheet, `U${testedRow}`, tested);

  const company = data.companyName.trim();
  if (company) setCellAddress(worksheet, `U${companyRow}`, company);
}

function buildReportSheetAoa(
  report: FactoryTestReportStored,
  data: FactoryTestReportLetterData,
): (string | number)[][] {
  const rows: (string | number)[][] = [];
  rows.push(["Factory Test Report"]);
  rows.push([]);
  rows.push([
    "Application No.",
    ":-",
    report.application_number,
    "Date of Application",
    ":-",
    formatDatePlain(report.date_of_application),
    "Date of Inspection",
    ":-",
    formatDatePlain(report.date_of_inspection),
  ]);
  rows.push(["Applicant Name", ":-", report.applicant_name]);
  rows.push(["Applicant Address", ":-", report.applicant_address]);
  rows.push([
    "Specification",
    ":-",
    productTitleAsPerIsCode(report.product_title, report.is_code),
  ]);
  rows.push(["Sample Description", ":-", report.grade_type]);
  rows.push(["Declared Values, if any", ":-", report.declared_values]);
  rows.push([
    "Batch / Heat Number",
    ":-",
    report.batch_heat_number,
    "",
    "Date of Manufacturing",
    ":-",
    formatDatePlain(report.date_of_manufacturing),
  ]);
  rows.push([
    "Date of Testing Start",
    ":-",
    formatDatePlain(report.date_of_testing_start),
    "",
    "Date of Testing Completion",
    ":-",
    formatDatePlain(report.date_of_testing_completion),
  ]);
  rows.push([]);
  rows.push([
    "Sr. No.",
    "Test Name",
    "Clause No.",
    "IS Reference",
    "Unit",
    "Specified Requirements",
    "Observed Value",
    "Remark",
  ]);

  let testSr = 0;
  for (const row of report.test_rows) {
    if (row.row_type === "section") {
      rows.push([row.section_code, row.section_title]);
      continue;
    }
    testSr += 1;
    rows.push([
      row.sr_no.trim() || String(testSr),
      row.test_name,
      row.clause_no,
      row.is_reference,
      row.unit,
      row.specified_requirements,
      formatFtrObservedForDisplay(row.observed_value, row.observed_decimals),
      normalizeFtrRemark(row.remark),
    ]);
  }

  rows.push([]);
  rows.push([
    "Witnessed By",
    witnessedSignatureText(data),
    "",
    "",
    "Tested By",
    testedSignatureText(data),
    "",
    data.companyName.trim(),
  ]);
  return rows;
}

async function loadTemplateWorkbook(): Promise<ExcelJS.Workbook | null> {
  try {
    const res = await fetch("/templates/factory-test-report-template.xlsx");
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return loadWorkbookFromArrayBuffer(buf);
  } catch {
    return null;
  }
}

function reportsWithContent(
  data: FactoryTestReportLetterData,
): FactoryTestReportStored[] {
  return data.reports.filter(
    (r) => r.sample_label.trim() || r.product_title.trim() || r.test_rows.length > 0,
  );
}

async function buildFactoryTestReportWorkbook(
  data: FactoryTestReportLetterData,
): Promise<ExcelJS.Workbook | null> {
  const reports = reportsWithContent(data);
  if (reports.length === 0) return null;

  const templateWb = await loadTemplateWorkbook();
  const wb = new ExcelJS.Workbook();

  if (templateWb && templateWb.worksheets.length > 0) {
    const templateSheet =
      templateWb.getWorksheet("FTR 1") ?? templateWb.worksheets[0];

    reports.forEach((report, index) => {
      const sheetName = `FTR ${index + 1}`.slice(0, 31);
      const worksheet = cloneWorksheet(wb, templateSheet, sheetName);
      fillReportSheet(worksheet, report, data);
    });
  } else {
    reports.forEach((report, index) => {
      const sheetName = `FTR ${index + 1}`.slice(0, 31);
      addSheetFromAoa(wb, sheetName, buildReportSheetAoa(report, data));
    });
  }

  return wb;
}

export async function downloadFactoryTestReportExcel(
  data: FactoryTestReportLetterData,
  companyName: string,
): Promise<void> {
  const wb = await buildFactoryTestReportWorkbook(data);
  if (!wb) {
    window.alert("No factory test reports to export.");
    return;
  }

  const coPart = safeFilePart(companyName || "Company");
  await downloadWorkbook(wb, `Factory_Test_Report_${coPart}.xlsx`);
}

export async function downloadFactoryTestReportExcelSync(
  data: FactoryTestReportLetterData,
  companyName: string,
): Promise<void> {
  await downloadFactoryTestReportExcel(data, companyName);
}

const DOCX_FONT = DOCX_LETTERHEAD_FONT;
const DOCX_TITLE_SIZE = 28;
const DOCX_META_SIZE = 20;
const DOCX_TABLE_HEAD_SIZE = 18;
const DOCX_TABLE_BODY_SIZE = 18;
const DOCX_MUTED_SIZE = 16;

const THIN_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "94A3B8",
} as const;

const TABLE_CELL_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
};

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
} as const;

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

const NO_TABLE_BORDERS = {
  ...NO_BORDERS,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

function docxRun(text: string, bold = false, size = DOCX_TABLE_BODY_SIZE): TextRun {
  return new TextRun({ text, font: DOCX_FONT, size, bold });
}

function mutedDocxRun(text: string): TextRun {
  return new TextRun({
    text,
    font: DOCX_FONT,
    size: DOCX_MUTED_SIZE,
    color: "64748B",
  });
}

function docxValue(raw: string): string {
  return (raw ?? "").trim() || "—";
}

function docxDate(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "—";
  return formatDisplayDate(v, v);
}

function metaCell(
  width: number,
  children: Paragraph[],
  columnSpan?: number,
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: NO_BORDERS,
    columnSpan,
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}

function metaParagraph(
  runs: TextRun[],
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
): Paragraph {
  return new Paragraph({ alignment, spacing: { after: 20 }, children: runs });
}

/** Nine-column grid tuned so Application/Date triple row stays on one line. */
function metaColumnWidths(totalWidth: number): number[] {
  const pct = [0.18, 0.025, 0.17, 0.16, 0.02, 0.09, 0.155, 0.02, 0.18];
  const widths = pct.map((p) => Math.max(200, Math.round(p * totalWidth)));
  const sum = widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] = Math.max(200, widths[widths.length - 1]! + (totalWidth - sum));
  return widths;
}

function metaPairRow(
  widths: number[],
  label1: string,
  value1: string,
  label2: string,
  value2: string,
  boldValue1 = false,
): TableRow {
  // Mirror HTML: lbl | :- | val | lbl(colspan 3) | :- | val(colspan 2)
  return new TableRow({
    children: [
      metaCell(widths[0]!, [metaParagraph([docxRun(label1, true, DOCX_META_SIZE)])]),
      metaCell(widths[1]!, [metaParagraph([docxRun(":-", false, DOCX_META_SIZE)])]),
      metaCell(widths[2]!, [
        metaParagraph([docxRun(docxValue(value1), boldValue1, DOCX_META_SIZE)]),
      ]),
      metaCell(
        widths[3]! + widths[4]! + widths[5]!,
        [metaParagraph([docxRun(label2, true, DOCX_META_SIZE)])],
        3,
      ),
      metaCell(widths[6]!, [metaParagraph([docxRun(":-", false, DOCX_META_SIZE)])]),
      metaCell(
        widths[7]! + widths[8]!,
        [metaParagraph([docxRun(docxValue(value2), false, DOCX_META_SIZE)])],
        2,
      ),
    ],
  });
}

function metaTripleRow(
  widths: number[],
  label1: string,
  value1: string,
  label2: string,
  value2: string,
  label3: string,
  value3: string,
): TableRow {
  return new TableRow({
    children: [
      metaCell(widths[0]!, [metaParagraph([docxRun(label1, true, DOCX_META_SIZE)])]),
      metaCell(widths[1]!, [metaParagraph([docxRun(":-", false, DOCX_META_SIZE)])]),
      metaCell(widths[2]!, [metaParagraph([docxRun(docxValue(value1), false, DOCX_META_SIZE)])]),
      metaCell(widths[3]!, [metaParagraph([docxRun(label2, true, DOCX_META_SIZE)])]),
      metaCell(widths[4]!, [metaParagraph([docxRun(":-", false, DOCX_META_SIZE)])]),
      metaCell(widths[5]!, [metaParagraph([docxRun(docxValue(value2), false, DOCX_META_SIZE)])]),
      metaCell(widths[6]!, [metaParagraph([docxRun(label3, true, DOCX_META_SIZE)])]),
      metaCell(widths[7]!, [metaParagraph([docxRun(":-", false, DOCX_META_SIZE)])]),
      metaCell(widths[8]!, [metaParagraph([docxRun(docxValue(value3), false, DOCX_META_SIZE)])]),
    ],
  });
}

function metaFullRow(
  widths: number[],
  label: string,
  value: string,
  boldValue = false,
): TableRow {
  const rest = widths.slice(2).reduce((a, b) => a + b, 0);
  return new TableRow({
    children: [
      metaCell(widths[0]!, [metaParagraph([docxRun(label, true, DOCX_META_SIZE)])]),
      metaCell(widths[1]!, [metaParagraph([docxRun(":-", false, DOCX_META_SIZE)])]),
      metaCell(
        rest,
        [metaParagraph([docxRun(docxValue(value), boldValue, DOCX_META_SIZE)])],
        7,
      ),
    ],
  });
}

function productTitleAsPerIsCode(productTitle: string, isCode: string): string {
  const title = (productTitle ?? "").trim();
  const code = (isCode ?? "").trim();
  if (title && code) return `${title} as per ${code}`;
  if (title) return title;
  if (code) return `as per ${code}`;
  return "";
}

function buildMetaTableDocx(report: FactoryTestReportStored, totalWidth: number): Table {
  const widths = metaColumnWidths(totalWidth);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    borders: NO_TABLE_BORDERS,
    rows: [
      metaTripleRow(
        widths,
        "Application No.",
        report.application_number,
        "Date of Application",
        docxDate(report.date_of_application),
        "Date of Inspection",
        docxDate(report.date_of_inspection),
      ),
      metaFullRow(widths, "Applicant Name", report.applicant_name, true),
      metaFullRow(widths, "Applicant Address", report.applicant_address),
      metaFullRow(
        widths,
        "Specification",
        productTitleAsPerIsCode(report.product_title, report.is_code),
      ),
      metaFullRow(widths, "Sample Description", report.grade_type),
      metaFullRow(widths, "Declared Values, if any", report.declared_values),
      metaPairRow(
        widths,
        "Batch / Heat Number",
        report.batch_heat_number,
        "Date of Manufacturing",
        docxDate(report.date_of_manufacturing),
      ),
      metaPairRow(
        widths,
        "Date of Testing Start",
        docxDate(report.date_of_testing_start),
        "Date of Testing Completion",
        docxDate(report.date_of_testing_completion),
      ),
    ],
  });
}

function testHeaderCell(width: number, primary: string, secondary: string): TableCell {
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [docxRun(primary, true, DOCX_TABLE_HEAD_SIZE)],
    }),
  ];
  if (secondary) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [docxRun(secondary, true, DOCX_TABLE_HEAD_SIZE)],
      }),
    );
  }
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: TABLE_CELL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, fill: "E2E8F0" },
    children,
  });
}

function stackedTestCell(
  width: number,
  primary: string,
  secondary: string,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
  boldPrimary = false,
): TableCell {
  const children = [
    new Paragraph({
      alignment,
      spacing: { after: 0 },
      children: [docxRun(docxValue(primary), boldPrimary, DOCX_TABLE_BODY_SIZE)],
    }),
  ];
  const sub = (secondary ?? "").trim();
  if (sub) {
    children.push(
      new Paragraph({
        alignment,
        spacing: { after: 0 },
        children: [mutedDocxRun(sub)],
      }),
    );
  }
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: TABLE_CELL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children,
  });
}

function buildTestTableDocx(rows: FtrTestRowStored[], totalWidth: number): Table {
  // Merged: Test Name + Clause No + IS Reference | Unit | Spec | Observed | Remark
  const pct = [0.28, 0.08, 0.32, 0.16, 0.16];
  const widths = pct.map((p) => Math.max(400, Math.round(p * totalWidth)));
  const sum = widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] = Math.max(400, widths[widths.length - 1]! + (totalWidth - sum));

  const header = new TableRow({
    tableHeader: true,
    children: [
      testHeaderCell(widths[0]!, "Test Name", "Clause No · IS Reference"),
      testHeaderCell(widths[1]!, "Unit", ""),
      testHeaderCell(widths[2]!, "Specified Requirements", ""),
      testHeaderCell(widths[3]!, "Observed Value", ""),
      testHeaderCell(widths[4]!, "Remark", ""),
    ],
  });

  const bodyRows = rows.map((row) => {
    const meta = [row.clause_no, row.is_reference]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(" · ");
    return new TableRow({
      children: [
        stackedTestCell(widths[0]!, row.test_name, meta, AlignmentType.LEFT),
        stackedTestCell(widths[1]!, row.unit, "", AlignmentType.CENTER),
        stackedTestCell(
          widths[2]!,
          row.specified_requirements,
          "",
          AlignmentType.CENTER,
        ),
        stackedTestCell(
          widths[3]!,
          formatFtrObservedForDisplay(row.observed_value, row.observed_decimals),
          "",
          AlignmentType.CENTER,
          true,
        ),
        stackedTestCell(
          widths[4]!,
          normalizeFtrRemark(row.remark),
          "",
          AlignmentType.CENTER,
        ),
      ],
    });
  });

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [header, ...bodyRows],
  });
}

function signatureCellParagraphs(
  title: string,
  name: string,
  designation: string,
  organisation: string,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      alignment,
      spacing: { after: 0 },
      children: [docxRun(title, true, DOCX_META_SIZE)],
    }),
    new Paragraph({
      alignment,
      spacing: { before: 480, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" } },
      children: [],
    }),
    new Paragraph({
      alignment,
      spacing: { after: 0 },
      children: [docxRun(docxValue(name), true, DOCX_META_SIZE)],
    }),
  ];
  if (designation.trim()) {
    out.push(
      new Paragraph({
        alignment,
        spacing: { after: 0 },
        children: [mutedDocxRun(designation.trim())],
      }),
    );
  }
  out.push(
    new Paragraph({
      alignment,
      spacing: { before: 40, after: 0 },
      children: [docxRun(docxValue(organisation), true, DOCX_MUTED_SIZE)],
    }),
  );
  return out;
}

function buildSignatureTableDocx(
  data: FactoryTestReportLetterData,
  settings: FactoryTestReportPrintSettings,
  totalWidth: number,
): Table | null {
  if (!settings.show_witnessed_by && !settings.show_tested_by) return null;

  const half = Math.round(totalWidth / 2);
  const left = settings.show_witnessed_by
    ? signatureCellParagraphs(
        "Witnessed By",
        data.inspectionOfficerName,
        data.inspectionOfficerDesignation,
        "Bureau of Indian Standards",
        AlignmentType.LEFT,
      )
    : [new Paragraph({ children: [] })];
  const right = settings.show_tested_by
    ? signatureCellParagraphs(
        "Tested By",
        data.qualityControlInchargeName,
        data.qualityControlInchargeDesignation,
        data.companyName,
        AlignmentType.RIGHT,
      )
    : [new Paragraph({ children: [] })];

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: [half, totalWidth - half],
    borders: NO_TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: half, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: left,
          }),
          new TableCell({
            width: { size: totalWidth - half, type: WidthType.DXA },
            borders: NO_BORDERS,
            children: right,
          }),
        ],
      }),
    ],
  });
}

async function buildSingleReportDocxBlocks(
  report: FactoryTestReportStored,
  reportIndex: number,
  data: FactoryTestReportLetterData,
  settings: FactoryTestReportPrintSettings,
  assets: FactoryTestReportPrintAssets | undefined,
  totalWidth: number,
): Promise<(Paragraph | Table)[]> {
  const company = buildFactoryTestReportCompany(data, assets);
  const blocks: (Paragraph | Table)[] = [];

  if (reportIndex > 0) {
    blocks.push(new Paragraph({ spacing: { after: 0 }, children: [new PageBreak()] }));
  }

  blocks.push(...(await buildNoLogoLetterheadBlocks(company, settings)));
  blocks.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [docxRun("Factory Test Report", true, DOCX_TITLE_SIZE)],
    }),
    buildMetaTableDocx(report, totalWidth),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  );

  const testRows = sortFtrTestRowsByClause(report.test_rows);
  if (testRows.length > 0) {
    blocks.push(buildTestTableDocx(testRows, totalWidth));
  } else {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [docxRun("No test parameters added for this sample.", false, DOCX_META_SIZE)],
      }),
    );
  }

  const signatures = buildSignatureTableDocx(data, settings, totalWidth);
  if (signatures) {
    blocks.push(new Paragraph({ spacing: { after: 200 }, children: [] }), signatures);
  }

  blocks.push(...(await buildLetterheadLowerParagraphs(settings, assets)));
  return blocks;
}

async function buildFactoryTestReportDocx(
  data: FactoryTestReportLetterData,
  settings: FactoryTestReportPrintSettings,
  assets?: FactoryTestReportPrintAssets,
): Promise<Document | null> {
  const reports = reportsWithContent(data);
  if (reports.length === 0) return null;

  const letterheadSettings = factoryTestReportLetterheadSettings(settings);
  const totalWidth = contentWidthTwip(letterheadSettings);

  const children: (Paragraph | Table)[] = [];
  for (let i = 0; i < reports.length; i++) {
    children.push(
      ...(await buildSingleReportDocxBlocks(
        reports[i]!,
        i,
        data,
        letterheadSettings,
        assets,
        totalWidth,
      )),
    );
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: pageSizeTwipFromSettings(letterheadSettings),
            margin: pageMarginsFromSettings(letterheadSettings),
          },
        },
        children,
      },
    ],
  });
}

export async function downloadFactoryTestReportWord(
  data: FactoryTestReportLetterData,
  settings: FactoryTestReportPrintSettings,
  assets?: FactoryTestReportPrintAssets,
): Promise<void> {
  const doc = await buildFactoryTestReportDocx(data, settings, assets);
  if (!doc) {
    window.alert("No factory test reports to export.");
    return;
  }

  const blob = await Packer.toBlob(doc);
  const coPart = safeFilePart(data.companyName || "Company");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Factory_Test_Report_${coPart}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
