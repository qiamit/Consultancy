import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import {
  CRM_ROWS_PER_PAGE,
  paginateCertifiedReferenceMaterialRows,
  type CertifiedReferenceMaterialStored,
} from "@/lib/certified-reference-materials";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";
import { buildClassSignatoryBlockHtml } from "@/lib/print/signatory-signature";

export type CertifiedReferenceMaterialsLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  firmRepName: string;
  firmRepDesignation: string;
  rows: CertifiedReferenceMaterialStored[];
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

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function formatBisBranchLine(branchName: string, state: string, country: string): string {
  const parts = [
    branchName.trim() || "________________",
    state.trim() || "________________",
    country.trim() || "India",
  ];
  return parts.map(esc).join(", ");
}

function formatIsStandardRef(isNumber: string, isTitle: string): string {
  const num = (isNumber ?? "").trim();
  const title = (isTitle ?? "").trim();
  if (num && title) return `<strong>${esc(num)}</strong> — ${esc(title)}`;
  if (num) return `<strong>${esc(num)}</strong>`;
  if (title) return `<strong>${esc(title)}</strong>`;
  return "";
}

function buildPageHeaderHtml(): string {
  return `
<h1 class="crm-title">List of Certified Reference Material</h1>`;
}

function buildPageIndicatorHtml(pageNum: number, totalPages: number): string {
  return `<div class="crm-page-indicator">Page ${padPageNum(pageNum)} of ${padPageNum(totalPages)}</div>`;
}

