import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  LONG_DURATION_TEST_ROW_COUNT,
  type UndertakingLongDurationTestStored,
} from "@backend/modules/bis/undertaking-long-duration-test";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildSignatureTableCellInnerHtml } from "@backend/modules/print/signatory-signature";

export type UndertakingLongDurationTestLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  document: UndertakingLongDurationTestStored;
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

function buildHeaderGridHtml(data: UndertakingLongDurationTestLetterData): string {
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
<h1 class="ldt-title">Undertaking for Long Duration Test</h1>
<table class="ldt-header-grid" style="width:100%;border-collapse:collapse;margin-bottom:4px;">
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
<div class="ldt-page-indicator">Page 01 of 01</div>`;
}

function buildTestTableHtml(document: UndertakingLongDurationTestStored): string {
  const th =
    "border:1px solid #111;padding:5px 6px;font-size:9px;font-weight:700;text-align:center;vertical-align:middle;background:#eef2f7;";
  const td =
    "border:1px solid #111;padding:5px 6px;font-size:9px;text-align:center;vertical-align:middle;";

  const rows = Array.from({ length: LONG_DURATION_TEST_ROW_COUNT }, (_, index) => {
    const row = document.test_rows[index];
    return `
    <tr>
      <td style="${td}width:8%;">${index + 1}</td>
      <td style="${td}">${blankOr(row?.type_of_test ?? "", "&nbsp;")}</td>
      <td style="${td}">${blankOr(row?.duration_of_test ?? "", "&nbsp;")}</td>
      <td style="${td}">${row?.date_of_completion?.trim() ? esc(formatMetaDate(row.date_of_completion)) : "&nbsp;"}</td>
    </tr>`;
  }).join("");

  return `
<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:10px 0;">
  <thead>
    <tr>
      <th style="${th}width:8%;">Sr. No.</th>
      <th style="${th}">Type of Test</th>
      <th style="${th}">Duration of Test</th>
      <th style="${th}">Date of Completion of Test</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>`;
}

function buildBodyHtml(data: UndertakingLongDurationTestLetterData): string {
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
<div class="ldt-to-block">
  To<br/>
  The Director &amp; Head<br/>
  Bureau of Indian Standard<br/>
  ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
</div>

<p class="ldt-salutation">Respected / Sir,</p>

<p class="ldt-declaration">
  I, <strong>${declarant}</strong> have applied for a license under Option 2 to you for use of BIS standard mark on
  <strong>${product}</strong> according to <strong>${standard}</strong> being manufactured at our factory at
  <strong>${factoryAddr}</strong>
</p>

<p class="ldt-agreement">
  I Understand &amp; Agree that in Event of Failure of the Sample Drawn for the Purpose of Grant of Licence to Use
  &amp; Apply Standard Mark in the Following Type Tests or My Inability to Submit the Test Report for Following Tests
  within 30 Days (One Month) of the Date of Completion of the Test(s) as Confirmed by the Laboratory*, The Licence if
  Granted to Me, shall be Processed for Cancellation:
</p>

${buildTestTableHtml(doc)}

<p class="ldt-closing">
  Further, I duly Undertake that I shall Abide by all the Directions Issued by the Bureau in this Regard.
</p>

<table style="width:100%;border-collapse:collapse;margin-top:28px;">
  <tr>
    <td style="width:50%;vertical-align:top;font-size:10px;line-height:1.8;">
      <div>Place :- ${place}</div>
      <div>Date :- ${esc(dateVal)}</div>
    </td>
    <td style="width:50%;vertical-align:top;text-align:right;font-size:10px;line-height:1.8;">
      ${buildSignatureTableCellInnerHtml({
        signatureImageUrl: data.signatureImageUrl,
        bodyHtml: `
      <div style="margin-top:32px;">Signature</div>
      <div>Name:- ${sigName}</div>
      <div>Designation:- ${sigDesig}</div>
      <div style="margin-top:16px;font-weight:700;">Seal of the Firm</div>`,
      })}
    </td>
  </tr>
</table>`;
}

function buildFormBody(data: UndertakingLongDurationTestLetterData): string {
  return `
<div class="ldt-sheet">
  ${buildHeaderGridHtml(data)}
  ${buildBodyHtml(data)}
</div>`;
}

export type UndertakingLongDurationTestPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildUndertakingLongDurationTestCompany(
  data: UndertakingLongDurationTestLetterData,
  assets?: UndertakingLongDurationTestPrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Letterhead matches Top Management / Plant & Machinery — text-only / no logo tile.
    logo_url: null,
  };
}

export function defaultUndertakingLongDurationTestPrintSettings(): PrintSettings {
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

/** Force no-logo letterhead for Long Duration Test preview / Word (same as Top Management). */
export function undertakingLongDurationTestLetterheadSettings(
  settings: PrintSettings,
): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildUndertakingLongDurationTestHtml(
  data: UndertakingLongDurationTestLetterData,
  settings: PrintSettings,
  assets?: UndertakingLongDurationTestPrintAssets,
): string {
  const letterheadSettings = undertakingLongDurationTestLetterheadSettings(settings);
  const styles = `
    .ldt-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
    }
    .ldt-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      line-height: 1.35;
    }
    .ldt-page-indicator {
      text-align: right;
      font-size: 10px;
      font-weight: 600;
      margin: 2px 0 8px;
    }
    .ldt-to-block {
      font-size: 11px;
      line-height: 1.55;
      margin: 8px 0 10px;
    }
    .ldt-salutation {
      margin: 0 0 10px;
      font-size: 10px;
    }
    .ldt-declaration,
    .ldt-agreement,
    .ldt-closing {
      margin: 0 0 10px;
      font-size: 10px;
      line-height: 1.55;
      text-align: justify;
    }
  `;

  return buildPrintDocument({
    title: "Undertaking for Long Duration Test",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings: letterheadSettings,
    company: buildUndertakingLongDurationTestCompany(data, assets),
  });
}

export function iframeSizeForUndertakingLongDurationTestPrintSettings(
  settings: PrintSettings,
): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
