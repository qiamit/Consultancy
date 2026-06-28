import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import {
  formatCmpf310RupeeDisplay,
  formatCmpf310RupeeInline,
  type Cmpf310Stored,
} from "@/lib/cmpf-310";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

export type Cmpf310LetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  document: Cmpf310Stored;
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

function buildHeaderGridHtml(data: Cmpf310LetterData): string {
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
<div class="cmpf-form-id">CMPF - 310</div>
<h1 class="cmpf-title">Acceptance of Rate of Marking Fee</h1>
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
<div class="cmpf-page-indicator">Page 01 of 01</div>`;
}

function buildRateTableHtml(doc: Cmpf310Stored): string {
  const th =
    "border:1px solid #111;padding:5px 6px;font-size:9px;font-weight:700;text-align:center;vertical-align:middle;background:#eef2f7;";
  const td =
    "border:1px solid #111;padding:5px 6px;font-size:10px;text-align:center;vertical-align:middle;";

  return `
<p class="cmpf-section-heading"><strong>1. Rate of Marking Fee</strong></p>
<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:10px;">
  <thead>
    <tr>
      <th style="${th}width:25%;">Unit</th>
      <th style="${th}width:25%;">Firm Scale</th>
      <th style="${th}width:25%;">Unit Rate in Rs</th>
      <th style="${th}width:25%;">Marking Fee in Rs</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="${td}">${esc(doc.unit) || "—"}</td>
      <td style="${td}">${esc(doc.firm_scale) || "—"}</td>
      <td style="${td}">${esc(formatCmpf310RupeeDisplay(doc.unit_rate_rs))}</td>
      <td style="${td}">${esc(formatCmpf310RupeeDisplay(doc.marking_fee_rs))}</td>
    </tr>
  </tbody>
</table>`;
}

function buildPaymentTermsHtml(markingFeeInline: string): string {
  return `
<p class="cmpf-section-heading"><strong>2. The marking fee is payable as under:-</strong></p>
<div class="cmpf-terms">
  <p><strong>A)</strong> The marking fee as per above is ${esc(markingFeeInline)} which shall be minimum marking fee and will be payable in advance for period of licence validity.</p>
  <p><strong>B) &amp; C)</strong> For 1<sup>st</sup> year of operation, the actual marking fee will be calculated on the basis of unit rate as mentioned above multiplied by the quantity of production marked with Standard Mark during the first nine months of operation. For subsequent years, the actual marking fee will be calculated on the basis of unit rate multiplied by the quantity of production marked with Standard Mark during the full year of operation.</p>
  <p><strong>D)</strong> In case the actual marking fee calculated as per (B) &amp; (C) above exceeds the advance minimum marking fee paid, the difference will be paid by us to BIS within one month of submission of marking fee return.</p>
  <p><strong>E)</strong> Any variations in the rate of marking fee as specified under the new regulations of the Government will be accepted by us and the same will be borne by us.</p>
  <p><strong>F)</strong> We will not request for any refund in case the actual marking fee calculated as per (B) &amp; (C) above is less than the tentative marking fee indicated above.</p>
</div>`;
}

function buildBodyHtml(data: Cmpf310LetterData): string {
  const doc = data.document;
  const refNo = esc(doc.reference_letter_no) || "________________";
  const refDate = doc.reference_letter_date.trim()
    ? esc(formatMetaDate(doc.reference_letter_date))
    : "________________";
  const markingFeeInline = formatCmpf310RupeeInline(doc.marking_fee_rs);
  const place = esc(data.city) || "________________";
  const dateVal = formatMetaDate(data.dateOfInspection);
  const sigName = esc(doc.signatory_name) || esc(data.contactPerson) || "—";
  const sigDesig = esc(doc.signatory_designation) || "—";

  return `
<div class="cmpf-to-block">
  To<br/>
  The Director &amp; Head<br/>
  Bureau of Indian Standard<br/>
  ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
</div>

<p class="cmpf-ref-line">
  This is with reference to your letter No. <strong>${refNo}</strong> Dated <strong>${refDate}</strong>
</p>

<p class="cmpf-intro">
  I/We agree to pay the tentative marking fee to the Bureau of Indian Standards in accordance with the rate mentioned below and as per the provisions of Scheme-I of Schedule-II in BIS (Conformity Assessment) Regulations, 2018.
</p>

${buildRateTableHtml(doc)}
${buildPaymentTermsHtml(markingFeeInline)}

<table style="width:100%;border-collapse:collapse;margin-top:28px;">
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

function buildFormBody(data: Cmpf310LetterData): string {
  return `
<div class="cmpf-sheet">
  ${buildHeaderGridHtml(data)}
  ${buildBodyHtml(data)}
</div>`;
}

export function buildCmpf310Company(data: Cmpf310LetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultCmpf310PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    show_letterhead: false,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 11,
  };
}

export function buildCmpf310Html(data: Cmpf310LetterData, settings: PrintSettings): string {
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
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
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
      margin: 8px 0 10px;
    }
    .cmpf-ref-line {
      margin: 0 0 10px;
      font-size: 10px;
    }
    .cmpf-intro {
      margin: 0 0 12px;
      font-size: 10px;
      line-height: 1.5;
      text-align: justify;
    }
    .cmpf-section-heading {
      margin: 10px 0 6px;
      font-size: 10px;
    }
    .cmpf-terms p {
      margin: 6px 0;
      font-size: 9px;
      line-height: 1.45;
      text-align: justify;
    }
  `;

  return buildPrintDocument({
    title: "CMPF 310 — Acceptance of Rate of Marking Fee",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings,
    company: buildCmpf310Company(data),
  });
}

export function iframeSizeForCmpf310PrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
