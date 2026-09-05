import { buildPrintDocument } from "@backend/modules/print/engine";

import {

  buildManufacturingScopeCompany,

  defaultDeclarationPrintSettings,

  iframeSizeForPrintSettings,

  type ManufacturingScopeDeclarationData,

} from "@backend/modules/print/manufacturing-scope-declaration";

import type { AuthorizationLetterStored } from "@backend/modules/bis/authorization-letter";

import {

  AUTH_LETTER_REPRESENTATION_PARAGRAPH,

  AUTH_LETTER_RESPONSIBILITY_PARAGRAPH,

} from "@backend/modules/bis/authorization-letter";

import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";

import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";

import { formatDisplayDate } from "@backend/shared/format-date";

import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";



export type AuthorizationLetterLetterData = Omit<

  ManufacturingScopeDeclarationData,

  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"

> & {

  applicationNumber: string;

  dateOfApplication: string;

  dateOfInspection: string;

  document: AuthorizationLetterStored;

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



function formatBisBranchLine(branchName: string, state: string): string {

  const branch = branchName.trim() || "________________";

  const st = state.trim() || "________________";

  return `${esc(branch)}, ${esc(st)}, INDIA`;

}



function blankOr(value: string, fallback = "________________"): string {

  const v = esc(value);

  return v || fallback;

}



function padPageNum(n: number): string {

  return String(n).padStart(2, "0");

}



function buildPageIndicatorHtml(): string {

  return `<div class="auth-page-indicator">Page ${padPageNum(1)} of ${padPageNum(1)}</div>`;

}



function buildLetterIntroHtml(data: AuthorizationLetterLetterData): string {

  const letterDate = formatMetaDate(data.dateOfApplication);

  const appNo = formatApplicationNo(data.applicationNumber);



  return `

<h1 class="auth-title">Authorization Letter</h1>

<div class="auth-to-row">

  <div class="auth-to-block">

    To<br/>

    The Director &amp; Head<br/>

    Bureau of Indian Standard<br/>

    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}

  </div>

  <div class="auth-date-block">

    <div><strong>Date:</strong> ${esc(letterDate)}</div>

    <div><strong>Application No.:</strong> ${esc(appNo)}</div>

  </div>

</div>`;

}



function buildSignatoryBlockHtml(data: AuthorizationLetterLetterData): string {

  const doc = data.document;

  const sigName =

    esc(doc.signatory_name) || esc(doc.authorized_name) || esc(data.contactPerson) || "—";

  const sigDesig = esc(doc.signatory_designation) || esc(doc.authorized_designation) || "—";



  return buildClassSignatoryBlockHtml({

    blockClass: "auth-signatory-block",

    forClass: "auth-signatory-for",

    sigWrapClass: "auth-signatory-sig",

    lineClass: "auth-signatory-line",

    companyName: esc(data.companyName),

    sigName,

    sigDesig,

    signatureImageUrl: data.signatureImageUrl,

  });

}



function buildBodyHtml(data: AuthorizationLetterLetterData): string {

  const doc = data.document;

  const authorizedName = blankOr(

    doc.authorized_name || data.contactPerson || data.companyName,

  );

  const authorizedDesig = blankOr(doc.authorized_designation);

  const isCode = blankOr(data.isNumber?.trim() || "");

  const isTitle = data.isTitle?.trim();

  const standard =

    isCode !== "________________" && isTitle

      ? `${isCode} — ${esc(isTitle)}`

      : isCode;

  const factoryAddr = formatAddressWithIndia(data.address, data.city, data.bisBranchState);



  return `

<p class="auth-subject"><strong>Subject:</strong> Authorization Letter for BIS Certification</p>



<p class="auth-salutation">Dear Sir</p>



<p class="auth-body">

  We, <strong>M/s. ${esc(data.companyName)}</strong>, having our factory / manufacturing unit at

  <strong>${factoryAddr}</strong>, hereby authorize <strong>${authorizedName}</strong>,

  <strong>${authorizedDesig}</strong> to represent our firm and to interact with the officials of

  Bureau of Indian Standards in connection with our application for grant of licence for use of

  BIS Standard Mark on our product(s) conforming to <strong>${standard}</strong>.

</p>



<p class="auth-body">${esc(AUTH_LETTER_REPRESENTATION_PARAGRAPH)}</p>



<p class="auth-body">${esc(AUTH_LETTER_RESPONSIBILITY_PARAGRAPH)}</p>



<p class="auth-thanks">Thanking you,</p>

<p class="auth-yours">Yours faithfully,</p>



${buildSignatoryBlockHtml(data)}`;

}



function buildFormBody(data: AuthorizationLetterLetterData): string {

  return `

<div class="auth-sheet">

  ${buildLetterIntroHtml(data)}

  ${buildBodyHtml(data)}

  ${buildPageIndicatorHtml()}

</div>`;

}



export type AuthorizationLetterPrintAssets = Partial<

  Pick<

    PrintCompanyInfo,

    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"

  >

>;



export function buildAuthorizationLetterCompany(

  data: AuthorizationLetterLetterData,

  assets?: AuthorizationLetterPrintAssets,

): PrintCompanyInfo {

  return {

    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),

    ...assets,

    // Letterhead matches Top Management / Plant & Machinery — text-only / no logo tile.

    logo_url: null,

  };

}



