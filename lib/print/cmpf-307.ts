import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import {
  CMPF307_ROWS_PER_PAGE,
  paginateBrandRows,
  type Cmpf307BrandStored,
  type Cmpf307Stored,
} from "@/lib/cmpf-307";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

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

function buildHeaderGridHtml(data: Cmpf307LetterData, pageNum: number, totalPages: number): string {
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
<div class="cmpf-form-id">CMPF - 307</div>
<h1 class="cmpf-title">Declaration of Brand Names Proposed to be Covered Under Certification</h1>
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

function buildBrandTableHtml(pageRows: Cmpf307BrandStored[], startIndex: number): string {
  const th =
    "border:1px solid #111;padding:4px 3px;font-size:8px;font-weight:700;text-align:center;vertical-align:middle;background:#eef2f7;line-height:1.25;";
  const td =
    "border:1px solid #111;padding:4px 3px;font-size:9px;text-align:center;vertical-align:middle;line-height:1.3;min-height:20px;";

  const body = pageRows
    .map((row, i) => {
      const sr = startIndex + i + 1;
      return `<tr>
        <td style="${td}width:5%;">${sr}</td>
        <td style="${td}width:40%;text-align:left;">${esc(row.brand_name) || "&nbsp;"}</td>
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
      <th style="${th}">Sr. No.</th>
      <th style="${th}">Brand Names / Trade – Mark(s) Which would be Marked on the Product Bearing the BIS Standard Mark<br>(Give Actual Design Depiction of the Brand Name / Trade – Mark(s)</th>
      <th style="${th}">Owned By Self OR Others</th>
      <th style="${th}">Registered / Unregistered</th>
      <th style="${th}">Date of Registration / Introduction</th>
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>`;
}

function buildNotesAndDeclarationsHtml(data: Cmpf307LetterData): string {
  const reasons = esc(data.document.brands_without_mark_reasons) || "&nbsp;";
  const place = esc(data.city) || "________________";
  const dateVal = formatMetaDate(data.dateOfInspection);
  const sigName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.firmRepDesignation) || "—";

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
</div>

<table style="width:100%;border-collapse:collapse;margin-top:24px;">
  <tr>
    <td style="width:50%;vertical-align:top;font-size:10px;line-height:1.8;">
      <div>Place :- ${place}</div>
      <div>Date :- ${esc(dateVal)}</div>
    </td>
    <td style="width:50%;vertical-align:top;text-align:right;font-size:10px;line-height:1.8;">
      <div style="margin-top:32px;">Signature</div>
      <div>Name:- ${sigName}</div>
      <div>Designation:- ${sigDesig}</div>
      <div style="margin-top:16px;font-weight:700;">Seal of the Firm</div>
    </td>
  </tr>
</table>`;
}

function buildSinglePageHtml(
  data: Cmpf307LetterData,
  pageRows: Cmpf307BrandStored[],
  pageNum: number,
  totalPages: number,
  startIndex: number,
  isLastPage: boolean,
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
  ${buildBrandTableHtml(pageRows, startIndex)}
  ${isLastPage ? buildNotesAndDeclarationsHtml(data) : ""}
</div>`;
}

function buildFormBody(data: Cmpf307LetterData): string {
  const pages = paginateBrandRows(data.document.brands, CMPF307_ROWS_PER_PAGE);
  const totalPages = pages.length;

  return pages
    .map((pageRows, i) =>
      buildSinglePageHtml(
        data,
        pageRows,
        i + 1,
        totalPages,
        i * CMPF307_ROWS_PER_PAGE,
        i === totalPages - 1,
      ),
    )
    .join("");
}

export function buildCmpf307Company(data: Cmpf307LetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultCmpf307PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "landscape",
    show_letterhead: false,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 10,
  };
}

export function buildCmpf307Html(data: Cmpf307LetterData, settings: PrintSettings): string {
  const styles = `
    .cmpf-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
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
    .page-break { page-break-before: always; }
  `;

  return buildPrintDocument({
    title: "CMPF 307 — Declaration of Brand Names",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings,
    company: buildCmpf307Company(data),
  });
}

export function iframeSizeForCmpf307PrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
