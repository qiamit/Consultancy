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
import { USIT_ANNEX_SECTIONS, USIT_NOTE_SECTIONS } from "@backend/modules/bis/updated-scheme-of-inspection";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import {
  printPageIndicatorHtml,
} from "@backend/modules/print/paged-preview";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import { buildRightAlignedSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type UpdatedSchemeOfInspectionLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  document: UpdatedSchemeOfInspectionStored;
  dateOfApplication?: string;
};

/** Always 2 pages: Annex C (portrait) + Table 1 with notes (portrait). */
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

/** Drop leading "HEADER -" / "HEADER –" when a separate header is printed. */
function normalizeHeaderLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripLeadingSectionHeader(text: string, header: string): string {
  const raw = text.trim();
  if (!raw || !header.trim()) return raw;
  const m = raw.match(/^(.{1,80}?)\s*[-–—:]\s+/);
  if (m && normalizeHeaderLabel(m[1]) === normalizeHeaderLabel(header)) {
    return raw.slice(m[0].length).trim();
  }
  // Also strip "Note-1" / "Note 1" style labels without requiring exact header match.
  const noteLike = raw.match(/^(note[\s-]*\d+)\s*[-–—:]\s+/i);
  if (
    noteLike &&
    normalizeHeaderLabel(noteLike[1]) === normalizeHeaderLabel(header)
  ) {
    return raw.slice(noteLike[0].length).trim();
  }
  const escaped = header.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return raw
    .replace(new RegExp(`^${escaped}\\s*[-–—:]\\s*`, "i"), "")
    .trim();
}

function annexSectionHtml(header: string, text: string, index?: number): string {
  const body = stripLeadingSectionHeader(text, header);
  if (!header.trim() && !body.trim()) return "";
  const label = header.trim()
    ? index != null
      ? `${index}. ${header.trim().toUpperCase()}`
      : header.trim().toUpperCase()
    : "";
  return `
${label ? `<p class="usit-annex-header"><strong>${esc(label)}</strong></p>` : ""}
${body.trim() ? textBlock(body) : ""}`;
}

function buildAnnexSectionsHtml(doc: UpdatedSchemeOfInspectionStored): string {
  const fixed = USIT_ANNEX_SECTIONS.map((section, i) =>
    annexSectionHtml(section.header, doc[section.key] ?? "", i + 1),
  ).join("");
  const extras = (doc.annex_extra_rows ?? [])
    .map((row, i) =>
      annexSectionHtml(row.header, row.text, USIT_ANNEX_SECTIONS.length + i + 1),
    )
    .join("");
  return `${fixed}${extras}`;
}

function buildNotesSectionsHtml(doc: UpdatedSchemeOfInspectionStored): string {
  const fixed = USIT_NOTE_SECTIONS.map((section) =>
    annexSectionHtml(section.header, doc[section.key] ?? ""),
  ).join("");
  const extras = (doc.note_extra_rows ?? [])
    .map((row) => annexSectionHtml(row.header, row.text))
    .join("");
  return `${fixed}${extras}`;
}

function cellMultiline(value: string): string {
  return esc(value)
    .split("\n")
    .join("<br/>");
}

function buildTableRowsHtml(rows: SitTestRow[]): string {
  const td =
    "border:1px solid #111;padding:4px 5px;font-size:8px;vertical-align:middle;line-height:1.35;";
  const tdCenter = `${td}text-align:center;`;
  const tdLeft = `${td}text-align:left;`;

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
        <td style="${tdLeft}font-weight:700;" colspan="6">${cellMultiline(row.requirement)}</td>
      </tr>`;
      }

      return `
      <tr>
        <td style="${tdCenter}">${cellMultiline(row.clause_no) || "&nbsp;"}</td>
        <td style="${tdLeft}">${cellMultiline(row.requirement) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.test_methods_ref) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.equipment_req) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.sample_count) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.frequency) || "&nbsp;"}</td>
        <td style="${tdLeft}">${cellMultiline(row.remarks) || "&nbsp;"}</td>
      </tr>`;
    })
    .join("");
}

function buildTableHtml(document: UpdatedSchemeOfInspectionStored): string {
  const th =
    "border:1px solid #111;padding:5px 4px;font-size:8px;font-weight:700;text-align:center;vertical-align:middle;background:#eef2f7;line-height:1.3;";

  // Content-based widths: short codes narrow, text columns wider.
  const colWidths = ["5%", "24%", "14%", "5%", "9%", "14%", "29%"];

  return `
