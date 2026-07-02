import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { LocationMapLetterData } from "@/lib/print/location-map";
import { parseCoordinate } from "@/lib/location-map";
import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 22;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: LocationMapLetterData): string {
  return safeFilePart(`Location_Map_${data.companyName || "Applicant"}`);
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

function plainParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [bodyRun(text)],
  });
}

function formatCoordDisplay(raw: string): string {
  const value = parseCoordinate(raw);
  return value === null ? "—" : String(value);
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

async function buildLocationMapDocx(data: LocationMapLetterData): Promise<Document> {
  const doc = data.document;
  const sigName = data.firmRepName || data.contactPerson || "—";
  const sigDesig = data.firmRepDesignation || "—";
  const bisBranch = [data.bisBranchName, data.bisBranchState].filter((p) => p.trim()).join(", ");

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [bodyRun("Location Map", true)],
    }),
    plainParagraph(`Date: ${formatMetaDate(data.dateOfApplication)}`),
    plainParagraph(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
    plainParagraph(
      `To\nThe Director & Head\nBureau of Indian Standards\n${bisBranch || "—"}, INDIA`,
    ),
    plainParagraph("Respected / Sir,"),
    plainParagraph(
      "We hereby submit the location map indicating the route from our manufacturing unit to the Bureau of Indian Standards branch office. The geographical coordinates and route map are furnished below for your kind reference in connection with our BIS licence application.",
    ),
    plainParagraph(`From Location Name: ${doc.from_location_name || "—"}`),
    plainParagraph(
      `From Coordinates: ${formatCoordDisplay(doc.from_latitude)}, ${formatCoordDisplay(doc.from_longitude)}`,
    ),
    plainParagraph(`To Location Name: ${doc.to_location_name || "—"}`),
    plainParagraph(
      `To Coordinates: ${formatCoordDisplay(doc.to_latitude)}, ${formatCoordDisplay(doc.to_longitude)}`,
    ),
  ];

  if (data.directionsUrl) {
    children.push(plainParagraph(`Google Maps Route: ${data.directionsUrl}`));
  }

  children.push(
    plainParagraph(
      "We hereby declare that all information furnished above is true and correct to the best of our knowledge and belief.",
    ),
  );

  children.push(
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
      children: [bodyRun(`Name: ${sigName}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun(`Designation: ${sigDesig}`)],
    }),
  );

  return new Document({ sections: [{ properties: {}, children }] });
}

export async function downloadLocationMapWord(
  data: LocationMapLetterData,
  _settings: PrintSettings,
): Promise<void> {
  const docx = await buildLocationMapDocx(data);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}
