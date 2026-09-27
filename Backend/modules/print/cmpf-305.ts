import { buildLetterheadHtml, buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  rowHasContent,
  type Cmpf305MachineryStored,
} from "@backend/modules/bis/cmpf-305";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import {
  buildRightAlignedSignatoryBlockHtml,
  signatorySignatureOverlayHtml,
} from "@backend/modules/print/signatory-signature";

export type Cmpf305LetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  inspectionOfficerName: string;
  inspectionOfficerDesignation: string;
  firmRepName: string;
  firmRepDesignation: string;
  rows: Cmpf305MachineryStored[];
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

export function formatCmpf305ApplicantAddress(address: string): string {
  const line = (address ?? "").trim();
  if (!line) return "______________________________, INDIA";
  if (/\bindia\b/i.test(line)) return line;
  return `${line}, INDIA`;
}

function formatApplicantAddress(address: string): string {
  return esc(formatCmpf305ApplicantAddress(address));
}

function formatBisBranchLine(branchName: string, state: string): string {
  const branch = branchName.trim() || "________________";
  const st = state.trim() || "________________";
  return `${esc(branch)}, ${esc(st)}, INDIA`;
}

function headerGridCellStyles(): { lbl: string; val: string } {
  // Borders come from CSS (.cmpf-header-grid td) so adjacent edges stay 1px — no double lines.
  const cell = "padding:4px 6px;font-size:10px;vertical-align:middle;line-height:1.35;";
  return {
    lbl: `${cell}font-weight:700;width:18%;background:#eef2f7;`,
    val: `${cell}font-weight:600;`,
  };
}

function buildApplicationMetaRowsHtml(data: Cmpf305LetterData): string {
  const { lbl, val } = headerGridCellStyles();
  const appNo = formatApplicationNo(data.applicationNumber);
  const dateApp = formatMetaDate(data.dateOfApplication);
  const dateInsp = formatMetaDate(data.dateOfInspection);
  const isCode = esc(data.isNumber) || "—";

  return `
  <tr>
    <td style="${lbl}">Application No.</td>
    <td style="${val}">${esc(appNo)}</td>
    <td style="${lbl}width:22%;">Date of Application</td>
    <td style="${val}">${esc(dateApp)}</td>
  </tr>
  <tr>
    <td style="${lbl}">IS Code</td>
    <td style="${val}">${isCode}</td>
    <td style="${lbl}">Date of Inspection</td>
    <td style="${val}">${esc(dateInsp)}</td>
  </tr>`;
}

/** Page 1 — Form-I title + one header table (firm + application meta). */
function buildFormCoverHeaderHtml(data: Cmpf305LetterData): string {
  const { lbl, val } = headerGridCellStyles();
  const applicant = esc(data.companyName) || "—";

  return `
<div class="cmpf-form-id">Form - I</div>
<h1 class="cmpf-title">Declaration Regarding Manufacturing Machinery</h1>
<table class="cmpf-header-grid" style="width:100%;margin-bottom:8px;">
  <colgroup>
    <col style="width:18%" />
    <col style="width:32%" />
    <col style="width:22%" />
    <col style="width:28%" />
  </colgroup>
  <tr>
    <td style="${lbl}">Applicant Name</td>
    <td style="${val}" colspan="3">${applicant}</td>
  </tr>
  <tr>
    <td style="${lbl}">Applicant Address</td>
    <td style="${val}" colspan="3">${formatApplicantAddress(data.address)}</td>
  </tr>
  ${buildApplicationMetaRowsHtml(data)}
</table>`;
}

/** Application No. + IS Code table — continuation pages (under letterhead). */
function buildApplicationMetaGridHtml(data: Cmpf305LetterData): string {
  return `
<table class="cmpf-header-grid cmpf-meta-grid" style="width:100%;margin:0 0 8px;">
  <colgroup>
    <col style="width:18%" />
    <col style="width:32%" />
    <col style="width:22%" />
    <col style="width:28%" />
  </colgroup>
  ${buildApplicationMetaRowsHtml(data)}
</table>`;
}

function machineryTableColgroup(settings: PrintSettings): string {
  const widths =
    settings.orientation === "landscape"
      ? [5, 30, 12, 24, 10, 19]
      : [6, 26, 12, 24, 10, 22];
  return `<colgroup>${widths.map((w) => `<col style="width:${w}%" />`).join("")}</colgroup>`;
}

