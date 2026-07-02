import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import type { Cmpf307BrandStored } from "@/lib/cmpf-307";
import type { RawMaterialStored } from "@/lib/raw-material-details";
import {
  SEF_BRAND_DECLARATION_POINTS,
  SEF_FINAL_DECLARATION,
  type SelfEvaluationFormStored,
  type SefPackagingMarkingRow,
  type SefQcStaffRow,
} from "@/lib/self-evaluation-form";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import { formatDisplayDate } from "@/lib/format-date";
import { buildClassSignatoryBlockHtml } from "@/lib/print/signatory-signature";

export type SelfEvaluationFormLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  markingClause: string;
  brandsWithoutMarkReasons: string;
  document: SelfEvaluationFormStored;
  rawMaterialRows: RawMaterialStored[];
  packagingMarkingRows: SefPackagingMarkingRow[];
  qcStaffRows: SefQcStaffRow[];
  brandRows: Cmpf307BrandStored[];
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

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

const SEF_TOTAL_PAGES = 2;

export function sefPrintPageCount(): number {
  return SEF_TOTAL_PAGES;
}

function buildPageIndicatorHtml(pageNum: number, totalPages: number): string {
  return `<div class="sef-page-indicator">Page ${padPageNum(pageNum)} of ${padPageNum(totalPages)}</div>`;
}

const CELL =
  "border:1px solid #111;padding:3px 5px;font-size:9px;vertical-align:middle;line-height:1.3;";
const TH = `${CELL}font-weight:700;text-align:center;background:#eef2f7;`;
const TD = `${CELL}text-align:center;`;
const TD_LEFT = `${CELL}text-align:left;`;
const LBL = `${CELL}font-weight:700;width:42%;background:#f8fafc;text-align:left;`;

