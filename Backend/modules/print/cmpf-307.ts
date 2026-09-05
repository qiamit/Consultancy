import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  CMPF307_ROWS_PER_PAGE,
  paginateBrandRows,
  type Cmpf307BrandStored,
  type Cmpf307Stored,
} from "@backend/modules/bis/cmpf-307";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type Cmpf307LetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  firmRepName: string;
  firmRepDesignation: string;
  document: Cmpf307Stored;
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

function buildTitleHtml(): string {
  return `
<div class="cmpf-form-id">CMPF - 307</div>
<h1 class="cmpf-title">Declaration of Brand Names Proposed to be Covered Under Certification</h1>`;
}

function buildPageIndicatorHtml(pageNum: number, totalPages: number): string {
  return `<div class="cmpf-page-indicator">Page ${padPageNum(pageNum)} of ${padPageNum(totalPages)}</div>`;
}

function buildLetterIntroHtml(data: Cmpf307LetterData): string {
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<div class="cmpf-to-row">
  <div class="cmpf-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standard<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="cmpf-date-block">
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildBrandTableHtml(pageRows: Cmpf307BrandStored[], startIndex: number): string {
  const th =
    "border:1px solid #111;padding:4px 3px;font-size:8px;font-weight:700;text-align:center;vertical-align:middle;background:#eef2f7;line-height:1.25;";
  const td =
    "border:1px solid #111;padding:4px 3px;font-size:9px;text-align:center;vertical-align:middle;line-height:1.3;min-height:20px;";

  const thSr =
    `${th}width:3%;padding:4px 2px;`;
  const tdSr =
    `${td}width:3%;padding:4px 2px;`;

  const body = pageRows
    .map((row, i) => {
      const sr = startIndex + i + 1;
      return `<tr>
        <td style="${tdSr}">${sr}</td>
        <td style="${td}width:42%;text-align:left;">${esc(row.brand_name) || "&nbsp;"}</td>
        <td style="${td}width:14%;">${esc(row.owned_by) || "&nbsp;"}</td>
        <td style="${td}width:16%;">${esc(row.registered_status) || "&nbsp;"}</td>
        <td style="${td}width:25%;">${esc(row.registration_date) || "&nbsp;"}</td>
      </tr>`;
    })
    .join("");

  return `
<p class="cmpf-section-heading"><strong>4. Brand/Trade Names Being Used:-</strong></p>
<table class="cmpf-brand-table" style="width:100%;border-collapse:collapse;table-layout:fixed;">
  <thead>
    <tr>
      <th style="${thSr}">Sr.</th>
      <th style="${th}width:42%;">Brand Names / Trade – Mark(s) Which would be Marked on the Product Bearing the BIS Standard Mark<br>(Give Actual Design Depiction of the Brand Name / Trade – Mark(s)</th>
      <th style="${th}width:14%;">Owned By Self OR Others</th>
      <th style="${th}width:16%;">Registered / Unregistered</th>
      <th style="${th}width:25%;">Date of Registration / Introduction</th>
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>`;
}

function buildNotesAndDeclarationsHtml(data: Cmpf307LetterData): string {
  const reasons = esc(data.document.brands_without_mark_reasons) || "&nbsp;";

  return `
<div class="cmpf-notes-block">
  <p><strong>Note-1:-</strong> In case brand name is registered in your name, enclose copies of Registration Certificate/ Document.</p>
  <p><strong>Note-2:-</strong> In case brand name is not registered in your name, enclose copies of Agreement authorizing use of this/these brand name(s).</p>
</div>

<p class="cmpf-section-heading"><strong>5.</strong> Brand/Trade Names which will not carry BIS Certification Mark. Give reasons.</p>
<div class="cmpf-reasons-box">${reasons}</div>

<div class="cmpf-declarations">
  <p><strong>6.</strong> I/We understand that in the event of a dispute with any other party over the use of the above Brand Names/ Trade Marks, the responsibility is entirely ours and BIS would not be involved in such disputes.</p>
  <p><strong>7.</strong> I/We also understand that in the event of any change, I/We will submit a revised declaration in the prescribed proforma before introducing the change in brand use including deletion or addition.</p>
  <p><strong>8.</strong> I/We also understand to maintain production and dispatch records of the product covered under the licence under each brand separately.</p>
  <p><strong>9.</strong> I/We also understand that, as far as possible, the entire production under the above brands and which conforms to the specification shall be marked with the Standard Mark.</p>
</div>`;
}

function buildSignatoryBlockHtml(data: Cmpf307LetterData): string {
  const sigName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.firmRepDesignation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "cmpf-signatory-block",
    forClass: "cmpf-signatory-for",
    sigWrapClass: "cmpf-signatory-sig",
    lineClass: "cmpf-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildSinglePageHtml(
  data: Cmpf307LetterData,
  pageRows: Cmpf307BrandStored[],
  pageNum: number,
  totalPages: number,
  startIndex: number,
  isLastPage: boolean,
): string {
  return `
<div class="cmpf-sheet${pageNum > 1 ? " page-break" : ""}">
  ${buildTitleHtml()}
  ${pageNum === 1 ? buildLetterIntroHtml(data) : ""}
  ${buildBrandTableHtml(pageRows, startIndex)}
  ${isLastPage ? buildNotesAndDeclarationsHtml(data) : ""}
  ${isLastPage ? buildSignatoryBlockHtml(data) : ""}
  ${buildPageIndicatorHtml(pageNum, totalPages)}
</div>`;
}

function buildFormBody(data: Cmpf307LetterData): string {
  const pages = paginateBrandRows(data.document.brands, CMPF307_ROWS_PER_PAGE);
  const totalPages = pages.length;
  let rowOffset = 0;

  return pages
    .map((pageRows, i) => {
      const html = buildSinglePageHtml(
        data,
        pageRows,
        i + 1,
        totalPages,
        rowOffset,
        i === totalPages - 1,
      );
      rowOffset += pageRows.length;
      return html;
    })
    .join("");
}

export type Cmpf307PrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildCmpf307Company(
  data: Cmpf307LetterData,
  assets?: Cmpf307PrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Letterhead matches Top Management / Plant & Machinery — text-only / no logo tile.
    logo_url: null,
  };
}

