import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildDefaultSlab1Text,
  computeMarkingFeeCalculation,
  formatMarkingFeeInr,
  formatMarkingFeeUnitRate,
  type UndertakingMinimumMarkingFeeStored,
} from "@backend/modules/bis/undertaking-minimum-marking-fee";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type UndertakingMinimumMarkingFeeLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  firmRepName: string;
  firmRepDesignation: string;
  document: UndertakingMinimumMarkingFeeStored;
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blankOr(value: string, fallback = "________________"): string {
  const v = esc(value);
  return v || fallback;
}

function displayOr(value: string, fallback = "—"): string {
  const v = esc(value);
  return v || fallback;
}

function formatStatusLine(doc: UndertakingMinimumMarkingFeeStored): string {
  const status = doc.firm_status.trim() || "________________";
  const branch = doc.bis_branch.trim() || "________________";
  return `STATUS- ${esc(status)} BO- ${esc(branch)}`;
}

function resolveIsProductLine(
  data: UndertakingMinimumMarkingFeeLetterData,
): string {
  const fromDoc = data.document.is_product_line.trim();
  if (fromDoc) return fromDoc;
  const num = (data.isNumber ?? "").trim();
  const title = (data.isTitle ?? "").trim();
  if (num && title) return `${num} Product: ${title}`;
  return num || title || "________________";
}

function buildExpenditureTableHtml(
  doc: UndertakingMinimumMarkingFeeStored,
): string {
  const calc = computeMarkingFeeCalculation(doc);
  const th =
    "border:1px solid #111;padding:4px 6px;font-size:9px;font-weight:700;text-align:center;vertical-align:middle;background:#eef2f7;";
  const td =
    "border:1px solid #111;padding:4px 6px;font-size:9px;vertical-align:middle;";
  const tdR = `${td}text-align:right;`;
  const tdC = `${td}text-align:center;`;

  const fsRateDisplay =
    doc.factory_sample_rate.trim() ||
    (calc.factorySampleRate != null ? formatMarkingFeeInr(calc.factorySampleRate) : "—");
  const msRateDisplay =
    doc.market_sample_rate.trim() ||
    (calc.marketSampleRate != null ? formatMarkingFeeInr(calc.marketSampleRate) : "—");
  const msCostDisplay =
    doc.market_sample_cost.trim() ||
    doc.market_cost_most_common_variety.trim() ||
    (calc.marketSampleUnitCost > 0 ? formatMarkingFeeInr(calc.marketSampleUnitCost) : "—");

  const totalNote =
    calc.totalRaw > 0 && calc.mmfLarge !== calc.totalRaw
      ? `<div style="font-size:8px;font-style:italic;margin-top:2px;">(Rounded off to ${formatMarkingFeeInr(calc.mmfLarge)})</div>`
      : "";

  return `
<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0;">
  <thead>
    <tr>
      <th style="${th}text-align:left;width:46%;">ITEM OF EXPENDITURE</th>
      <th style="${th}width:10%;">NO.</th>
      <th style="${th}width:22%;">RATE</th>
      <th style="${th}width:22%;">AMOUNT</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="${td}font-weight:700;" colspan="4">a) TESTING CHARGES</td>
    </tr>
    <tr>
      <td style="${td}padding-left:16px;">i) FACTORY SAMPLES</td>
      <td style="${tdC}">${calc.factorySampleCount}</td>
      <td style="${tdR}">${displayOr(fsRateDisplay)}</td>
      <td style="${tdR}">${formatMarkingFeeInr(calc.factoryTestingAmount)}</td>
    </tr>
    <tr>
      <td style="${td}padding-left:16px;">ii) MARKET SAMPLES</td>
      <td style="${tdC}">${calc.marketSampleCount}</td>
      <td style="${tdR}">${displayOr(msRateDisplay)}</td>
      <td style="${tdR}">${formatMarkingFeeInr(calc.marketTestingAmount)}</td>
    </tr>
    <tr>
      <td style="${td}">b) COST OF MARKET SAMPLES</td>
      <td style="${tdC}">${calc.marketSampleCount}</td>
      <td style="${tdR}">${displayOr(msCostDisplay)}</td>
      <td style="${tdR}">${formatMarkingFeeInr(calc.marketSampleCostAmount)}</td>
    </tr>
    <tr>
      <td style="${td}">c) Direct Cost of Overhead</td>
      <td style="${tdC}">—</td>
      <td style="${tdR}">${formatMarkingFeeInr(calc.overheadAmount)}</td>
      <td style="${tdR}">${formatMarkingFeeInr(calc.overheadAmount)}</td>
    </tr>
    <tr>
      <td style="${td}font-weight:700;">TOTAL (in Rs.):</td>
      <td style="${td}" colspan="3">
        <div style="font-weight:700;">${formatMarkingFeeInr(calc.totalRaw)}</div>
        ${totalNote}
      </td>
    </tr>
  </tbody>
</table>`;
}

