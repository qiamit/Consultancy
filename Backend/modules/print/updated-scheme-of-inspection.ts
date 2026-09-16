import { buildLetterheadHtml, buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type {
  SitTestRow,
  UpdatedSchemeOfInspectionStored,
} from "@backend/modules/bis/updated-scheme-of-inspection";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import {
  printPageGapHtml,
  printPageIndicatorHtml,
} from "@backend/modules/print/paged-preview";

export type UpdatedSchemeOfInspectionLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  document: UpdatedSchemeOfInspectionStored;
};

/** Always 2 pages: Annex C (portrait) + Table 1 (landscape). */
export function usitPrintPageCount(): number {
  return 2;
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textBlock(text: string): string {
  return esc(text)
    .split("\n")
    .map((line) => `<p class="usit-para">${line || "&nbsp;"}</p>`)
    .join("");
}

function cellMultiline(value: string): string {
  return esc(value)
    .split("\n")
    .join("<br/>");
}

function buildTableRowsHtml(rows: SitTestRow[]): string {
  const td =
    "border:1px solid #111;padding:4px 5px;font-size:8px;vertical-align:top;line-height:1.35;";
  const tdCenter = `${td}text-align:center;`;

  return rows
    .map((row) => {
      if (row.row_kind === "section") {
        return `
      <tr>
        <td style="${tdCenter}font-weight:700;" colspan="7">${cellMultiline(row.requirement || row.clause_no)}</td>
      </tr>`;
      }
      if (row.row_kind === "group") {
        return `
      <tr>
        <td style="${tdCenter}">${cellMultiline(row.clause_no)}</td>
        <td style="${td}font-weight:700;" colspan="6">${cellMultiline(row.requirement)}</td>
      </tr>`;
      }

      return `
      <tr>
        <td style="${tdCenter}">${cellMultiline(row.clause_no) || "&nbsp;"}</td>
        <td style="${td}">${cellMultiline(row.requirement) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.test_methods_ref) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.equipment_req) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.sample_count) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.frequency) || "&nbsp;"}</td>
        <td style="${td}">${cellMultiline(row.remarks) || "&nbsp;"}</td>
      </tr>`;
    })
    .join("");
}

function buildTableHtml(document: UpdatedSchemeOfInspectionStored): string {
  const th =
    "border:1px solid #111;padding:5px 4px;font-size:8px;font-weight:700;text-align:center;vertical-align:middle;background:#eef2f7;line-height:1.3;";

  return `
<p class="usit-table-title"><strong>TABLE 1</strong></p>
<table class="usit-test-table" style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0;">
  <thead>
    <tr>
      <th style="${th}width:7%;" colspan="3">(1) Test Details</th>
      <th style="${th}width:14%;">(2)<br/>Test equipment requirement<br/>R: Required (or)<br/>S: Subcontracting permitted</th>
      <th style="${th}width:26%;" colspan="3">(3) Levels of Control</th>
    </tr>
    <tr>
      <th style="${th}">Cl.</th>
      <th style="${th}">Requirement</th>
      <th style="${th}">Test Methods<br/>Reference</th>
      <th style="${th}">&nbsp;</th>
      <th style="${th}">No. of Sample</th>
      <th style="${th}">Frequency</th>
      <th style="${th}">Remarks</th>
    </tr>
  </thead>
  <tbody>
    ${buildTableRowsHtml(document.test_rows)}
  </tbody>
</table>`;
}

function buildFormBody(
  data: UpdatedSchemeOfInspectionLetterData,
  settings: PrintSettings,
  company: PrintCompanyInfo,
): string {
  const doc = data.document;
  const pmRef = esc(doc.pm_reference) || "PM/ IS __________/1/__________";
  const letterheadHtml = buildLetterheadHtml(company, { ...settings, show_letterhead: true });

  return `
<div class="print-sheet usit-sheet usit-page-portrait">
  <div class="print-sheet-body">
    ${letterheadHtml}
    <p class="usit-pm-ref">${pmRef}</p>
    <h1 class="usit-title">ANNEX C</h1>
    <h2 class="usit-subtitle">Scheme of Inspection and Testing</h2>
    ${textBlock(doc.laboratory_text)}
    ${textBlock(doc.test_records_text)}
    ${textBlock(doc.labelling_marking_text)}
    ${textBlock(doc.control_unit_text)}
    ${textBlock(doc.levels_of_control_text)}
    ${textBlock(doc.standard_mark_text)}
    ${textBlock(doc.rejections_text)}
    <p class="usit-pm-ref usit-pm-ref-bottom">${pmRef}</p>
  </div>
  ${printPageIndicatorHtml(1, 2)}
</div>
${printPageGapHtml(2, 2)}
<div class="print-sheet usit-sheet usit-page-landscape print-sheet-page-break">
  <div class="print-sheet-body">
    ${letterheadHtml}
    <p class="usit-pm-ref">${pmRef}</p>
    ${buildTableHtml(doc)}
    ${textBlock(doc.note_1)}
    ${textBlock(doc.note_2)}
    ${textBlock(doc.note_3)}
    <p class="usit-pm-ref usit-pm-ref-bottom">${pmRef}</p>
  </div>
  ${printPageIndicatorHtml(2, 2)}
</div>`;
}

export type UpdatedSchemeOfInspectionPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildUpdatedSchemeOfInspectionCompany(
  data: UpdatedSchemeOfInspectionLetterData,
  assets?: UpdatedSchemeOfInspectionPrintAssets,
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

export function defaultUpdatedSchemeOfInspectionPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    letterhead_layout: "logo-na",
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 10,
    // Page 1 (Annex C) is portrait; Table 1 forces landscape in CSS named pages.
    orientation: "portrait",
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 15,
    margin_right: 10,
  };
}

