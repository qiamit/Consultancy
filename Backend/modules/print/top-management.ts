import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS,
  normalizeTopManagementTableColumns,
  TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS,
  topManagementColumnWidthPct,
  type TopManagementTableColumnKey,
} from "@backend/modules/print/top-management-table-columns";
import type { TopManagementStored } from "@backend/modules/bis/top-management";
import { rowHasContent } from "@backend/modules/bis/top-management";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { signatorySignatureOverlayHtml } from "@backend/modules/print/signatory-signature";

export type TopManagementLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  signatoryName: string;
  signatoryDesignation: string;
  rows: TopManagementStored[];
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBisBranchLine(branchName: string, state: string, country: string): string {
  const parts = [
    branchName.trim() || "________________",
    state.trim() || "________________",
    country.trim() || "India",
  ];
  return parts.join(", ");
}

function formatInspectionDateDisplay(dateStr: string): string {
  const raw = (dateStr ?? "").trim();
  if (!raw) return "N/A";
  return formatDisplayDate(raw, "N/A");
}

function formatApplicationNo(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function formatIsStandardRef(isNumber: string, isTitle: string): string {
  const num = (isNumber ?? "").trim();
  const title = (isTitle ?? "").trim();
  if (num && title) return `<strong>${esc(num)}</strong> — ${esc(title)}`;
  if (num) return `<strong>${esc(num)}</strong>`;
  if (title) return `<strong>${esc(title)}</strong>`;
  return "";
}

function cellForColumn(
  key: TopManagementTableColumnKey,
  row: TopManagementStored,
  rowIndex: number,
): string {
  switch (key) {
    case "sr_no":
      return String(rowIndex + 1).padStart(2, "0");
    case "person_name":
      return esc(row.person_name) || "—";
    case "designation":
      return esc(row.designation) || "—";
    case "email":
      return esc(row.email) || "—";
    case "mobile":
      return esc(row.mobile) || "—";
    default:
      return "—";
  }
}

function visibleRows(rows: TopManagementStored[]): TopManagementStored[] {
  return rows.filter(rowHasContent);
}

function buildTopManagementTableHtml(
  rows: TopManagementStored[],
  visibleColumns?: TopManagementTableColumnKey[],
): string {
  const visible = visibleRows(rows);

  if (visible.length === 0) {
    return `<p style="font-size:12px;color:#64748b;text-align:center;padding:16px;">No top management details entered yet.</p>`;
  }

  const columns = normalizeTopManagementTableColumns(visibleColumns);
  const columnDefs = TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS.filter((col) =>
    columns.includes(col.key),
  );

  const thBase =
    "padding:5px 7px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:10px;font-weight:700;vertical-align:middle;line-height:1.35;overflow:hidden;text-align:center;";
  const tdBase =
    "padding:5px 7px;border:1px solid #e2e8f0;font-size:11px;vertical-align:middle;line-height:1.45;overflow:hidden;text-align:center;";

  function headerStyle(col: (typeof columnDefs)[number]): string {
    const width = topManagementColumnWidthPct(col.key, columns);
    return `${thBase}width:${width};max-width:${width};word-wrap:break-word;`;
  }

  function cellStyle(key: TopManagementTableColumnKey): string {
    const width = topManagementColumnWidthPct(key, columns);
    const wrap =
      key === "email"
        ? "word-break:break-all;overflow-wrap:anywhere;"
        : "word-break:break-word;overflow-wrap:break-word;";
    return `${tdBase}width:${width};max-width:${width};${wrap}`;
  }

  const colGroup = columnDefs
    .map(
      (col) =>
        `<col style="width:${topManagementColumnWidthPct(col.key, columns)};" />`,
    )
    .join("");

  const headRow = columnDefs
    .map((col) => `<th style="${headerStyle(col)}">${col.headerHtml}</th>`)
    .join("");

  const bodyRows = visible
    .map((r, i) => {
      const cells = columnDefs
        .map(
          (col) =>
            `<td style="${cellStyle(col.key)}">${cellForColumn(col.key, r, i)}</td>`,
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<div style="width:100%;overflow:hidden;">
  <table style="width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px;">
    <colgroup>${colGroup}</colgroup>
    <thead><tr>${headRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>`;
}

function buildSignatoryBlock(data: TopManagementLetterData): string {
  const sigName = esc(data.signatoryName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.signatoryDesignation) || "—";
  const primaryRow = visibleRows(data.rows)[0];
  const applyOnDocuments = primaryRow?.apply_signature_on_documents !== false;
  const signatureUrl =
    applyOnDocuments ? primaryRow?.signature_image_url?.trim() ?? "" : "";
  const signatureOverlayHtml = signatorySignatureOverlayHtml(signatureUrl);

  return `
  <div style="margin-top:36px;display:flex;flex-direction:column;align-items:flex-end;text-align:right;">
      <div style="font-weight:700;">For ${esc(data.companyName)}</div>
      <div style="position:relative;margin-top:32px;min-width:200px;text-align:right;">
        ${signatureOverlayHtml}
        <div style="position:relative;z-index:1;border-top:1px solid #94a3b8;padding-top:2px;font-size:11px;line-height:1.35;text-align:right;">
          <div><strong>Name:</strong> ${sigName}</div>
          <div><strong>Designation:</strong> ${sigDesig}</div>
        </div>
      </div>
  </div>`;
}

function buildLetterBody(
  data: TopManagementLetterData,
  tableColumns?: TopManagementTableColumnKey[],
  printSettings?: PrintSettings,
): string {
  const isStdRef = formatIsStandardRef(data.isNumber, data.isTitle);
  const bisBranchLine = formatBisBranchLine(
    data.bisBranchName,
    data.bisBranchState,
    data.bisBranchCountry,
  );
  const inspectionDate = formatInspectionDateDisplay(data.inspectionDate);
  const applicationNo = formatApplicationNo(data.applicationNumber);

  return `
<div style="text-align:center;margin-bottom:18px;">
  <div style="font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;text-decoration:underline;">
    Top Management Details
  </div>
</div>

<div style="font-size:12px;line-height:1.75;text-align:justify;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin:0 0 14px;">
    <div style="flex:1;min-width:0;">
      To<br/>
      The Director &amp; Head<br/>
      Bureau of Indian Standards<br/>
      ${esc(bisBranchLine)}
    </div>
    <div style="flex-shrink:0;text-align:right;white-space:nowrap;">
      <div><strong>Date:</strong> ${esc(inspectionDate)}</div>
      <div style="margin-top:4px;"><strong>Application No.:</strong> ${esc(applicationNo)}</div>
    </div>
  </div>

  <p style="margin:0 0 14px;">
    <strong>Sub:</strong> Details of Top Management for BIS licence application
    ${isStdRef ? ` under Indian Standard ${isStdRef}` : ""}.
  </p>

  <p style="margin:0 0 14px;">
    We, <strong>M/s. ${esc(data.companyName)}</strong>,
    ${data.address ? ` having our factory at <strong>${esc(data.address)}</strong>,` : ""}
    hereby furnish the following details of our Top Management
    ${isStdRef ? ` in connection with BIS certification under ${isStdRef}` : " in connection with BIS certification"}.
    The particulars are as under:
  </p>

  <div style="margin:16px 0;padding:12px 14px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;">
    ${buildTopManagementTableHtml(data.rows, tableColumns)}
  </div>

  <p style="margin:0 0 14px;">
    We declare that the information furnished above is true and correct to the best of our knowledge and belief.
    The persons listed above are responsible for the overall management and compliance of the unit with respect to
    BIS certification requirements.
  </p>

  ${buildSignatoryBlock(data)}
</div>`;
}

export function buildTopManagementCompany(data: TopManagementLetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({
    ...data,
    licenseScope: "",
  });
}

export function defaultTopManagementPrintSettings(): PrintSettings {
  return defaultDeclarationPrintSettings();
}

export function buildTopManagementHtml(
  data: TopManagementLetterData,
  settings: PrintSettings,
  tableColumns: TopManagementTableColumnKey[] = DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS,
): string {
  return buildPrintDocument({
    title: "Top Management Details",
    bodyHtml: buildLetterBody(data, tableColumns, settings),
    settings,
    company: buildTopManagementCompany(data),
  });
}

export function iframeSizeForTopManagementPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}

export {
  DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS,
  TOP_MANAGEMENT_TABLE_COLUMN_OPTIONS,
  toggleTopManagementTableColumn,
  type TopManagementTableColumnKey,
} from "@backend/modules/print/top-management-table-columns";
