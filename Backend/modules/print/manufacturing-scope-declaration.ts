import { buildPrintDocument } from "@backend/modules/print/engine";
import { openPrintPreview } from "@backend/modules/print/preview";
import {
  LICENSE_SCOPE_DEFAULT_COLUMNS,
  buildLicenseScopeTableHtml,
  licenseScopeUsesPlain,
  licenseScopeUsesTable,
  type LicenseScopeFormat,
  type LicenseScopeRow,
} from "@backend/modules/bis/license-scope-format";
import {
  DEFAULT_PRINT_SETTINGS,
  type PrintCompanyInfo,
  type PrintSettings,
} from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import {
  buildRightAlignedSignatoryBlockHtml,
  wrapKeepWithSignatoryHtml,
} from "@backend/modules/print/signatory-signature";

export type ManufacturingScopeDeclarationData = {
  companyName: string;
  address: string;
  city: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber: string;
  isNumber: string;
  isTitle: string;
  licenseScope: string;
  licenseScopeFormat?: LicenseScopeFormat;
  licenseScopeColumnCount?: number;
  licenseScopeColumnHeaders?: string[];
  licenseScopeRows?: Pick<LicenseScopeRow, "component" | "value" | "extra">[];
  bisBranchName: string;
  bisBranchState: string;
  bisBranchCountry: string;
  inspectionDate: string;
  applicationNumber?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  /** Top Management Sr 1 signature when apply-on-documents is Yes. */
  signatureImageUrl?: string;
};

function formatBisBranchLine(
  branchName: string,
  state: string,
  country: string,
): string {
  const parts = [
    branchName.trim() || "________________",
    state.trim() || "________________",
    country.trim() || "India",
  ];
  return parts.join(", ");
}

function formatInspectionDate(dateStr: string | Date | null | undefined): string {
  return formatDisplayDate(dateStr, "");
}

function formatApplicationNo(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, "<br/>");
}

function buildLicenseScopeContent(data: ManufacturingScopeDeclarationData): string {
  const format = data.licenseScopeFormat ?? "plain";
  const columnCount = data.licenseScopeColumnCount ?? LICENSE_SCOPE_DEFAULT_COLUMNS;
  const parts: string[] = [];
  if (licenseScopeUsesPlain(format)) {
    const scopeText = data.licenseScope.trim();
    if (scopeText || !licenseScopeUsesTable(format)) {
      parts.push(
        `<div style="font-size:11px;line-height:1.4;">${nl2br(scopeText || "—")}</div>`,
      );
    }
  }
  if (licenseScopeUsesTable(format) && data.licenseScopeRows?.length) {
    const rows = data.licenseScopeRows.map((r, i) => ({
      id: String(i),
      component: r.component,
      value: r.value,
      extra: r.extra,
    }));
    parts.push(
      buildLicenseScopeTableHtml(rows, columnCount, data.licenseScopeColumnHeaders),
    );
  }
  if (parts.length === 0) {
    return `<div style="font-size:11px;line-height:1.4;">—</div>`;
  }
  return parts.join(`<div style="height:6px;"></div>`);
}

function formatIsStandardRef(isNumber: string, isTitle: string): string {
  const num = (isNumber ?? "").trim();
  const title = (isTitle ?? "").trim();
  if (num && title) return `<strong>${esc(num)}</strong> — ${esc(title)}`;
  if (num) return `<strong>${esc(num)}</strong>`;
  if (title) return `<strong>${esc(title)}</strong>`;
  return "";
}

