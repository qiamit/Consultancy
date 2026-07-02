import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import type { ProcessFlowChartStored } from "@/lib/process-flow-chart";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";
import { buildClassSignatoryBlockHtml } from "@/lib/print/signatory-signature";

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

function buildDrawingHtml(data: ProcessFlowChartLetterData): string {
  const drawing = data.document.drawing_data_url?.trim();
  if (!drawing) {
    return `
<div class="pfc-drawing-placeholder">
  Process flow chart has not been added yet.
</div>`;
  }

  return `
<div class="pfc-drawing-wrap">
  <img src="${esc(drawing)}" alt="Process flow chart" class="pfc-drawing-image" />
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

function buildBodyHtml(data: ProcessFlowChartLetterData): string {
  return `
<h1 class="pfc-title">Process Flow Chart</h1>
${buildLetterIntroHtml(data)}
<p class="pfc-salutation">Respected / Sir,</p>
<p class="pfc-declaration">
  We hereby submit the process flow chart of our manufacturing process for your kind
  reference in connection with our BIS licence application. The process flow diagram is shown below.
</p>
${buildDrawingHtml(data)}
<p class="pfc-truth-declaration">
  We hereby declare that all information furnished above is true and correct to the best of our
  knowledge and belief.
</p>
${buildSignatoryBlockHtml(data)}`;
}

export function buildProcessFlowChartCompany(data: ProcessFlowChartLetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultProcessFlowChartPrintSettings(): PrintSettings {
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

export function buildProcessFlowChartHtml(
  data: ProcessFlowChartLetterData,
  settings: PrintSettings,
): string {
  const sheetMinHeight = `calc(297mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm)`;
  const styles = `
    .pfc-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 4mm;
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
      margin: 0 0 16px;
      line-height: 1.35;
    }
    .pfc-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 12px;
    }
    .pfc-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.55;
    }
    .pfc-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.55;
    }
    .pfc-salutation,
    .pfc-declaration,
    .pfc-truth-declaration {
      margin: 0 0 10px;
      font-size: 10px;
      line-height: 1.55;
      text-align: justify;
    }
    .pfc-truth-declaration {
      margin-top: 14px;
    }
    .pfc-drawing-wrap {
      margin: 12px 0 16px;
      text-align: center;
    }
    .pfc-drawing-image {
      width: 100%;
      max-height: 520px;
      object-fit: contain;
      border: 1px solid #cbd5e1;
      display: block;
      margin: 0 auto;
    }
    .pfc-drawing-placeholder {
      border: 1px dashed #94a3b8;
      min-height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: #64748b;
      margin: 12px 0 16px;
    }
    .pfc-signatory-block {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .pfc-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .pfc-signatory-sig {
      margin-top: 32px;
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
  `;

  return buildPrintDocument({
    title: "Process Flow Chart",
    bodyHtml: `<div class="pfc-sheet">${buildBodyHtml(data)}${buildPageIndicatorHtml()}</div>`,
    extraStyles: styles,
    settings: { ...settings, show_page_numbers: false },
    company: buildProcessFlowChartCompany(data),
  });
}

export function iframeSizeForProcessFlowChartPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
