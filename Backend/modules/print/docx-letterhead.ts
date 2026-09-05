import {
  AlignmentType,
  BorderStyle,
  ImageRun,
  Paragraph,
  TextRun,
  convertMillimetersToTwip,
} from "docx";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";

export const DOCX_LETTERHEAD_FONT = "Times New Roman";
/** @deprecated Prefer pageWidthTwip / pageHeightTwip from PrintSettings. */
export const PAGE_WIDTH_TWIP = 11906; // A4 ≈ 210mm
/** @deprecated Prefer pageWidthTwip / pageHeightTwip from PrintSettings. */
export const PAGE_HEIGHT_TWIP = 16838; // A4 ≈ 297mm

export type DocxPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

/** Page dimensions in mm from Page Settings (paper size + orientation). */
export function pageSizeMmFromSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  const landscape = settings.orientation === "landscape";
  let w = 210;
  let h = 297;
  if (settings.paper_size === "A5") {
    w = 148;
    h = 210;
  } else if (settings.paper_size === "Letter") {
    w = 216;
    h = 279;
  } else if (settings.paper_size === "Legal") {
    w = 216;
    h = 356;
  }
  if (landscape) [w, h] = [h, w];
  return { widthMm: w, heightMm: h };
}

export function pageWidthTwip(settings: PrintSettings): number {
  return convertMillimetersToTwip(pageSizeMmFromSettings(settings).widthMm);
}

export function pageHeightTwip(settings: PrintSettings): number {
  return convertMillimetersToTwip(pageSizeMmFromSettings(settings).heightMm);
}

/** Word section page.size from current Page Settings. */
export function pageSizeTwipFromSettings(settings: PrintSettings): {
  width: number;
  height: number;
} {
  return {
    width: pageWidthTwip(settings),
    height: pageHeightTwip(settings),
  };
}

export function pageMarginsFromSettings(settings: PrintSettings) {
  return {
    top: convertMillimetersToTwip(settings.margin_top),
    left: convertMillimetersToTwip(settings.margin_left),
    bottom: convertMillimetersToTwip(settings.margin_bottom),
    right: convertMillimetersToTwip(settings.margin_right),
  };
}

export function contentWidthTwip(settings: PrintSettings): number {
  const m = pageMarginsFromSettings(settings);
  return Math.max(1200, pageWidthTwip(settings) - m.left - m.right);
}

export function twipToPx(twip: number): number {
  return Math.max(1, Math.round(twip / 15));
}

export function primaryColorHex(settings: PrintSettings): string {
  const raw = (settings.primary_color || "#1e3a8a").replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(raw) ? raw.toUpperCase() : "1E3A8A";
}

export function parseDataUrlImage(
  dataUrl: string,
): { type: "png" | "jpg"; data: Uint8Array } | null {
  const trimmed = dataUrl.trim();
  const match = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/i.exec(trimmed);
  if (!match) return null;
  const rawType = match[1]!.toLowerCase();
  const type = rawType === "png" ? "png" : "jpg";
  const binary = atob(match[2]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { type, data: bytes };
}

export async function loadImageFromUrl(
  url: string | null | undefined,
): Promise<{ type: "png" | "jpg"; data: Uint8Array } | null> {
  const src = (url ?? "").trim();
  if (!src) return null;
  const asData = parseDataUrlImage(src);
  if (asData) return asData;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const lower = src.toLowerCase();
    const type: "png" | "jpg" =
      ct.includes("png") || lower.includes(".png") ? "png" : "jpg";
    return { type, data: bytes };
  } catch {
    return null;
  }
}

function letterheadBottomRule(color: string): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 18, color },
    },
    children: [],
  });
}

function mutedRun(text: string, size = 18, italic = false): TextRun {
  return new TextRun({
    text,
    font: DOCX_LETTERHEAD_FONT,
    size,
    italics: italic,
    color: "555555",
  });
}

function buildLetterheadContactLine(
  company: PrintCompanyInfo,
  settings: PrintSettings,
): string {
  const parts: string[] = [];
  if (settings.letterhead_show_gst && company.gst_number.trim()) {
    parts.push(`GST: ${company.gst_number.trim()}`);
  }
  if (settings.letterhead_show_contact && company.email.trim()) {
    parts.push(`Email: ${company.email.trim()}`);
  }
  if (settings.letterhead_show_contact && company.phone.trim()) {
    parts.push(`Tel: ${company.phone.trim()}`);
  }
  return parts.join("  |  ");
}

function companyAddressLine(company: PrintCompanyInfo): string {
  return [company.address, company.city, company.state, company.pin_code, company.country]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

/** Text-only / banner letterhead (no logo tile) for declaration-style Word exports. */
export async function buildNoLogoLetterheadBlocks(
  company: PrintCompanyInfo,
  settings: PrintSettings,
): Promise<Paragraph[]> {
  if (!settings.show_letterhead) return [];

  const color = primaryColorHex(settings);
  const width = contentWidthTwip(settings);
  const addressLine = settings.letterhead_show_address
    ? companyAddressLine(company)
    : "";
  const contactLine = buildLetterheadContactLine(company, settings);
  const tagline = settings.letterhead_tagline.trim();

  const upperImg = await loadImageFromUrl(company.letterhead_upper_url);
  if (upperImg) {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [
          new ImageRun({
            type: upperImg.type,
            data: upperImg.data,
            transformation: {
              width: twipToPx(width),
              height: 110,
            },
            altText: {
              title: "Letterhead",
              description: "Company letterhead",
              name: "letterhead_upper",
            },
          }),
        ],
      }),
      letterheadBottomRule(color),
    ];
  }

  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: company.name || "Company",
          bold: true,
          font: DOCX_LETTERHEAD_FONT,
          size: 40,
          color,
        }),
      ],
    }),
  ];
  if (addressLine) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [mutedRun(addressLine, 18)],
      }),
    );
  }
  if (tagline) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 20 },
        children: [mutedRun(tagline, 18, true)],
      }),
    );
  }
  if (contactLine) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [mutedRun(contactLine, 18)],
      }),
    );
  }
  out.push(letterheadBottomRule(color));
  return out;
}

export async function buildLetterheadLowerParagraphs(
  settings: PrintSettings,
  assets: DocxPrintAssets | undefined,
): Promise<Paragraph[]> {
  const img = await loadImageFromUrl(assets?.letterhead_lower_url ?? null);
  if (!img) return [];
  const width = contentWidthTwip(settings);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 0 },
      children: [
        new ImageRun({
          type: img.type,
          data: img.data,
          transformation: {
            width: twipToPx(width),
            height: 80,
          },
          altText: {
            title: "Footer letterhead",
            description: "Company footer letterhead",
            name: "letterhead_lower",
          },
        }),
      ],
    }),
  ];
}
