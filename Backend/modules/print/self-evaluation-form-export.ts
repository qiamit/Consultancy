import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { buildWorkbookBuffer } from "@backend/shared/spreadsheet/excel";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import {
  buildSelfEvaluationFormCompany,
  selfEvaluationFormLetterheadSettings,
  type SelfEvaluationFormLetterData,
  type SelfEvaluationFormPrintAssets,
} from "@backend/modules/print/self-evaluation-form";
import {
  SEF_BRAND_DECLARATION_POINTS,
  SEF_FINAL_DECLARATION,
} from "@backend/modules/bis/self-evaluation-form";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  pageMarginsFromSettings,
  pageSizeTwipFromSettings,
} from "@backend/modules/print/docx-letterhead";
import { formatDisplayDate } from "@backend/shared/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 20;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: SelfEvaluationFormLetterData): string {
  return safeFilePart(`Self_Evaluation_Form_${data.companyName || "Application"}`);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatMetaDate(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "N/A";
  return formatDisplayDate(v, "N/A");
}

function formatApplicationNo(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function bodyRun(text: string, bold = false): TextRun {
  return new TextRun({ text, font: DOCX_FONT, size: DOCX_BODY_SIZE, bold });
}

function plainParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [bodyRun(text)],
  });
}

async function buildSelfEvaluationFormDocx(
  data: SelfEvaluationFormLetterData,
  settings: PrintSettings,
  assets?: SelfEvaluationFormPrintAssets,
): Promise<Document> {
  const letterheadSettings = selfEvaluationFormLetterheadSettings(settings);
  const company = buildSelfEvaluationFormCompany(data, assets);
  const doc = data.document;
  const children: Paragraph[] = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [bodyRun("Self Evaluation cum Verification Form", true)],
    }),
    plainParagraph(`Applicant Name: ${data.companyName || "—"}`),
    plainParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(`Date of Application: ${formatMetaDate(data.dateOfApplication)}`),
    plainParagraph(`IS Code: ${data.isNumber || "—"}`),
    plainParagraph(`Date of Inspection: ${formatMetaDate(data.dateOfInspection)}`),
    plainParagraph("1. General Information"),
    plainParagraph(`a. Applicant Name: ${data.companyName || "—"}`),
    plainParagraph(`b. Plant Layout: ${doc.plant_layout || "Enclosed"}`),
    plainParagraph("2. Raw Material Details"),
    ...data.rawMaterialRows
      .filter(
        (row) =>
          row.raw_material ||
          row.supplier_name ||
          row.bis_certification_mark ||
          row.test_certificate ||
          row.batches_packaging,
      )
      .map((row, i) =>
        plainParagraph(
          `${i + 1}. ${row.raw_material || "—"} | ${row.supplier_name || "—"} | ${row.bis_certification_mark || "—"} | ${row.test_certificate || "—"} | ${row.batches_packaging || "—"}`,
        ),
      ),
    plainParagraph("3. Packaging & Marking"),
    ...data.packagingMarkingRows.map((row, i) =>
      plainParagraph(`${i + 1}. ${row.label}: ${row.value}`),
    ),
    plainParagraph("4. Details of Quality Control Staff"),
    ...data.qcStaffRows
      .filter(
        (row) =>
          row.person_name || row.designation || row.qualification || row.experience,
      )
      .map((row, i) =>
        plainParagraph(
          `${i + 1}. ${row.person_name || "—"} | ${row.designation || "—"} | ${row.qualification || "—"} | ${row.experience || "—"}`,
        ),
      ),
    plainParagraph("5. Brand Name"),
    ...data.brandRows
      .filter(
        (row) =>
          row.brand_name ||
          row.owned_by ||
          row.registered_status ||
          row.registration_date,
      )
      .map((row, i) =>
        plainParagraph(
          `${i + 1}. ${row.brand_name || "—"} | ${row.owned_by || "—"} | ${row.registered_status || "—"} | ${row.registration_date || "—"}`,
        ),
      ),
    ...SEF_BRAND_DECLARATION_POINTS.map((text, i) =>
      plainParagraph(
        `${String.fromCharCode(66 + i)}. ${text}${i === 0 && data.brandsWithoutMarkReasons ? ` ${data.brandsWithoutMarkReasons}` : ""}`,
      ),
    ),
    plainParagraph(`Declaration: ${SEF_FINAL_DECLARATION}`),
    plainParagraph(`Place: ${doc.sign_place || "—"}`),
    plainParagraph(`Date: ${doc.sign_date || "—"}`),
    plainParagraph(`Name: ${doc.signatory_name || "—"}`),
    plainParagraph(`Designation: ${doc.signatory_designation || "—"}`),
    ...(await buildLetterheadLowerParagraphs(letterheadSettings, assets)),
  ];

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

export async function downloadSelfEvaluationFormWord(
  data: SelfEvaluationFormLetterData,
  settings: PrintSettings,
  assets?: SelfEvaluationFormPrintAssets,
): Promise<void> {
  const docx = await buildSelfEvaluationFormDocx(data, settings, assets);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadSelfEvaluationFormExcel(
  data: SelfEvaluationFormLetterData,
): Promise<void> {
  const doc = data.document;
  const rows: (string | number)[][] = [
    ["Self Evaluation cum Verification Form"],
    ["Applicant Name", data.companyName || "—"],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["Date of Application", formatMetaDate(data.dateOfApplication)],
    ["IS Code", data.isNumber || "—"],
    ["Date of Inspection", formatMetaDate(data.dateOfInspection)],
    [],
    ["1. General Information"],
    ["a. Applicant Name", data.companyName || "—"],
    ["b. Plant Layout", doc.plant_layout || "Enclosed"],
    [],
    ["2. Raw Material Details"],
    [
      "Sr. No",
      "Raw Material",
      "Name of Supplier",
      "BIS Mark",
      "Test Certificate",
      "Batches / Packaging",
    ],
    ...data.rawMaterialRows.map((row, i) => [
      i + 1,
      row.raw_material,
      row.supplier_name,
      row.bis_certification_mark,
      row.test_certificate,
      row.batches_packaging,
    ]),
    [],
    ["3. Packaging & Marking"],
    ["Sr. No", "Item", "Value"],
    ...data.packagingMarkingRows.map((row, i) => [i + 1, row.label, row.value]),
    [],
    ["4. Quality Control Staff"],
    ["Sr. No", "Name", "Designation", "Qualification", "Experience"],
    ...data.qcStaffRows.map((row, i) => [
      i + 1,
      row.person_name,
      row.designation,
      row.qualification,
      row.experience,
    ]),
    [],
    ["5. Brand Names"],
    ["Sr. No", "Brand Name", "Owned By", "Registered", "Date"],
    ...data.brandRows.map((row, i) => [
      i + 1,
      row.brand_name,
      row.owned_by,
      row.registered_status,
      row.registration_date,
    ]),
    [],
    ["Declaration", SEF_FINAL_DECLARATION],
    ["Place", doc.sign_place],
    ["Date", doc.sign_date],
    ["Name", doc.signatory_name],
    ["Designation", doc.signatory_designation],
  ];

  const buffer = await buildWorkbookBuffer([
    { name: "Self Evaluation Form", rows },
  ]);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.xlsx`);
}