function buildMachineryTableHtml(
  pageRows: Cmpf305MachineryStored[],
  startIndex: number,
  settings: PrintSettings,
): string {
  const th = "cmpf-cell cmpf-th";
  const td = "cmpf-cell cmpf-td";
  const tdLeft = "cmpf-cell cmpf-td cmpf-col-name";
  const thSr = `${th} cmpf-col-sr`;
  const tdSr = `${td} cmpf-col-sr`;
  const thCompact = `${th} cmpf-col-compact`;
  const tdCompact = `${td} cmpf-col-compact`;
  const thName = `${th} cmpf-col-name`;

  const body =
    pageRows.length === 0
      ? `<tr>
        <td class="${td}" colspan="6">No plant &amp; machinery details entered yet.</td>
      </tr>`
      : pageRows
          .map((row, i) => {
            const sr = startIndex + i + 1;
            return `<tr>
        <td class="${tdSr}">${sr}</td>
        <td class="${tdLeft}">${esc(row.machinery_name) || "&nbsp;"}</td>
        <td class="${tdCompact}">${esc(row.make) || "&nbsp;"}</td>
        <td class="${tdCompact}">${esc(row.production_capacity_per_day) || "&nbsp;"}</td>
        <td class="${tdCompact}">${esc(row.number) || "&nbsp;"}</td>
        <td class="${tdCompact}">${esc(row.remarks) || "&nbsp;"}</td>
      </tr>`;
          })
          .join("");

  return `<table class="cmpf-machinery-table">
    ${machineryTableColgroup(settings)}
    <thead>
      <tr>
        <th class="${thSr}">Sr<br/>No</th>
        <th class="${thName}">Machinery Name</th>
        <th class="${thCompact}">Make</th>
        <th class="${thCompact}">Production Capacity / Day<br>(If Applicable)</th>
        <th class="${thCompact}">Number</th>
        <th class="${thCompact}">Remarks</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`;
}

function buildFooterHtml(data: Cmpf305LetterData): string {
  const firmName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const firmDesig = esc(data.firmRepDesignation) || "—";
  const bisName = esc(data.inspectionOfficerName) || "----";
  const bisDesig = esc(data.inspectionOfficerDesignation) || "----";
  const dateInsp = formatMetaDate(data.dateOfInspection);

  return `
<p class="cmpf-extra-note"><em>Note: Attach Extra Sheet, If Required</em></p>
<div class="cmpf-footer-gap" aria-hidden="true"></div>
<table class="cmpf-decl-table">
  <tr>
    <td class="cmpf-decl-box">
      <div class="cmpf-decl-cell-inner">
        <div class="cmpf-decl-text">
          <p style="margin:0 0 6px;text-align:justify;">
            I hereby declare that the machinery of which details are given overleaf is owned by me and are actually installed in the premises.*
          </p>
          <p style="margin:0;text-align:justify;">
            I also declare that in case of grant of licence, I will send prior intimation to BIS whenever any machinery is takenout of the premises of the firm due to any reason.
          </p>
        </div>
        <div class="cmpf-decl-sig-area">
          <div class="cmpf-decl-sig-spacer"></div>
          <div class="cmpf-decl-sig-line">
            <div>Sig. of Firm's Representative :-</div>
            <div style="position:relative;display:inline-block;min-width:210px;padding-right:95px;">
              ${signatorySignatureOverlayHtml(data.signatureImageUrl, {
                left: "auto",
                right: "0",
                top: "calc(-36px + 1mm)",
                maxHeight: "42px",
                maxWidth: "105px",
              })}
              <div style="position:relative;z-index:1;">Name :- ${firmName}</div>
            </div>
            <div>Designation :- ${firmDesig}</div>
            <div>Date :- ${esc(dateInsp)}</div>
          </div>
        </div>
      </div>
    </td>
    <td class="cmpf-decl-box">
      <div class="cmpf-decl-cell-inner">
        <div class="cmpf-decl-text">
          <p style="margin:0;text-align:right;">
            I have checked and found that Machinery of which details are given overleaf was available during my Inspection
          </p>
        </div>
        <div class="cmpf-decl-sig-area">
          <div class="cmpf-decl-sig-spacer"></div>
          <div class="cmpf-decl-sig-line" style="text-align:right;">
            <div>Sig. of BIS Certification Officer :-</div>
            <div>Name :- ${bisName}</div>
            <div>Designation :- ${bisDesig}</div>
            <div>Date :- ${esc(dateInsp)}</div>
          </div>
        </div>
      </div>
    </td>
  </tr>
</table>
<p class="cmpf-footnote">
  * If Any Part of the Manufacturing Activity is Out Sourced, Details of Machinery used for Out Sourced Activity shall be Indicated in a Separate form Along with Complete Address of the Out Sourced Premises
</p>`;
}

