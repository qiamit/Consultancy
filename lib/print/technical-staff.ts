import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import {
  DEFAULT_TECHNICAL_STAFF_TABLE_COLUMNS,
  TECHNICAL_STAFF_TABLE_COLUMN_OPTIONS,
  technicalStaffColumnWidthPct,
  type TechnicalStaffTableColumnKey,
} from "@/lib/print/technical-staff-table-columns";
import type { TechnicalStaffStored } from "@/lib/technical-staff";
import { rowHasContent } from "@/lib/technical-staff";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";
import { buildRightAlignedSignatoryBlockHtml } from "@/lib/print/signatory-signature";

export type TechnicalStaffLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  signatoryName: string;
  signatoryDesignation: string;
  rows: TechnicalStaffStored[];
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

function fileCellDisplay(url: string, isPhoto = false): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return "—";
  if (isPhoto && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(trimmed)) {
    return `<img src="${esc(trimmed)}" alt="Photo" style="max-width:48px;max-height:48px;object-fit:cover;border-radius:4px;" />`;
  }
  return `<span style="color:#0369a1;">Attached</span>`;
}

function cellForColumn(
  key: TechnicalStaffTableColumnKey,
  row: TechnicalStaffStored,
  rowIndex: number,
): string {
  switch (key) {
    case "sr_no":
      return String(rowIndex + 1).padStart(2, "0");
    case "person_name":
      return esc(row.person_name) || "—";
    case "designation":
      return esc(row.designation) || "—";
    case "educational_qualification":
      return esc(row.educational_qualification) || "—";
    case "experience_years":
      return esc(row.experience_years) || "—";
    case "appointment_letter":
      return fileCellDisplay(row.appointment_letter);
    case "educational_certificate":
      return fileCellDisplay(row.educational_certificate);
    case "photo":
      return fileCellDisplay(row.photo, true);
    case "seal_sign":
      return fileCellDisplay(row.seal_sign, true);
    default:
      return "—";
  }
}

function visibleRows(rows: TechnicalStaffStored[]): TechnicalStaffStored[] {
  return rows.filter(rowHasContent);
}

function buildTechnicalStaffTableHtml(
  rows: TechnicalStaffStored[],
  visibleColumns: TechnicalStaffTableColumnKey[] = DEFAULT_TECHNICAL_STAFF_TABLE_COLUMNS,
): string {
  const visible = visibleRows(rows);

  if (visible.length === 0) {
    return `<p style="font-size:12px;color:#64748b;text-align:center;padding:16px;">No technical staff details entered yet.</p>`;
  }

  const columns = visibleColumns;
  const columnDefs = TECHNICAL_STAFF_TABLE_COLUMN_OPTIONS.filter((col) =>
    columns.includes(col.key),
  );

  const thBase =
    "padding:5px 7px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:10px;font-weight:700;vertical-align:middle;line-height:1.35;overflow:hidden;text-align:center;";
  const tdBase =
    "padding:5px 7px;border:1px solid #e2e8f0;font-size:11px;vertical-align:middle;line-height:1.45;overflow:hidden;text-align:center;";

  function headerStyle(col: (typeof columnDefs)[number]): string {
    const width = technicalStaffColumnWidthPct(col.key, columns);
    return `${thBase}width:${width};max-width:${width};word-wrap:break-word;`;
  }

  function cellStyle(key: TechnicalStaffTableColumnKey): string {
    const width = technicalStaffColumnWidthPct(key, columns);
    return `${tdBase}width:${width};max-width:${width};word-break:break-word;overflow-wrap:break-word;`;
  }

  const colGroup = columnDefs
    .map(
      (col) =>
        `<col style="width:${technicalStaffColumnWidthPct(col.key, columns)};" />`,
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

function buildSignatoryBlock(data: TechnicalStaffLetterData): string {
  const sigName = esc(data.signatoryName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.signatoryDesignation) || "—";

  return buildRightAlignedSignatoryBlockHtml({
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildLetterBody(data: TechnicalStaffLetterData): string {
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
    Technical Staff Details
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
    <strong>Sub:</strong> Details of Technical Staff for BIS licence application
    ${isStdRef ? ` under Indian Standard ${isStdRef}` : ""}.
  </p>

  <p style="margin:0 0 14px;">
    We, <strong>M/s. ${esc(data.companyName)}</strong>,
    ${data.address ? ` having our factory at <strong>${esc(data.address)}</strong>,` : ""}
    hereby furnish the following details of our Technical Staff
    ${isStdRef ? ` in connection with BIS certification under ${isStdRef}` : " in connection with BIS certification"}.
    The particulars are as under:
  </p>

  <div style="margin:16px 0;padding:12px 14px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;">
    ${buildTechnicalStaffTableHtml(data.rows)}
  </div>

  <p style="margin:0 0 14px;">
    We declare that the information furnished above is true and correct to the best of our knowledge and belief.
    The persons listed above are responsible for technical operations and compliance of the unit with respect to
    BIS certification requirements.
  </p>

  ${buildSignatoryBlock(data)}
</div>`;
}

export function buildTechnicalStaffCompany(data: TechnicalStaffLetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({
    ...data,
    licenseScope: "",
  });
}

export function defaultTechnicalStaffPrintSettings(): PrintSettings {
  return defaultDeclarationPrintSettings();
}

export function buildTechnicalStaffHtml(
  data: TechnicalStaffLetterData,
  settings: PrintSettings,
): string {
  return buildPrintDocument({
    title: "Technical Staff Details",
    bodyHtml: buildLetterBody(data),
    settings,
    company: buildTechnicalStaffCompany(data),
  });
}

export function iframeSizeForTechnicalStaffPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