function buildBodyHtml(data: UndertakingMinimumMarkingFeeLetterData): string {
  const doc = data.document;
  const calc = computeMarkingFeeCalculation(doc);
  const isLine = resolveIsProductLine(data);
  const unit = doc.unit_of_sale.trim() || "unit";

  const bisLab = doc.bis_lab_testing_charges.trim() || "None";
  const oslAvg = doc.osl_avg_testing_charges.trim() || "—";

  const finalUnitRate =
    doc.final_unit_rate.trim() ||
    (calc.suggestedUnitRate != null ? formatMarkingFeeUnitRate(calc.suggestedUnitRate) : "—");

  const slab1 =
    doc.slab_1_text.trim() ||
    (calc.suggestedUnitRate != null ? buildDefaultSlab1Text(calc.suggestedUnitRate, unit) : "—");
  const slab2 = doc.slab_2_text.trim() || "Rs. _______-_______ per unit for next _______-_______ units,";
  const slab3 =
    doc.slab_3_text.trim() || "Rs. ___-_____ per unit for remaining __-_____ units.";

  const probableDisplay =
    calc.probableUnitRate != null && calc.annualProductionQty != null && calc.mmfLarge > 0
      ? `${formatMarkingFeeInr(calc.mmfLarge)}/${calc.annualProductionQty.toLocaleString("en-IN")} = ${formatMarkingFeeUnitRate(calc.probableUnitRate)} per ${esc(unit)}`
      : calc.probableUnitRate != null
        ? `${formatMarkingFeeUnitRate(calc.probableUnitRate)} per ${esc(unit)}`
        : "—";

  const msmeNote =
    calc.mmfMsme !== calc.mmfMsmeRaw
      ? ` Round off - ${formatMarkingFeeInr(calc.mmfMsme)}`
      : "";

  return `
<div class="mmf-annex-title">ANNEX 1</div>
<div class="mmf-status-line">${formatStatusLine(doc)}</div>

<p class="mmf-section"><strong>1</strong>&nbsp;&nbsp;&nbsp;&nbsp;${blankOr(isLine)}</p>

<p class="mmf-section"><strong>2</strong>&nbsp;&nbsp;&nbsp;&nbsp;Installed capacity of the Plant:</p>
<p class="mmf-sub">a)&nbsp;&nbsp;Production:</p>
<p class="mmf-sub">i)&nbsp;&nbsp;Annual Production Capacity:&nbsp;${blankOr(doc.annual_production_capacity)}</p>
<p class="mmf-sub">ii)&nbsp;&nbsp;Value (Rs.):&nbsp;${blankOr(doc.value_of_production_per_unit)}</p>
<p class="mmf-sub">b)&nbsp;&nbsp;Cost of Production (Rs.):&nbsp;${blankOr(doc.cost_of_production_per_unit)}</p>

<p class="mmf-section"><strong>3</strong>&nbsp;&nbsp;&nbsp;&nbsp;Market Surveillance Plan (proposed):</p>
<p class="mmf-para">${blankOr(doc.market_surveillance_plan, "&nbsp;")}</p>

<p class="mmf-section"><strong>4</strong>&nbsp;&nbsp;&nbsp;&nbsp;Testing charges for complete testing per sample:</p>
<p class="mmf-sub">i)&nbsp;&nbsp;BIS Lab (Rs.):&nbsp;${displayOr(bisLab)}</p>
<p class="mmf-sub">ii)&nbsp;&nbsp;If BIS testing charges are not available, the average of prevailing testing charges of OSLs (in Rs.):&nbsp;${displayOr(oslAvg)}</p>

<p class="mmf-section"><strong>5</strong>&nbsp;&nbsp;&nbsp;&nbsp;Cost of Market Sample:</p>
<p class="mmf-sub">a)&nbsp;&nbsp;Quantity per Market Sample:&nbsp;${blankOr(doc.market_sample_quantity)}</p>
<p class="mmf-sub">b)&nbsp;&nbsp;*Cost of market sample (Rs.):&nbsp;${blankOr(doc.market_sample_cost || doc.market_cost_most_common_variety)}</p>

<p class="mmf-section"><strong>6</strong>&nbsp;&nbsp;&nbsp;&nbsp;Estimated Expenditure in Operating License Per Year of One Operative Period</p>
${buildExpenditureTableHtml(doc)}

<p class="mmf-section"><strong>7</strong>&nbsp;&nbsp;&nbsp;&nbsp;Final MMF proposal</p>
<p class="mmf-sub">i)&nbsp;&nbsp;LARGE SCALE (Rs.):&nbsp;${formatMarkingFeeInr(calc.mmfLarge)}</p>
<p class="mmf-sub">ii)&nbsp;&nbsp;MSME (Rs.):&nbsp;${formatMarkingFeeInr(calc.mmfMsmeRaw)}${msmeNote ? esc(msmeNote) : ""}</p>

<p class="mmf-section"><strong>8</strong>&nbsp;&nbsp;&nbsp;&nbsp;Calculation for unit rate:</p>
<p class="mmf-sub">i)&nbsp;&nbsp;Probable Unit Rate: (MMF of Large ÷ Production capacity)&nbsp;${probableDisplay}</p>
<p class="mmf-sub">ii)&nbsp;&nbsp;0.01% of cost of production (Rs.)&nbsp;${calc.bandMin != null ? `${formatMarkingFeeUnitRate(calc.bandMin)} per ${esc(unit)}` : "—"}</p>
<p class="mmf-sub">iii)&nbsp;&nbsp;0.2% of cost of production (Rs.)&nbsp;${calc.bandMax != null ? `${formatMarkingFeeUnitRate(calc.bandMax)} per ${esc(unit)}` : "—"}</p>

<p class="mmf-section"><strong>9</strong>&nbsp;&nbsp;&nbsp;&nbsp;FINAL UNIT RATE:&nbsp;&nbsp;Unit– 1 ${blankOr(unit)}</p>
<p class="mmf-sub">Slab-1&nbsp;&nbsp;${displayOr(slab1)}</p>
<p class="mmf-sub">Slab-2&nbsp;&nbsp;${displayOr(slab2)}</p>
<p class="mmf-sub">Slab-3&nbsp;&nbsp;${displayOr(slab3)}</p>
<p class="mmf-sub">Final Unit Rate:&nbsp;${displayOr(finalUnitRate)}</p>

<p class="mmf-footnote">*authenticated through market survey</p>
<p class="mmf-footnote">** in case of licence being operative on Factory testing basis, charges for mandays required for complete testing of the product twice in a year are to be considered</p>`;
}

