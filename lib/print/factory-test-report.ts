import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import type { FactoryTestReportStored, FtrTestRowStored } from "@/lib/factory-test-report";
import { normalizeFtrRemark, sortFtrTestRowsByClause } from "@/lib/factory-test-report";
import { formatFtrObservedForDisplay } from "@/lib/ftr-observed-formula";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate, parseToDate } from "@/lib/format-date";

export type FactoryTestReportPrintSettings = PrintSettings & {
  show_witnessed_by: boolean;
  show_tested_by: boolean;
};

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
    <td class="val${boldValue ? " ftr-val-bold" : ""}" colspan="5">${display}</td>
  </tr>`;
}

function fieldRowPair(
  label1: string,
  value1: string,
  label2: string,
  value2: string,
): string {
  return `<tr>
    <td class="lbl">${esc(label1)}</td>
    <td class="sep">:-</td>
    <td class="val">${esc(value1) || "—"}</td>
    <td class="lbl right">${esc(label2)}</td>
    <td class="sep">:-</td>
    <td class="val">${formatDateDisplay(value2)}</td>
  </tr>`;
}

function stackedCell(
  primary: string,
  secondary: string,
  align: "left" | "center" = "left",
): string {
  const primaryText = esc(primary) || "—";
  const secondaryText = esc(secondary);
  const alignStyle = align === "center" ? "text-align:center;" : "";
  const secondaryBlock =
    secondaryText && secondaryText !== "—"
      ? `<div style="font-size:8px;color:#64748b;margin-top:2px;line-height:1.25;${alignStyle}">${secondaryText}</div>`
      : "";
  return `<div style="line-height:1.3;${alignStyle}">${primaryText}</div>${secondaryBlock}`;
}

function buildTestTableHtml(rows: FtrTestRowStored[]): string {
  const th =
    "padding:4px 6px;border:1px solid #94a3b8;background:#e2e8f0;font-size:9px;font-weight:700;text-align:center;vertical-align:middle;line-height:1.3;";
  const td =
    "padding:4px 6px;border:1px solid #cbd5e1;font-size:9px;vertical-align:middle;line-height:1.35;";

  const sortedTests = sortFtrTestRowsByClause(rows);

  let body = "";
  for (const row of sortedTests) {
    body += `<tr>
      <td style="${td}">${stackedCell(row.test_name, row.unit)}</td>
      <td style="${td}text-align:center;">${stackedCell(row.is_reference, row.clause_no, "center")}</td>
      <td style="${td}text-align:center;">${esc(row.specified_requirements) || "—"}</td>
      <td style="${td}text-align:center;font-weight:600;">${esc(formatFtrObservedForDisplay(row.observed_value, row.observed_decimals)) || "—"}</td>
      <td style="${td}text-align:center;">${esc(normalizeFtrRemark(row.remark))}</td>
    </tr>`;
  }

  return `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
    <thead>
      <tr>
        <th style="${th}width:24%;">Test Name<br>Unit</th>
        <th style="${th}width:16%;">IS Reference<br>Clause No.</th>
        <th style="${th}width:34%;">Specified Requirements</th>
        <th style="${th}width:13%;">Observed<br>Value</th>
        <th style="${th}width:13%;">Remark</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
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
  index: number,
  data: FactoryTestReportLetterData,
  settings: FactoryTestReportPrintSettings,
): string {
  return `
    <div class="ftr-sheet${index > 0 ? " page-break" : ""}">
      <h1 class="ftr-title">Factory Test Report</h1>
      <table class="ftr-meta">
        ${fieldRowPair(
          "Application No.",
          report.application_number,
          "Date of Application",
          report.date_of_application,
        )}
        ${fieldRowPair(
          "Licence No.",
          report.licence_number,
          "Date of Inspection",
          report.date_of_inspection,
        )}
        ${fieldRow("Applicant Name", report.applicant_name, true)}
        ${fieldRow("Applicant Address", report.applicant_address)}
        ${fieldRow("Product Title", report.product_title)}
        ${fieldRow("Sample Description", report.grade_type)}
        ${fieldRow("Declared Values, if any", report.declared_values)}
        <tr>
          <td class="lbl">Any Other Information</td>
          <td class="sep">:-</td>
          <td class="val">${esc(report.other_information) || "N/A"}</td>
          <td class="lbl right">IS Code</td>
          <td class="sep">:-</td>
          <td class="val">${esc(report.is_code) || "—"}</td>
        </tr>
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
      </table>
      ${buildTestTableHtml(report.test_rows)}
      ${buildSignaturesHtml(data, settings)}
    </div>`;
}

export function buildFactoryTestReportHtml(
  data: FactoryTestReportLetterData,
  settings: FactoryTestReportPrintSettings,
): string {
  const reports = data.reports.filter(
    (r) =>
      r.sample_label.trim() ||
      r.product_title.trim() ||
      r.test_rows.length > 0,
  );

  const body =
    reports.length > 0
      ? reports.map((r, i) => buildSingleReportHtml(r, i, data, settings)).join("")
      : `<p style="text-align:center;color:#64748b;padding:40px;">No factory test reports. Add samples in Sample for OSL / PI first.</p>`;

  const styles = `
    .ftr-sheet { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10px; }
    .ftr-title { text-align: center; font-size: 16px; font-weight: 700; margin: 0 0 12px; }
    .ftr-meta { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    .ftr-meta .lbl { width: 22%; font-weight: 600; padding: 3px 4px; vertical-align: top; }
    .ftr-meta .lbl.right { padding-left: 16px; }
    .ftr-meta .sep { width: 2%; text-align: center; padding: 3px 2px; }
    .ftr-meta .val { padding: 3px 4px; vertical-align: top; }
    .ftr-meta .val.ftr-val-bold { font-weight: 700; }
    .ftr-signatures { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; margin-top: 32px; width: 100%; }
    .ftr-sig-block { flex: 0 0 42%; max-width: 42%; }
    .ftr-sig-left { text-align: left; margin-right: auto; }
    .ftr-sig-right { text-align: right; margin-left: auto; }
    .sig-title { font-weight: 700; font-size: 10px; margin-bottom: 4px; }
    .sig-space { height: 40px; border-bottom: 1px solid #94a3b8; margin-bottom: 6px; }
    .sig-name { font-size: 10px; font-weight: 600; line-height: 1.4; }
    .sig-designation { font-size: 9px; color: #475569; line-height: 1.35; margin-top: 2px; }
    .sig-org { font-size: 9px; font-weight: 700; margin-top: 4px; line-height: 1.35; }
    .page-break { page-break-before: always; }
  `;

  return buildPrintDocument({
    title: "Factory Test Report",
    bodyHtml: body,
    extraStyles: styles,
    settings,
    company: buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
  });
}

export function defaultFactoryTestReportPrintSettings(): FactoryTestReportPrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "landscape",
    show_witnessed_by: true,
    show_tested_by: true,
  };
}

export function iframeSizeForFactoryTestReportPrintSettings(
  settings: FactoryTestReportPrintSettings,
) {
  return iframeSizeForPrintSettings({ ...settings, orientation: "landscape" });
}
