import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { buildWorkbookBuffer } from "@backend/shared/spreadsheet/excel";
import type { UpdatedSchemeOfInspectionLetterData } from "@backend/modules/print/updated-scheme-of-inspection";
import type { PrintSettings } from "@backend/modules/print/types";
import type { SitTestRow } from "@backend/modules/bis/updated-scheme-of-inspection";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 18;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: UpdatedSchemeOfInspectionLetterData): string {
  return safeFilePart(
    `Updated_SIT_${data.isNumber || data.companyName || "Scheme"}`,
  );
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

function plainParagraph(text: string, bold = false): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: [bodyRun(text, bold)],
  });
}

function tableCell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [bodyRun(text, bold)],
      }),
    ],
  });
}

function sitRowToCells(row: SitTestRow): TableRow {
  if (row.row_kind === "section") {
    return new TableRow({
      children: [
        new TableCell({
          columnSpan: 7,
          children: [plainParagraph(row.requirement, true)],
        }),
      ],
    });
  }
  if (row.row_kind === "group") {
    return new TableRow({
      children: [
        tableCell(row.clause_no, true),
        new TableCell({
          columnSpan: 6,
          children: [plainParagraph(row.requirement, true)],
        }),
      ],
    });
  }

  return new TableRow({
    children: [
      tableCell(row.clause_no),
      tableCell(row.requirement),
      tableCell(row.test_methods_ref),
      tableCell(row.equipment_req),
      tableCell(row.sample_count),
      tableCell(row.frequency),
      tableCell(row.remarks),
    ],
  });
}

async function buildUpdatedSitDocx(
  data: UpdatedSchemeOfInspectionLetterData,
): Promise<Document> {
  const doc = data.document;
  const children: (Paragraph | Table)[] = [
    plainParagraph(doc.pm_reference, true),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [bodyRun("ANNEX C", true)],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [bodyRun("Scheme of Inspection and Testing", true)],
    }),
    plainParagraph(doc.laboratory_text),
    plainParagraph(doc.test_records_text),
    plainParagraph(doc.labelling_marking_text),
    plainParagraph(doc.control_unit_text),
    plainParagraph(doc.levels_of_control_text),
    plainParagraph(doc.standard_mark_text),
    plainParagraph(doc.rejections_text),
    plainParagraph("TABLE 1", true),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            tableCell("Cl.", true),
            tableCell("Requirement", true),
            tableCell("Test Methods Ref.", true),
            tableCell("Equip. R/S", true),
            tableCell("No. of Sample", true),
            tableCell("Frequency", true),
            tableCell("Remarks", true),
          ],
        }),
        ...doc.test_rows.map(sitRowToCells),
      ],
    }),
    plainParagraph(doc.note_1),
    plainParagraph(doc.note_2),
    plainParagraph(doc.note_3),
  ];

  return new Document({ sections: [{ children }] });
}

export async function downloadUpdatedSchemeOfInspectionWord(
  data: UpdatedSchemeOfInspectionLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const docx = await buildUpdatedSitDocx(data);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadUpdatedSchemeOfInspectionExcel(
  data: UpdatedSchemeOfInspectionLetterData,
): Promise<void> {
  const doc = data.document;
  const rows: (string | number)[][] = [
    ["Updated Scheme of Inspection & Testing"],
    [doc.pm_reference],
    ["ANNEX C — Scheme of Inspection and Testing"],
    [],
    ["Annex Text"],
    ["Laboratory", doc.laboratory_text],
    ["Test Records", doc.test_records_text],
    ["Labelling & Marking", doc.labelling_marking_text],
    ["Control Unit", doc.control_unit_text],
    ["Levels of Control", doc.levels_of_control_text],
    ["Standard Mark", doc.standard_mark_text],
    ["Rejections", doc.rejections_text],
    [],
    ["TABLE 1"],
    [
      "Cl.",
      "Requirement",
      "Test Methods Ref.",
      "Equip. R/S",
      "No. of Sample",
      "Frequency",
      "Remarks",
    ],
  ];

  for (const row of doc.test_rows) {
    rows.push([
      row.clause_no,
      row.requirement,
      row.test_methods_ref,
      row.equipment_req,
      row.sample_count,
      row.frequency,
      row.remarks,
    ]);
  }

  rows.push([], [doc.note_1], [doc.note_2], [doc.note_3]);

  const buffer = await buildWorkbookBuffer([
    {
      name: "Updated SIT",
      rows,
      cols: [
        { wch: 8 },
        { wch: 34 },
        { wch: 16 },
        { wch: 10 },
        { wch: 14 },
        { wch: 18 },
        { wch: 40 },
      ],
      merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }],
    },
  ]);

  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${exportFilenameBase(data)}.xlsx`,
  );
}
