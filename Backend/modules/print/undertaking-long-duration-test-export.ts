import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { buildWorkbookBuffer } from "@backend/shared/spreadsheet/excel";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import { LONG_DURATION_TEST_ROW_COUNT } from "@backend/modules/bis/undertaking-long-duration-test";
import type { UndertakingLongDurationTestLetterData } from "@backend/modules/print/undertaking-long-duration-test";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: UndertakingLongDurationTestLetterData): string {
  return safeFilePart(`Undertaking_Long_Duration_Test_${data.companyName || "Applicant"}`);
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
    spacing: { after: 120 },
    children: [bodyRun(text)],
  });
}

async function buildUndertakingLongDurationTestDocx(
  data: UndertakingLongDurationTestLetterData,
): Promise<Document> {
  const doc = data.document;
  const declarant = doc.declarant_name || data.contactPerson || data.companyName || "—";
  const product = doc.product_for_mark || "—";
  const standard = doc.is_standard || data.isNumber || "—";
  const factoryAddrRaw = (doc.factory_address || data.address).trim();
  const factoryAddr =
    factoryAddrRaw && /\bindia\b/i.test(factoryAddrRaw)
      ? factoryAddrRaw
      : factoryAddrRaw
        ? `${factoryAddrRaw}, INDIA`
        : "—";

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Undertaking for Long Duration Test", true)],
    }),
    plainParagraph(`Applicant Name: ${data.companyName}`),
    plainParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(`IS Code: ${data.isNumber || "—"}`),
    plainParagraph("Respected / Sir,"),
    plainParagraph(
      `I, ${declarant} have applied for a license under Option 2 to you for use of BIS standard mark on ${product} according to ${standard} being manufactured at our factory at ${factoryAddr}`,
    ),
    plainParagraph(
      "I Understand & Agree that in Event of Failure of the Sample Drawn for the Purpose of Grant of Licence to Use & Apply Standard Mark in the Following Type Tests or My Inability to Submit the Test Report for Following Tests within 30 Days (One Month) of the Date of Completion of the Test(s) as Confirmed by the Laboratory*, The Licence if Granted to Me, shall be Processed for Cancellation:",
    ),
  ];

  for (let i = 0; i < LONG_DURATION_TEST_ROW_COUNT; i += 1) {
    const row = doc.test_rows[i];
    children.push(
      plainParagraph(
        `${i + 1}. Type of Test: ${row?.type_of_test || "—"} | Duration: ${row?.duration_of_test || "—"} | Date of Completion: ${row?.date_of_completion ? formatMetaDate(row.date_of_completion) : "—"}`,
      ),
    );
  }

  children.push(
    plainParagraph(
      "Further, I duly Undertake that I shall Abide by all the Directions Issued by the Bureau in this Regard.",
    ),
    plainParagraph(
      `Place: ${data.city || "—"}\nDate: ${formatMetaDate(data.dateOfInspection)}\nName: ${doc.signatory_name || declarant}\nDesignation: ${doc.signatory_designation || "—"}`,
    ),
  );

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadUndertakingLongDurationTestWord(
  data: UndertakingLongDurationTestLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const docx = await buildUndertakingLongDurationTestDocx(data);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadUndertakingLongDurationTestExcel(
  data: UndertakingLongDurationTestLetterData,
): Promise<void> {
  const doc = data.document;
  const rows: (string | number)[][] = [
    ["Undertaking for Long Duration Test"],
    [],
    ["Applicant Name", data.companyName],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    ["IS Code", data.isNumber || "—"],
    ["Declarant Name", doc.declarant_name || data.contactPerson || "—"],
    ["Product (BIS Mark On)", doc.product_for_mark || "—"],
    ["Indian Standard", doc.is_standard || data.isNumber || "—"],
    ["Factory Address", doc.factory_address || data.address || "—"],
    [],
    ["Sr. No.", "Type of Test", "Duration of Test", "Date of Completion of Test"],
  ];

  for (let i = 0; i < LONG_DURATION_TEST_ROW_COUNT; i += 1) {
    const row = doc.test_rows[i];
    rows.push([
      i + 1,
      row?.type_of_test || "",
      row?.duration_of_test || "",
      row?.date_of_completion ? formatMetaDate(row.date_of_completion) : "",
    ]);
  }

  rows.push(
    [],
    ["Signatory Name", doc.signatory_name || "—"],
    ["Signatory Designation", doc.signatory_designation || "—"],
  );

  const buffer = await buildWorkbookBuffer([
    {
      name: "Long Duration Test",
      rows,
      cols: [{ wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 28 }],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}
