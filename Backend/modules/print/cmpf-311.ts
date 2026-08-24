import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type { Cmpf311Stored } from "@backend/modules/bis/cmpf-311";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type Cmpf311LetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  firmRepName: string;
  firmRepDesignation: string;
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

function formatBisBranchLine(branchName: string, state: string): string {
  const branch = branchName.trim() || "________________";
  const st = state.trim() || "________________";
  return `${esc(branch)}, ${esc(st)}, INDIA`;
}

function buildFormHeaderHtml(data: Cmpf311LetterData): string {
  const appNo = formatApplicationNo(data.applicationNumber);
  const letterDate = formatMetaDate(data.dateOfApplication);

  return `
<div class="cmpf-form-id">CMPF - 311</div>
<h1 class="cmpf-title">Acceptance of Scheme of Inspection &amp; Testing</h1>
<div class="cmpf-meta-block">
  <div><strong>Date:</strong> ${esc(letterDate)}</div>
  <div><strong>Application No.:</strong> ${esc(appNo)}</div>
</div>`;
}

function buildPageIndicatorHtml(): string {
  return `<div class="cmpf-page-indicator">Page 01 of 01</div>`;
}

export function cmpf311DeclarationPlainText(
  licenceFor: string,
  productManualNo: string,
): string {
  return `We hereby undertake that, upon grant of a licence for ${licenceFor}, we shall faithfully implement the Scheme of Inspection and Testing as specified in Product Manual No. ${productManualNo}, and shall maintain all prescribed records in accordance with the requirements of the Bureau of Indian Standards.`;
}

function buildSignatoryBlockHtml(data: Cmpf311LetterData): string {
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

function buildBodyHtml(data: Cmpf311LetterData): string {
  const doc = data.document;
  const refNo = esc(doc.reference_letter_no) || "________________";
  const refDate = doc.reference_letter_date.trim()
    ? esc(formatMetaDate(doc.reference_letter_date))
    : "________________";
  const licenceFor = esc(doc.licence_for_standard) || esc(data.isNumber) || "________________";
  const productManualNo = esc(doc.sit_document_ref) || "________________";

  return `
<div class="cmpf-to-block">
  To<br/>
  The Director &amp; Head<br/>
  Bureau of Indian Standards<br/>
  ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
</div>

<p class="cmpf-ref-line">
  This has reference to your letter No. <strong>${refNo}</strong> dated <strong>${refDate}</strong>.
</p>

<p class="cmpf-declaration">
  We hereby undertake that, upon grant of a licence for <strong>${licenceFor}</strong>, we shall faithfully implement the Scheme of Inspection and Testing as specified in Product Manual No. <strong>${productManualNo}</strong>, and shall maintain all prescribed records in accordance with the requirements of the Bureau of Indian Standards.
</p>

${buildSignatoryBlockHtml(data)}`;
}

function buildFormBody(data: Cmpf311LetterData): string {
  return `
<div class="cmpf-sheet">
  ${buildFormHeaderHtml(data)}
  ${buildBodyHtml(data)}
  ${buildPageIndicatorHtml()}
</div>`;
}

export function buildCmpf311Company(data: Cmpf311LetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultCmpf311PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    show_letterhead: true,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 11,
  };
}

export function buildCmpf311Html(data: Cmpf311LetterData, settings: PrintSettings): string {
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
    .cmpf-meta-block {
      text-align: right;
      font-size: 10px;
      line-height: 1.55;
      margin: 0 0 10px;
    }
    .cmpf-meta-block div + div {
      margin-top: 4px;
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
      margin: 0 0 24px;
      font-size: 10px;
      line-height: 1.55;
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
