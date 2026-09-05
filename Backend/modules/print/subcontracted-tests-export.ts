import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  buildSubcontractedTestsCompany,
  subcontractedTestsLetterheadSettings,
  type SubcontractedTestsLetterData,
  type SubcontractedTestsPrintAssets,
} from "@backend/modules/print/subcontracted-tests";
import { rowHasContent } from "@backend/modules/bis/subcontracted-tests";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  pageMarginsFromSettings,
  pageSizeTwipFromSettings,
} from "@backend/modules/print/docx-letterhead";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: SubcontractedTestsLetterData): string {
  const coPart = safeFilePart(data.companyName || "Company");
  const isPart = safeFilePart(data.isNumber || "IS");
  return `Subcontracted_Tests_${coPart}_${isPart}`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bodyRun(text: string, bold = false): TextRun {
  return new TextRun({ text, font: DOCX_FONT, size: DOCX_BODY_SIZE, bold });
}

function plainParagraph(
  text: string,
  bold = false,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED,
): Paragraph {
  return new Paragraph({
    alignment,
    spacing: { after: 200, line: 360 },
    children: [bodyRun(text, bold)],
  });
}

function isStandardRef(data: SubcontractedTestsLetterData): string {
  const num = (data.isNumber ?? "").trim();
  const title = (data.isTitle ?? "").trim();
  if (num && title) return `${num} — ${title}`;
  if (num) return num;
  if (title) return title;
  return "";
}

function bisBranchLine(data: SubcontractedTestsLetterData): string {
  return [
    data.bisBranchName.trim() || "________________",
    data.bisBranchState.trim() || "________________",
    data.bisBranchCountry.trim() || "India",
  ].join(", ");
}

function formatLetterDate(dateStr: string | Date | null | undefined): string {
  return formatDisplayDate(dateStr, "_______________________");
}

function formatApplicationNo(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function buildTestsTable(data: SubcontractedTestsLetterData): Table {
  const visible = data.rows.filter(rowHasContent);
  const headers = ["Sr", "Test Parameter", "Clause", "Test Method", "Unit", "Subcontract Laboratory"];
  const widths = [6, 22, 10, 18, 8, 36];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (label, i) =>
        new TableCell({
          width: { size: widths[i]!, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [bodyRun(label, true)],
            }),
          ],
        }),
    ),
  });

  const bodyRows =
    visible.length > 0
      ? visible.map((r, i) =>
          new TableRow({
            children: [
              String(i + 1),
              r.test_name || "—",
              r.clause_no || "—",
              r.test_method || "—",
              r.unit || "—",
              r.laboratory_name || "—",
            ].map((cell, ci) =>
              new TableCell({
                width: { size: widths[ci]!, type: WidthType.PERCENTAGE },
                children: [
                  plainParagraph(
                    cell,
                    false,
                    ci === 1 ? AlignmentType.LEFT : AlignmentType.CENTER,
                  ),
                ],
              }),
            ),
          }),
        )
      : [
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 6,
                children: [plainParagraph("No subcontracted test parameters entered yet.", false, AlignmentType.CENTER)],
              }),
            ],
          }),
        ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

async function buildSubcontractedTestsDocx(
  data: SubcontractedTestsLetterData,
  settings: PrintSettings,
  assets?: SubcontractedTestsPrintAssets,
): Promise<Document> {
  const letterheadSettings = subcontractedTestsLetterheadSettings(settings);
  const company = buildSubcontractedTestsCompany(data, assets);
  const isRef = isStandardRef(data);
  const bisBranch = bisBranchLine(data);
  const letterDate = formatLetterDate(data.inspectionDate);
  const applicationNo = formatApplicationNo(data.applicationNumber);
  const sigName =
    data.document.signatory_name.trim() || data.contactPerson.trim() || "—";
  const sigDesig = data.document.signatory_designation.trim() || "—";

  const children: (Paragraph | Table)[] = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [bodyRun("Declaration Regarding Test Parameters Subcontracted", true)],
    }),
    plainParagraph(
      `To\nThe Director & Head\nBureau of Indian Standards\n${bisBranch}`,
      false,
      AlignmentType.LEFT,
    ),
    plainParagraph(`Date: ${letterDate}`, false, AlignmentType.RIGHT),
    plainParagraph(`Application No.: ${applicationNo}`, false, AlignmentType.RIGHT),
    plainParagraph(
      `Sub: Declaration regarding test parameters subcontracted to accredited laboratories${isRef ? ` for Indian Standard ${isRef}` : ""}.`,
    ),
    plainParagraph(
      `We, M/s. ${data.companyName}${data.address ? `, having our factory at ${data.address},` : ""} hereby declare that the following test parameters required for BIS certification${isRef ? ` under ${isRef}` : ""} are not available in our in-house testing facility and are being carried out through BIS Recognized / ISO/IEC 17025 accredited laboratories:`,
    ),
    buildTestsTable(data),
    plainParagraph(
      "We further declare that the above particulars are true and correct to the best of our knowledge and belief. We undertake to maintain proper records of subcontracted testing and to inform BIS of any change in the list of subcontracted test parameters or laboratories.",
    ),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360, after: 0 },
      children: [bodyRun(`For ${data.companyName}`, true)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 320, after: 0 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
      },
      children: [bodyRun(`Name: ${sigName}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun(`Designation: ${sigDesig}`)],
    }),
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

export async function downloadSubcontractedTestsWord(
  data: SubcontractedTestsLetterData,
  settings: PrintSettings,
  assets?: SubcontractedTestsPrintAssets,
): Promise<void> {
  const doc = await buildSubcontractedTestsDocx(data, settings, assets);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}
