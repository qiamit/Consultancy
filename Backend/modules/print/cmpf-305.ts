import { buildPrintDocument } from "@backend/modules/print/engine";
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
import { signatorySignatureOverlayHtml } from "@backend/modules/print/signatory-signature";

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

function buildHeaderGridHtml(data: Cmpf305LetterData): string {
  const appNo = formatApplicationNo(data.applicationNumber);
  const dateApp = formatMetaDate(data.dateOfApplication);
  const dateInsp = formatMetaDate(data.dateOfInspection);
  const isCode = esc(data.isNumber) || "—";
  const applicant = esc(data.companyName) || "—";

  const cell =
    "border:1px solid #111;padding:4px 6px;font-size:10px;vertical-align:middle;line-height:1.35;";
  const lbl = `${cell}font-weight:700;width:18%;background:#eef2f7;`;
  const val = `${cell}font-weight:600;`;

  return `
<div class="cmpf-form-id">Form - I</div>
<h1 class="cmpf-title">Declaration Regarding Manufacturing Machinery</h1>
<table class="cmpf-header-grid" style="width:100%;border-collapse:collapse;margin-bottom:2px;">
  <tr>
    <td style="${lbl}">Applicant Name</td>
    <td style="${val}" colspan="3">${applicant}</td>
  </tr>
  <tr>
    <td style="${lbl}">Applicant Address</td>
    <td style="${val}" colspan="3">${formatApplicantAddress(data.address)}</td>
  </tr>
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
  </tr>
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

  const box =
    "border:1px solid #111;padding:0;vertical-align:top;width:50%;";
  const cellInner =
    "display:flex;flex-direction:column;min-height:142px;height:100%;";
  const declBlock = "padding:5px 7px 2px;font-size:8px;line-height:1.35;";
  const sigArea =
    "flex:1;background:#eef2f7;padding:5px 7px;display:flex;flex-direction:column;min-height:70px;";
  const sigSpacer = "flex:1;min-height:17px;";
  const sigLine = "font-size:8px;line-height:1.4;";

  return `
<p class="cmpf-extra-note"><em>Note: Attach Extra Sheet, If Required</em></p>
<table style="width:100%;border-collapse:collapse;margin-top:6px;table-layout:fixed;">
  <tr>
    <td style="${box}">
      <div style="${cellInner}">
        <div style="${declBlock}">
          <p style="margin:0 0 8px;text-align:justify;">
            I hereby declare that the machinery of which details are given overleaf is owned by me and are actually installed in the premises.*
          </p>
          <p style="margin:0;text-align:justify;">
            I also declare that in case of grant of licence, I will send prior intimation to BIS whenever any machinery is takenout of the premises of the firm due to any reason.
          </p>
        </div>
        <div style="${sigArea}">
          <div style="${sigSpacer}"></div>
          <div style="${sigLine}">
            <div>Sig. of Firm's Representative :-</div>
            <div style="position:relative;display:inline-block;min-width:200px;">
              ${signatorySignatureOverlayHtml(data.signatureImageUrl, {
                left: "12mm",
                top: "calc(-36px + 4mm)",
                right: "auto",
                maxHeight: "42px",
                maxWidth: "120px",
              })}
              <div style="position:relative;z-index:1;">Name :- ${firmName}</div>
            </div>
            <div>Designation :- ${firmDesig}</div>
            <div>Date :- ${esc(dateInsp)}</div>
          </div>
        </div>
      </div>
    </td>
    <td style="${box}">
      <div style="${cellInner}">
        <div style="${declBlock}">
          <p style="margin:0;text-align:right;">
            I have checked and found that Machinery of which details are given overleaf was available during my Inspection
          </p>
        </div>
        <div style="${sigArea}">
          <div style="${sigSpacer}"></div>
          <div style="${sigLine};text-align:right;">
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

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

/** How many machinery rows fit on a sheet for the selected Page Settings. */
export function cmpf305RowsCapacity(
  settings: PrintSettings,
  kind: "single" | "first" | "middle" | "last",
): number {
  const { heightMm } = iframeSizeForPrintSettings(settings);
  const usable = Math.max(
    80,
    heightMm - settings.margin_top - settings.margin_bottom,
  );
  // Compact 8px table rows ≈ 4.5–5mm each in portrait.
  const rowMm = settings.orientation === "landscape" ? 4.2 : 4.8;
  // Measured from Form-I layout: title+grid ≈ 50mm, To ≈ 15mm, thead ≈ 6mm, signatures ≈ 50mm.
  const headerBlock = 50;
  const toBlock = 15;
  const tableHead = 6;
  const footerBlock = 50;

  let overhead = headerBlock + tableHead;
  if (kind === "single" || kind === "first") overhead += toBlock;
  if (kind === "single" || kind === "last") overhead += footerBlock;

  return Math.max(4, Math.floor((usable - overhead) / rowMm));
}

/** Paginate machinery rows into print sheets for current Page Settings. */
export function paginateCmpf305ForPrint(
  rows: Cmpf305MachineryStored[],
  settings: PrintSettings,
): Cmpf305MachineryStored[][] {
  const visible = rows.filter(rowHasContent);
  if (visible.length === 0) return [[]];

  // Prefer one page whenever header + To + all rows + signatures fit.
  const singleCap = cmpf305RowsCapacity(settings, "single");
  if (visible.length <= singleCap) return [visible];

  const firstCap = cmpf305RowsCapacity(settings, "first");
  const middleCap = cmpf305RowsCapacity(settings, "middle");
  const lastCap = cmpf305RowsCapacity(settings, "last");

  const pages: Cmpf305MachineryStored[][] = [];
  let index = 0;

  // First page (header + To, no footer) — leave at least one row for a later page.
  const firstTake = Math.min(firstCap, Math.max(1, visible.length - 1));
  pages.push(visible.slice(index, index + firstTake));
  index += firstTake;

  while (index < visible.length) {
    const remaining = visible.length - index;
    if (remaining <= lastCap) {
      pages.push(visible.slice(index));
      break;
    }
    const take = Math.min(middleCap, Math.max(1, remaining - 1));
    pages.push(visible.slice(index, index + take));
    index += take;
  }

  return pages;
}

function buildPageIndicatorHtml(pageNum: number, totalPages: number): string {
  return `<div class="cmpf-page-indicator">Page ${padPageNum(pageNum)} of ${padPageNum(totalPages)}</div>`;
}

function buildPageGapHtml(pageNum: number, totalPages: number): string {
  if (pageNum <= 1 || totalPages <= 1) return "";
  return `<div class="cmpf-page-gap" aria-hidden="true">Page break · ${padPageNum(pageNum - 1)} → ${padPageNum(pageNum)}</div>`;
}

function buildSinglePageHtml(
  data: Cmpf305LetterData,
  pageRows: Cmpf305MachineryStored[],
  pageNum: number,
  totalPages: number,
  startIndex: number,
  isLastPage: boolean,
  settings: PrintSettings,
): string {
  const toBlock = `
<div class="cmpf-to-block">
  To<br/>
  The Director &amp; Head<br/>
  Bureau of Indian Standard<br/>
  ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
</div>`;

  return `
${buildPageGapHtml(pageNum, totalPages)}
<div class="cmpf-sheet${pageNum > 1 ? " page-break" : ""}">
  <div class="cmpf-sheet-body">
    ${buildHeaderGridHtml(data)}
    ${pageNum === 1 ? toBlock : ""}
    ${buildMachineryTableHtml(pageRows, startIndex, settings)}
    ${isLastPage ? `<div class="cmpf-footer-wrap">${buildFooterHtml(data)}</div>` : ""}
  </div>
  ${buildPageIndicatorHtml(pageNum, totalPages)}
</div>`;
}

function buildFormBody(data: Cmpf305LetterData, settings: PrintSettings): string {
  const pages = paginateCmpf305ForPrint(data.rows, settings);
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
    margin_right: 10,
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
): string {
  const letterheadSettings = cmpf305LetterheadSettings(settings);
  const pageSize = iframeSizeForPrintSettings(letterheadSettings);
  const sheetMinHeight = `calc(${pageSize.heightMm}mm - ${letterheadSettings.margin_top}mm - ${letterheadSettings.margin_bottom}mm)`;
  const styles = `
    .cmpf-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      width: 100%;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 4mm;
      display: flex;
      flex-direction: column;
    }
    .cmpf-sheet-body {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
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
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }
    .cmpf-header-grid {
      flex-shrink: 0;
    }
    .cmpf-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .cmpf-to-block {
      font-size: 11px;
      line-height: 1.55;
      margin: 8px 0 4px;
      flex-shrink: 0;
    }
    .cmpf-extra-note {
      margin: 14px 0 4px;
      font-size: 10px;
      text-align: left;
    }
    .cmpf-footnote {
      margin: 10px 0 0;
      font-size: 8px;
      font-weight: 700;
      line-height: 1.4;
      text-align: justify;
    }
    .cmpf-machinery-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 10px;
    }
    .cmpf-machinery-table thead {
      display: table-header-group;
    }
    .cmpf-machinery-table .cmpf-cell {
      border: 1px solid #111;
      padding: 4px 5px;
      vertical-align: middle;
      line-height: 1.3;
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
    .cmpf-footer-wrap {
      flex-shrink: 0;
      margin-top: auto;
      padding-top: 4px;
    }
    .page-break { page-break-before: always; break-before: page; }
    @media screen {
      .cmpf-page-gap {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 10mm;
        margin: 4mm 0;
        color: #64748b;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border-top: 2px dashed #94a3b8;
        border-bottom: 2px dashed #94a3b8;
      }
    }
    @media print {
      .cmpf-page-gap {
        display: none !important;
      }
      .cmpf-sheet {
        page-break-after: always;
        break-after: page;
      }
      .cmpf-sheet:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
    }
  `;

  return buildPrintDocument({
    title: "CMPF 305 — Declaration Regarding Manufacturing Machinery",
    bodyHtml: buildFormBody(data, letterheadSettings),
    extraStyles: styles,
    settings: letterheadSettings,
    company: buildCmpf305Company(data, assets),
  });
}

export function cmpf305PrintPageCount(
  data: Cmpf305LetterData,
  settings: PrintSettings,
): number {
  return paginateCmpf305ForPrint(data.rows, cmpf305LetterheadSettings(settings))
    .length;
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
  // 14mm labeled gap between stacked preview sheets
  const gapMm = pages > 1 ? (pages - 1) * 14 : 0;
  return {
    widthMm: base.widthMm,
    // 8px ≈ 2mm top/bottom screen padding on .doc-page
    heightMm: base.heightMm * pages + gapMm + (pages > 0 ? 4 : 0),
  };
}
