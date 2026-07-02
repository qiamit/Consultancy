import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import {
  rowHasContent,
  type SubcontractedTestStored,
  type SubcontractedTestsDocumentStored,
} from "@/lib/subcontracted-tests";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";
import { buildRightAlignedSignatoryBlockHtml } from "@/lib/print/signatory-signature";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";

export type SubcontractedTestsLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  rows: SubcontractedTestStored[];
  document: SubcontractedTestsDocumentStored;
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatIsStandardRef(isNumber: string, isTitle: string): string {
  const num = (isNumber ?? "").trim();
  const title = (isTitle ?? "").trim();
  if (num && title) return `<strong>${esc(num)}</strong> — ${esc(title)}`;
  if (num) return `<strong>${esc(num)}</strong>`;
  if (title) return `<strong>${esc(title)}</strong>`;
  return "";
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
  return parts.map(esc).join(", ");
}

function formatLetterDate(dateStr: string): string {
  const raw = (dateStr ?? "").trim();
  if (!raw) return "_______________________";
  return esc(formatDisplayDate(raw, "_______________________"));
}

function formatApplicationNo(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function visibleRows(rows: SubcontractedTestStored[]): SubcontractedTestStored[] {
  return rows.filter(rowHasContent);
}

function buildSubcontractedTestsTableHtml(rows: SubcontractedTestStored[]): string {
  const visible = visibleRows(rows);

  if (visible.length === 0) {
    return `<p style="font-size:12px;color:#64748b;text-align:center;padding:16px;">No subcontracted test parameters entered yet.</p>`;
  }

  const th =
    "padding:4px 5px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:9px;font-weight:700;vertical-align:middle;line-height:1.3;text-align:center;";
  const td =
    "padding:4px 5px;border:1px solid #e2e8f0;font-size:9px;vertical-align:middle;line-height:1.35;text-align:center;word-break:break-word;";
  const tdLeft =
    "padding:4px 5px;border:1px solid #e2e8f0;font-size:9px;vertical-align:middle;line-height:1.35;text-align:left;word-break:break-word;";

  const headRow = `
    <th style="${th}width:5%;">Sr</th>
    <th style="${th}width:22%;">Test Parameter</th>
    <th style="${th}width:10%;">Clause</th>
    <th style="${th}width:18%;">Test Method</th>
    <th style="${th}width:8%;">Unit</th>
    <th style="${th}width:37%;">Subcontract Laboratory</th>`;

  const bodyRows = visible
    .map(
      (r, i) => `
    <tr>
      <td style="${td}">${i + 1}</td>
      <td style="${tdLeft}">${esc(r.test_name) || "—"}</td>
      <td style="${td}">${esc(r.clause_no) || "—"}</td>
      <td style="${td}">${esc(r.test_method) || "—"}</td>
      <td style="${td}">${esc(r.unit) || "—"}</td>
      <td style="${td}">${esc(r.laboratory_name) || "—"}</td>
    </tr>`,
    )
    .join("");

  return `<div style="width:100%;overflow:hidden;">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px;">
    <thead><tr>${headRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</div>`;
}

function buildLetterBody(data: SubcontractedTestsLetterData): string {
  const isStdRef = formatIsStandardRef(data.isNumber, data.isTitle ?? "");
  const bisBranchLine = formatBisBranchLine(
    data.bisBranchName,
    data.bisBranchState,
    data.bisBranchCountry,
  );
  const letterDate = formatLetterDate(data.inspectionDate);
  const applicationNo = esc(formatApplicationNo(data.applicationNumber));
  const sigName =
    esc(data.document.signatory_name) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.document.signatory_designation) || "—";

  return `
<div style="text-align:center;margin-bottom:16px;">
  <div style="font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;text-decoration:underline;">
    Declaration Regarding Test Parameters Subcontracted
  </div>
</div>

<div style="font-size:11px;line-height:1.65;text-align:justify;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin:0 0 14px;">
    <div style="flex:1;min-width:0;">
      To<br/>
      The Director &amp; Head<br/>
      Bureau of Indian Standards<br/>
      ${bisBranchLine}
    </div>
    <div style="flex-shrink:0;text-align:right;white-space:nowrap;">
      <div><strong>Date:</strong> ${letterDate}</div>
      <div style="margin-top:4px;"><strong>Application No.:</strong> ${applicationNo}</div>
    </div>
  </div>

  <p style="margin:0 0 14px;">
    <strong>Sub:</strong> Declaration regarding test parameters subcontracted to accredited laboratories
    ${isStdRef ? ` for Indian Standard ${isStdRef}` : ""}.
  </p>

  <p style="margin:0 0 14px;">
    We, <strong>M/s. ${esc(data.companyName)}</strong>,
    ${data.address ? ` having our factory at <strong>${esc(data.address)}</strong>,` : ""}
    hereby declare that the following test parameters required for BIS certification
    ${isStdRef ? ` under ${isStdRef}` : ""}
    are not available in our in-house testing facility and are being carried out through
    BIS Recognized / ISO/IEC 17025 accredited laboratories:
  </p>

  <div style="margin:12px 0;">
    ${buildSubcontractedTestsTableHtml(data.rows)}
  </div>

  <p style="margin:0 0 14px;">
    We further declare that the above particulars are true and correct to the best of our knowledge and belief.
    We undertake to maintain proper records of subcontracted testing and to inform BIS of any change in the
    list of subcontracted test parameters or laboratories.
  </p>

  ${buildRightAlignedSignatoryBlockHtml({
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  })}
</div>`;
}

export function buildSubcontractedTestsCompany(
  data: SubcontractedTestsLetterData,
): PrintCompanyInfo {
  return buildManufacturingScopeCompany({
    ...data,
    licenseScope: "",
  });
}

export function defaultSubcontractedTestsPrintSettings(): PrintSettings {
  return defaultDeclarationPrintSettings();
}

export function buildSubcontractedTestsHtml(
  data: SubcontractedTestsLetterData,
  settings: PrintSettings,
): string {
  return buildPrintDocument({
    title: "Declaration Regarding Test Parameters Subcontracted",
    bodyHtml: buildLetterBody(data),
    settings,
    company: buildSubcontractedTestsCompany(data),
  });
}

export function iframeSizeForSubcontractedTestsPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
