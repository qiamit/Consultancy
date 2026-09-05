import { buildLetterheadHtml, buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type { FactoryTestReportStored, FtrTestRowStored, FtrPrintPaginationOptions } from "@backend/modules/bis/factory-test-report";
import {
  normalizeFtrRemark,
  paginateFtrPrintTestRows,
  sortFtrTestRowsByClause,
} from "@backend/modules/bis/factory-test-report";
import { formatFtrObservedForDisplay } from "@backend/modules/bis/ftr-observed-formula";
import { iframeSizeForPagedPrintSettings } from "@backend/modules/print/paged-preview";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate, parseToDate } from "@backend/shared/format-date";

export type FactoryTestReportPrintSettings = PrintSettings & {
  show_witnessed_by: boolean;
  show_tested_by: boolean;
};

export function ftrPrintPaginationOptionsFromSettings(
  settings: FactoryTestReportPrintSettings,
): FtrPrintPaginationOptions {
  return {
    showLetterhead: settings.show_letterhead,
    showWitnessedBy: settings.show_witnessed_by,
    showTestedBy: settings.show_tested_by,
    marginTopMm: settings.margin_top,
    marginBottomMm: settings.margin_bottom,
  };
}

export type FactoryTestReportLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  reports: FactoryTestReportStored[];
  inspectionOfficerName: string;
  inspectionOfficerDesignation: string;
  qualityControlInchargeName: string;
  qualityControlInchargeDesignation: string;
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateDisplay(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "—";
  if (!parseToDate(v)) return esc(v);
  return esc(formatDisplayDate(v));
}

function fieldRow(label: string, value: string, boldValue = false): string {
  const display = esc(value) || "—";
  return `<tr>
    <td class="lbl">${esc(label)}</td>
    <td class="sep">:-</td>
    <td class="val${boldValue ? " ftr-val-bold" : ""}" colspan="7">${display}</td>
  </tr>`;
}

function fieldRowPair(
  label1: string,
  value1: string,
  label2: string,
  value2: string,
): string {
  // Wider second label (colspan 3) so "Date of Manufacturing / Testing Completion" stay one line.
  return `<tr class="ftr-meta-pair">
    <td class="lbl">${esc(label1)}</td>
    <td class="sep">:-</td>
    <td class="val">${formatDateDisplay(value1)}</td>
    <td class="lbl right" colspan="3">${esc(label2)}</td>
    <td class="sep">:-</td>
    <td class="val" colspan="2">${formatDateDisplay(value2)}</td>
  </tr>`;
}

function fieldRowTriple(
  label1: string,
  value1: string,
  label2: string,
  value2: string,
  label3: string,
  value3: string,
): string {
  return `<tr class="ftr-meta-triple">
    <td class="lbl">${esc(label1)}</td>
    <td class="sep">:-</td>
    <td class="val">${formatDateDisplay(value1)}</td>
    <td class="lbl right">${esc(label2)}</td>
    <td class="sep">:-</td>
    <td class="val">${formatDateDisplay(value2)}</td>
    <td class="lbl right">${esc(label3)}</td>
    <td class="sep">:-</td>
    <td class="val">${formatDateDisplay(value3)}</td>
  </tr>`;
}

function productTitleAsPerIsCode(productTitle: string, isCode: string): string {
  const title = (productTitle ?? "").trim();
  const code = (isCode ?? "").trim();
  if (title && code) return `${title} as per ${code}`;
  if (title) return title;
  if (code) return `as per ${code}`;
  return "";
}

function stackedCell(
  primary: string,
  secondary: string,
  tertiary = "",
  align: "left" | "center" = "left",
): string {
  const primaryText = esc(primary) || "—";
  const alignStyle = align === "center" ? "text-align:center;" : "";
  const parts = [secondary, tertiary]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .map((s) => esc(s));
  const secondaryBlock =
    parts.length > 0
      ? `<div style="font-size:7.5px;color:#64748b;margin-top:2px;line-height:1.25;${alignStyle}">${parts.join(" · ")}</div>`
      : "";
  return `<div style="line-height:1.3;${alignStyle}">${primaryText}</div>${secondaryBlock}`;
}