/** Usable height for machinery rows on a continuation sheet (page 2+). */
function cmpf305TableBodyBudgetMm(settings: PrintSettings): number {
  const { heightMm } = iframeSizeForPrintSettings(settings);
  const usable = Math.max(
    80,
    heightMm - settings.margin_top - settings.margin_bottom,
  );
  const letterhead = settings.show_letterhead ? 34 : 0;
  const meta = 16;
  const tableHeader = 8;
  const tableTop = 2;
  const signatory = 34;
  const pageNum = 8;
  const slack = 4;
  return Math.max(40, usable - letterhead - meta - tableHeader - tableTop - signatory - pageNum - slack);
}

function cmpf305TextLineCount(value: string, charsPerLine: number): number {
  const parts = String(value ?? "").trim().split(/\n/);
  if (!parts.length || (parts.length === 1 && !parts[0])) return 1;
  return Math.max(
    1,
    ...parts.map((part) => Math.ceil(Math.max(1, part.length) / Math.max(8, charsPerLine))),
  );
}

/** Fit-to-content row: 1mm + 1mm padding plus wrapped line height. */
function estimateCmpf305RowHeightMm(row: Cmpf305MachineryStored, landscape: boolean): number {
  const padMm = 2;
  const lineMm = landscape ? 2.8 : 3.0;
  const nameWidth = landscape ? 38 : 24;
  const compactWidth = landscape ? 16 : 12;
  const remarksWidth = landscape ? 22 : 18;
  const lines = Math.max(
    cmpf305TextLineCount(row.machinery_name, nameWidth),
    cmpf305TextLineCount(row.make, compactWidth),
    cmpf305TextLineCount(row.production_capacity_per_day, compactWidth + 4),
    cmpf305TextLineCount(row.number, 10),
    cmpf305TextLineCount(row.remarks, remarksWidth),
  );
  return padMm + lines * lineMm;
}

/** How many single-line rows would fill one continuation sheet. */
export function cmpf305RowsCapacity(settings: PrintSettings): number {
  const rowMm = settings.orientation === "landscape" ? 4.8 : 5.0;
  const cap = settings.orientation === "landscape" ? 48 : 42;
  return Math.max(4, Math.min(cap, Math.floor(cmpf305TableBodyBudgetMm(settings) / rowMm)));
}

/**
 * Page 1 is the fixed Form-I cover.
 * Page 2+ pack as many fit-to-content rows as the sheet allows, then spill to the next page.
 */
export function paginateCmpf305ForPrint(
  rows: Cmpf305MachineryStored[],
  settings: PrintSettings,
): Cmpf305MachineryStored[][] {
  const visible = rows.filter(rowHasContent);
  if (visible.length === 0) return [[]];

  const landscape = settings.orientation === "landscape";
  const budget = cmpf305TableBodyBudgetMm(settings);
  const maxRows = landscape ? 48 : 42;
  const pages: Cmpf305MachineryStored[][] = [];
  let page: Cmpf305MachineryStored[] = [];
  let used = 0;

  for (const row of visible) {
    const height = estimateCmpf305RowHeightMm(row, landscape);
    if (page.length > 0 && (used + height > budget || page.length >= maxRows)) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(row);
    used += height;
  }
  if (page.length) pages.push(page);
  return pages;
}

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function buildPageIndicatorHtml(pageNum: number, totalPages: number): string {
  return `<div class="cmpf-page-indicator">Page ${padPageNum(pageNum)} of ${padPageNum(totalPages)}</div>`;
}

function buildPageGapHtml(_pageNum: number, _totalPages: number): string {
  return "";
}

