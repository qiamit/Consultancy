import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  paginateRawMaterialRows,
  RAW_MATERIAL_ROWS_FIRST_PAGE,
  RAW_MATERIAL_ROWS_PER_PAGE,
  type RawMaterialStored,
} from "@backend/modules/bis/raw-material-details";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";
import {
  iframeSizeForPagedPrintSettings,
  printPageGapHtml,
} from "@backend/modules/print/paged-preview";

export type RawMaterialDetailsLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  firmRepName: string;
  firmRepDesignation: string;
  rows: RawMaterialStored[];
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

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function formatBisBranchLine(branchName: string, state: string, country: string): string {
  const parts = [
    branchName.trim() || "________________",
    state.trim() || "________________",
    country.trim() || "India",
  ];
  return parts.map(esc).join(", ");
}

function formatIsStandardRef(isNumber: string, isTitle: string): string {
  const num = (isNumber ?? "").trim();
  const title = (isTitle ?? "").trim();
  if (num && title) return `<strong>${esc(num)}</strong> — ${esc(title)}`;
  if (num) return `<strong>${esc(num)}</strong>`;
  if (title) return `<strong>${esc(title)}</strong>`;
  return "";
}

function buildPageHeaderHtml(): string {
  return `
<h1 class="rmd-title">Raw Material Details</h1>`;
}

function buildPageIndicatorHtml(pageNum: number, totalPages: number): string {
  return `<div class="rmd-page-indicator">Page ${padPageNum(pageNum)} of ${padPageNum(totalPages)}</div>`;
}

