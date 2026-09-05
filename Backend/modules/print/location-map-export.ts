import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from "docx";
import {
  buildLocationMapCompany,
  locationMapLetterheadSettings,
  type LocationMapLetterData,
  type LocationMapPrintAssets,
} from "@backend/modules/print/location-map";
import { parseCoordinate } from "@backend/modules/bis/location-map";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  contentWidthTwip,
  DOCX_LETTERHEAD_FONT,
  loadImageFromUrl,
  pageMarginsFromSettings,
  twipToPx,
} from "@backend/modules/print/docx-letterhead";
import { captureLocationMapPng } from "@backend/modules/print/location-map-snapshot";

const DOCX_FONT = DOCX_LETTERHEAD_FONT;
const DOCX_BODY_SIZE = 20;
const MAP_HEIGHT_MM = 125;

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

function bodyRun(text: string, bold = false, size = DOCX_BODY_SIZE): TextRun {
  return new TextRun({ text, font: DOCX_FONT, size, bold });
}

function plainParagraph(
  text: string,
  opts?: { bold?: boolean; after?: number; before?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] },
): Paragraph {
  return new Paragraph({
    alignment: opts?.align,
    spacing: { after: opts?.after ?? 100, before: opts?.before ?? 0 },
    children: [bodyRun(text, opts?.bold)],
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

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: "111111",
};
const borders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

function labelCell(text: string, width: number): TableCell {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "EEF2F7" },
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [bodyRun(text, true, 18)],
      }),
    ],
  });
}

function valueCell(text: string, width: number, span = 1): TableCell {
  return new TableCell({
    borders,
    columnSpan: span > 1 ? span : undefined,
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        spacing: { after: 0 },
        children: [bodyRun(text || "—", true, 18)],
      }),
    ],
  });
}

function buildCoordinatesTable(data: LocationMapLetterData, widthTwip: number): Table {
  const doc = data.document;
  const c1 = Math.round(widthTwip * 0.22);
  const c2 = Math.round(widthTwip * 0.28);
  const c3 = Math.round(widthTwip * 0.22);
  const c4 = widthTwip - c1 - c2 - c3;

  return new Table({
    width: { size: widthTwip, type: WidthType.DXA },
    columnWidths: [c1, c2, c3, c4],
    rows: [
      new TableRow({
        children: [
          labelCell("From Location Name", c1),
          valueCell(doc.from_location_name || "—", c2 + c3 + c4, 3),
        ],
      }),
      new TableRow({
        children: [
          labelCell("From Latitude", c1),
          valueCell(formatCoordDisplay(doc.from_latitude), c2),
          labelCell("From Longitude", c3),
          valueCell(formatCoordDisplay(doc.from_longitude), c4),
        ],
      }),
      new TableRow({
        children: [
          labelCell("To Location Name", c1),
          valueCell(doc.to_location_name || "—", c2 + c3 + c4, 3),
        ],
      }),
      new TableRow({
        children: [
          labelCell("To Latitude", c1),
          valueCell(formatCoordDisplay(doc.to_latitude), c2),
          labelCell("To Longitude", c3),
          valueCell(formatCoordDisplay(doc.to_longitude), c4),
        ],
      }),
    ],
  });
}

async function buildMapImageParagraph(
  data: LocationMapLetterData,
  settings: PrintSettings,
  mapImage?: { type: "png" | "jpg"; data: Uint8Array } | null,
): Promise<Paragraph[]> {
  const widthTwip = contentWidthTwip(settings);
  const widthPx = twipToPx(widthTwip);
  const heightTwip = convertMillimetersToTwip(MAP_HEIGHT_MM);
  const heightPx = twipToPx(heightTwip);

  let image = mapImage ?? null;
  if (!image) {
    image = await captureLocationMapPng(data.document, {
      widthPx: Math.max(720, widthPx * 2),
      heightPx: Math.max(472, heightPx * 2),
    });
  }

  if (image) {
    const out: Paragraph[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 60 },
        children: [
          new ImageRun({
            type: image.type,
            data: image.data,
            transformation: {
              width: widthPx,
              height: heightPx,
            },
            altText: {
              title: "Location map route",
              description: "Route map from origin to destination",
              name: "location_map_route",
            },
          }),
        ],
      }),
    ];
    if (data.directionsUrl) {
      out.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: "Open route in Google Maps: ",
              font: DOCX_FONT,
              size: 16,
            }),
            new TextRun({
              text: data.directionsUrl,
              font: DOCX_FONT,
              size: 16,
              color: "1D4ED8",
            }),
          ],
        }),
      );
    }
    return out;
  }

  // Fallback when map capture fails.
  const fallback: Paragraph[] = [
    plainParagraph(
      "Route map image could not be generated. Please use the Google Maps link below.",
      { after: 60 },
    ),
  ];
  if (data.directionsUrl) {
    fallback.push(plainParagraph(`Open route in Google Maps: ${data.directionsUrl}`, { after: 80 }));
  }
  return fallback;
}

