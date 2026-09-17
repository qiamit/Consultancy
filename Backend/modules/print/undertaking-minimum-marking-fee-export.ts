import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import {
  buildDefaultSlab1Text,
  computeMarkingFeeCalculation,
  formatMarkingFeeInr,
  formatMarkingFeeUnitRate,
} from "@backend/modules/bis/undertaking-minimum-marking-fee";
import {
  buildUndertakingMinimumMarkingFeeCompany,
  undertakingMinimumMarkingFeeLetterheadSettings,
  type UndertakingMinimumMarkingFeeLetterData,
  type UndertakingMinimumMarkingFeePrintAssets,
} from "@backend/modules/print/undertaking-minimum-marking-fee";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildLetterheadLowerParagraphs,
  buildNoLogoLetterheadBlocks,
  pageMarginsFromSettings,
  pageSizeTwipFromSettings,
} from "@backend/modules/print/docx-letterhead";

const DOCX_FONT = "Times New Roman";
const DOCX_BODY_SIZE = 20;
const DOCX_TITLE_SIZE = 26;

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function exportFilenameBase(data: UndertakingMinimumMarkingFeeLetterData): string {
  return safeFilePart(`Marking_Fee_Calculation_Annex1_${data.companyName || "Applicant"}`);
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

function plainParagraph(text: string, indent = 0): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    indent: indent > 0 ? { left: indent } : undefined,
    children: [bodyRun(text)],
  });
}

function resolveIsProductLine(data: UndertakingMinimumMarkingFeeLetterData): string {
  const fromDoc = data.document.is_product_line.trim();
  if (fromDoc) return fromDoc;
  const num = (data.isNumber ?? "").trim();
  const title = (data.isTitle ?? "").trim();
  if (num && title) return `${num} Product: ${title}`;
  return num || title || "—";
}

