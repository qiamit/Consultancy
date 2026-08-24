import ExcelJS from "exceljs";
import type { FactoryTestReportStored, FtrTestRowStored } from "@backend/modules/bis/factory-test-report";
import { normalizeFtrRemark } from "@backend/modules/bis/factory-test-report";
import type { FactoryTestReportLetterData } from "@backend/modules/print/factory-test-report";
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
  rows.push(["Applicant Name", ":-", report.applicant_name]);
  rows.push(["Applicant Address", ":-", report.applicant_address]);
  rows.push([
    "Application No.",
    ":-",
    report.application_number,
    "",
    "Date of Application",
    ":-",
    formatDatePlain(report.date_of_application),
  ]);
  rows.push([
    "Licence No.",
    ":-",
    report.licence_number,
    "",
    "Date of Inspection",
    ":-",
    formatDatePlain(report.date_of_inspection),
  ]);
  rows.push(["Product Title", ":-", report.product_title]);
  rows.push(["Sample Description", ":-", report.grade_type]);
  rows.push(["Declared Values, if any", ":-", report.declared_values]);
  rows.push([
    "Any Other Information",
    ":-",
    report.other_information || "N/A",
    "",
    "IS Code",
    ":-",
    report.is_code,
  ]);
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
    "Unit",
    "Clause No.",
    "IS Reference",
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
      row.unit,
      row.clause_no,
      row.is_reference,
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

async function buildFactoryTestReportWorkbook(
  data: FactoryTestReportLetterData,
): Promise<ExcelJS.Workbook | null> {
  const reports = data.reports.filter(
    (r) => r.sample_label.trim() || r.product_title.trim() || r.test_rows.length > 0,
  );
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
