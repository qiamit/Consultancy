import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  sampleOfferLetterLabels,
  type SampleOfferLetterVariant,
} from "@backend/modules/print/sample-offer-letter-variant";
import {
  DEFAULT_OSL_SAMPLE_TABLE_COLUMNS,
  normalizeOslSampleTableColumns,
  OSL_SAMPLE_TABLE_COLUMN_OPTIONS,
  type OslSampleTableColumnKey,
} from "@backend/modules/print/osl-sample-table-columns";
import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildRightAlignedSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type OslSampleOfferLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  signatoryName: string;
  signatoryDesignation: string;
  rows: OslSampleRequirementStored[];
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

function formatApplicationNo(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function formatDateDisplay(ymd: string): string {
  const raw = (ymd ?? "").trim();
  if (!raw) return "—";
  return esc(formatDisplayDate(raw, "—"));
}

function formatIsStandardRef(isNumber: string, isTitle: string): string {
  const num = (isNumber ?? "").trim();
  const title = (isTitle ?? "").trim();
  if (num && title) return `<strong>${esc(num)}</strong> — ${esc(title)}`;
  if (num) return `<strong>${esc(num)}</strong>`;
  if (title) return `<strong>${esc(title)}</strong>`;
  return "";
}

function laboratoryInitials(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "—";
  const initials = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "—";
}

function cellForColumn(
  key: OslSampleTableColumnKey,
  row: OslSampleRequirementStored,
  rowIndex: number,
): string {
  switch (key) {
    case "sr_no":
      return String(rowIndex + 1).padStart(2, "0");
    case "sample_description":
      return esc(row.sample_description) || "—";
    case "declared_value":
      return esc(row.declared_value) || "—";
    case "batch_no":
      return esc(row.batch_number) || "—";
    case "dom":
      return formatDateDisplay(row.date_of_manufacturing);
    case "sample_quantity":
      return esc(row.sample_quantity) || "—";
    case "sample_code":
      return esc(row.sample_code) || "—";
    case "qr_code":
      return esc(row.qr_code) || "—";
    case "batch_quantity":
      return esc(row.batch_quantity) || "—";
    case "sample_type":
      return esc(row.sample_type) || "—";
    case "priority":
      return esc(row.priority) || "Priority";
    case "laboratory":
      return esc(laboratoryInitials(row.laboratory_name));
    default:
      return "—";
  }
}

function buildSampleTableHtml(
  rows: OslSampleRequirementStored[],
  visibleColumns?: OslSampleTableColumnKey[],
): string {
  const visible = rows.filter(
    (r) =>
      r.sample_description.trim() ||
      r.declared_value.trim() ||
      r.batch_number.trim() ||
      r.date_of_manufacturing.trim() ||
      r.sample_quantity.trim() ||
      r.batch_quantity.trim() ||
      r.sample_code.trim() ||
      r.qr_code.trim() ||
      r.sample_type.trim() ||
      r.laboratory_name.trim(),
  );

  if (visible.length === 0) {
    return `<p style="font-size:12px;color:#64748b;text-align:center;padding:16px;">No sample details entered yet.</p>`;
  }

  const columns = normalizeOslSampleTableColumns(visibleColumns);
  const columnDefs = OSL_SAMPLE_TABLE_COLUMN_OPTIONS.filter((col) => columns.includes(col.key));

  const thBase =
    "padding:5px 7px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:10px;font-weight:700;vertical-align:middle;line-height:1.35;";
  const thNarrow = `${thBase}width:1%;white-space:nowrap;text-align:center;`;
  const thWide = `${thBase}text-align:left;`;
  const thWideCenter = `${thBase}text-align:center;`;
  const thStack = `${thBase}width:1%;text-align:center;line-height:1.4;`;
  const tdBase =
    "padding:5px 7px;border:1px solid #e2e8f0;font-size:11px;vertical-align:top;line-height:1.45;";
  const tdNarrow = `${tdBase}width:1%;white-space:nowrap;text-align:center;`;
  const tdWide = `${tdBase}text-align:left;word-break:break-word;`;
  const tdWideCenter = `${tdBase}text-align:center;word-break:break-word;`;
  const tdStack = `${tdBase}width:1%;text-align:center;word-break:break-word;line-height:1.4;vertical-align:middle;`;

  function headerStyle(col: (typeof columnDefs)[number]): string {
    if (col.stackHeader) return thStack;
    if (col.wide) return col.headerCenter ? thWideCenter : thWide;
    return thNarrow;
  }

  function cellStyle(col: (typeof columnDefs)[number]): string {
    if (col.cellCenter && col.wide) return tdWideCenter;
    if (col.wide) return tdWide;
    if (col.stackHeader) return tdStack;
    if (col.cellCenter) return tdNarrow;
    return tdNarrow;
  }

  const headRow = columnDefs
    .map((col) => `<th style="${headerStyle(col)}">${col.headerHtml}</th>`)
    .join("");

  const bodyRows = visible
    .map((r, i) => {
      const cells = columnDefs
        .map((col) => {
          const style = cellStyle(col);
          return `<td style="${style}">${cellForColumn(col.key, r, i)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<div style="overflow-x:auto;">
  <table style="width:100%;border-collapse:collapse;table-layout:auto;font-size:11px;">
    <thead><tr>${headRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>`;
}

function buildSignatoryBlock(data: OslSampleOfferLetterData): string {
  const sigName = esc(data.signatoryName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.signatoryDesignation) || "—";

  return buildRightAlignedSignatoryBlockHtml({
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildOfferLetterBody(
  data: OslSampleOfferLetterData,
  variant: SampleOfferLetterVariant,
  tableColumns?: OslSampleTableColumnKey[],
): string {
  const labels = sampleOfferLetterLabels(variant);
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
    ${esc(labels.documentHeading)}
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
    <strong>Sub:</strong> Submission of samples for testing at Outside Testing Laboratory (OSL)
    ${isStdRef ? ` under Indian Standard ${isStdRef}` : ""}.
  </p>

  <p style="margin:0 0 14px;">
    We, <strong>M/s. ${esc(data.companyName)}</strong>,
    ${data.address ? ` having our factory at <strong>${esc(data.address)}</strong>,` : ""}
    hereby sending the following samples for testing at the designated Outside Testing Laboratory (OSL)
    ${isStdRef ? ` in connection with BIS certification under ${isStdRef}` : " in connection with BIS certification"}.
    The details of the samples sent are as under:
  </p>

  <div style="margin:16px 0;padding:12px 14px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:8px;">
      Sample Details for OSL
    </div>
    ${buildSampleTableHtml(data.rows, tableColumns)}
  </div>

  <p style="margin:0 0 14px;">
    We declare that the above samples have been prepared prior to grant of the BIS licence, are drawn from
    trial production, and are being manufactured for the purpose of obtaining BIS licence. The information
    furnished above is true and correct to the best of our knowledge and belief.
  </p>

  ${buildSignatoryBlock(data)}
</div>`;
}

export function buildOslSampleCompany(data: OslSampleOfferLetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({
    ...data,
    licenseScope: "",
  });
}

export function defaultOslSamplePrintSettings(): PrintSettings {
  return defaultDeclarationPrintSettings();
}

export function buildOslSampleRequirementsHtml(
  data: OslSampleOfferLetterData,
  settings: PrintSettings,
  tableColumns: OslSampleTableColumnKey[] = DEFAULT_OSL_SAMPLE_TABLE_COLUMNS,
  variant: SampleOfferLetterVariant = "osl",
): string {
  const labels = sampleOfferLetterLabels(variant);
  return buildPrintDocument({
    title: labels.documentTitle,
    bodyHtml: buildOfferLetterBody(data, variant, tableColumns),
    settings,
    company: buildOslSampleCompany(data),
  });
}

export function iframeSizeForOslPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}

export {
  sampleOfferLetterLabels,
  type SampleOfferLetterVariant,
} from "@backend/modules/print/sample-offer-letter-variant";
export {
  DEFAULT_OSL_SAMPLE_TABLE_COLUMNS,
  OSL_SAMPLE_TABLE_COLUMN_OPTIONS,
  toggleOslSampleTableColumn,
  type OslSampleTableColumnKey,
} from "@backend/modules/print/osl-sample-table-columns";
export { type ManufacturingScopeDeclarationData };
