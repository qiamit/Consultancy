import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { buildWorkbookBuffer } from "@backend/shared/spreadsheet/excel";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import {
  resolveUndertakingGeneralIssPoints,
  type UndertakingGeneralIssLetterData,
} from "@backend/modules/print/undertaking-general-iss";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: UndertakingGeneralIssLetterData): string {
  return safeFilePart(`Undertaking_General_ISS_${data.companyName || "Application"}`);
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

async function buildUndertakingGeneralIssDocx(
  data: UndertakingGeneralIssLetterData,
): Promise<Document> {
  const bisBranch = [data.bisBranchName, data.bisBranchState, data.bisBranchCountry]
    .filter((p) => p.trim())
    .join(", ") || "—";
  const points = resolveUndertakingGeneralIssPoints(data);

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Undertaking for General & ISS", true)],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        bodyRun("To\nThe Director & Head\nBureau of Indian Standard\n"),
        bodyRun(bisBranch),
        bodyRun("\t\t\t\tDate: "),
        bodyRun(formatMetaDate(data.dateOfApplication), true),
        bodyRun("\n\t\t\t\tApplication No.: "),
        bodyRun(formatApplicationNo(data.applicationNumber), true),
      ],
    }),
    plainParagraph("We hereby undertake that:"),
    ...points.map((text, i) => plainParagraph(`${i + 1}. ${text}`)),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 360, after: 0 },
      children: [bodyRun(`For ${data.companyName || "—"}`, true)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 320, after: 0 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
      },
      children: [
        bodyRun(
          `Name: ${data.document.signatory_name || data.contactPerson || "—"}`,
        ),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [
        bodyRun(`Designation: ${data.document.signatory_designation || "—"}`),
      ],
    }),
  ];

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadUndertakingGeneralIssWord(
  data: UndertakingGeneralIssLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const doc = await buildUndertakingGeneralIssDocx(data);
  const buffer = await Packer.toBlob(doc);
  triggerBlobDownload(buffer, `${exportFilenameBase(data)}.docx`);
}

export async function downloadUndertakingGeneralIssExcel(
  data: UndertakingGeneralIssLetterData,
): Promise<void> {
  const bisBranch = [data.bisBranchName, data.bisBranchState, data.bisBranchCountry]
    .filter((p) => p.trim())
    .join(", ") || "—";
  const points = resolveUndertakingGeneralIssPoints(data);

  const rows: (string | number)[][] = [
    ["Undertaking for General & ISS"],
    [],
    ["Date", formatMetaDate(data.dateOfApplication)],
    ["Application No.", formatApplicationNo(data.applicationNumber)],
    [],
    ["To", `The Director & Head, Bureau of Indian Standard, ${bisBranch}`],
    [],
    ["We hereby undertake that:", ""],
    ...points.map((text, i) => [`${i + 1}.`, text]),
    [],
    ["", "For " + (data.companyName || "—")],
    ["Name", data.document.signatory_name || data.contactPerson || "—"],
    ["Designation", data.document.signatory_designation || "—"],
  ];

  const buffer = await buildWorkbookBuffer([
    {
      name: "Undertaking General ISS",
      rows,
      cols: [{ wch: 8 }, { wch: 100 }],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}
