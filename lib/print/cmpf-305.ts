import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import {
  CMPF305_ROWS_PER_PAGE,
  paginateMachineryRows,
  rowHasContent,
  type Cmpf305MachineryStored,
} from "@/lib/cmpf-305";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

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

function formatAddressWithIndia(address: string, city: string, state: string): string {
  const parts = [address.trim(), city.trim(), state.trim()].filter(Boolean);
  const line = parts.length > 0 ? parts.join(", ") : "______________________________";
  return `${esc(line)}, INDIA`;
}

function formatBisBranchLine(branchName: string, state: string): string {
  const branch = branchName.trim() || "________________";
  const st = state.trim() || "________________";
  return `${esc(branch)}, ${esc(st)}, INDIA`;
}

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function buildHeaderGridHtml(data: Cmpf305LetterData, pageNum: number, totalPages: number): string {
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
<table class="cmpf-header-grid" style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <tr>
    <td style="${lbl}">Applicant Name</td>
    <td style="${val}" colspan="3">${applicant}</td>
  </tr>
  <tr>
    <td style="${lbl}">Applicant Address</td>
    <td style="${val}" colspan="3">${formatAddressWithIndia(data.address, data.city, data.bisBranchState)}</td>
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
</table>
<div class="cmpf-page-indicator">Page ${padPageNum(pageNum)} of ${padPageNum(totalPages)}</div>`;
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

  const body = pageRows
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
        <th class="${thSr}">Sr No.</th>
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
    "border:1px solid #111;padding:8px 10px;font-size:9px;line-height:1.45;vertical-align:top;width:50%;";
  const boxBis = `${box}text-align:right;`;
  const sigLine = "margin-top:14px;font-size:9px;line-height:1.6;";

  return `
<p class="cmpf-extra-note"><em>Note: Attach Extra Sheet, If Required</em></p>
<table style="width:100%;border-collapse:collapse;margin-top:6px;">
  <tr>
    <td style="${box}">
      <p style="margin:0 0 8px;text-align:justify;">
        I hereby declare that the machinery of which details are given overleaf is owned by me and are actually installed in the premises.*
      </p>
      <p style="margin:0 0 8px;text-align:justify;">
        I also declare that in case of grant of licence, I will send prior intimation to BIS whenever any machinery is takenout of the premises of the firm due to any reason.
      </p>
      <div style="${sigLine}">
        <div>Sig. of Firm's Representative :-</div>
        <div>Name :- ${firmName}</div>
        <div>Designation :- ${firmDesig}</div>
        <div>Date :- ${esc(dateInsp)}</div>
      </div>
    </td>
    <td style="${boxBis}">
      <p style="margin:0 0 8px;text-align:right;">
        I have checked and found that Machinery of which details are given overleaf was available during my Inspection
      </p>
      <div style="${sigLine}">
        <div>Sig. of BIS Certification Officer :-</div>
        <div>Name :- ${bisName}</div>
        <div>Designation :- ${bisDesig}</div>
        <div>Date :- ${esc(dateInsp)}</div>
      </div>
    </td>
  </tr>
</table>
<p class="cmpf-footnote">
  * If Any Part of the Manufacturing Activity is Out Sourced, Details of Machinery used for Out Sourced Activity shall be Indicated in a Separate form Along with Complete Address of the Out Sourced Premises
</p>`;
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
<div class="cmpf-sheet${pageNum > 1 ? " page-break" : ""}">
  ${buildHeaderGridHtml(data, pageNum, totalPages)}
  ${pageNum === 1 ? toBlock : ""}
  ${buildMachineryTableHtml(pageRows, startIndex, settings)}
  ${isLastPage ? buildFooterHtml(data) : ""}
</div>`;
}

function buildFormBody(data: Cmpf305LetterData, settings: PrintSettings): string {
  const pages = paginateMachineryRows(data.rows, CMPF305_ROWS_PER_PAGE);
  const totalPages = pages.length;

  if (data.rows.filter(rowHasContent).length === 0 && totalPages === 1) {
    return buildSinglePageHtml(data, pages[0]!, 1, 1, 0, true, settings);
  }

  return pages
    .map((pageRows, i) =>
      buildSinglePageHtml(
        data,
        pageRows,
        i + 1,
        totalPages,
        i * CMPF305_ROWS_PER_PAGE,
        i === totalPages - 1,
        settings,
      ),
    )
    .join("");
}

export function buildCmpf305Company(data: Cmpf305LetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultCmpf305PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    show_letterhead: false,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 10,
  };
}

export function buildCmpf305Html(data: Cmpf305LetterData, settings: PrintSettings): string {
  const styles = `
    .cmpf-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      width: 100%;
    }
    .cmpf-form-id {
      text-align: right;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .cmpf-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      letter-spacing: 0.02em;
    }
    .cmpf-page-indicator {
      text-align: right;
      font-size: 10px;
      font-weight: 600;
      margin: 2px 0 8px;
    }
    .cmpf-to-block {
      font-size: 11px;
      line-height: 1.55;
      margin: 8px 0 4px;
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
      min-height: 20px;
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
    .page-break { page-break-before: always; }
  `;

  return buildPrintDocument({
    title: "CMPF 305 — Declaration Regarding Manufacturing Machinery",
    bodyHtml: buildFormBody(data, settings),
    extraStyles: styles,
    settings,
    company: buildCmpf305Company(data),
  });
}

export function iframeSizeForCmpf305PrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