function buildIntroContentHtml(data: CertifiedReferenceMaterialsLetterData): string {
  const isStdRef = formatIsStandardRef(data.isNumber, data.isTitle ?? "");
  const bisBranchLine = formatBisBranchLine(
    data.bisBranchName,
    data.bisBranchState,
    data.bisBranchCountry,
  );
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<div class="crm-intro">
  <div class="crm-to-row">
    <div class="crm-to-block">
      To<br/>
      The Director &amp; Head<br/>
      Bureau of Indian Standards<br/>
      ${bisBranchLine}
    </div>
    <div class="crm-date-block">
      <div><strong>Date:</strong> ${esc(letterDate)}</div>
      <div><strong>Application No.:</strong> ${esc(appNo)}</div>
    </div>
  </div>

  <p class="crm-para">
    <strong>Sub:</strong> List of Certified Reference Materials (CRMs) used in the testing /
    calibration activities in connection with BIS licence application
    ${isStdRef ? ` for Indian Standard ${isStdRef}` : ""}.
  </p>

  <p class="crm-para">
    We, <strong>M/s. ${esc(data.companyName)}</strong>,
    ${data.address ? ` having our factory / laboratory at <strong>${esc(data.address)}</strong>,` : ""}
    hereby furnish the list of Certified Reference Materials (CRMs) used in our in-house testing
    activities ${isStdRef ? ` in connection with BIS certification under ${isStdRef}` : " in connection with BIS certification"}.
    The particulars regarding the name of CRM, supplier / manufacturer, whether procured from an
    accredited Reference Material Producer (RMP), CRM certificate / lot number, and validity /
    expiry period are as under:
  </p>
</div>`;
}

function buildClosingDeclarationHtml(): string {
  return `
<p class="crm-para crm-closing">
  We declare that the information furnished above is true and correct to the best of our knowledge
  and belief. We undertake to maintain records of CRM procurement, certificates of analysis,
  traceability and validity, and to inform BIS of any change in CRM source, supplier or specifications.
</p>`;
}

function materialTableColgroup(_settings: PrintSettings): string {
  const widths = [5, 24, 22, 16, 16, 17];
  return `<colgroup>${widths.map((w) => `<col style="width:${w}%" />`).join("")}</colgroup>`;
}

function buildMaterialTableHtml(
  pageRows: CertifiedReferenceMaterialStored[],
  startIndex: number,
  settings: PrintSettings,
): string {
  const th = "crm-cell crm-th";
  const td = "crm-cell crm-td";
  const tdLeft = "crm-cell crm-td crm-col-left";
  const thSr = `${th} crm-col-sr`;
  const tdSr = `${td} crm-col-sr`;

  const body = pageRows
    .map((row, i) => {
      const sr = startIndex + i + 1;
      return `<tr>
        <td class="${tdSr}">${sr}</td>
        <td class="${tdLeft}">${esc(row.crm_name) || "&nbsp;"}</td>
        <td class="${td}">${esc(row.supplier_name) || "&nbsp;"}</td>
        <td class="${td}">${esc(row.accredited_rmp) || "&nbsp;"}</td>
        <td class="${td}">${esc(row.certificate_lot_no) || "&nbsp;"}</td>
        <td class="${td}">${esc(row.validity_period) || "&nbsp;"}</td>
      </tr>`;
    })
    .join("");

  return `<table class="crm-material-table">
    ${materialTableColgroup(settings)}
    <thead>
      <tr>
        <th class="${thSr}">Sr. No.</th>
        <th class="${th}">Certified Reference Material</th>
        <th class="${th}">Name of Supplier / Manufacturer</th>
        <th class="${th}">From Accredited Reference Material Producer (Yes / No)</th>
        <th class="${th}">CRM Certificate / Lot No.</th>
        <th class="${th}">Validity / Expiry Period</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`;
}

function buildSignatoryBlockHtml(data: CertifiedReferenceMaterialsLetterData): string {
  const sigName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.firmRepDesignation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "crm-signatory-block",
    forClass: "crm-signatory-for",
    sigWrapClass: "crm-signatory-sig",
    lineClass: "crm-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildSinglePageHtml(
  data: CertifiedReferenceMaterialsLetterData,
  pageRows: CertifiedReferenceMaterialStored[],
  pageNum: number,
  totalPages: number,
  startIndex: number,
  isLastPage: boolean,
  settings: PrintSettings,
): string {
  return `
<div class="crm-sheet${pageNum > 1 ? " page-break" : ""}">
  ${buildPageHeaderHtml()}
  ${pageNum === 1 ? buildIntroContentHtml(data) : ""}
  ${buildMaterialTableHtml(pageRows, startIndex, settings)}
  ${isLastPage ? buildClosingDeclarationHtml() : ""}
  ${isLastPage ? buildSignatoryBlockHtml(data) : ""}
  ${buildPageIndicatorHtml(pageNum, totalPages)}
</div>`;
}

function buildFormBody(data: CertifiedReferenceMaterialsLetterData, settings: PrintSettings): string {
  const pages = paginateCertifiedReferenceMaterialRows(data.rows, CRM_ROWS_PER_PAGE);
  const totalPages = pages.length;

  return pages
    .map((pageRows, i) =>
      buildSinglePageHtml(
        data,
        pageRows,
        i + 1,
        totalPages,
        i * CRM_ROWS_PER_PAGE,
        i === totalPages - 1,
        settings,
      ),
    )
    .join("");
}

export function buildCertifiedReferenceMaterialsCompany(
  data: CertifiedReferenceMaterialsLetterData,
): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultCertifiedReferenceMaterialsPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    margin_top: 8,
    font_family: "Times New Roman",
    font_size: 9,
    show_page_numbers: false,
    show_footer_line: false,
  };
}

export function buildCertifiedReferenceMaterialsHtml(
  data: CertifiedReferenceMaterialsLetterData,
  settings: PrintSettings,
): string {
  const sheetMinHeight = `calc(297mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm)`;
  const styles = `
    .crm-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 9px;
      position: relative;
      width: 100%;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 4mm;
    }
    .crm-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      letter-spacing: 0.02em;
    }
    .crm-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .crm-intro {
      font-size: 10px;
      line-height: 1.55;
      text-align: justify;
      margin: 8px 0 10px;
    }
    .crm-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 12px;
    }
    .crm-to-block {
      flex: 1;
      min-width: 0;
      line-height: 1.55;
    }
    .crm-date-block {
      flex-shrink: 0;
      text-align: right;
      line-height: 1.55;
    }
    .crm-date-block div + div {
      margin-top: 4px;
    }
    .crm-para {
      margin: 0 0 10px;
    }
    .crm-closing {
      margin-top: 14px;
    }
    .crm-material-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 10px;
    }
    .crm-material-table .crm-cell {
      border: 1px solid #111;
      padding: 4px 5px;
      vertical-align: middle;
      line-height: 1.3;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .crm-material-table .crm-th {
      font-size: 7.5px;
      font-weight: 700;
      text-align: center;
      background: #eef2f7;
      line-height: 1.25;
    }
    .crm-material-table .crm-td {
      font-size: 9px;
      text-align: center;
    }
    .crm-material-table .crm-col-left {
      text-align: left;
    }
    .crm-material-table .crm-col-sr {
      text-align: center;
    }
    .crm-signatory-block {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .crm-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .crm-signatory-sig {
      margin-top: 32px;
      min-width: 200px;
      text-align: right;
    }
    .crm-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
    .page-break { page-break-before: always; }
  `;

  return buildPrintDocument({
    title: "List of Certified Reference Material",
    bodyHtml: buildFormBody(data, settings),
    extraStyles: styles,
    settings,
    company: buildCertifiedReferenceMaterialsCompany(data),
  });
}

export function iframeSizeForCertifiedReferenceMaterialsPrintSettings(
  settings: PrintSettings,
): { widthMm: number; heightMm: number } {
  return iframeSizeForPrintSettings(settings);
}