function buildTestTableHtmlFromRows(rows: FtrTestRowStored[]): string {
  if (rows.length === 0) return "";

  const th =
    "padding:4px 6px;border:1px solid #94a3b8;background:#e2e8f0;font-size:9px;font-weight:700;text-align:center;vertical-align:middle;line-height:1.3;";
  const td =
    "padding:4px 6px;border:1px solid #cbd5e1;font-size:9px;vertical-align:middle;line-height:1.35;";

  const body = rows
    .map(
      (row) => `<tr>
      <td style="${td}">${stackedCell(row.test_name, row.clause_no, row.is_reference)}</td>
      <td style="${td}text-align:center;white-space:nowrap;">${esc(row.unit) || "—"}</td>
      <td style="${td}text-align:center;">${esc(row.specified_requirements) || "—"}</td>
      <td style="${td}text-align:center;font-weight:600;">${esc(formatFtrObservedForDisplay(row.observed_value, row.observed_decimals)) || "—"}</td>
      <td style="${td}text-align:center;">${esc(normalizeFtrRemark(row.remark))}</td>
    </tr>`,
    )
    .join("");

  return `<table style="width:100%;border-collapse:collapse;margin-top:8px;table-layout:fixed;">
    <thead>
      <tr>
        <th style="${th}width:28%;">Test Name<br><span style="font-weight:600;font-size:8px;">Clause No · IS Reference</span></th>
        <th style="${th}width:8%;">Unit</th>
        <th style="${th}width:32%;">Specified Requirements</th>
        <th style="${th}width:16%;">Observed Value</th>
        <th style="${th}width:16%;">Remark</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`;
}

function buildTestTableHtml(rows: FtrTestRowStored[]): string {
  return buildTestTableHtmlFromRows(sortFtrTestRowsByClause(rows));
}

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function buildPageIndicatorHtml(pageNum: number, totalPages: number): string {
  return `<div class="ftr-page-indicator">Page ${padPageNum(pageNum)} of ${padPageNum(totalPages)}</div>`;
}

function buildPageGapHtml(pageNum: number, totalPages: number): string {
  if (pageNum <= 1 || totalPages <= 1) return "";
  return `<div class="ftr-page-gap" aria-hidden="true">Page break · ${padPageNum(pageNum - 1)} → ${padPageNum(pageNum)}</div>`;
}

function buildMetaTableHtml(report: FactoryTestReportStored): string {
  return `<table class="ftr-meta">
        <colgroup>
          <col style="width:18%" />
          <col style="width:2.5%" />
          <col style="width:17%" />
          <col style="width:16%" />
          <col style="width:2%" />
          <col style="width:9%" />
          <col style="width:15.5%" />
          <col style="width:2%" />
          <col style="width:18%" />
        </colgroup>
        ${fieldRowTriple(
          "Application No.",
          report.application_number,
          "Date of Application",
          report.date_of_application,
          "Date of Inspection",
          report.date_of_inspection,
        )}
        ${fieldRow("Applicant Name", report.applicant_name, true)}
        ${fieldRow("Applicant Address", report.applicant_address)}
        ${fieldRow(
          "Specification",
          productTitleAsPerIsCode(report.product_title, report.is_code),
        )}
        ${fieldRow("Sample Description", report.grade_type)}
        ${fieldRow("Declared Values, if any", report.declared_values)}
        ${fieldRowPair(
          "Batch / Heat Number",
          report.batch_heat_number,
          "Date of Manufacturing",
          report.date_of_manufacturing,
        )}
        ${fieldRowPair(
          "Date of Testing Start",
          report.date_of_testing_start,
          "Date of Testing Completion",
          report.date_of_testing_completion,
        )}
      </table>`;
}