async function buildSignatoryParagraphs(data: LocationMapLetterData): Promise<Paragraph[]> {
  const sigName = data.firmRepName || data.contactPerson || "—";
  const sigDesig = data.firmRepDesignation || "—";
  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 0 },
      children: [bodyRun(`For ${data.companyName || "—"}`, true)],
    }),
  ];

  const sigImg = await loadImageFromUrl(data.signatureImageUrl?.trim() || null);
  if (sigImg) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 80, after: 40 },
        children: [
          new ImageRun({
            type: sigImg.type,
            data: sigImg.data,
            transformation: { width: 120, height: 50 },
            altText: {
              title: "Signature",
              description: "Signatory signature",
              name: "signature",
            },
          }),
        ],
      }),
    );
  } else {
    out.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 200, after: 0 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
        },
        children: [bodyRun("")],
      }),
    );
  }

  out.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun(`Name: ${sigName}`)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 20, after: 0 },
      children: [bodyRun(`Designation: ${sigDesig}`)],
    }),
  );
  return out;
}

async function buildLocationMapDocx(
  data: LocationMapLetterData,
  settings: PrintSettings,
  assets?: LocationMapPrintAssets,
  mapImage?: { type: "png" | "jpg"; data: Uint8Array } | null,
): Promise<Document> {
  const letterheadSettings = locationMapLetterheadSettings(settings);
  const company = buildLocationMapCompany(data, assets);
  const widthTwip = contentWidthTwip(letterheadSettings);
  const bisBranch = [data.bisBranchName, data.bisBranchState].filter((p) => p.trim()).join(", ");

  const children: Array<Paragraph | Table> = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: "Location Map",
          bold: true,
          font: DOCX_FONT,
          size: 28,
          underline: {},
        }),
      ],
    }),
    new Table({
      width: { size: widthTwip, type: WidthType.DXA },
      columnWidths: [Math.round(widthTwip * 0.62), Math.round(widthTwip * 0.38)],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              width: { size: Math.round(widthTwip * 0.62), type: WidthType.DXA },
              children: [
                plainParagraph("To,", { after: 40 }),
                plainParagraph("The Director & Head", { after: 20 }),
                plainParagraph("Bureau of Indian Standards", { after: 20 }),
                plainParagraph(`${bisBranch || "—"}, INDIA`, { after: 0 }),
              ],
            }),
            new TableCell({
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              width: { size: Math.round(widthTwip * 0.38), type: WidthType.DXA },
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 20 },
                  children: [bodyRun(`Date: ${formatMetaDate(data.dateOfApplication)}`)],
                }),
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 0 },
                  children: [
                    bodyRun(`Application No.: ${formatApplicationNo(data.applicationNumber)}`),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    plainParagraph("Respected / Sir,", { before: 140, after: 80 }),
    plainParagraph(
      "We hereby submit the location map indicating the route from our manufacturing unit to the Bureau of Indian Standards branch office. The geographical coordinates and route map are furnished below for your kind reference in connection with our BIS licence application.",
      { after: 120 },
    ),
    buildCoordinatesTable(data, widthTwip),
    ...(await buildMapImageParagraph(data, letterheadSettings, mapImage)),
    plainParagraph(
      "We hereby declare that all information furnished above is true and correct to the best of our knowledge and belief.",
      { before: 80, after: 80 },
    ),
    ...(await buildSignatoryParagraphs(data)),
    ...(await buildLetterheadLowerParagraphs(letterheadSettings, assets)),
  ];

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: pageMarginsFromSettings(letterheadSettings),
          },
        },
        children,
      },
    ],
  });
}

export async function downloadLocationMapWord(
  data: LocationMapLetterData,
  settings: PrintSettings,
  assets?: LocationMapPrintAssets,
  mapImage?: { type: "png" | "jpg"; data: Uint8Array } | null,
): Promise<void> {
  const widthTwip = contentWidthTwip(locationMapLetterheadSettings(settings));
  const widthPx = twipToPx(widthTwip);
  const heightPx = twipToPx(convertMillimetersToTwip(MAP_HEIGHT_MM));

  const captured =
    mapImage ??
    (await captureLocationMapPng(data.document, {
      widthPx: Math.max(720, widthPx * 2),
      heightPx: Math.max(472, heightPx * 2),
    }));

  const docx = await buildLocationMapDocx(data, settings, assets, captured);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}