<p class="usit-table-title"><strong>TABLE 1</strong></p>
<table class="usit-test-table" style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0;">
  <colgroup>
    ${colWidths.map((w) => `<col style="width:${w};" />`).join("")}
  </colgroup>
  <thead>
    <tr>
      <th style="${th}" colspan="3">(1) Test Details</th>
      <th style="${th}" colspan="4">(2) Test equipment requirement — R: Required (or) S: Subcontracting permitted &nbsp;&nbsp;|&nbsp;&nbsp; (3) Levels of Control</th>
    </tr>
    <tr>
      <th style="${th}">Cl.</th>
      <th style="${th}">Requirement</th>
      <th style="${th}">Test Methods<br/>Reference</th>
      <th style="${th}">R/S</th>
      <th style="${th}">No. of<br/>Sample</th>
      <th style="${th}">Frequency</th>
      <th style="${th}">Remarks</th>
    </tr>
  </thead>
  <tbody>
    ${buildTableRowsHtml(document.test_rows)}
  </tbody>
</table>`;
}

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

function formatApplicationNo(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function buildUsitMetaHeaderHtml(data: UpdatedSchemeOfInspectionLetterData): string {
  const doc = data.document;
  const branchName = (data.bisBranchName ?? "").trim() || "Raipur Branch Office";
  const bisBranchLine = formatBisBranchLine(
    branchName,
    data.bisBranchState ?? "",
    data.bisBranchCountry ?? "India",
  );
  const dateApp =
    formatDisplayDate(data.dateOfApplication, "") || "________________";
  const appNo = formatApplicationNo(data.applicationNumber);
  const pmNo =
    esc(doc.pm_reference).trim() || "PM/ IS __________/1/__________";

  return `
<div class="usit-meta-row">
  <div class="usit-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standards<br/>
    ${esc(bisBranchLine)}
  </div>
  <div class="usit-date-block">
    <div><strong>Date of Application:</strong> ${esc(dateApp)}</div>
    <div><strong>Application Number:</strong> ${esc(appNo)}</div>
    <div><strong>PM Number:</strong> ${pmNo}</div>
  </div>
</div>`;
}

function buildUsitSignatoryHtml(data: UpdatedSchemeOfInspectionLetterData): string {
  const sigName =
    esc(data.signatoryName ?? "") || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.signatoryDesignation ?? "") || "—";
  return `
${buildRightAlignedSignatoryBlockHtml({
  companyName: esc(data.companyName),
  sigName,
  sigDesig,
  signatureImageUrl: data.signatureImageUrl,
})}
<div class="usit-auth-signatory">Authorized Signatory</div>`;
}

function buildFormBody(
  data: UpdatedSchemeOfInspectionLetterData,
  settings: PrintSettings,
  company: PrintCompanyInfo,
): string {
  const doc = data.document;
  const letterheadHtml = buildLetterheadHtml(company, { ...settings, show_letterhead: true });
  const metaHeader = buildUsitMetaHeaderHtml(data);
  const signatoryHtml = buildUsitSignatoryHtml(data);

  return `
<div class="print-sheet usit-sheet usit-page-portrait">
  <div class="print-sheet-body">
    ${letterheadHtml}
    ${metaHeader}
    <h1 class="usit-title">ANNEX C</h1>
    <h2 class="usit-subtitle">Scheme of Inspection and Testing</h2>
    ${buildAnnexSectionsHtml(doc)}
    ${signatoryHtml}
  </div>
  ${printPageIndicatorHtml(1, 2)}
