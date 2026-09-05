import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type { UndertakingOption2Stored } from "@backend/modules/bis/undertaking-option-2";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type UndertakingOption2LetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  document: UndertakingOption2Stored;
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

function formatFactoryAddressForDeclaration(
  factoryAddress: string,
  fallbackAddress: string,
): string {
  const raw = (factoryAddress || fallbackAddress).trim();
  const base = blankOr(raw);
  return /\bindia\b/i.test(raw) ? base : `${base}, INDIA`;
}

function formatBisBranchLine(branchName: string, state: string): string {
  const branch = branchName.trim() || "________________";
  const st = state.trim() || "________________";
  return `${esc(branch)}, ${esc(st)}, INDIA`;
}

function blankOr(value: string, fallback = "________________"): string {
  const v = esc(value);
  return v || fallback;
}

function buildFormHeaderHtml(): string {
  return `<h1 class="u2-title">Undertaking for Simplified Procedure (Option 2)</h1>`;
}

function buildPageIndicatorHtml(): string {
  return `<div class="u2-page-indicator">Page 01 of 01</div>`;
}

function buildLetterIntroHtml(data: UndertakingOption2LetterData): string {
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<div class="u2-to-row">
  <div class="u2-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standard<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="u2-date-block">
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildConditionsHtml(): string {
  return `
<div class="u2-conditions">
  <p><strong>1.</strong> The licence, if granted against the above application shall be put under suspension by BIS, if the sample drawn during the verification visit fails to conform to the relevant Indian Standard</p>
  <p><strong>2.</strong> In such case of suspension, I shall take necessary corrective actions and inform the same to BIS within one month and offer fresh lot of products manufactured after taking corrective actions, from which sample(s) will be drawn by BIS for third party testing</p>
  <p><strong>3.</strong> The revocation of suspension will be considered only based on complete test report(s) of the fresh sample(s) offered, from third party testing laboratory</p>
  <p><strong>4.</strong> The testing fee for testing of sample drawn for consideration of revocation of suspension shall be borne by me</p>
  <p><strong>5.</strong> In case, the fresh sample drawn by BIS for considering revocation of suspension shows non-conformity, or I fail to inform corrective actions within 30 days from the date of suspension, the licence will be processed for cancellation</p>
</div>`;
}

function buildSignatoryBlockHtml(data: UndertakingOption2LetterData): string {
  const doc = data.document;
  const sigName =
    esc(doc.signatory_name) || esc(doc.declarant_name) || esc(data.contactPerson) || "—";
  const sigDesig = esc(doc.signatory_designation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "u2-signatory-block",
    forClass: "u2-signatory-for",
    sigWrapClass: "u2-signatory-sig",
    lineClass: "u2-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildBodyHtml(data: UndertakingOption2LetterData): string {
  const doc = data.document;
  const declarant = blankOr(doc.declarant_name || data.contactPerson || data.companyName);
  const product = blankOr(doc.product_for_mark);
  const standard = blankOr(doc.is_standard || data.isNumber);
  const factoryAddr = formatFactoryAddressForDeclaration(doc.factory_address, data.address);

  return `
<p class="u2-salutation">Dear Sir</p>

<p class="u2-declaration">
  I, <strong>${declarant}</strong> have applied for a license under Option 2 to you for use of BIS standard mark on <strong>${product}</strong> according to <strong>${standard}</strong> being manufactured at our factory at <strong>${factoryAddr}</strong>
</p>

<p class="u2-agreement">I clearly understand and agree to the conditions that-</p>

${buildConditionsHtml()}

<div class="u2-footer">
  ${buildSignatoryBlockHtml(data)}
</div>`;
}

function buildFormBody(data: UndertakingOption2LetterData): string {
  return `
<div class="u2-sheet">
  ${buildFormHeaderHtml()}
  ${buildLetterIntroHtml(data)}
  ${buildBodyHtml(data)}
  ${buildPageIndicatorHtml()}
</div>`;
}

export type UndertakingOption2PrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildUndertakingOption2Company(
  data: UndertakingOption2LetterData,
  assets?: UndertakingOption2PrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Letterhead matches Top Management / Plant & Machinery — text-only / no logo tile.
    logo_url: null,
  };
}

export function defaultUndertakingOption2PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
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

/** Force no-logo letterhead for Undertaking Option 2 preview / Word (same as Top Management). */
export function undertakingOption2LetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildUndertakingOption2Html(
  data: UndertakingOption2LetterData,
  settings: PrintSettings,
  assets?: UndertakingOption2PrintAssets,
): string {
  const letterheadSettings = undertakingOption2LetterheadSettings(settings);
  const pageSize = iframeSizeForPrintSettings(letterheadSettings);
  const sheetMinHeight = `calc(${pageSize.heightMm}mm - ${letterheadSettings.margin_top}mm - ${letterheadSettings.margin_bottom}mm)`;
  const styles = `
    .u2-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 4mm;
    }
    .u2-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      line-height: 1.35;
    }
    .u2-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .u2-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 12px;
    }
    .u2-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.55;
    }
    .u2-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.55;
    }
    .u2-date-block div + div {
      margin-top: 4px;
    }
    .u2-salutation {
      margin: 0 0 10px;
      font-size: 10px;
    }
    .u2-declaration {
      margin: 0 0 10px;
      font-size: 10px;
      line-height: 1.55;
      text-align: justify;
    }
    .u2-agreement {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
    }
    .u2-conditions p {
      margin: 6px 0;
      font-size: 10.5px;
      line-height: 1.5;
      text-align: justify;
    }
    .u2-footer {
      margin-top: 28px;
      display: flex;
      justify-content: flex-end;
    }
    .u2-signatory-block {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .u2-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .u2-signatory-sig {
      margin-top: 32px;
      min-width: 200px;
      text-align: right;
    }
    .u2-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
  `;

  return buildPrintDocument({
    title: "Undertaking for Simplified Procedure (Option 2)",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings: letterheadSettings,
    company: buildUndertakingOption2Company(data, assets),
  });
}

export function iframeSizeForUndertakingOption2PrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