function buildSignatoryBlockHtml(data: UndertakingMinimumMarkingFeeLetterData): string {
  const sigName =
    esc(data.document.signatory_name) || esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.document.signatory_designation) || esc(data.firmRepDesignation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "mmf-signatory-block",
    forClass: "mmf-signatory-for",
    sigWrapClass: "mmf-signatory-sig",
    lineClass: "mmf-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildFormBody(data: UndertakingMinimumMarkingFeeLetterData): string {
  return `
<div class="mmf-sheet">
  ${buildBodyHtml(data)}
  ${buildSignatoryBlockHtml(data)}
  <div class="mmf-page-indicator">Page 01 of 01</div>
</div>`;
}

export type UndertakingMinimumMarkingFeePrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildUndertakingMinimumMarkingFeeCompany(
  data: UndertakingMinimumMarkingFeeLetterData,
  assets?: UndertakingMinimumMarkingFeePrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

export function defaultUndertakingMinimumMarkingFeePrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    show_letterhead: true,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 11,
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 15,
    margin_right: 10,
  };
}

export function undertakingMinimumMarkingFeeLetterheadSettings(
  settings: PrintSettings,
): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildUndertakingMinimumMarkingFeeHtml(
  data: UndertakingMinimumMarkingFeeLetterData,
  settings: PrintSettings,
  assets?: UndertakingMinimumMarkingFeePrintAssets,
): string {
  const letterheadSettings = undertakingMinimumMarkingFeeLetterheadSettings(settings);
  const styles = `
    .mmf-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      line-height: 1.45;
    }
    .mmf-annex-title {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      margin: 0 0 6px;
    }
    .mmf-status-line {
      font-size: 10px;
      font-weight: 700;
      margin: 0 0 10px;
    }
    .mmf-section {
      margin: 0 0 4px;
      font-size: 10px;
      line-height: 1.5;
    }
    .mmf-sub {
      margin: 0 0 3px 18px;
      font-size: 10px;
      line-height: 1.5;
    }
    .mmf-para {
      margin: 0 0 8px 18px;
      font-size: 10px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .mmf-footnote {
      margin: 8px 0 0;
      font-size: 8px;
      line-height: 1.4;
      font-style: italic;
    }
    .mmf-page-indicator {
      position: absolute;
      right: 5mm;
      bottom: 5mm;
      font-size: 9px;
      font-weight: 600;
    }
    .mmf-signatory-block {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 9px;
      line-height: 1.5;
      text-align: right;
    }
    .mmf-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .mmf-signatory-sig {
      margin-top: 20px;
      min-width: 180px;
      text-align: right;
    }
    .mmf-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 9px;
      line-height: 1.35;
      text-align: right;
    }
  `;

  return buildPrintDocument({
    title: "Marking Fee Calculation — Annex 1",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings: letterheadSettings,
    company: buildUndertakingMinimumMarkingFeeCompany(data, assets),
  });
}

export function iframeSizeForUndertakingMinimumMarkingFeePrintSettings(
  settings: PrintSettings,
): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