function buildDeclarationBody(data: ManufacturingScopeDeclarationData): string {
  const scopeContent = buildLicenseScopeContent(data);
  const isStdRef = formatIsStandardRef(data.isNumber, data.isTitle);
  const bisBranchLine = formatBisBranchLine(
    data.bisBranchName,
    data.bisBranchState,
    data.bisBranchCountry,
  );
  const inspectionDate = formatInspectionDate(data.inspectionDate);
  const dateLabel = inspectionDate ? esc(inspectionDate) : "_______________________";
  const applicationNo = formatApplicationNo(data.applicationNumber);
  const sigName = esc(data.signatoryName ?? "") || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.signatoryDesignation ?? "") || "—";
  const signatoryHtml = buildRightAlignedSignatoryBlockHtml({
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
  const closingWithSignatory = wrapKeepWithSignatoryHtml(
    `<p style="margin:8px 0 0;">
    We further declare that the above information is true and correct to the best of our knowledge and belief.
    We undertake to inform BIS of any change in the manufacturing scope covered under the licence.
  </p>`,
    signatoryHtml,
  );

  return `
<div style="text-align:center;margin-bottom:10px;">
  <div style="font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;text-decoration:underline;">
    Declaration Regarding Manufacturing Scope
  </div>
</div>

<div style="font-size:11.5px;line-height:1.45;text-align:justify;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin:0 0 8px;">
    <div style="flex:1;min-width:0;">
      To<br/>
      The Director &amp; Head<br/>
      Bureau of Indian Standards<br/>
      ${esc(bisBranchLine)}
    </div>
    <div style="flex-shrink:0;text-align:right;white-space:nowrap;">
      <div><strong>Date of Inspection:</strong> ${dateLabel}</div>
      <div style="margin-top:2px;"><strong>Application No.:</strong> ${esc(applicationNo)}</div>
    </div>
  </div>

  <p style="margin:0 0 8px;">
    <strong>Sub:</strong> Declaration regarding manufacturing scope
    ${isStdRef ? ` under Indian Standard ${isStdRef}` : ""}.
  </p>

  <p style="margin:0 0 8px;">
    We, <strong>M/s. ${esc(data.companyName)}</strong>,
    ${data.address ? ` having our factory at <strong>${esc(data.address)}</strong>,` : ""}
    hereby declare that our manufacturing scope for BIS certification
    ${isStdRef ? ` under ${isStdRef}` : ""}
    is as follows:
  </p>

  <div style="margin:8px 0;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:4px;">
      License Scope
    </div>
    ${scopeContent}
  </div>

  ${closingWithSignatory}
</div>`;
}

export function defaultDeclarationPrintSettings(): PrintSettings {
  return {
    ...DEFAULT_PRINT_SETTINGS,
    font_family: "Times New Roman",
    font_size: 12,
    show_letterhead: true,
    letterhead_layout: "logo-na",
    letterhead_show_address: true,
    show_footer_line: false,
    show_page_numbers: true,
    show_watermark: false,
    footer_left: "",
    footer_center: "",
    footer_right: "Page {page} of {total}",
  };
}

/** Top Management–aligned defaults for Manufacturing Scope declaration. */
export function defaultManufacturingScopePrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    letterhead_layout: "logo-na",
    show_page_numbers: false,
    show_footer_line: false,
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 15,
    margin_right: 10,
  };
}

/** Force no-logo letterhead for Manufacturing Scope preview / Word. */
export function manufacturingScopeLetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export type ManufacturingScopePrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildManufacturingScopeCompany(
  data: ManufacturingScopeDeclarationData,
  assets?: ManufacturingScopePrintAssets,
): PrintCompanyInfo {
  return {
    name: data.companyName,
    address: data.address,
    city: "",
    state: "",
    pin_code: "",
    country: "",
    gst_number: data.gstNumber,
    email: data.email,
    phone: data.phone,
    contact_person: data.contactPerson,
    website: "",
    ...assets,
    // Applicant letterhead only — never consultant letterhead / logo / seal images.
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

export function buildManufacturingScopeDeclarationHtml(
  data: ManufacturingScopeDeclarationData,
  settings: PrintSettings,
  assets?: ManufacturingScopePrintAssets,
): string {
  return buildPrintDocument({
    title: "Declaration Regarding Manufacturing Scope",
    bodyHtml: buildDeclarationBody(data),
    settings: manufacturingScopeLetterheadSettings(settings),
    company: buildManufacturingScopeCompany(data, assets),
    extraStyles: `
      .lh-wrap { padding: 8px 0 6px !important; }
      .license-scope-table { font-size: 10.5px !important; line-height: 1.35 !important; }
      .license-scope-table th, .license-scope-table td {
        text-transform: none;
        letter-spacing: normal;
        text-align: center;
        padding: 3px 6px !important;
      }
      .print-keep-with-signatory { break-inside: avoid; page-break-inside: avoid; }
    `,
  });
}

export function iframeSizeForPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  const landscape = settings.orientation === "landscape";
  let w = 210;
  let h = 297;
  if (settings.paper_size === "A5") {
    w = 148;
    h = 210;
  } else if (settings.paper_size === "Letter") {
    w = 216;
    h = 279;
  } else if (settings.paper_size === "Legal") {
    w = 216;
    h = 356;
  }
  if (landscape) [w, h] = [h, w];
  return { widthMm: w, heightMm: h };
}

export function openManufacturingScopeDeclarationPreview(
  data: ManufacturingScopeDeclarationData,
): void {
  const settings = defaultDeclarationPrintSettings();
  const company = buildManufacturingScopeCompany(data);

  openPrintPreview({
    buildDoc: (s, c) =>
      buildPrintDocument({
        title: "Declaration Regarding Manufacturing Scope",
        bodyHtml: buildDeclarationBody(data),
        settings: { ...settings, ...s },
        company: c,
        extraStyles: `
          .lh-wrap { padding: 8px 0 6px !important; }
          .license-scope-table { font-size: 10.5px !important; line-height: 1.35 !important; }
          .license-scope-table th, .license-scope-table td {
            text-transform: none;
            letter-spacing: normal;
            text-align: center;
            padding: 3px 6px !important;
          }
          .print-keep-with-signatory { break-inside: avoid; page-break-inside: avoid; }
        `,
      }),
    initialSettings: settings,
    company,
  });
}