async function buildUndertakingMinimumMarkingFeeDocx(
  data: UndertakingMinimumMarkingFeeLetterData,
  settings: PrintSettings,
  assets?: UndertakingMinimumMarkingFeePrintAssets,
): Promise<Document> {
  const letterheadSettings = undertakingMinimumMarkingFeeLetterheadSettings(settings);
  const company = buildUndertakingMinimumMarkingFeeCompany(data, assets);
  const doc = data.document;
  const calc = computeMarkingFeeCalculation(doc);
  const unit = doc.unit_of_sale.trim() || "unit";
  const status = doc.firm_status.trim() || "—";
  const branch = doc.bis_branch.trim() || "—";

  const finalUnitRate =
    doc.final_unit_rate.trim() ||
    (calc.suggestedUnitRate != null ? formatMarkingFeeUnitRate(calc.suggestedUnitRate) : "—");
  const slab1 =
    doc.slab_1_text.trim() ||
    (calc.suggestedUnitRate != null ? buildDefaultSlab1Text(calc.suggestedUnitRate, unit) : "—");

  const probableDisplay =
    calc.probableUnitRate != null && calc.annualProductionQty != null && calc.mmfLarge > 0
      ? `${formatMarkingFeeInr(calc.mmfLarge)}/${calc.annualProductionQty.toLocaleString("en-IN")} = ${formatMarkingFeeUnitRate(calc.probableUnitRate)} per ${unit}`
      : calc.probableUnitRate != null
        ? formatMarkingFeeUnitRate(calc.probableUnitRate)
        : "—";

  const sigName = doc.signatory_name || data.firmRepName || data.contactPerson || "—";
  const sigDesig = doc.signatory_designation || data.firmRepDesignation || "—";

  const children: Paragraph[] = [
    ...(await buildNoLogoLetterheadBlocks(company, letterheadSettings)),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [bodyRun("ANNEX 1", true, DOCX_TITLE_SIZE)],
    }),
    plainParagraph(`STATUS- ${status} BO- ${branch}`),
    plainParagraph(`1      ${resolveIsProductLine(data)}`),
    plainParagraph("2   Installed capacity of the Plant:"),
    plainParagraph("a)   Production:", 360),
    plainParagraph(`i) Annual Production Capacity: ${doc.annual_production_capacity || "—"}`, 720),
    plainParagraph(`ii) Value (Rs.): ${doc.value_of_production_per_unit || "—"}`, 720),
    plainParagraph(`b) Cost of Production (Rs.): ${doc.cost_of_production_per_unit || "—"}`, 360),
    plainParagraph("3  Market Surveillance Plan (proposed):"),
    plainParagraph(doc.market_surveillance_plan || "—", 360),
    plainParagraph("4  Testing charges for complete testing per sample:"),
    plainParagraph(`i) BIS Lab (Rs.): ${doc.bis_lab_testing_charges || "None"}`, 360),
    plainParagraph(
      `ii) If BIS testing charges are not available, the average of prevailing testing charges of OSLs (in Rs.): ${doc.osl_avg_testing_charges || "—"}`,
      360,
    ),
    plainParagraph("5  Cost of Market Sample:"),
    plainParagraph(`a) Quantity per Market Sample: ${doc.market_sample_quantity || "—"}`, 360),
    plainParagraph(
      `b) *Cost of market sample (Rs.): ${doc.market_sample_cost || doc.market_cost_most_common_variety || "—"}`,
      360,
    ),
    plainParagraph("6  Estimated Expenditure in Operating License Per Year of One Operative Period"),
    plainParagraph(
      `Factory Samples: ${calc.factorySampleCount} × ${formatMarkingFeeInr(calc.factorySampleRate)} = ${formatMarkingFeeInr(calc.factoryTestingAmount)}`,
      360,
    ),
    plainParagraph(
      `Market Samples (testing): ${calc.marketSampleCount} × ${formatMarkingFeeInr(calc.marketSampleRate)} = ${formatMarkingFeeInr(calc.marketTestingAmount)}`,
      360,
    ),
    plainParagraph(
      `Cost of Market Samples: ${calc.marketSampleCount} × ${formatMarkingFeeInr(calc.marketSampleUnitCost)} = ${formatMarkingFeeInr(calc.marketSampleCostAmount)}`,
      360,
    ),
    plainParagraph(`Direct Cost of Overhead: ${formatMarkingFeeInr(calc.overheadAmount)}`, 360),
    plainParagraph(`TOTAL (in Rs.): ${formatMarkingFeeInr(calc.totalRaw)}`, 360),
    plainParagraph("7  Final MMF proposal"),
    plainParagraph(`i) LARGE SCALE (Rs.): ${formatMarkingFeeInr(calc.mmfLarge)}`, 360),
    plainParagraph(
      `ii) MSME (Rs.): ${formatMarkingFeeInr(calc.mmfMsmeRaw)}${calc.mmfMsme !== calc.mmfMsmeRaw ? ` Round off - ${formatMarkingFeeInr(calc.mmfMsme)}` : ""}`,
      360,
    ),
    plainParagraph("8  Calculation for unit rate:"),
    plainParagraph(`i) Probable Unit Rate: ${probableDisplay}`, 360),
    plainParagraph(
      `ii) 0.01% of cost of production (Rs.) ${calc.bandMin != null ? `${formatMarkingFeeUnitRate(calc.bandMin)} per ${unit}` : "—"}`,
      360,
    ),
    plainParagraph(
      `iii) 0.2% of cost of production (Rs.) ${calc.bandMax != null ? `${formatMarkingFeeUnitRate(calc.bandMax)} per ${unit}` : "—"}`,
      360,
    ),
    plainParagraph(`9  FINAL UNIT RATE: Unit– 1 ${unit}`),
    plainParagraph(`Slab-1   ${slab1}`, 360),
    plainParagraph(`Slab-2   ${doc.slab_2_text || "Rs. _______-_______ per unit for next _______-_______ units,"}`, 360),
    plainParagraph(`Slab-3   ${doc.slab_3_text || "Rs. ___-_____ per unit for remaining __-_____ units."}`, 360),
    plainParagraph(`Final Unit Rate: ${finalUnitRate}`, 360),
    plainParagraph("*authenticated through market survey"),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 240, after: 0 },
      children: [bodyRun(`For ${data.companyName || "—"}`, true)],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200, after: 0 },
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

export async function downloadUndertakingMinimumMarkingFeeWord(
  data: UndertakingMinimumMarkingFeeLetterData,
  settings: PrintSettings,
  assets?: UndertakingMinimumMarkingFeePrintAssets,
): Promise<void> {
  const docx = await buildUndertakingMinimumMarkingFeeDocx(data, settings, assets);
  const blob = await Packer.toBlob(docx);
  triggerBlobDownload(blob, `${exportFilenameBase(data)}.docx`);
}
