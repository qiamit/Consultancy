import { buildPrintDocument } from "@/lib/print/engine";
import { openPrintPreview } from "@/lib/print/preview";
import {
  buildLicenseScopeTableHtml,
  type LicenseScopeFormat,
  type LicenseScopeRow,
} from "@/lib/license-scope-format";
import {
  DEFAULT_PRINT_SETTINGS,
  type PrintCompanyInfo,
  type PrintSettings,
} from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

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
  licenseScopeRows?: Pick<LicenseScopeRow, "component" | "value">[];
  bisBranchName: string;
  bisBranchState: string;
  bisBranchCountry: string;
  inspectionDate: string;
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

function formatInspectionDate(dateStr: string): string {
  const raw = (dateStr ?? "").trim();
  if (!raw) return "";
  return formatDisplayDate(raw, "");
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
  if (data.licenseScopeFormat === "table" && data.licenseScopeRows?.length) {
    const rows = data.licenseScopeRows.map((r, i) => ({
      id: String(i),
      component: r.component,
      value: r.value,
    }));
    return buildLicenseScopeTableHtml(rows);
  }
  const scopeText = data.licenseScope.trim() || "—";
  return `<div style="font-size:12px;line-height:1.65;">${nl2br(scopeText)}</div>`;
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

  return `
<div style="text-align:center;margin-bottom:18px;">
  <div style="font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;text-decoration:underline;">
    Declaration Regarding Manufacturing Scope
  </div>
</div>

<div style="font-size:12px;line-height:1.75;text-align:justify;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin:0 0 14px;">
    <div style="flex:1;min-width:0;">
      To<br/>
      The Director &amp; Head<br/>
      Bureau of Indian Standards<br/>
      ${esc(bisBranchLine)}
    </div>
    <div style="flex-shrink:0;text-align:right;white-space:nowrap;">
      <strong>Date:</strong> ${inspectionDate ? esc(inspectionDate) : "_______________________"}
    </div>
  </div>

  <p style="margin:0 0 14px;">
    <strong>Sub:</strong> Declaration regarding manufacturing scope
    ${isStdRef ? ` under Indian Standard ${isStdRef}` : ""}.
  </p>

  <p style="margin:0 0 14px;">
    We, <strong>M/s. ${esc(data.companyName)}</strong>,
    ${data.address ? ` having our factory at <strong>${esc(data.address)}</strong>,` : ""}
    hereby declare that our manufacturing scope for BIS certification
    ${isStdRef ? ` under ${isStdRef}` : ""}
    is as follows:
  </p>

  <div style="margin:16px 0;padding:12px 14px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;min-height:80px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:6px;">
      License Scope
    </div>
    ${scopeContent}
  </div>

  <p style="margin:0 0 14px;">
    We further declare that the above information is true and correct to the best of our knowledge and belief.
    We undertake to inform BIS of any change in the manufacturing scope covered under the licence.
  </p>

  <div style="margin-top:36px;display:table;width:100%;">
    <div style="display:table-cell;width:50%;vertical-align:top;">
      <div>Place: ${data.city.trim() ? esc(data.city.trim()) : "_______________________"}</div>
    </div>
    <div style="display:table-cell;width:50%;vertical-align:top;text-align:right;">
      <div style="margin-top:24px;font-weight:700;">For ${esc(data.companyName)}</div>
      <div style="margin-top:48px;border-top:1px solid #94a3b8;display:inline-block;min-width:180px;padding-top:6px;font-size:11px;">
        Authorised Signatory
      </div>
      ${data.contactPerson ? `<div style="margin-top:4px;font-size:10px;color:#64748b;">(${esc(data.contactPerson)})</div>` : ""}
    </div>
  </div>
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

export function buildManufacturingScopeCompany(
  data: ManufacturingScopeDeclarationData,
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
    logo_url: null,
    website: "",
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

export function buildManufacturingScopeDeclarationHtml(
  data: ManufacturingScopeDeclarationData,
  settings: PrintSettings,
): string {
  return buildPrintDocument({
    title: "Declaration Regarding Manufacturing Scope",
    bodyHtml: buildDeclarationBody(data),
    settings,
    company: buildManufacturingScopeCompany(data),
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
      }),
    initialSettings: settings,
    company,
  });
}