/** Force no-logo letterhead for Updated SIT preview / Word (same as Top Management). */
export function updatedSchemeOfInspectionLetterheadSettings(
  settings: PrintSettings,
): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

function pageSizeCssForOrientation(
  settings: PrintSettings,
  orientation: "portrait" | "landscape",
): string {
  const { widthMm, heightMm } = iframeSizeForPrintSettings({
    ...settings,
    orientation,
  });
  return `${widthMm}mm ${heightMm}mm`;
}

export function buildUpdatedSchemeOfInspectionHtml(
  data: UpdatedSchemeOfInspectionLetterData,
  settings: PrintSettings,
  assets?: UpdatedSchemeOfInspectionPrintAssets,
): string {
  const letterheadSettings = updatedSchemeOfInspectionLetterheadSettings({
    ...settings,
    orientation: "portrait",
    show_letterhead: false,
  });
  const company = buildUpdatedSchemeOfInspectionCompany(data, assets);
  const portrait = iframeSizeForPrintSettings({
    ...letterheadSettings,
    orientation: "portrait",
  });
  const landscape = iframeSizeForPrintSettings({
    ...letterheadSettings,
    orientation: "landscape",
  });
  const mt = letterheadSettings.margin_top;
  const mb = letterheadSettings.margin_bottom;
  const ml = letterheadSettings.margin_left;
  const mr = letterheadSettings.margin_right;

  const styles = `
    @page usit-portrait {
      size: ${pageSizeCssForOrientation(letterheadSettings, "portrait")};
      margin: 0;
    }
    @page usit-landscape {
      size: ${pageSizeCssForOrientation(letterheadSettings, "landscape")};
      margin: 0;
    }
    .usit-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 9px;
      line-height: 1.45;
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .usit-sheet .print-sheet-body {
      flex: 1 1 auto;
      min-height: 0;
    }
    .usit-page-portrait {
      page: usit-portrait;
    }
    .usit-page-landscape {
      page: usit-landscape;
      page-break-before: always;
      break-before: page;
    }
    .print-sheet-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .print-sheet-page-gap {
      display: none;
    }
    .print-sheet-page-break {
      page-break-before: always;
      break-before: page;
    }
    @media screen {
      .doc-page {
        padding: 0 !important;
        max-width: none !important;
      }
      .usit-page-portrait {
        width: ${portrait.widthMm}mm;
        min-height: ${portrait.heightMm}mm;
        padding: ${mt}mm ${mr}mm ${mb}mm ${ml}mm;
        margin: 0 auto;
        background: #fff;
      }
      .usit-page-landscape {
        width: ${landscape.widthMm}mm;
        min-height: ${landscape.heightMm}mm;
        padding: ${mt}mm ${mr}mm ${mb}mm ${ml}mm;
        margin: 12mm auto 0;
        background: #fff;
      }
      .print-sheet-page-gap {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 10mm;
        margin: 4mm auto;
        width: ${Math.max(portrait.widthMm, landscape.widthMm)}mm;
        color: #64748b;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border-top: 2px dashed #94a3b8;
        border-bottom: 2px dashed #94a3b8;
      }
    }
    @media print {
      .print-sheet-page-gap {
        display: none !important;
      }
      .usit-page-portrait,
      .usit-page-landscape {
        width: auto;
        min-height: auto;
        padding: ${mt}mm ${mr}mm ${mb}mm ${ml}mm;
        margin: 0;
      }
      .usit-sheet {
        page-break-after: always;
        break-after: page;
      }
      .usit-sheet:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
      .print-sheet-page-indicator {
        display: none !important;
      }
    }
    .usit-pm-ref {
      text-align: right;
      font-size: 9px;
      font-weight: 600;
      margin: 0 0 6px;
    }
    .usit-pm-ref-bottom {
      margin-top: 12px;
      margin-bottom: 0;
    }
    .usit-title {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      margin: 0 0 4px;
    }
    .usit-subtitle {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 10px;
    }
    .usit-para {
      margin: 0 0 8px;
      text-align: justify;
      font-size: 9px;
      line-height: 1.45;
    }
    .usit-table-title {
      margin: 8px 0 4px;
      font-size: 10px;
      text-align: center;
    }
    .usit-test-table {
      break-inside: auto;
      page-break-inside: auto;
    }
    .usit-test-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  `;

  return buildPrintDocument({
    title: "Updated Scheme of Inspection & Testing",
    bodyHtml: buildFormBody(data, { ...letterheadSettings, show_letterhead: true }, company),
    extraStyles: styles,
    settings: letterheadSettings,
    company,
  });
}

export function iframeSizeForUpdatedSchemeOfInspectionPrintSettings(
  settings: PrintSettings,
): {
  widthMm: number;
  heightMm: number;
} {
  const portrait = iframeSizeForPrintSettings({
    ...settings,
    orientation: "portrait",
  });
  const landscape = iframeSizeForPrintSettings({
    ...settings,
    orientation: "landscape",
  });
  const gapMm = 12;
  return {
    widthMm: Math.max(portrait.widthMm, landscape.widthMm),
    heightMm: portrait.heightMm + gapMm + landscape.heightMm + 4,
  };
}