function buildSignaturesHtml(
  data: FactoryTestReportLetterData,
  settings: FactoryTestReportPrintSettings,
): string {
  const left =
    settings.show_witnessed_by
      ? `<div class="ftr-sig-block ftr-sig-left">
      <div class="sig-title">Witnessed By</div>
      <div class="sig-space"></div>
      <div class="sig-name">${esc(data.inspectionOfficerName) || "—"}</div>
      ${data.inspectionOfficerDesignation.trim() ? `<div class="sig-designation">${esc(data.inspectionOfficerDesignation)}</div>` : ""}
      <div class="sig-org">Bureau of Indian Standards</div>
    </div>`
      : "";

  const right =
    settings.show_tested_by
      ? `<div class="ftr-sig-block ftr-sig-right">
      <div class="sig-title">Tested By</div>
      <div class="sig-space"></div>
      <div class="sig-name">${esc(data.qualityControlInchargeName) || "—"}</div>
      ${data.qualityControlInchargeDesignation.trim() ? `<div class="sig-designation">${esc(data.qualityControlInchargeDesignation)}</div>` : ""}
      <div class="sig-org">${esc(data.companyName) || "—"}</div>
    </div>`
      : "";

  if (!left && !right) return "";
  return `<div class="ftr-signatures">${left}${right}</div>`;
}

function buildSingleReportHtml(
  report: FactoryTestReportStored,
  reportIndex: number,
  data: FactoryTestReportLetterData,
  settings: FactoryTestReportPrintSettings,
  letterheadHtml: string,
): string {
  const paginationOptions = ftrPrintPaginationOptionsFromSettings(settings);
  const testPages = paginateFtrPrintTestRows(report.test_rows, paginationOptions);
  const totalPages = testPages.length;

  return testPages
    .map((pageRows, pageIndex) => {
      const isFirstPage = pageIndex === 0;
      const pageNum = pageIndex + 1;
      const needsBreak = (reportIndex > 0 && isFirstPage) || pageIndex > 0;
      const letterheadBlock = letterheadHtml
        ? `<div class="ftr-sheet-letterhead">${letterheadHtml}</div>`
        : "";
      // Across reports, still show a screen gap before the next report's first page.
      const gapHtml =
        reportIndex > 0 && isFirstPage
          ? `<div class="ftr-page-gap" aria-hidden="true">Page break</div>`
          : buildPageGapHtml(pageNum, totalPages);

      return `
    ${gapHtml}
    <div class="ftr-sheet${needsBreak ? " ftr-page-break" : ""}">
      <div class="ftr-sheet-inner">
        ${letterheadBlock}
        <div class="ftr-sheet-body">
          ${isFirstPage ? `<h1 class="ftr-title">Factory Test Report</h1>${buildMetaTableHtml(report)}` : ""}
          ${buildTestTableHtmlFromRows(pageRows)}
        </div>
        <div class="ftr-sheet-footer">
          ${buildSignaturesHtml(data, settings)}
          ${buildPageIndicatorHtml(pageNum, totalPages)}
        </div>
      </div>
    </div>`;
    })
    .join("");
}

export type FactoryTestReportPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildFactoryTestReportCompany(
  data: FactoryTestReportLetterData,
  assets?: FactoryTestReportPrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Letterhead matches Top Management / Plant & Machinery — text-only / no logo tile.
    logo_url: null,
  };
}

/** Force no-logo letterhead for FTR preview / Word (same as Plant & Machinery). */
export function factoryTestReportLetterheadSettings(
  settings: FactoryTestReportPrintSettings,
): FactoryTestReportPrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_letterhead: settings.show_letterhead ?? true,
    // Preview / download chrome matches Plant & Machinery (no engine page-number footer).
    show_page_numbers: false,
    show_footer_line: false,
  };
}

