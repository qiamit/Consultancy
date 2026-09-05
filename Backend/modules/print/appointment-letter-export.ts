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
} from "docx";
import { buildWorkbookBuffer, triggerBlobDownload } from "@backend/shared/spreadsheet/excel";
import {
  appointmentLetterLetterheadSettings,
  buildAppointmentLetterCompany,
  type AppointmentLetterData,
  type AppointmentLetterPrintAssets,
} from "@backend/modules/print/appointment-letter";
import type { PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate, parseToDate } from "@backend/shared/format-date";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  contentWidthTwip,
  DOCX_LETTERHEAD_FONT,
  loadImageFromUrl,
  PAGE_HEIGHT_TWIP,
  PAGE_WIDTH_TWIP,
  pageMarginsFromSettings,
} from "@backend/modules/print/docx-letterhead";

const DOCX_FONT = DOCX_LETTERHEAD_FONT;
const DOCX_BODY_SIZE = 24;

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

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function formatDate(dateStr: string): string {
  const raw = (dateStr ?? "").trim();
  if (!raw) return "_______________________";
  if (!parseToDate(raw)) return raw;
  return formatDisplayDate(raw);
}

function qualificationPhrasePlain(data: AppointmentLetterData): string {
  const qual = data.educational_qualification.trim();
  const exp = data.experience_years.trim();
  if (qual && exp) {
    return `who holds ${qual} and possesses approximately ${exp} year${exp === "1" ? "" : "s"} of relevant experience`;
  }
  if (qual) return `who holds ${qual}`;
  if (exp) {
    return `who possesses approximately ${exp} year${exp === "1" ? "" : "s"} of relevant experience`;
  }
  return "who is suitably qualified and experienced";
}

function exportFilenameBase(data: AppointmentLetterData): string {
  const coPart = safeFilePart(data.companyName || "Company");
  const personPart = safeFilePart(data.person_name || "Staff");
  return `Appointment_Letter_${coPart}_${personPart}`;
}

function bodyRun(text: string, bold = false): TextRun {
  return new TextRun({
    text,
    bold,
    font: DOCX_FONT,
    size: DOCX_BODY_SIZE,
  });
}

function bodyParagraph(
  runs: TextRun[],
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED,
): Paragraph {
  return new Paragraph({
    alignment,
    spacing: { after: 200, line: 360 },
    children: runs,
  });
}

function plainParagraph(
  text: string,
  bold = false,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.JUSTIFIED,
): Paragraph {
  return bodyParagraph([bodyRun(text, bold)], alignment);
}

function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 360 },
    bullet: { level: 0 },
    children: [bodyRun(text)],
  });
}

async function buildSignatureBlock(
  data: AppointmentLetterData,
  settings: PrintSettings,
): Promise<(Paragraph | Table)[]> {
  const sigName =
    data.signatory_name.trim() || data.contactPerson.trim() || "—";
  const sigDesig = data.signatory_designation.trim() || "—";
  const totalWidth = contentWidthTwip(settings);
  const sigWidth = Math.min(3200, Math.round(totalWidth * 0.42));
  const spacerWidth = totalWidth - sigWidth;
  const parsed = await loadImageFromUrl(
    (data as { signatureImageUrl?: string }).signatureImageUrl?.trim() || null,
  );

  const sigChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [bodyRun(`For ${data.companyName}`, true)],
    }),
  ];

  if (parsed) {
    sigChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 120, after: 0 },
        children: [
          new ImageRun({
            type: parsed.type,
            data: parsed.data,
            transformation: { width: 120, height: 48 },
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
    sigChildren.push(
      new Paragraph({
        spacing: { before: 280, after: 0 },
        children: [],
      }),
    );
  }

  sigChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 80, after: 0 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "94A3B8" },
      },
      children: [bodyRun("Name: ", true), bodyRun(sigName)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 40, after: 0 },
      children: [bodyRun("Designation: ", true), bodyRun(sigDesig)],
    }),
  );

  return [
    new Paragraph({ spacing: { before: 280, after: 0 }, children: [] }),
    new Table({
      width: { size: totalWidth, type: WidthType.DXA },
      columnWidths: [spacerWidth, sigWidth],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: spacerWidth, type: WidthType.DXA },
              borders: NO_BORDERS,
              children: [new Paragraph({ children: [] })],
            }),
            new TableCell({
              width: { size: sigWidth, type: WidthType.DXA },
              borders: NO_BORDERS,
              children: sigChildren,
            }),
          ],
        }),
      ],
    }),
  ];
}

