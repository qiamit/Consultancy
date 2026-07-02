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
import { buildClassSignatoryBlockHtml } from "@/lib/print/signatory-signature";

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

function formatBisBranchLine(branchName: string, state: string): string {
  const branch = branchName.trim() || "________________";
  const st = state.trim() || "________________";
  return `${esc(branch)}, ${esc(st)}, INDIA`;
}

function buildFormHeaderHtml(): string {
  return `
<div class="cmpf-form-id">CMPF - 310</div>
<h1 class="cmpf-title">Acceptance of Rate of Marking Fee</h1>`;
}

function buildPageIndicatorHtml(): string {
  return `<div class="cmpf-page-indicator">Page 01 of 01</div>`;
}

function buildLetterIntroHtml(data: Cmpf310LetterData): string {
  const appNo = formatApplicationNo(data.applicationNumber);
  const letterDate = formatMetaDate(data.dateOfApplication);

  return `
<div class="cmpf-to-row">
  <div class="cmpf-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standards<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="cmpf-date-block">
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
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
<p class="cmpf-section-heading"><strong>2. The marking fee shall be payable as under:</strong></p>
<div class="cmpf-terms">
  <p><strong>A)</strong> The marking fee indicated above is ${esc(markingFeeInline)}, which shall constitute the minimum marking fee payable in advance for the validity period of the licence.</p>
  <p><strong>B)</strong> During the first year of operation, the actual marking fee shall be calculated by multiplying the unit rate stated above by the quantity of production marked with the Standard Mark during the first nine months of operation.</p>
  <p><strong>C)</strong> For subsequent years, the actual marking fee shall be calculated by multiplying the unit rate by the quantity of production marked with the Standard Mark during the full year of operation.</p>
  <p><strong>D)</strong> In case the actual marking fee calculated under clauses (B) and (C) above exceeds the advance minimum marking fee paid, we shall pay the difference to BIS within one month of submission of the marking fee return.</p>
  <p><strong>E)</strong> We shall accept any variation in the rate of marking fee as may be specified under the revised regulations of the Government, and the same shall be borne by us.</p>
  <p><strong>F)</strong> We shall not claim any refund in case the actual marking fee calculated under clauses (B) and (C) above is less than the tentative marking fee indicated above.</p>
</div>`;
}

function buildSignatoryBlockHtml(data: Cmpf310LetterData): string {
  const sigName = esc(data.document.signatory_name) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.document.signatory_designation) || "—";

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

function buildBodyHtml(data: Cmpf310LetterData): string {
  const doc = data.document;
  const refNo = esc(doc.reference_letter_no) || "________________";
  const refDate = doc.reference_letter_date.trim()
    ? esc(formatMetaDate(doc.reference_letter_date))
    : "________________";
  const markingFeeInline = formatCmpf310RupeeInline(doc.marking_fee_rs);

  return `
<p class="cmpf-ref-line">
  This has reference to your letter No. <strong>${refNo}</strong> dated <strong>${refDate}</strong>.
</p>

<p class="cmpf-intro">
  I/We hereby agree to pay the tentative marking fee to the Bureau of Indian Standards at the rate indicated below, in accordance with Scheme-I of Schedule-II of the BIS (Conformity Assessment) Regulations, 2018.
</p>

${buildRateTableHtml(doc)}
${buildPaymentTermsHtml(markingFeeInline)}
${buildSignatoryBlockHtml(data)}`;
}

function buildFormBody(data: Cmpf310LetterData): string {
  return `
<div class="cmpf-sheet">
  ${buildFormHeaderHtml()}
  ${buildLetterIntroHtml(data)}
  ${buildBodyHtml(data)}
  ${buildPageIndicatorHtml()}
</div>`;
}

export function buildCmpf310Company(data: Cmpf310LetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultCmpf310PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    show_letterhead: true,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 11,
  };
}

export function buildCmpf310Html(data: Cmpf310LetterData, settings: PrintSettings): string {
  const sheetMinHeight = `calc(297mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm)`;
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
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
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
    .cmpf-date-block div + div {
      margin-top: 4px;
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
