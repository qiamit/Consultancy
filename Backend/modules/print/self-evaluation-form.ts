import { buildLetterheadHtml, buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type { Cmpf307BrandStored } from "@backend/modules/bis/cmpf-307";
import type { RawMaterialStored } from "@backend/modules/bis/raw-material-details";
import {
  SEF_BRAND_DECLARATION_POINTS,
  SEF_FINAL_DECLARATION,
  type SelfEvaluationFormStored,
  type SefPackagingMarkingRow,
  type SefQcStaffRow,
} from "@backend/modules/bis/self-evaluation-form";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";
import {
  iframeSizeForPagedPrintSettings,
  pagedPrintSheetStyles,
  printPageGapHtml,
  printPageIndicatorHtml,
} from "@backend/modules/print/paged-preview";

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

/** Self Evaluation Form is always two print pages. */
export function sefPrintPageCount(_pageCount = 2): number {
  return 2;
}

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

const CELL =
  "border:1px solid #111;padding:3px 5px;font-size:9px;vertical-align:middle;line-height:1.3;";
const TH = `${CELL}font-weight:700;text-align:center;background:#eef2f7;`;
const TD = `${CELL}text-align:center;`;
const TD_LEFT = `${CELL}text-align:left;`;
const LBL = `${CELL}font-weight:700;width:42%;background:#f8fafc;text-align:left;`;

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

function buildBrandPointsHtml(data: SelfEvaluationFormLetterData): string {
  const reasonsB = esc(data.brandsWithoutMarkReasons) || "&nbsp;";
  return SEF_BRAND_DECLARATION_POINTS.map(
    (text, i) =>
      `<p class="sef-point"><strong>${String.fromCharCode(66 + i)}.</strong> ${esc(text)}${i === 0 ? ` ${reasonsB}` : ""}</p>`,
  ).join("");
}

/**
 * Page 1: General / Raw Material / Packaging + Seal & Sign
 * Page 2: Letterhead + QC Staff / Brand / Declaration + Seal & Sign
 */
function buildFormBodyHtml(
  data: SelfEvaluationFormLetterData,
  settings: PrintSettings,
  company: PrintCompanyInfo,
): string {
  const page2Letterhead = buildLetterheadHtml(company, settings);
  const signatory = buildSignatoryBlockHtml(data);

  return `
<div class="print-sheet sef-sheet">
  <div class="print-sheet-body">
    <h1 class="sef-title">Self Evaluation cum Verification Form</h1>
    ${buildToBlockHtml(data)}
    <section class="sef-block">
      <p class="sef-section"><strong>1. General Information</strong></p>
      <p class="sef-line"><strong>a.</strong> Applicant Name :- ${esc(data.companyName) || "________________"}</p>
      <p class="sef-line"><strong>b.</strong> Plant Layout :- ${esc(data.document.plant_layout) || "Enclosed"}</p>
    </section>
    <section class="sef-block">
      <p class="sef-section"><strong>2. Raw Material Details</strong></p>
      ${buildRawMaterialTableHtml(data.rawMaterialRows)}
    </section>
    <section class="sef-block">
      <p class="sef-section"><strong>3. Packaging &amp; Marking</strong></p>
      ${buildPackagingMarkingTableHtml(data.packagingMarkingRows)}
    </section>
    ${signatory}
  </div>
  ${printPageIndicatorHtml(1, 2)}
</div>
${printPageGapHtml(2, 2)}
<div class="print-sheet sef-sheet print-sheet-page-break">
  <div class="print-sheet-body">
    ${page2Letterhead}
    <section class="sef-block">
      <p class="sef-section sef-section-tight"><strong>4. Details of Quality Control Staff</strong></p>
      ${buildQcStaffTableHtml(data.qcStaffRows)}
    </section>
    <section class="sef-block">
      <p class="sef-section"><strong>5. Brand Name</strong></p>
      <p class="sef-subhead"><strong>Declaration of Brand Name / Trade – Mark Proposed to be Covered Under Certification</strong></p>
      <p class="sef-subhead"><strong>A. Brand Name / Trade – Mark(s) Being Used</strong></p>
      ${buildBrandTableHtml(data.brandRows)}
      ${buildBrandPointsHtml(data)}
    </section>
    <section class="sef-block sef-declaration-block">
      <p class="sef-section"><strong>Declaration</strong></p>
      <p class="sef-declaration">${esc(SEF_FINAL_DECLARATION)}</p>
      ${signatory}
    </section>
  </div>
  ${printPageIndicatorHtml(2, 2)}
</div>`;
}

export type SelfEvaluationFormPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildSelfEvaluationFormCompany(
  data: SelfEvaluationFormLetterData,
  assets?: SelfEvaluationFormPrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Letterhead matches Top Management / Plant & Machinery — text-only / no logo tile.
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

export function defaultSelfEvaluationFormPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    letterhead_layout: "logo-na",
    font_family: "Times New Roman",
    font_size: 10,
    show_page_numbers: false,
    show_footer_line: false,
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 15,
    margin_right: 10,
  };
}

/** Force no-logo letterhead for Self Evaluation Form preview / Word (same as Top Management). */
export function selfEvaluationFormLetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildSelfEvaluationFormHtml(
  data: SelfEvaluationFormLetterData,
  settings: PrintSettings,
  assets?: SelfEvaluationFormPrintAssets,
): string {
  const letterheadSettings = selfEvaluationFormLetterheadSettings(settings);
  const company = buildSelfEvaluationFormCompany(data, assets);
  const styles = `
    ${pagedPrintSheetStyles(letterheadSettings)}
    .sef-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
    }
    .sef-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 6px;
      line-height: 1.35;
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
    @media print {
      .sef-block table {
        break-inside: auto;
        page-break-inside: auto;
      }
      .sef-block tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .sef-declaration-block {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;

  return buildPrintDocument({
    title: "Self Evaluation cum Verification Form",
    bodyHtml: buildFormBodyHtml(data, letterheadSettings, company),
    extraStyles: styles,
    settings: letterheadSettings,
    company,
  });
}

export function iframeSizeForSelfEvaluationFormPrintSettings(
  settings: PrintSettings,
  pageCount = 2,
): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPagedPrintSettings(settings, sefPrintPageCount(pageCount));
}