async function buildAppointmentLetterDocx(
  data: AppointmentLetterData,
  settings: PrintSettings,
  assets?: AppointmentLetterPrintAssets,
): Promise<Document> {
  const letterheadSettings = appointmentLetterLetterheadSettings(settings);
  const company = buildAppointmentLetterCompany(data, assets);
  const personName = data.person_name.trim() || "_______________________";
  const designation = data.designation.trim() || "Technical Staff";
  const dateLabel = formatDate(data.appointment_date);
  const qualPhrase = qualificationPhrasePlain(data);
  const salutation =
    personName && personName !== "_______________________"
      ? `Dear ${personName},`
      : "Dear Sir/Madam,";

  const factoryPart = data.address.trim()
    ? `, having its registered office / manufacturing unit at ${data.address.trim()}`
    : "";

  const children: (Paragraph | Table)[] = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new TextRun({
          text: "Appointment Letter",
          bold: true,
          font: DOCX_FONT,
          size: 34,
          allCaps: true,
        }),
      ],
    }),
    ...(data.reference_no.trim()
      ? [
          plainParagraph(
            `Ref. No.: ${data.reference_no.trim()}`,
            false,
            AlignmentType.CENTER,
          ),
        ]
      : []),
    bodyParagraph([
      bodyRun("To,\n"),
      bodyRun(personName, true),
      bodyRun(`\n${designation}`),
    ]),
    bodyParagraph([
      bodyRun("Subject: ", true),
      bodyRun(`Appointment as ${designation}`),
    ]),
    plainParagraph(salutation),
    bodyParagraph([
      bodyRun("We are pleased to inform you that "),
      bodyRun(`M/s. ${data.companyName}`, true),
      bodyRun(`${factoryPart}, has appointed you to the position of `),
      bodyRun(designation, true),
      bodyRun(", with effect from "),
      bodyRun(dateLabel, true),
      bodyRun("."),
    ]),
    plainParagraph(
      `You ${qualPhrase}. Based on your credentials, the Management is confident that you will discharge your responsibilities with competence and integrity.`,
    ),
    plainParagraph("Your duties and responsibilities shall include, inter alia:", true),
    bulletParagraph(
      "Ensuring adherence to applicable quality standards, process controls, and internal procedures of the unit;",
    ),
    bulletParagraph(
      "Maintaining technical records, documentation, and correspondence in proper order;",
    ),
    bulletParagraph(
      "Assisting the Management in matters relating to certification, inspection, and liaison with concerned authorities; and",
    ),
    bulletParagraph(
      "Performing such other duties as may be assigned to you from time to time by the Management.",
    ),
    plainParagraph(
      "You shall report to the Management and conduct yourself in accordance with the rules, policies, and instructions of the Company. You are expected to devote your full attention to the duties entrusted to you and to act in the best interests of the organisation at all times.",
    ),
    plainParagraph(
      "Your remuneration, leave, and other terms and conditions of service shall be as mutually agreed and communicated to you separately, unless otherwise specified in writing by the Company.",
    ),
    plainParagraph(
      "This appointment shall continue unless terminated or modified by the Management through written intimation. Either party may terminate this arrangement in accordance with the applicable policy or applicable law, as the case may be.",
    ),
    plainParagraph(
      "We welcome you to our organisation and look forward to a long and mutually rewarding association.",
    ),
    plainParagraph("Thanking you,"),
    plainParagraph("Yours faithfully,"),
    ...(await buildSignatureBlock(data, letterheadSettings)),
    ...(await buildLetterheadLowerParagraphs(letterheadSettings, assets)),
  ];

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH_TWIP,
              height: PAGE_HEIGHT_TWIP,
            },
            margin: pageMarginsFromSettings(letterheadSettings),
          },
        },
        children,
      },
    ],
  });
}

export async function downloadAppointmentLetterWord(
  data: AppointmentLetterData,
  settings: PrintSettings,
  assets?: AppointmentLetterPrintAssets,
): Promise<void> {
  const doc = await buildAppointmentLetterDocx(data, settings, assets);
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}

export async function downloadAppointmentLetterExcel(
  data: AppointmentLetterData,
): Promise<void> {
  const rows: (string | number)[][] = [];

  rows.push(["Appointment Letter"]);
  rows.push([]);
  rows.push(["Company Name", data.companyName]);
  rows.push(["Address", data.address]);
  rows.push(["City", data.city]);
  rows.push(["Contact Person", data.contactPerson]);
  rows.push(["Phone", data.phone]);
  rows.push(["Email", data.email]);
  rows.push([]);
  rows.push(["Person Name", data.person_name]);
  rows.push(["Designation", data.designation]);
  rows.push(["Educational Qualification", data.educational_qualification]);
  rows.push(["Experience (Years)", data.experience_years]);
  rows.push(["Appointment Date", formatDate(data.appointment_date)]);
  rows.push(["Reference No.", data.reference_no || "—"]);
  rows.push(["Signatory Name", data.signatory_name || data.contactPerson || "—"]);
  rows.push(["Signatory Designation", data.signatory_designation || "—"]);
  rows.push([]);
  rows.push(["Duties and Responsibilities"]);
  rows.push([
    "1. Ensuring adherence to applicable quality standards, process controls, and internal procedures of the unit;",
  ]);
  rows.push([
    "2. Maintaining technical records, documentation, and correspondence in proper order;",
  ]);
  rows.push([
    "3. Assisting the Management in matters relating to certification, inspection, and liaison with concerned authorities; and",
  ]);
  rows.push([
    "4. Performing such other duties as may be assigned to you from time to time by the Management.",
  ]);

  const buffer = await buildWorkbookBuffer([
    {
      name: "Appointment Letter",
      rows,
      cols: [{ wch: 28 }, { wch: 56 }],
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