function buildDummyPlantMachineryTableHtml(settings: PrintSettings): string {
  const th = "cmpf-cell cmpf-th";
  const td = "cmpf-cell cmpf-td";
  const tdLeft = "cmpf-cell cmpf-td cmpf-col-name";
  const thSr = `${th} cmpf-col-sr`;
  const tdSr = `${td} cmpf-col-sr`;
  const thCompact = `${th} cmpf-col-compact`;
  const tdCompact = `${td} cmpf-col-compact`;
  const thName = `${th} cmpf-col-name`;

  const emptyRow = (sr: number) => `
<tr>
  <td class="${tdSr}">${sr}</td>
  <td class="${tdLeft}">&nbsp;</td>
  <td class="${tdCompact}">&nbsp;</td>
  <td class="${tdCompact}">&nbsp;</td>
  <td class="${tdCompact}">&nbsp;</td>
  <td class="${tdCompact}">&nbsp;</td>
</tr>`;

  const mergedRow = `
<tr>
  <td class="${td} cmpf-dummy-merge" colspan="6">(List of Plant &amp; Machinery is Attached)</td>
</tr>`;

  return `
<table class="cmpf-machinery-table cmpf-dummy-machinery-table">
  ${machineryTableColgroup(settings)}
  <thead>
    <tr>
      <th class="${thSr}">Sr<br/>No</th>
      <th class="${thName}">Machinery Name</th>
      <th class="${thCompact}">Make</th>
      <th class="${thCompact}">Production Capacity / Day<br>(If Applicable)</th>
      <th class="${thCompact}">Number</th>
      <th class="${thCompact}">Remarks</th>
    </tr>
  </thead>
  <tbody>
    ${emptyRow(1)}
    ${emptyRow(2)}
    ${mergedRow}
    ${emptyRow(4)}
    ${emptyRow(5)}
  </tbody>
</table>`;
}

function buildToBlockHtml(data: Cmpf305LetterData): string {
  return `
<div class="cmpf-to-block">
  To<br/>
  The Director &amp; Head<br/>
  Bureau of Indian Standard<br/>
  ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
</div>`;
}

/** Page 1 — letterhead + Form-I + Applicant + To + dummy machinery table + declaration. */
function buildFormCoverPageHtml(
  data: Cmpf305LetterData,
  totalPages: number,
  settings: PrintSettings,
  company: PrintCompanyInfo,
): string {
  const letterheadHtml = buildLetterheadHtml(company ?? buildCmpf305Company(data), settings);
  return `
${buildPageGapHtml(1, totalPages)}
<div class="cmpf-sheet cmpf-sheet-cover">
  <div class="cmpf-sheet-body">
    ${letterheadHtml}
    ${buildFormCoverHeaderHtml(data)}
    ${buildToBlockHtml(data)}
    ${buildDummyPlantMachineryTableHtml(settings)}
    <div class="cmpf-footer-wrap">${buildFooterHtml(data)}</div>
  </div>
  ${buildPageIndicatorHtml(1, totalPages)}
</div>`;
}

