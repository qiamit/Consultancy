import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import type { UndertakingOption2Stored } from "@/lib/undertaking-option-2";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

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

function formatAddressWithIndia(address: string, city: string, state: string): string {
  const line = address.trim();
  if (line) {
    return /\bindia\b/i.test(line) ? esc(line) : `${esc(line)}, INDIA`;
  }
  const parts = [city.trim(), state.trim()].filter(Boolean);
  const fallback = parts.length > 0 ? parts.join(", ") : "______________________________";
  return `${esc(fallback)}, INDIA`;
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

function buildHeaderGridHtml(data: UndertakingOption2LetterData): string {
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
<h1 class="cmpf-title">Undertaking for Simplified Procedure (Option 2)</h1>
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

function buildConditionsHtml(): string {
  return `
<div class="cmpf-conditions">
  <p><strong>1.</strong> The licence, if granted against the above application shall be put under suspension by BIS, if the sample drawn during the verification visit fails to conform to the relevant Indian Standard</p>
  <p><strong>2.</strong> In such case of suspension, I shall take necessary corrective actions and inform the same to BIS within one month and offer fresh lot of products manufactured after taking corrective actions, from which sample(s) will be drawn by BIS for third party testing</p>
  <p><strong>3.</strong> The revocation of suspension will be considered only based on complete test report(s) of the fresh sample(s) offered, from third party testing laboratory</p>
  <p><strong>4.</strong> The testing fee for testing of sample drawn for consideration of revocation of suspension shall be borne by me</p>
  <p><strong>5.</strong> In case, the fresh sample drawn by BIS for considering revocation of suspension shows non-conformity, or I fail to inform corrective actions within 30 days from the date of suspension, the licence will be processed for cancellation</p>
</div>`;
}

function buildBodyHtml(data: UndertakingOption2LetterData): string {
  const doc = data.document;
  const declarant = blankOr(doc.declarant_name || data.contactPerson || data.companyName);
  const product = blankOr(doc.product_for_mark);
  const standard = blankOr(doc.is_standard || data.isNumber);
  const factoryAddr = formatFactoryAddressForDeclaration(doc.factory_address, data.address);
  const place = esc(data.city) || "________________";
  const dateVal = formatMetaDate(data.dateOfInspection);
  const sigName = esc(doc.signatory_name) || esc(doc.declarant_name) || esc(data.contactPerson) || "—";
  const sigDesig = esc(doc.signatory_designation) || "—";

  return `
<div class="cmpf-to-block">
  To<br/>
  The Director &amp; Head<br/>
  Bureau of Indian Standard<br/>
  ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
</div>

<p class="cmpf-salutation">Dear Sir</p>

<p class="cmpf-declaration">
  I, <strong>${declarant}</strong> have applied for a license under Option 2 to you for use of BIS standard mark on <strong>${product}</strong> according to <strong>${standard}</strong> being manufactured at our factory at <strong>${factoryAddr}</strong>
</p>

<p class="cmpf-agreement">I clearly understand and agree to the conditions that-</p>

${buildConditionsHtml()}

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

function buildFormBody(data: UndertakingOption2LetterData): string {
  return `
<div class="cmpf-sheet">
  ${buildHeaderGridHtml(data)}
  ${buildBodyHtml(data)}
</div>`;
}

export function buildUndertakingOption2Company(data: UndertakingOption2LetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultUndertakingOption2PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    show_letterhead: false,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 11,
  };
}

export function buildUndertakingOption2Html(
  data: UndertakingOption2LetterData,
  settings: PrintSettings,
): string {
  const styles = `
    .cmpf-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
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
    .cmpf-salutation {
      margin: 0 0 10px;
      font-size: 10px;
    }
    .cmpf-declaration {
      margin: 0 0 10px;
      font-size: 10px;
      line-height: 1.55;
      text-align: justify;
    }
    .cmpf-agreement {
      margin: 0 0 8px;
      font-size: 10px;
      font-weight: 700;
    }
    .cmpf-conditions p {
      margin: 6px 0;
      font-size: 9px;
      line-height: 1.45;
      text-align: justify;
    }
  `;

  return buildPrintDocument({
    title: "Undertaking for Simplified Procedure (Option 2)",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings,
    company: buildUndertakingOption2Company(data),
  });
}

export function iframeSizeForUndertakingOption2PrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