</div>
<div class="print-sheet usit-sheet usit-page-portrait print-sheet-page-break">
  <div class="print-sheet-body">
    ${letterheadHtml}
    ${metaHeader}
    ${buildTableHtml(doc)}
    ${buildNotesSectionsHtml(doc)}
    ${signatoryHtml}
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
    font_size: 11,
    // Both pages (Annex C + Table 1 / notes) print in portrait.
    orientation: "portrait",
    margin_top: 5,
    margin_bottom: 5,
    // Sheet-only padding (see @media print .doc-page { padding: 0 }). Keep L/R modest so Table 1 uses page width.
    margin_left: 10,
    margin_right: 8,
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
  const mt = letterheadSettings.margin_top;
  const mb = letterheadSettings.margin_bottom;
  const ml = letterheadSettings.margin_left;
  const mr = letterheadSettings.margin_right;
  const fs = letterheadSettings.font_size || 11;
  const titleFs = Math.max(fs + 2, 13);
  const subtitleFs = Math.max(fs + 1, 12);
  const tableFs = Math.max(fs - 1, 9);

  const styles = `
    @page usit-portrait {
      size: ${pageSizeCssForOrientation(letterheadSettings, "portrait")};
      margin: 0;
    }
    .usit-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: ${fs}px;
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
    .print-sheet-page-indicator {
      position: absolute;
      right: 5mm;
      bottom: 5mm;
      font-size: ${fs}px;
      font-weight: 600;
      text-align: right;
    }
    .print-sheet-page-gap {
      display: none !important;
    }
    .print-sheet-page-break {
      page-break-before: always;
      break-before: page;
    }
    @media screen {
      html, body {
        background: #52525b !important;
      }
      .doc-page {
        padding: 8mm 0 !important;
        max-width: none !important;
        background: transparent !important;
      }
      .usit-page-portrait {
        width: ${portrait.widthMm}mm;
        min-height: ${portrait.heightMm}mm;
        padding: ${mt}mm ${mr}mm ${mb}mm ${ml}mm;
        margin: 0 auto;
        background: #fff;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.28);
        box-sizing: border-box;
      }
      .usit-page-portrait.print-sheet-page-break {
        margin-top: 14mm;
      }
    }
    @media print {
      /* Margins live on each sheet only — avoid stacking with engine .doc-page padding (PDF was too narrow). */
      .doc-page {
        padding: 0 !important;
        max-width: none !important;
      }
      .print-sheet-page-gap {
        display: none !important;
      }
      .usit-page-portrait {
        width: auto;
        min-height: auto;
        padding: ${mt}mm ${mr}mm ${mb}mm ${ml}mm;
        margin: 0;
        box-shadow: none;
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
      font-size: ${fs}px;
      font-weight: 600;
      margin: 0 0 6px;
    }
    .usit-pm-ref-bottom {
      margin-top: 12px;
      margin-bottom: 0;
    }
    .usit-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin: 0 0 10px;
      font-size: ${fs}px;
      line-height: 1.45;
    }
    .usit-to-block {
      flex: 1;
      min-width: 0;
      text-align: left;
    }
    .usit-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
    }
    .usit-date-block div + div {
      margin-top: 3px;
    }
    .usit-auth-signatory {
      margin-top: 4px;
      text-align: right;
      font-size: ${fs}px;
      font-weight: 700;
    }
    .usit-title {
      text-align: center;
      font-size: ${titleFs}px;
      font-weight: 700;
      margin: 0 0 4px;
    }
    .usit-subtitle {
      text-align: center;
      font-size: ${subtitleFs}px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 10px;
    }
    .usit-annex-header {
      margin: 10px 0 2px;
      text-align: left;
      font-size: ${fs}px;
      font-weight: 700;
      line-height: 1.35;
    }
    .usit-para {
      margin: 0 0 8px;
      text-align: justify;
      font-size: ${fs}px;
      line-height: 1.45;
    }
    .usit-table-title {
      margin: 8px 0 4px;
      font-size: ${subtitleFs}px;
      text-align: center;
    }
    .usit-test-table {
      break-inside: auto;
      page-break-inside: auto;
    }
    .usit-test-table th,
    .usit-test-table td {
      font-size: ${tableFs}px !important;
      vertical-align: middle !important;
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
  const gapMm = 14;
  const chromeMm = 16; // screen padding above/below sheets
  return {
    widthMm: portrait.widthMm,
    heightMm: portrait.heightMm + gapMm + portrait.heightMm + chromeMm,
  };
}