function buildToBlockHtml(data: SelfEvaluationFormLetterData): string {
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<div class="sef-to-row">
  <div class="sef-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standard<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="sef-date-block">
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildSignatoryBlockHtml(data: SelfEvaluationFormLetterData): string {
  const sigName =
    esc(data.document.signatory_name) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.document.signatory_designation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "sef-signatory-block",
    forClass: "sef-signatory-for",
    sigWrapClass: "sef-signatory-sig",
    lineClass: "sef-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildRawMaterialTableHtml(rows: RawMaterialStored[]): string {
  const filled = rows.filter(
    (row) =>
      row.raw_material.trim() ||
      row.supplier_name.trim() ||
      row.bis_certification_mark.trim() ||
      row.test_certificate.trim() ||
      row.batches_packaging.trim(),
  );
  if (filled.length === 0) return "";

  const body = filled
    .map((row, i) => {
      return `<tr>
        <td style="${TD}width:5%;">${i + 1}</td>
        <td style="${TD_LEFT}">${esc(row.raw_material) || "&nbsp;"}</td>
        <td style="${TD}">${esc(row.supplier_name) || "&nbsp;"}</td>
        <td style="${TD}">${esc(row.bis_certification_mark) || "&nbsp;"}</td>
        <td style="${TD}">${esc(row.test_certificate) || "&nbsp;"}</td>
        <td style="${TD}">${esc(row.batches_packaging) || "&nbsp;"}</td>
      </tr>`;
    })
    .join("");

  return `
<table style="width:100%;border-collapse:collapse;margin:6px 0;">
  <tr>
    <td style="${TH}width:5%;">Sr. No</td>
    <td style="${TH}width:18%;">Raw Material</td>
    <td style="${TH}width:18%;">Name of Supplier</td>
    <td style="${TH}width:18%;">With OR Without BIS Certification Mark</td>
    <td style="${TH}width:18%;">Test Certificate of The Supplier</td>
    <td style="${TH}width:23%;">How Received Batches / Lots Nature of Packaging</td>
  </tr>
  ${body}
</table>`;
}

function buildPackagingMarkingTableHtml(rows: SefPackagingMarkingRow[]): string {
  const body = rows
    .map(
      (row, i) => `<tr>
        <td style="${TD}width:6%;">${i + 1}</td>
        <td style="${LBL}">${esc(row.label)}</td>
        <td style="${TD_LEFT}">${esc(row.value) || "&nbsp;"}</td>
      </tr>`,
    )
    .join("");

  return `
<table style="width:100%;border-collapse:collapse;margin:6px 0;">
  ${body}
</table>`;
}

function buildQcStaffTableHtml(rows: SefQcStaffRow[]): string {
  const filled = rows.filter(
    (row) =>
      row.person_name.trim() ||
      row.designation.trim() ||
      row.qualification.trim() ||
      row.experience.trim(),
  );
  if (filled.length === 0) return "";

  const body = filled
    .map(
      (row, i) => `<tr>
        <td style="${TD}width:6%;">${i + 1}</td>
        <td style="${TD}">${esc(row.person_name) || "&nbsp;"}</td>
        <td style="${TD}">${esc(row.designation) || "&nbsp;"}</td>
        <td style="${TD}">${esc(row.qualification) || "&nbsp;"}</td>
        <td style="${TD}">${esc(row.experience) || "&nbsp;"}</td>
      </tr>`,
    )
    .join("");

  return `
<table style="width:100%;border-collapse:collapse;margin:6px 0;">
  <tr>
    <td style="${TH}width:6%;">Sr. No</td>
    <td style="${TH}width:24%;">Name of the Person</td>
    <td style="${TH}width:24%;">Designation</td>
    <td style="${TH}width:22%;">Qualification</td>
    <td style="${TH}width:24%;">Experience</td>
  </tr>
  ${body}
</table>`;
}

function buildBrandTableHtml(rows: Cmpf307BrandStored[]): string {
  const filled = rows.filter(
    (row) =>
      row.brand_name.trim() ||
      row.owned_by.trim() ||
      row.registered_status.trim() ||
      row.registration_date.trim(),
  );
  if (filled.length === 0) return "";

  const body = filled
    .map(
      (row, i) => `<tr>
        <td style="${TD}width:5%;">${i + 1}</td>
        <td style="${TD_LEFT}width:40%;">${esc(row.brand_name) || "&nbsp;"}</td>
        <td style="${TD}width:14%;">${esc(row.owned_by) || "&nbsp;"}</td>
        <td style="${TD}width:16%;">${esc(row.registered_status) || "&nbsp;"}</td>
        <td style="${TD}width:25%;">${esc(row.registration_date) || "&nbsp;"}</td>
      </tr>`,
    )
    .join("");

  return `
<table style="width:100%;border-collapse:collapse;margin:6px 0;">
  <tr>
    <td style="${TH}width:5%;">Sr. No.</td>
    <td style="${TH}width:40%;">Brand Names / Trade – Mark(s) Which would be Marked on the Product Bearing the BIS Standard Mark (Give Actual Design Depiction of the Brand Name / Trade – Mark(s)</td>
    <td style="${TH}width:14%;">Owned By Self OR Others</td>
    <td style="${TH}width:16%;">Registered / Unregistered</td>
    <td style="${TH}width:25%;">Date of Registration / Introduction</td>
  </tr>
  ${body}
</table>`;
}

function buildPage1Html(data: SelfEvaluationFormLetterData, sheetMinHeight: string): string {
  return `
<div class="sef-sheet" style="min-height:${sheetMinHeight};">
  <h1 class="sef-title">Self Evaluation cum Verification Form</h1>
  ${buildToBlockHtml(data)}
  <p class="sef-section"><strong>1. General Information</strong></p>
  <p class="sef-line"><strong>a.</strong> Applicant Name :- ${esc(data.companyName) || "________________"}</p>
  <p class="sef-line"><strong>b.</strong> Plant Layout :- ${esc(data.document.plant_layout) || "Enclosed"}</p>
  <p class="sef-section"><strong>2. Raw Material Details</strong></p>
  ${buildRawMaterialTableHtml(data.rawMaterialRows)}
  <p class="sef-section"><strong>3. Packaging &amp; Marking</strong></p>
  ${buildPackagingMarkingTableHtml(data.packagingMarkingRows)}
  <p class="sef-section sef-section-tight"><strong>4. Details of Quality Control Staff</strong></p>
  ${buildQcStaffTableHtml(data.qcStaffRows)}
  ${buildPageIndicatorHtml(1, SEF_TOTAL_PAGES)}
</div>`;
}

function buildPage2Html(data: SelfEvaluationFormLetterData, sheetMinHeight: string): string {
  const reasonsB = esc(data.brandsWithoutMarkReasons) || "&nbsp;";
  const points = SEF_BRAND_DECLARATION_POINTS.map(
    (text, i) =>
      `<p class="sef-point"><strong>${String.fromCharCode(66 + i)}.</strong> ${esc(text)}${i === 0 ? ` ${reasonsB}` : ""}</p>`,
  ).join("");

  return `
<div class="sef-sheet sef-page-break" style="min-height:${sheetMinHeight};">
  <p class="sef-section"><strong>5. Brand Name</strong></p>
  <p class="sef-subhead"><strong>Declaration of Brand Name / Trade – Mark Proposed to be Covered Under Certification</strong></p>
  <p class="sef-subhead"><strong>A. Brand Name / Trade – Mark(s) Being Used</strong></p>
  ${buildBrandTableHtml(data.brandRows)}
  ${points}
  <p class="sef-section"><strong>Declaration</strong></p>
  <p class="sef-declaration">${esc(SEF_FINAL_DECLARATION)}</p>
  ${buildSignatoryBlockHtml(data)}
  ${buildPageIndicatorHtml(2, SEF_TOTAL_PAGES)}
</div>`;
}

function buildFormBody(data: SelfEvaluationFormLetterData, sheetMinHeight: string): string {
  return `${buildPage1Html(data, sheetMinHeight)}${buildPage2Html(data, sheetMinHeight)}`;
}

export function buildSelfEvaluationFormCompany(
  data: SelfEvaluationFormLetterData,
): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultSelfEvaluationFormPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    font_family: "Times New Roman",
    font_size: 10,
    show_page_numbers: false,
    show_footer_line: false,
  };
}