function buildIntroContentHtml(data: RawMaterialDetailsLetterData): string {
  const isStdRef = formatIsStandardRef(data.isNumber, data.isTitle ?? "");
  const bisBranchLine = formatBisBranchLine(
    data.bisBranchName,
    data.bisBranchState,
    data.bisBranchCountry,
  );
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<div class="rmd-intro">
  <div class="rmd-to-row">
    <div class="rmd-to-block">
      To<br/>
      The Director &amp; Head<br/>
      Bureau of Indian Standards<br/>
      ${bisBranchLine}
    </div>
    <div class="rmd-date-block">
      <div><strong>Date:</strong> ${esc(letterDate)}</div>
      <div><strong>Application No.:</strong> ${esc(appNo)}</div>
    </div>
  </div>

  <p class="rmd-para">
    <strong>Sub:</strong> Details of Raw Materials used in the manufacture of product(s) covered under
    BIS licence application${isStdRef ? ` for Indian Standard ${isStdRef}` : ""}.
  </p>

  <p class="rmd-para">
    We, <strong>M/s. ${esc(data.companyName)}</strong>,
    ${data.address ? ` having our factory at <strong>${esc(data.address)}</strong>,` : ""}
    hereby furnish the following details of raw materials used in our manufacturing process
    ${isStdRef ? ` in connection with BIS certification under ${isStdRef}` : " in connection with BIS certification"}.
    The particulars regarding the name of supplier, with or without BIS Certification Mark on raw material,
    test certificate of the supplier, and how received batches/lots with nature of packaging are as under:
  </p>
</div>`;
}

function buildClosingDeclarationHtml(): string {
  return `
<p class="rmd-para rmd-closing">
  We declare that the information furnished above is true and correct to the best of our knowledge and belief.
  We undertake to maintain records of raw material receipts, supplier test certificates and batch/lot details,
  and to inform BIS of any change in raw material source, supplier or specifications.
</p>`;
}

function materialTableColgroup(_settings: PrintSettings): string {
  const widths = [5, 25, 25, 15, 15, 15];
  return `<colgroup>${widths.map((w) => `<col style="width:${w}%" />`).join("")}</colgroup>`;
}

function buildMaterialTableHtml(
  pageRows: RawMaterialStored[],
  startIndex: number,
  settings: PrintSettings,
): string {
  const th = "rmd-cell rmd-th";
  const td = "rmd-cell rmd-td";
  const tdLeft = "rmd-cell rmd-td rmd-col-left";
  const thSr = `${th} rmd-col-sr`;
  const tdSr = `${td} rmd-col-sr`;

  const body = pageRows
    .map((row, i) => {
      const sr = startIndex + i + 1;
      return `<tr>
        <td class="${tdSr}">${sr}</td>
        <td class="${tdLeft}">${esc(row.raw_material) || "&nbsp;"}</td>
        <td class="${td}">${esc(row.supplier_name) || "&nbsp;"}</td>
        <td class="${td}">${esc(row.bis_certification_mark) || "&nbsp;"}</td>
        <td class="${td}">${esc(row.test_certificate) || "&nbsp;"}</td>
        <td class="${td}">${esc(row.batches_packaging) || "&nbsp;"}</td>
      </tr>`;
    })
    .join("");

  return `<table class="rmd-material-table">
    ${materialTableColgroup(settings)}
    <thead>
      <tr>
        <th class="${thSr}">Sr. No.</th>
        <th class="${th}">Raw Material</th>
        <th class="${th}">Name of Supplier</th>
        <th class="${th}">With OR Without BIS Certification Mark</th>
        <th class="${th}">Test Certificate of The Supplier</th>
        <th class="${th}">How Received Batches / Lots Nature of Packaging</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`;
}

function buildSignatoryBlockHtml(data: RawMaterialDetailsLetterData): string {
  const sigName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.firmRepDesignation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "rmd-signatory-block",
    forClass: "rmd-signatory-for",
    sigWrapClass: "rmd-signatory-sig",
    lineClass: "rmd-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildSinglePageHtml(
  data: RawMaterialDetailsLetterData,
  pageRows: RawMaterialStored[],
  pageNum: number,
  totalPages: number,
  startIndex: number,
  isLastPage: boolean,
  settings: PrintSettings,
): string {
  const sheetClass = [
    "rmd-sheet",
    "rmd-sheet-fill",
    pageNum > 1 ? "rmd-page-break rmd-sheet-cont" : "rmd-sheet-first",
  ]
    .filter(Boolean)
    .join(" ");

  return `
${printPageGapHtml(pageNum, totalPages)}
<div class="${sheetClass}">
  ${buildPageHeaderHtml()}
  ${pageNum === 1 ? buildIntroContentHtml(data) : ""}
  ${buildMaterialTableHtml(pageRows, startIndex, settings)}
  ${isLastPage ? buildClosingDeclarationHtml() : ""}
  ${isLastPage ? buildSignatoryBlockHtml(data) : ""}
  ${buildPageIndicatorHtml(pageNum, totalPages)}
</div>`;
}

function buildFormBody(data: RawMaterialDetailsLetterData, settings: PrintSettings): string {
  const pages = paginateRawMaterialRows(
    data.rows,
    RAW_MATERIAL_ROWS_PER_PAGE,
    RAW_MATERIAL_ROWS_FIRST_PAGE,
  );
  const totalPages = pages.length;
  let startIndex = 0;

  return pages
    .map((pageRows, i) => {
      const html = buildSinglePageHtml(
        data,
        pageRows,
        i + 1,
        totalPages,
        startIndex,
        i === totalPages - 1,
        settings,
      );
      startIndex += pageRows.length;
      return html;
    })
    .join("");
}

export type RawMaterialDetailsPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildRawMaterialDetailsCompany(
  data: RawMaterialDetailsLetterData,
  assets?: RawMaterialDetailsPrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Letterhead matches Top Management / Plant & Machinery — text-only / no logo tile.
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

export function defaultRawMaterialDetailsPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    letterhead_layout: "logo-na",
    font_family: "Times New Roman",
    font_size: 9,
    show_page_numbers: false,
    show_footer_line: false,
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 12,
    margin_right: 10,
  };
}

/** Force no-logo letterhead for Raw Material Details preview / Word (same as Top Management). */
export function rawMaterialDetailsLetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
    font_size: 9,
  };
}

export function rawMaterialDetailsPrintPageCount(rows: RawMaterialStored[]): number {
  return paginateRawMaterialRows(
    rows,
    RAW_MATERIAL_ROWS_PER_PAGE,
    RAW_MATERIAL_ROWS_FIRST_PAGE,
  ).length;
}

export function buildRawMaterialDetailsHtml(
  data: RawMaterialDetailsLetterData,
  settings: PrintSettings,
  assets?: RawMaterialDetailsPrintAssets,
): string {
  const letterheadSettings = rawMaterialDetailsLetterheadSettings(settings);
  const pageSize = iframeSizeForPrintSettings(letterheadSettings);
  const letterheadReserveMm = 26;
  const sheetMinHeightFirst = `calc(${pageSize.heightMm}mm - ${letterheadSettings.margin_top}mm - ${letterheadSettings.margin_bottom}mm - ${letterheadReserveMm}mm)`;
  const sheetMinHeightCont = `calc(${pageSize.heightMm}mm - ${letterheadSettings.margin_top}mm - ${letterheadSettings.margin_bottom}mm)`;
  const styles = `
    .rmd-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 9px;
      position: relative;
      width: 100%;
      box-sizing: border-box;
      padding-bottom: 6mm;
    }
    .rmd-sheet.rmd-sheet-fill.rmd-sheet-first {
      min-height: ${sheetMinHeightFirst};
    }
    .rmd-sheet.rmd-sheet-fill.rmd-sheet-cont {
      min-height: ${sheetMinHeightCont};
    }
    .rmd-title {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 6px;
      letter-spacing: 0.02em;
    }
    .rmd-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 9px;
      font-weight: 600;
      text-align: right;
    }
    .rmd-intro {
      font-size: 9.5px;
      line-height: 1.4;
      text-align: justify;
      margin: 4px 0 6px;
    }
    .rmd-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin: 0 0 6px;
    }
    .rmd-to-block {
      flex: 1;
      min-width: 0;
      line-height: 1.4;
    }
    .rmd-date-block {
      flex-shrink: 0;
      text-align: right;
      line-height: 1.4;
    }
    .rmd-date-block div + div {
      margin-top: 2px;
    }
    .rmd-para {
      margin: 0 0 6px;
    }
    .rmd-closing {
      margin-top: 8px;
      font-size: 9.5px;
      line-height: 1.4;
    }
    .rmd-material-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 4px;
    }
    .rmd-material-table .rmd-cell {
      border: 1px solid #111;
      padding: 2px 4px;
      vertical-align: middle;
      line-height: 1.25;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .rmd-material-table .rmd-th {
      font-size: 7px;
      font-weight: 700;
      text-align: center;
      background: #eef2f7;
      line-height: 1.2;
    }
    .rmd-material-table .rmd-td {
      font-size: 8.5px;
      text-align: center;
    }
    .rmd-material-table .rmd-col-left {
      text-align: left;
    }
    .rmd-material-table .rmd-col-sr {
      text-align: center;
    }
    .rmd-signatory-block {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 9.5px;
      line-height: 1.45;
      text-align: right;
    }
    .rmd-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .rmd-signatory-sig {
      margin-top: 18px;
      min-width: 180px;
      text-align: right;
    }
    .rmd-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 9.5px;
      line-height: 1.3;
      text-align: right;
    }
    .rmd-page-break {
      page-break-before: always;
      break-before: page;
    }
    @media print {
      .rmd-sheet {
        page-break-after: always;
        break-after: page;
      }
      .rmd-sheet:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
    }
  `;

  return buildPrintDocument({
    title: "Raw Material Details",
    bodyHtml: buildFormBody(data, letterheadSettings),
    extraStyles: styles,
    settings: letterheadSettings,
    company: buildRawMaterialDetailsCompany(data, assets),
  });
}

export function iframeSizeForRawMaterialDetailsPrintSettings(
  settings: PrintSettings,
  pageCount = 1,
): { widthMm: number; heightMm: number } {
  return iframeSizeForPagedPrintSettings(settings, pageCount);
}
