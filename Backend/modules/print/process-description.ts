import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type { ProcessDescriptionStored } from "@backend/modules/bis/process-description";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type ProcessDescriptionLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  document: ProcessDescriptionStored;
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function formatBisBranchLine(branchName: string, state: string): string {
  const branch = branchName.trim() || "________________";
  const st = state.trim() || "________________";
  return `${esc(branch)}, ${esc(st)}, INDIA`;
}

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function buildPageIndicatorHtml(): string {
  return `<div class="pd-page-indicator">Page ${padPageNum(1)} of ${padPageNum(1)}</div>`;
}

function buildLetterIntroHtml(data: ProcessDescriptionLetterData): string {
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<h1 class="pd-title">Process Description</h1>
<div class="pd-to-row">
  <div class="pd-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standards<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="pd-date-block">
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildSignatoryBlockHtml(data: ProcessDescriptionLetterData): string {
  const sigName = esc(data.document.signatory_name) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.document.signatory_designation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "pd-signatory-block",
    forClass: "pd-signatory-for",
    sigWrapClass: "pd-signatory-sig",
    lineClass: "pd-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildDescriptionPointsHtml(data: ProcessDescriptionLetterData): string {
  const points = resolveProcessDescriptionPoints(data);
  const isCode = esc(data.isNumber?.trim() || "the applicable Indian Standard");

  return `
<p class="pd-salutation">Respected / Sir,</p>
<p class="pd-intro">
  We hereby submit the following description of the manufacturing process adopted at our unit for
  ${isCode} for your kind reference in connection with our BIS licence application.
</p>
<div class="pd-points">
  ${points.map((text, i) => `<p><strong>${i + 1}.</strong> ${esc(text)}</p>`).join("")}
</div>
<p class="pd-truth-declaration">
  We hereby declare that all information furnished above is true and correct to the best of our
  knowledge and belief.
</p>`;
}

function buildFormBody(data: ProcessDescriptionLetterData): string {
  return `
<div class="pd-sheet">
  ${buildLetterIntroHtml(data)}
  ${buildDescriptionPointsHtml(data)}
  ${buildSignatoryBlockHtml(data)}
  ${buildPageIndicatorHtml()}
</div>`;
}

export type ProcessDescriptionPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildProcessDescriptionCompany(
  data: ProcessDescriptionLetterData,
  assets?: ProcessDescriptionPrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Process Description letterhead matches Top Management — text-only / no logo tile.
    logo_url: null,
  };
}

export function defaultProcessDescriptionPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    letterhead_layout: "logo-na",
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 10,
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 15,
    margin_right: 10,
  };
}

/** Force no-logo letterhead for Process Description preview / Word. */
export function processDescriptionLetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildProcessDescriptionHtml(
  data: ProcessDescriptionLetterData,
  settings: PrintSettings,
  assets?: ProcessDescriptionPrintAssets,
): string {
  const letterheadSettings = processDescriptionLetterheadSettings(settings);
  const sheetMinHeight = `calc(297mm - ${letterheadSettings.margin_top}mm - ${letterheadSettings.margin_bottom}mm)`;
  const styles = `
    .pd-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 4mm;
    }
    .pd-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .pd-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      line-height: 1.35;
    }
    .pd-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 12px;
    }
    .pd-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.55;
    }
    .pd-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.55;
    }
    .pd-salutation,
    .pd-intro,
    .pd-truth-declaration {
      margin: 0 0 8px;
      font-size: 10px;
      line-height: 1.55;
      text-align: justify;
    }
    .pd-truth-declaration {
      margin-top: 14px;
    }
    .pd-points p {
      margin: 5px 0;
      font-size: 9px;
      line-height: 1.45;
      text-align: justify;
    }
    .pd-signatory-block {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .pd-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .pd-signatory-sig {
      margin-top: 32px;
      min-width: 200px;
      text-align: right;
    }
    .pd-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
  `;

  return buildPrintDocument({
    title: "Process Description",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings: letterheadSettings,
    company: buildProcessDescriptionCompany(data, assets),
  });
}

export function iframeSizeForProcessDescriptionPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}

export function processDescriptionPointTexts(data: ProcessDescriptionLetterData): string[] {
  const isCode = data.isNumber?.trim() || "the product";
  const company = data.companyName?.trim() || "Our manufacturing unit";

  return [
    `${company} manufactures ${isCode} as per the applicable Indian Standard. Raw materials are received, inspected, and accepted only against defined specifications before use in production.`,
    "Accepted raw materials are stored in a designated area with proper identification, segregation, and protection from contamination, damage, and deterioration.",
    "The main manufacturing operations are carried out in sequence as per approved standard operating procedures, work instructions, and the process flow chart submitted with this application.",
    "In-process checks and controls are exercised at defined stages to ensure conformity of the product to the specified requirements.",
    "Finished products are inspected/tested as per the relevant Indian Standard before acceptance and are stored in a separate identified area.",
    "Non-conforming products, if any, are identified, segregated, and disposed of in a manner that prevents their unintended use or dispatch.",
    "Relevant production, inspection, and test records are maintained and made available for verification during BIS inspections.",
  ];
}

export function resolveProcessDescriptionPoints(data: ProcessDescriptionLetterData): string[] {
  const stored = data.document.description_points
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (stored.length > 0) return stored;
  return processDescriptionPointTexts(data);
}
