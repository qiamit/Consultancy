import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import type { Cmpf311Stored } from "@/lib/cmpf-311";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

export type Cmpf311LetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  document: Cmpf311Stored;
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

function buildHeaderGridHtml(data: Cmpf311LetterData): string {
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
<div class="cmpf-form-id">CMPF - 311</div>
<h1 class="cmpf-title">Acceptance of Scheme of Inspection &amp; Testing</h1>
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

function buildBodyHtml(data: Cmpf311LetterData): string {
  const doc = data.document;
  const refNo = esc(doc.reference_letter_no) || "________________";
  const refDate = doc.reference_letter_date.trim()
    ? esc(formatMetaDate(doc.reference_letter_date))
    : "________________";
  const licenceFor = esc(doc.licence_for_standard) || esc(data.isNumber) || "________________";
  const sitDoc = esc(doc.sit_document_ref) || "________________";
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
  This is with reference to your letter No. <strong>${refNo}</strong> &nbsp;&nbsp;&nbsp; Dated <strong>${refDate}</strong>
</p>

<p class="cmpf-declaration">
  We hereby agree that after a licence is granted to us for according to <strong>${licenceFor}</strong> we shall follow the scheme of Testing and Inspection (Doc: <strong>${sitDoc}</strong>) strictly and maintain all records properly.
</p>

<table style="width:100%;border-collapse:collapse;margin-top:36px;">
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

function buildFormBody(data: Cmpf311LetterData): string {
  return `
<div class="cmpf-sheet">
  ${buildHeaderGridHtml(data)}
  ${buildBodyHtml(data)}
</div>`;
}

export function buildCmpf311Company(data: Cmpf311LetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultCmpf311PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    show_letterhead: false,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 11,
  };
}

export function buildCmpf311Html(data: Cmpf311LetterData, settings: PrintSettings): string {
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
      margin: 8px 0 10px;
    }
    .cmpf-ref-line {
      margin: 0 0 14px;
      font-size: 10px;
    }
    .cmpf-declaration {
      margin: 0;
      font-size: 10px;
      line-height: 1.55;
      text-align: center;
    }
  `;

  return buildPrintDocument({
    title: "CMPF 311 — Acceptance of Scheme of Inspection & Testing",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings,
    company: buildCmpf311Company(data),
  });
}

export function iframeSizeForCmpf311PrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
