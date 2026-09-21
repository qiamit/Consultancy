import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type { PlantLayoutStored } from "@backend/modules/bis/plant-layout";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type PlantLayoutLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  document: PlantLayoutStored;
  firmRepName: string;
  firmRepDesignation: string;
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

function buildPageIndicatorHtml(): string {
  return `<div class="pl-page-indicator">Page ${padPageNum(1)} of ${padPageNum(1)}</div>`;
}

function buildLetterIntroHtml(data: PlantLayoutLetterData): string {
  const letterDate = formatMetaDate(
    (data.dateOfInspection ?? "").trim() || data.dateOfApplication,
  );
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<div class="pl-to-row">
  <div class="pl-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standards<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="pl-date-block">
    <div><strong>Date of Inspection:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildDrawingHtml(data: PlantLayoutLetterData, fitOnePage: boolean): string {
  const drawing = data.document.drawing_data_url?.trim();
  if (!drawing) {
    return `
<div class="pl-drawing-placeholder">
  Plant layout drawing has not been added yet.
</div>`;
  }

  const sizeClass = fitOnePage ? "pl-drawing-image pl-drawing-image--fit" : "pl-drawing-image";
  return `
<div class="pl-drawing-wrap">
  <img src="${esc(drawing)}" alt="Plant layout drawing" class="${sizeClass}" />
</div>`;
}

function buildSignatoryBlockHtml(data: PlantLayoutLetterData): string {
  const sigName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.firmRepDesignation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "pl-signatory-block",
    forClass: "pl-signatory-for",
    sigWrapClass: "pl-signatory-sig",
    lineClass: "pl-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildBodyHtml(data: PlantLayoutLetterData, fitOnePage: boolean): string {
  return `
<h1 class="pl-title">Plant Layout</h1>
${buildLetterIntroHtml(data)}
<p class="pl-salutation">Respected / Sir,</p>
<p class="pl-declaration">
  We hereby submit the enclosed plant layout drawing of our manufacturing unit for your kind
  perusal and record in connection with our application for grant of BIS licence under the
  applicable Indian Standard. The drawing indicates the arrangement of production, storage,
  testing and allied areas within the factory premises to facilitate inspection and verification
  by the Bureau. The detailed layout plan is shown below for ready reference.
</p>
${buildDrawingHtml(data, fitOnePage)}
<p class="pl-truth-declaration">
  We hereby declare that all information furnished above is true and correct to the best of our
  knowledge and belief.
</p>
${buildSignatoryBlockHtml(data)}`;
}

export type PlantLayoutPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildPlantLayoutCompany(
  data: PlantLayoutLetterData,
  assets?: PlantLayoutPrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Plant Layout letterhead matches Top Management — text-only / no logo tile.
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

export function defaultPlantLayoutPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
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

/** Force no-logo letterhead for Plant Layout preview / Word. */
export function plantLayoutLetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildPlantLayoutHtml(
  data: PlantLayoutLetterData,
  settings: PrintSettings,
  assets?: PlantLayoutPrintAssets,
): string {
  const letterheadSettings = plantLayoutLetterheadSettings(settings);
  // Always fit one A4 page so PDF / print does not spill to page 2.
  const fitOnePage = true;
  const pageSize = iframeSizeForPrintSettings(letterheadSettings);
  const sheetHeightMm = Math.max(
    80,
    pageSize.heightMm - letterheadSettings.margin_top - letterheadSettings.margin_bottom,
  );
  // Leave room for letterhead + letter text + signatory (incl. signature clear space).
  const drawingMaxHeightMm = Math.max(55, Math.round(sheetHeightMm - 115));

  const fitPageStyles = `
    html, body {
      width: ${pageSize.widthMm}mm;
      height: ${pageSize.heightMm}mm;
      max-height: ${pageSize.heightMm}mm;
      overflow: hidden !important;
    }
    .doc-page {
      width: ${pageSize.widthMm}mm;
      height: ${pageSize.heightMm}mm;
      max-height: ${pageSize.heightMm}mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .lh-wrap {
      flex-shrink: 0;
      margin-bottom: 4px !important;
      padding-top: 4px !important;
      padding-bottom: 4px !important;
    }
    .pl-sheet {
      flex: 1 1 auto;
      min-height: 0;
      height: auto !important;
      max-height: none !important;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      padding-bottom: 0;
    }
    .pl-sheet > *:not(.pl-drawing-wrap) {
      flex-shrink: 0;
    }
    /* Box height follows the drawing — do not stretch to fill the page. */
    .pl-drawing-wrap {
      flex: 0 1 auto;
      min-height: 0;
      max-height: ${drawingMaxHeightMm}mm;
      margin: 2px 0 12px;
      width: 100%;
      overflow: hidden;
      line-height: 0;
    }
    .pl-drawing-image--fit {
      position: static !important;
      inset: auto !important;
      display: block;
      width: 100% !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: ${drawingMaxHeightMm}mm !important;
      margin: 0 !important;
      object-fit: contain;
      object-position: center top;
    }
    .pl-title { margin: 0 0 4px; font-size: 14px; }
    .pl-to-row { margin: 0 0 4px; }
    .pl-salutation,
    .pl-declaration { margin: 0 0 3px; font-size: 9px; line-height: 1.35; }
    .pl-truth-declaration { margin: 10px 0 6px !important; font-size: 9px; line-height: 1.35; }
    /* Keep signature (absolute overlay ~-62px) clear of the plant layout drawing. */
    .pl-signatory-block { margin-top: 22px !important; }
    .pl-signatory-sig { margin-top: 44px !important; }
    .pl-page-indicator { display: none; }
    .doc-page > .pl-sheet ~ div { display: none !important; }
  `;

  const styles = `
    .pl-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      box-sizing: border-box;
      padding-bottom: 4mm;
      ${fitOnePage ? "" : `min-height: ${sheetHeightMm}mm;`}
    }
    .pl-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .pl-title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 10px;
      line-height: 1.35;
    }
    .pl-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 8px;
    }
    .pl-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.45;
    }
    .pl-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.45;
    }
    .pl-salutation,
    .pl-declaration,
    .pl-truth-declaration {
      margin: 0 0 6px;
      font-size: 10px;
      line-height: 1.45;
      text-align: justify;
    }
    .pl-truth-declaration {
      margin-top: 12px;
      margin-bottom: 8px;
    }
    .pl-drawing-wrap {
      margin: 6px 0 8px;
      text-align: center;
    }
    .pl-drawing-image {
      width: 100%;
      height: auto;
      max-width: 100%;
      object-fit: contain;
      border: 1px solid #cbd5e1;
      display: block;
      margin: 0 auto;
    }
    .pl-drawing-image--fit {
      width: auto;
      max-width: 100%;
      height: auto;
      object-fit: contain;
    }
    .pl-drawing-placeholder {
      border: 1px dashed #94a3b8;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 12px;
      font-size: 11px;
      color: #64748b;
      margin: 6px 0 8px;
      width: 100%;
    }
    .pl-signatory-block {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 11px;
      line-height: 1.45;
      text-align: right;
    }
    .pl-signatory-block-inner {
      display: inline-block;
      min-width: 220px;
      text-align: right;
    }
    .pl-signatory-for {
      font-weight: 700;
      text-align: right;
      white-space: nowrap;
    }
    .pl-signatory-sig {
      margin-top: 40px;
      width: 100%;
      text-align: right;
    }
    .pl-signatory-line {
      border-top: 1px solid #111;
      padding-top: 4px;
      font-size: 11px;
      line-height: 1.4;
      text-align: right;
      width: 100%;
    }
    ${fitPageStyles}
  `;

  return buildPrintDocument({
    title: "Plant Layout",
    bodyHtml: `<div class="pl-sheet">${buildBodyHtml(data, fitOnePage)}${buildPageIndicatorHtml()}</div>`,
    extraStyles: styles,
    settings: letterheadSettings,
    company: buildPlantLayoutCompany(data, assets),
  });
}

export function iframeSizeForPlantLayoutPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