export function buildFactoryTestReportHtml(
  data: FactoryTestReportLetterData,
  settings: FactoryTestReportPrintSettings,
  assets?: FactoryTestReportPrintAssets,
): string {
  const letterheadSettings = factoryTestReportLetterheadSettings(settings);
  const reports = data.reports.filter(
    (r) =>
      r.sample_label.trim() ||
      r.product_title.trim() ||
      r.test_rows.length > 0,
  );

  const pageSize = iframeSizeForPrintSettings(letterheadSettings);
  const sheetMinHeight = `calc(${pageSize.heightMm}mm - ${letterheadSettings.margin_top}mm - ${letterheadSettings.margin_bottom}mm)`;
  const company = buildFactoryTestReportCompany(data, assets);
  const letterheadHtml = letterheadSettings.show_letterhead
    ? buildLetterheadHtml(company, letterheadSettings)
    : "";

  const body =
    reports.length > 0
      ? reports
          .map((r, i) => buildSingleReportHtml(r, i, data, letterheadSettings, letterheadHtml))
          .join("")
      : `<p style="text-align:center;color:#64748b;padding:40px;">No factory test reports. Add samples in Sample for OSL / PI first.</p>`;

  const styles = `
    .ftr-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      width: 100%;
      box-sizing: border-box;
      min-height: ${sheetMinHeight};
      height: ${sheetMinHeight};
      display: flex;
      flex-direction: column;
    }
    .ftr-sheet-inner {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 100%;
      height: 100%;
      width: 100%;
    }
    .ftr-sheet-letterhead .lh-wrap {
      margin-bottom: 6px;
    }
    .ftr-sheet-body {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
    }
    .ftr-sheet-footer {
      flex-shrink: 0;
      margin-top: auto;
      position: relative;
      padding-bottom: 14px;
      width: 100%;
    }
    .ftr-title { text-align: center; font-size: 16px; font-weight: 700; margin: 0 0 12px; }
    .ftr-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .ftr-page-gap {
      display: none;
    }
    .ftr-meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed; font-size: 9px; }
    .ftr-meta .lbl { font-weight: 600; padding: 2px 3px; vertical-align: middle; white-space: nowrap; }
    .ftr-meta .lbl.right { padding-left: 6px; }
    .ftr-meta .sep { text-align: center; padding: 2px 1px; vertical-align: middle; white-space: nowrap; }
    .ftr-meta .val { padding: 2px 3px; vertical-align: middle; }
    .ftr-meta .val.ftr-val-bold { font-weight: 700; }
    .ftr-meta-triple .lbl,
    .ftr-meta-triple .val,
    .ftr-meta-pair .lbl,
    .ftr-meta-pair .val {
      white-space: nowrap;
      overflow: hidden;
    }
    .ftr-signatures { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; margin-top: 12px; width: 100%; }
    .ftr-sig-block { flex: 0 0 42%; max-width: 42%; }
    .ftr-sig-left { text-align: left; margin-right: auto; }
    .ftr-sig-right { text-align: right; margin-left: auto; }
    .sig-title { font-weight: 700; font-size: 10px; margin-bottom: 4px; }
    .sig-space { height: 40px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px; }
    .sig-name { font-size: 10px; font-weight: 600; line-height: 1.4; }
    .sig-designation { font-size: 9px; color: #475569; line-height: 1.35; margin-top: 2px; }
    .sig-org { font-size: 9px; font-weight: 700; margin-top: 4px; line-height: 1.35; }
    .ftr-page-break { page-break-before: always; break-before: page; }
    @media screen {
      .ftr-page-gap {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 10mm;
        margin: 4mm 0;
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
      .ftr-page-gap {
        display: none !important;
      }
      .ftr-sheet {
        page-break-after: always;
        break-after: page;
      }
      .ftr-sheet:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
    }
  `;

  return buildPrintDocument({
    title: "Factory Test Report",
    bodyHtml: body,
    extraStyles: styles,
    // Letterhead is rendered per sheet above, so suppress the document-level one.
    settings: { ...letterheadSettings, show_letterhead: false, show_page_numbers: false },
    company,
  });
}

export { ftrPrintPageCount } from "@backend/modules/bis/factory-test-report";

export function defaultFactoryTestReportPrintSettings(): FactoryTestReportPrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    // Page / Print Settings defaults match Top Management.
    orientation: "portrait",
    letterhead_layout: "logo-na",
    show_letterhead: true,
    // Preview / Word document typography matches Plant & Machinery.
    font_family: "Times New Roman",
    font_size: 10,
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 15,
    margin_right: 10,
    show_witnessed_by: true,
    show_tested_by: true,
  };
}

export function iframeSizeForFactoryTestReportPrintSettings(
  settings: FactoryTestReportPrintSettings,
  pageCount = 1,
) {
  return iframeSizeForPagedPrintSettings(settings, pageCount);
}