export function defaultAuthorizationLetterPrintSettings(): PrintSettings {

  return {

    ...defaultDeclarationPrintSettings(),

    show_letterhead: true,

    letterhead_layout: "logo-na",

    show_page_numbers: false,

    show_footer_line: false,

    font_family: "Times New Roman",

    font_size: 11,

    margin_top: 5,

    margin_bottom: 5,

    margin_left: 15,

    margin_right: 10,

  };

}



/** Force no-logo letterhead for Authorization Letter preview / Word (same as Top Management). */

export function authorizationLetterLetterheadSettings(settings: PrintSettings): PrintSettings {

  return {

    ...settings,

    letterhead_layout: "logo-na",

    show_page_numbers: false,

  };

}



export function buildAuthorizationLetterHtml(

  data: AuthorizationLetterLetterData,

  settings: PrintSettings,

  assets?: AuthorizationLetterPrintAssets,

): string {

  const letterheadSettings = authorizationLetterLetterheadSettings(settings);

  const pageSize = iframeSizeForPrintSettings(letterheadSettings);

  const sheetMinHeight = `calc(${pageSize.heightMm}mm - ${letterheadSettings.margin_top}mm - ${letterheadSettings.margin_bottom}mm)`;

  const styles = `

    .auth-sheet {

      font-family: "Times New Roman", Times, serif;

      color: #111;

      font-size: 10px;

      position: relative;

      min-height: ${sheetMinHeight};

      box-sizing: border-box;

      padding-bottom: 4mm;

    }

    .auth-title {

      text-align: center;

      font-size: 14px;

      font-weight: 700;

      text-decoration: underline;

      margin: 0 0 12px;

      line-height: 1.35;

    }

    .auth-page-indicator {

      position: absolute;

      right: 0;

      bottom: 0;

      font-size: 10px;

      font-weight: 600;

      text-align: right;

    }

    .auth-to-row {

      display: flex;

      justify-content: space-between;

      align-items: flex-start;

      gap: 16px;

      margin: 0 0 12px;

    }

    .auth-to-block {

      flex: 1;

      min-width: 0;

      font-size: 11px;

      line-height: 1.55;

    }

    .auth-date-block {

      flex-shrink: 0;

      text-align: right;

      white-space: nowrap;

      font-size: 11px;

      line-height: 1.55;

    }

    .auth-date-block div + div {

      margin-top: 4px;

    }

    .auth-subject {

      margin: 0 0 10px;

      font-size: 10px;

      font-weight: 700;

    }

    .auth-salutation {

      margin: 0 0 10px;

      font-size: 10px;

    }

    .auth-body {

      margin: 0 0 10px;

      font-size: 10px;

      line-height: 1.55;

      text-align: justify;

    }

    .auth-thanks, .auth-yours {

      margin: 0 0 4px;

      font-size: 10px;

    }

    .auth-signatory-block {

      margin-top: 28px;

      display: flex;

      flex-direction: column;

      align-items: flex-end;

      font-size: 10px;

      line-height: 1.6;

      text-align: right;

    }

    .auth-signatory-for {

      font-weight: 700;

      text-align: right;

    }

    .auth-signatory-sig {

      margin-top: 32px;

      min-width: 200px;

      text-align: right;

    }

    .auth-signatory-line {

      border-top: 1px solid #94a3b8;

      padding-top: 2px;

      font-size: 10px;

      line-height: 1.35;

      text-align: right;

    }

  `;



  return buildPrintDocument({

    title: "Authorization Letter",

    bodyHtml: buildFormBody(data),

    extraStyles: styles,

    settings: letterheadSettings,

    company: buildAuthorizationLetterCompany(data, assets),

  });

}



export function iframeSizeForAuthorizationLetterPrintSettings(settings: PrintSettings): {

  widthMm: number;

  heightMm: number;

} {

  return iframeSizeForPrintSettings(settings);

}

