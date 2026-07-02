import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import type {
  SitTestRow,
  UpdatedSchemeOfInspectionStored,
} from "@/lib/updated-scheme-of-inspection";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";

export type UpdatedSchemeOfInspectionLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  document: UpdatedSchemeOfInspectionStored;
};

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
<p class="usit-pm-ref">${esc(document.pm_reference) || "PM/ IS __________/1/__________"}</p>
<p class="usit-table-title"><strong>TABLE 1</strong></p>
<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0;">
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

function buildFormBody(data: UpdatedSchemeOfInspectionLetterData): string {
  const doc = data.document;
  const pmRef = esc(doc.pm_reference) || "PM/ IS __________/1/__________";

  return `
<div class="usit-sheet">
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
  ${buildTableHtml(doc)}
  ${textBlock(doc.note_1)}
  ${textBlock(doc.note_2)}
  ${textBlock(doc.note_3)}
  <p class="usit-pm-ref">${pmRef}</p>
</div>`;
}

export function buildUpdatedSchemeOfInspectionCompany(
  data: UpdatedSchemeOfInspectionLetterData,
): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultUpdatedSchemeOfInspectionPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    show_letterhead: false,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 10,
    orientation: "landscape",
  };
}

export function buildUpdatedSchemeOfInspectionHtml(
  data: UpdatedSchemeOfInspectionLetterData,
  settings: PrintSettings,
): string {
  const styles = `
    .usit-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 9px;
      line-height: 1.45;
    }
    .usit-pm-ref {
      text-align: right;
      font-size: 9px;
      font-weight: 600;
      margin: 0 0 6px;
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
  `;

  return buildPrintDocument({
    title: "Updated Scheme of Inspection & Testing",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings,
    company: buildUpdatedSchemeOfInspectionCompany(data),
  });
}

export function iframeSizeForUpdatedSchemeOfInspectionPrintSettings(
  settings: PrintSettings,
): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
