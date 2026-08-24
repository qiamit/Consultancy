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
  const letterDate = formatMetaDate(data.dateOfApplication);
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
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildDrawingHtml(data: PlantLayoutLetterData): string {
  const drawing = data.document.drawing_data_url?.trim();
  if (!drawing) {
    return `
<div class="pl-drawing-placeholder">
  Plant layout drawing has not been added yet.
</div>`;
  }

  return `
<div class="pl-drawing-wrap">
  <img src="${esc(drawing)}" alt="Plant layout drawing" class="pl-drawing-image" />
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

function buildBodyHtml(data: PlantLayoutLetterData): string {
  return `
<h1 class="pl-title">Plant Layout</h1>
${buildLetterIntroHtml(data)}
<p class="pl-salutation">Respected / Sir,</p>
<p class="pl-declaration">
  We hereby submit the plant layout drawing of our manufacturing unit for your kind reference in
  connection with our BIS licence application. The layout plan is shown below.
</p>
${buildDrawingHtml(data)}
<p class="pl-truth-declaration">
  We hereby declare that all information furnished above is true and correct to the best of our
  knowledge and belief.
</p>
${buildSignatoryBlockHtml(data)}`;
}

export function buildPlantLayoutCompany(data: PlantLayoutLetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultPlantLayoutPrintSettings(): PrintSettings {
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

export function buildPlantLayoutHtml(data: PlantLayoutLetterData, settings: PrintSettings): string {
  const sheetMinHeight = `calc(297mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm)`;
  const styles = `
    .pl-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 4mm;
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
      margin: 0 0 16px;
      line-height: 1.35;
    }
    .pl-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 12px;
    }
    .pl-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.55;
    }
    .pl-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.55;
    }
    .pl-salutation,
    .pl-declaration,
    .pl-truth-declaration {
      margin: 0 0 10px;
      font-size: 10px;
      line-height: 1.55;
      text-align: justify;
    }
    .pl-truth-declaration {
      margin-top: 14px;
    }
    .pl-drawing-wrap {
      margin: 12px 0 16px;
      text-align: center;
    }
    .pl-drawing-image {
      width: 100%;
      max-height: 520px;
      object-fit: contain;
      border: 1px solid #cbd5e1;
      display: block;
      margin: 0 auto;
    }
    .pl-drawing-placeholder {
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
    .pl-signatory-block {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .pl-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .pl-signatory-sig {
      margin-top: 32px;
      min-width: 200px;
      text-align: right;
    }
    .pl-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
  `;

  return buildPrintDocument({
    title: "Plant Layout",
    bodyHtml: `<div class="pl-sheet">${buildBodyHtml(data)}${buildPageIndicatorHtml()}</div>`,
    extraStyles: styles,
    settings: { ...settings, show_page_numbers: false },
    company: buildPlantLayoutCompany(data),
  });
}

export function iframeSizeForPlantLayoutPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