export function defaultCmpf307PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    letterhead_layout: "logo-na",
    show_letterhead: true,
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

/** Force no-logo letterhead for CMPF 307 preview / Word (same as Top Management). */
export function cmpf307LetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildCmpf307Html(
  data: Cmpf307LetterData,
  settings: PrintSettings,
  assets?: Cmpf307PrintAssets,
): string {
  const letterheadSettings = cmpf307LetterheadSettings(settings);
  const pageSize = iframeSizeForPrintSettings(letterheadSettings);
  const sheetMinHeight = `calc(${pageSize.heightMm}mm - ${letterheadSettings.margin_top}mm - ${letterheadSettings.margin_bottom}mm)`;
  const styles = `
    .cmpf-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 4mm;
    }
    .cmpf-form-id {
      text-align: right;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .cmpf-title {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      letter-spacing: 0.02em;
      line-height: 1.35;
    }
    .cmpf-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .cmpf-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 12px;
    }
    .cmpf-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.55;
    }
    .cmpf-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.55;
    }
    .cmpf-section-heading {
      margin: 12px 0 6px;
      font-size: 10px;
    }
    .cmpf-notes-block p {
      margin: 4px 0;
      font-size: 9px;
      line-height: 1.45;
    }
    .cmpf-reasons-box {
      border: 1px solid #111;
      min-height: 36px;
      padding: 6px 8px;
      font-size: 10px;
      margin-bottom: 8px;
    }
    .cmpf-declarations p {
      margin: 6px 0;
      font-size: 9px;
      line-height: 1.45;
      text-align: justify;
    }
    .cmpf-signatory-block {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .cmpf-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .cmpf-signatory-sig {
      margin-top: 32px;
      min-width: 200px;
      text-align: right;
    }
    .cmpf-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
    .page-break { page-break-before: always; }
  `;

  return buildPrintDocument({
    title: "CMPF 307 — Declaration of Brand Names",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings: letterheadSettings,
    company: buildCmpf307Company(data, assets),
  });
}

export function iframeSizeForCmpf307PrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