export function buildSelfEvaluationFormHtml(
  data: SelfEvaluationFormLetterData,
  settings: PrintSettings,
): string {
  const sheetMinHeight = `calc(297mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm)`;
  const styles = `
    .sef-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      box-sizing: border-box;
      padding-bottom: 4mm;
    }
    .sef-page-break {
      page-break-before: always;
      break-before: page;
    }
    .sef-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 6px;
      line-height: 1.35;
    }
    .sef-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .sef-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 8px 0;
    }
    .sef-to-block {
      flex: 1;
      min-width: 0;
      font-size: 10px;
      line-height: 1.5;
    }
    .sef-date-block {
      flex-shrink: 0;
      text-align: right;
      font-size: 10px;
      line-height: 1.5;
    }
    .sef-date-block div + div {
      margin-top: 4px;
    }
    .sef-section {
      margin: 8px 0 4px;
      font-size: 10px;
      font-weight: 700;
    }
    .sef-section-tight {
      margin-top: 4px;
    }
    .sef-subhead {
      margin: 4px 0;
      font-size: 9px;
      font-weight: 700;
      line-height: 1.35;
    }
    .sef-line {
      margin: 2px 0;
      font-size: 10px;
      line-height: 1.4;
    }
    .sef-point {
      margin: 4px 0;
      font-size: 9px;
      line-height: 1.4;
      text-align: justify;
    }
    .sef-declaration {
      margin: 4px 0 8px;
      font-size: 9px;
      line-height: 1.45;
      text-align: justify;
    }
    .sef-signatory-block {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .sef-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .sef-signatory-sig {
      margin-top: 32px;
      min-width: 200px;
      text-align: right;
    }
    .sef-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
  `;

  return buildPrintDocument({
    title: "Self Evaluation cum Verification Form",
    bodyHtml: buildFormBody(data, sheetMinHeight),
    extraStyles: styles,
    settings: { ...settings, show_page_numbers: false },
    company: buildSelfEvaluationFormCompany(data),
  });
}

export function iframeSizeForSelfEvaluationFormPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
