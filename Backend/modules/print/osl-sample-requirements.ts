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
  oslSampleColumnCellText,
  oslSampleRowHasPrintableContent,
  OSL_SAMPLE_TABLE_COLUMN_OPTIONS,
  type OslSampleTableColumnKey,
} from "@backend/modules/print/osl-sample-table-columns";
import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";
import { isSampleIncludedInPrint } from "@backend/modules/bis/osl-sample-requirements";
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

function formatInspectionDateDisplay(dateStr: string | Date | null | undefined): string {
  return formatDisplayDate(dateStr, "N/A");
}

function formatApplicationNo(raw: string): string {
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
  key: OslSampleTableColumnKey,
  row: OslSampleRequirementStored,
  rowIndex: number,
): string {
  const text = oslSampleColumnCellText(key, row, rowIndex);
  if (key === "dom" || key === "payment_date") return esc(text);
  return text === "—" ? "—" : esc(text);
}

function buildSampleTableHtml(
  rows: OslSampleRequirementStored[],
  visibleColumns?: OslSampleTableColumnKey[],
): string {
  const visible = rows.filter(
    (r) => isSampleIncludedInPrint(r) && oslSampleRowHasPrintableContent(r),
  );

  if (visible.length === 0) {
    return `<p style="font-size:10px;color:#64748b;text-align:center;padding:8px;">No sample details entered yet.</p>`;
  }

  const columns = normalizeOslSampleTableColumns(visibleColumns);
  const columnDefs = OSL_SAMPLE_TABLE_COLUMN_OPTIONS.filter((col) => columns.includes(col.key));

  // Dense cells so ~8 long sample rows + declaration still fit on one A4 page.
  const thBase =
    "padding:2px 4px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:8.5px;font-weight:700;vertical-align:middle;line-height:1.2;";
  const thNarrow = `${thBase}width:1%;white-space:nowrap;text-align:center;`;
  const thWide = `${thBase}text-align:left;`;
  const thWideCenter = `${thBase}text-align:center;`;
  const thStack = `${thBase}width:1%;text-align:center;line-height:1.2;`;
  const tdBase =
    "padding:2px 4px;border:1px solid #e2e8f0;font-size:9px;vertical-align:middle;line-height:1.25;";
  const tdNarrow = `${tdBase}width:1%;white-space:nowrap;text-align:center;vertical-align:middle;`;
  const tdWide = `${tdBase}text-align:left;word-break:break-word;`;
  const tdWideCenter = `${tdBase}text-align:center;word-break:break-word;`;
  const tdStack = `${tdBase}width:1%;text-align:center;word-break:break-word;line-height:1.2;vertical-align:middle;`;

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

  return `<div>
  <table class="osl-sample-table" style="width:100%;border-collapse:collapse;table-layout:auto;font-size:9px;">
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
    compact: true,
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

  // Declaration left + signature right — saves a full vertical signature stack.
  const closingWithSignatory = `<div class="print-keep-with-signatory" style="break-inside:avoid;page-break-inside:avoid;display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-top:6px;">
      <p style="flex:1;min-width:0;margin:0;font-size:10px;line-height:1.3;text-align:justify;">
        We declare that the above samples have been prepared prior to grant of the BIS licence, are drawn from
        trial production, and are being manufactured for the purpose of obtaining BIS licence. The information
        furnished above is true and correct to the best of our knowledge and belief.
      </p>
      <div style="flex-shrink:0;">${buildSignatoryBlock(data)}</div>
    </div>`;

  return `
<div style="text-align:center;margin-bottom:6px;">
  <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;text-decoration:underline;">
    ${esc(labels.documentHeading)}
  </div>
</div>

<div style="font-size:10.5px;line-height:1.3;text-align:justify;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin:0 0 5px;">
    <div style="flex:1;min-width:0;line-height:1.25;">
      To<br/>
      The Director &amp; Head<br/>
      Bureau of Indian Standards<br/>
      ${esc(bisBranchLine)}
    </div>
    <div style="flex-shrink:0;text-align:right;white-space:nowrap;font-size:10px;">
      <div><strong>Date of Inspection:</strong> ${esc(inspectionDate)}</div>
      <div style="margin-top:1px;"><strong>Application No.:</strong> ${esc(applicationNo)}</div>
    </div>
  </div>

  <p style="margin:0 0 5px;">
    <strong>Sub:</strong> Submission of samples for testing at Outside Testing Laboratory (OSL)
    ${isStdRef ? ` under Indian Standard ${isStdRef}` : ""}.
  </p>

  <p style="margin:0 0 5px;">
    We, <strong>M/s. ${esc(data.companyName)}</strong>,
    ${data.address ? ` having our factory at <strong>${esc(data.address)}</strong>,` : ""}
    hereby sending the following samples for testing at the designated Outside Testing Laboratory (OSL)
    ${isStdRef ? ` in connection with BIS certification under ${isStdRef}` : " in connection with BIS certification"}.
    The details of the samples sent are as under:
  </p>

  <div style="margin:4px 0 2px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:4px;background:#f8fafc;">
    <div style="font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:3px;">
      ${variant === "pi" ? "Sample Details for Inspection" : "Sample Details for OSL"}
    </div>
    ${buildSampleTableHtml(data.rows, tableColumns)}
  </div>

  ${closingWithSignatory}
</div>`;
}

export type OslSamplePrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildOslSampleCompany(
  data: OslSampleOfferLetterData,
  assets?: OslSamplePrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({
      ...data,
      licenseScope: "",
    }),
    ...assets,
    // OSL Sample letterhead matches Top Management — text-only / no logo tile.
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

export function defaultOslSamplePrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    letterhead_layout: "logo-na",
    show_page_numbers: false,
    show_footer_line: false,
    font_size: 10,
    margin_top: 4,
    margin_bottom: 4,
    margin_left: 12,
    margin_right: 8,
  };
}

/** Force no-logo letterhead for OSL Sample preview / Word. */
export function oslSampleLetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildOslSampleRequirementsHtml(
  data: OslSampleOfferLetterData,
  settings: PrintSettings,
  tableColumns: OslSampleTableColumnKey[] = DEFAULT_OSL_SAMPLE_TABLE_COLUMNS,
  variant: SampleOfferLetterVariant = "osl",
  assets?: OslSamplePrintAssets,
): string {
  const labels = sampleOfferLetterLabels(variant);
  return buildPrintDocument({
    title: labels.documentTitle,
    bodyHtml: buildOfferLetterBody(data, variant, tableColumns),
    settings: oslSampleLetterheadSettings(settings),
    company: buildOslSampleCompany(data, assets),
    extraStyles: `
      .lh-wrap { padding: 6px 0 4px !important; margin-bottom: 6px !important; }
      .lh-wrap > div:first-child { font-size: 18px !important; line-height: 1.05 !important; }
      .osl-sample-table th, .osl-sample-table td {
        padding: 2px 4px !important;
        font-size: 9px !important;
        line-height: 1.25 !important;
      }
      .osl-sample-table th { font-size: 8.5px !important; }
      .print-keep-with-signatory { break-inside: avoid; page-break-inside: avoid; }
    `,
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