/** Top Management–style signatory block for continuation pages. */
function buildContinuationSignatoryHtml(data: Cmpf305LetterData): string {
  const sigName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.firmRepDesignation) || "—";
  return buildRightAlignedSignatoryBlockHtml({
    companyName: esc(data.companyName) || "—",
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

/** Page 2+ — letterhead + Application meta + machinery table + TM-style signature. */
function buildTablePageHtml(
  data: Cmpf305LetterData,
  pageRows: Cmpf305MachineryStored[],
  pageNum: number,
  totalPages: number,
  startIndex: number,
  settings: PrintSettings,
  company: PrintCompanyInfo,
): string {
  const letterheadHtml = buildLetterheadHtml(company, settings);
  return `
${buildPageGapHtml(pageNum, totalPages)}
<div class="cmpf-sheet${pageNum > 1 ? " page-break" : ""}">
  <div class="cmpf-sheet-body">
    ${letterheadHtml}
    ${buildApplicationMetaGridHtml(data)}
    ${buildMachineryTableHtml(pageRows, startIndex, settings)}
    <div class="cmpf-continuation-signatory">${buildContinuationSignatoryHtml(data)}</div>
  </div>
  ${buildPageIndicatorHtml(pageNum, totalPages)}
</div>`;
}

function buildFormBody(
  data: Cmpf305LetterData,
  settings: PrintSettings,
  company: PrintCompanyInfo,
  onlyPage?: number,
): string {
  const tablePages = paginateCmpf305ForPrint(data.rows, settings);
  const totalPages = 1 + tablePages.length;
  const wanted = onlyPage && onlyPage >= 1 && onlyPage <= totalPages ? onlyPage : 0;
  let startIndex = 0;

  const cover =
    !wanted || wanted === 1
      ? buildFormCoverPageHtml(data, totalPages, settings, company)
      : "";
  const tables = tablePages
    .map((pageRows, i) => {
      const pageNum = i + 2;
      const html =
        wanted && wanted !== pageNum
          ? ""
          : buildTablePageHtml(
              data,
              pageRows,
              pageNum,
              totalPages,
              startIndex,
              settings,
              company,
            );
      startIndex += pageRows.length;
      return html;
    })
    .join("");

  return `<div class="cmpf-sheets">${cover}${tables}</div>`;
}

export type Cmpf305PrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildCmpf305Company(
  data: Cmpf305LetterData,
  assets?: Cmpf305PrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Plant & Machinery letterhead matches Top Management — text-only / no logo tile.
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

export function defaultCmpf305PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    letterhead_layout: "logo-na",
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 10,
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 15,
    margin_right: 5,
  };
}

/** Force no-logo letterhead for CMPF 305 preview / Word (same as Top Management). */
export function cmpf305LetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildCmpf305Html(
  data: Cmpf305LetterData,
  settings: PrintSettings,
  assets?: Cmpf305PrintAssets,
  opts?: { onlyPage?: number },
): string {
  const letterheadSettings = cmpf305LetterheadSettings(settings);
  const company = buildCmpf305Company(data, assets);
  const pageSize = iframeSizeForPrintSettings(letterheadSettings);
  const sheetPad = `${letterheadSettings.margin_top}mm ${letterheadSettings.margin_right}mm ${letterheadSettings.margin_bottom}mm ${letterheadSettings.margin_left}mm`;
  const styles = `
    .doc-page {
      padding: 0 !important;
      max-width: none !important;
    }
    .cmpf-sheets {
      width: ${pageSize.widthMm}mm;
    }
    .cmpf-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      width: ${pageSize.widthMm}mm;
      height: ${pageSize.heightMm}mm;
      min-height: ${pageSize.heightMm}mm;
      max-height: ${pageSize.heightMm}mm;
      overflow: hidden;
      box-sizing: border-box;
      padding: ${sheetPad};
      display: flex;
      flex-direction: column;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .cmpf-sheet-cover {
      overflow: hidden;
    }
    .cmpf-sheet-body {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      padding-bottom: 6mm;
    }
    .cmpf-page-gap {
      display: none;
    }
    .cmpf-form-id {
      text-align: right;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 4px;
      flex-shrink: 0;
    }
    .cmpf-title {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 6px;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }
    .cmpf-header-grid {
      flex-shrink: 0;
      border-collapse: collapse;
      border-spacing: 0;
      border: none;
    }
    .cmpf-header-grid td {
      border: 1px solid #111;
      border-width: 1px;
    }
    .cmpf-meta-grid {
      flex-shrink: 0;
    }
    /* Continuation pages embed their own letterhead inside the sheet. */
    .cmpf-sheet .lh-wrap {
      flex-shrink: 0;
      margin-bottom: 6px !important;
      padding-top: 4px !important;
      padding-bottom: 6px !important;
    }
    .cmpf-page-indicator {
      position: absolute;
      right: 5mm;
      bottom: 5mm;
      margin: 0;
      padding: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
      line-height: 1.2;
      z-index: 3;
      background: #fff;
    }
    .cmpf-to-block {
      font-size: 11px;
      line-height: 1.45;
      margin: 4px 0 2px;
      flex-shrink: 0;
    }
    .cmpf-extra-note {
      margin: 4px 0 2px;
      font-size: 11px;
      text-align: left;
      flex-shrink: 0;
      width: 100%;
      align-self: stretch;
    }
    .cmpf-footnote {
      margin: 4px 0 0;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.4;
      text-align: justify;
      flex-shrink: 0;
      width: 100%;
      align-self: stretch;
    }
    .cmpf-machinery-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      table-layout: fixed;
      margin-top: 6px;
      border: none;
      flex: 0 0 auto;
      height: auto;
      min-height: 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .cmpf-machinery-table thead {
      display: table-header-group;
    }
    .cmpf-machinery-table tr {
      height: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .cmpf-machinery-table .cmpf-cell {
      border: 1px solid #111;
      border-width: 1px;
      padding: 1mm 4px;
      height: auto;
      vertical-align: middle;
      line-height: 1.25;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .cmpf-machinery-table .cmpf-th {
      font-size: 8px;
      font-weight: 700;
      text-align: center;
      background: #eef2f7;
      line-height: 1.25;
    }
    .cmpf-machinery-table .cmpf-td {
      font-size: 9px;
      text-align: center;
      min-height: 0;
    }
    .cmpf-machinery-table .cmpf-col-sr {
      white-space: nowrap;
    }
    .cmpf-machinery-table .cmpf-col-compact {
      text-align: center;
    }
    .cmpf-machinery-table .cmpf-col-name {
      text-align: left;
    }
    .cmpf-dummy-machinery-table {
      margin-top: 6px;
      margin-bottom: 2px;
      flex-shrink: 0;
    }
    .cmpf-dummy-machinery-table .cmpf-dummy-merge {
      text-align: center;
      font-weight: 700;
      font-size: 10px;
      padding: 8px 6px;
    }
    .cmpf-footer-wrap {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      align-self: stretch;
      margin-top: 4px;
      padding-top: 2px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    .cmpf-footer-gap {
      flex: 1 1 auto;
      min-height: 6mm;
      width: 100%;
    }
    .cmpf-decl-table {
      width: 100% !important;
      min-width: 100%;
      max-width: 100%;
      border-collapse: collapse;
      margin-top: 2px;
      table-layout: fixed;
      flex: 0 0 auto;
      align-self: stretch;
      height: auto;
      min-height: 73mm;
    }
    .cmpf-decl-box {
      border: 1px solid #111;
      padding: 0;
      vertical-align: top;
      width: 50%;
      height: auto;
    }
    .cmpf-decl-cell-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 73mm;
      width: 100%;
    }
    .cmpf-decl-text {
      padding: 5px 7px 3px;
      font-size: 11px;
      line-height: 1.4;
      flex-shrink: 0;
    }
    .cmpf-decl-sig-area {
      flex: 1 1 auto;
      min-height: 40mm;
      background: #eef2f7;
      padding: 5px 7px;
      display: flex;
      flex-direction: column;
      width: 100%;
      box-sizing: border-box;
    }
    .cmpf-decl-sig-spacer {
      flex: 1 1 auto;
      min-height: 22mm;
    }
    .cmpf-decl-sig-line {
      font-size: 11px;
      line-height: 1.4;
      flex-shrink: 0;
    }
    .cmpf-continuation-signatory {
      flex-shrink: 0;
      margin-top: 6px;
      margin-bottom: 0;
      padding-top: 0;
      padding-bottom: 0;
    }
    .cmpf-continuation-signatory > div {
      margin-top: 6px !important;
      margin-bottom: 0 !important;
    }
    .cmpf-sheets {
      display: block;
    }
    .page-break { page-break-before: auto; break-before: auto; }
    @media screen {
      html, body, .doc-page {
        background: #52525b !important;
      }
      .cmpf-sheets {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3mm;
        background: transparent;
      }
      .cmpf-sheet {
        background: #fff;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
      }
      .cmpf-page-gap {
        display: none !important;
      }
    }
    @media print {
      html, body {
        width: ${pageSize.widthMm}mm;
        margin: 0 !important;
        padding: 0 !important;
      }
      .cmpf-page-gap {
        display: none !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
      }
      .cmpf-sheet {
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .cmpf-sheets > .cmpf-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  `;

  return buildPrintDocument({
    title: "CMPF 305 — Declaration Regarding Manufacturing Machinery",
    bodyHtml: buildFormBody(data, letterheadSettings, company, opts?.onlyPage),
    extraStyles: styles,
    // Sheets embed their own letterhead. An outer copy made Chromium overflow
    // page 1 and emit a blank extra page on PDF download.
    settings: { ...letterheadSettings, show_letterhead: false },
    company,
  });
}

export function cmpf305PrintPageCount(
  data: Cmpf305LetterData,
  settings: PrintSettings,
): number {
  // Form-I cover + machinery table page(s).
  return (
    1 +
    paginateCmpf305ForPrint(data.rows, cmpf305LetterheadSettings(settings)).length
  );
}

export function iframeSizeForCmpf305PrintSettings(
  settings: PrintSettings,
  pageCount = 1,
): {
  widthMm: number;
  heightMm: number;
} {
  const base = iframeSizeForPrintSettings(settings);
  const pages = Math.max(1, pageCount);
  const gapMm = pages > 1 ? (pages - 1) * 3 : 0;
  return {
    widthMm: base.widthMm,
    // 8px ≈ 2mm top/bottom screen padding on .doc-page
    heightMm: base.heightMm * pages + gapMm + (pages > 0 ? 4 : 0),
  };
}
