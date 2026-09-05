import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type { ProcessFlowChartStored } from "@backend/modules/bis/process-flow-chart";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type ProcessFlowChartLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  document: ProcessFlowChartStored;
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
  return `<div class="pfc-page-indicator">Page ${padPageNum(1)} of ${padPageNum(1)}</div>`;
}

function buildLetterIntroHtml(data: ProcessFlowChartLetterData): string {
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<div class="pfc-to-row">
  <div class="pfc-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standards<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="pfc-date-block">
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildDrawingHtml(
  data: ProcessFlowChartLetterData,
  fitOnePage: boolean,
): string {
  const drawing = data.document.drawing_data_url?.trim();
  if (!drawing) {
    return `
<div class="pfc-drawing-placeholder">
  Process flow chart has not been added yet.
</div>`;
  }

  const sizeClass = fitOnePage ? "pfc-drawing-image pfc-drawing-image--fit" : "pfc-drawing-image";
  return `
<div class="pfc-drawing-wrap">
  <img src="${esc(drawing)}" alt="Process flow chart" class="${sizeClass}" />
</div>`;
}

function buildSignatoryBlockHtml(data: ProcessFlowChartLetterData): string {
  const sigName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.firmRepDesignation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "pfc-signatory-block",
    forClass: "pfc-signatory-for",
    sigWrapClass: "pfc-signatory-sig",
    lineClass: "pfc-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildBodyHtml(data: ProcessFlowChartLetterData, fitOnePage: boolean): string {
  return `
<h1 class="pfc-title">Process Flow Chart</h1>
${buildLetterIntroHtml(data)}
<p class="pfc-salutation">Respected / Sir,</p>
<p class="pfc-declaration">
  We hereby submit the process flow chart of our manufacturing process for your kind
  reference in connection with our BIS licence application. The process flow diagram is shown below.
</p>
${buildDrawingHtml(data, fitOnePage)}
<p class="pfc-truth-declaration">
  We hereby declare that all information furnished above is true and correct to the best of our
  knowledge and belief.
</p>
${buildSignatoryBlockHtml(data)}`;
}

export type ProcessFlowChartPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildProcessFlowChartCompany(
  data: ProcessFlowChartLetterData,
  assets?: ProcessFlowChartPrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Process Flow Chart letterhead matches Top Management — text-only / no logo tile.
    logo_url: null,
  };
}

export function defaultProcessFlowChartPrintSettings(): PrintSettings {
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

/** Force no-logo letterhead for Process Flow Chart preview / Word. */
export function processFlowChartLetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildProcessFlowChartHtml(
  data: ProcessFlowChartLetterData,
  settings: PrintSettings,
  assets?: ProcessFlowChartPrintAssets,
): string {
  const letterheadSettings = processFlowChartLetterheadSettings(settings);
  // Default / missing → fit one page (single A4).
  const fitOnePage = data.document.chart_settings?.print_chart_size !== "full";
  const pageSize = iframeSizeForPrintSettings(letterheadSettings);
  const sheetHeightMm = Math.max(
    80,
    pageSize.heightMm - letterheadSettings.margin_top - letterheadSettings.margin_bottom,
  );

  const fitPageStyles = fitOnePage
    ? `
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
    .pfc-sheet {
      flex: 1 1 auto;
      min-height: 0;
      height: auto !important;
      max-height: none !important;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding-bottom: 0;
    }
    .pfc-sheet > *:not(.pfc-drawing-wrap) {
      flex-shrink: 0;
    }
    .pfc-drawing-wrap {
      flex: 1 1 auto;
      min-height: 0;
      max-height: none !important;
      margin: 2px 0 4px;
      position: relative;
    }
    .pfc-drawing-image--fit {
      position: absolute;
      inset: 0;
      margin: auto;
      width: auto !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: 100% !important;
      object-fit: contain;
    }
    .pfc-title { margin: 0 0 4px; font-size: 14px; }
    .pfc-to-row { margin: 0 0 4px; }
    .pfc-salutation,
    .pfc-declaration,
    .pfc-truth-declaration { margin: 0 0 3px; font-size: 9px; line-height: 1.35; }
    .pfc-signatory-block { margin-top: 4px; }
    .pfc-signatory-sig { margin-top: 10px; }
    .pfc-page-indicator { display: none; }
    .doc-page > .pfc-sheet ~ div { display: none !important; }
  `
    : "";

  const styles = `
    .pfc-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      box-sizing: border-box;
      padding-bottom: 4mm;
      ${fitOnePage ? "" : `min-height: ${sheetHeightMm}mm;`}
    }
    .pfc-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .pfc-title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 10px;
      line-height: 1.35;
    }
    .pfc-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 8px;
    }
    .pfc-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.45;
    }
    .pfc-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.45;
    }
    .pfc-salutation,
    .pfc-declaration,
    .pfc-truth-declaration {
      margin: 0 0 6px;
      font-size: 10px;
      line-height: 1.45;
      text-align: justify;
    }
    .pfc-truth-declaration {
      margin-top: 6px;
    }
    .pfc-drawing-wrap {
      margin: 6px 0 8px;
      text-align: center;
    }
    .pfc-drawing-image {
      width: 100%;
      height: auto;
      max-width: 100%;
      border: 1px solid #cbd5e1;
      display: block;
      margin: 0 auto;
    }
    .pfc-drawing-image--fit {
      width: auto;
      max-width: 100%;
      height: auto;
      object-fit: contain;
    }
    .pfc-drawing-placeholder {
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
    .pfc-signatory-block {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.45;
      text-align: right;
    }
    .pfc-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .pfc-signatory-sig {
      margin-top: 18px;
      min-width: 200px;
      text-align: right;
    }
    .pfc-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
    ${fitPageStyles}
  `;

  return buildPrintDocument({
    title: "Process Flow Chart",
    bodyHtml: `<div class="pfc-sheet">${buildBodyHtml(data, fitOnePage)}${buildPageIndicatorHtml()}</div>`,
    extraStyles: styles,
    settings: letterheadSettings,
    company: buildProcessFlowChartCompany(data, assets),
  });
}

export function iframeSizeForProcessFlowChartPrintSettings(
  settings: PrintSettings,
  options?: { contentHeightMm?: number },
): {
  widthMm: number;
  heightMm: number;
} {
  const base = iframeSizeForPrintSettings(settings);
  if (options?.contentHeightMm && options.contentHeightMm > base.heightMm) {
    return { widthMm: base.widthMm, heightMm: Math.ceil(options.contentHeightMm) };
  }
  return base;
}
