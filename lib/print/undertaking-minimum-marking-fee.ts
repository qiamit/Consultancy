import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import type { UndertakingMinimumMarkingFeeStored } from "@/lib/undertaking-minimum-marking-fee";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";
import { buildClassSignatoryBlockHtml } from "@/lib/print/signatory-signature";

export type UndertakingMinimumMarkingFeeLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  firmRepName: string;
  firmRepDesignation: string;
  document: UndertakingMinimumMarkingFeeStored;
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMetaDate(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "N/A";
  return formatDisplayDate(v, "N/A");
}

function formatApplicationNo(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function formatBisBranchLine(branchName: string, state: string): string {
  const branch = branchName.trim() || "________________";
  const st = state.trim() || "________________";
  return `${esc(branch)}, ${esc(st)}, INDIA`;
}

function blankOr(value: string, fallback = "________________"): string {
  const v = esc(value);
  return v || fallback;
}

function buildTitleHtml(): string {
  return `
<h1 class="mmf-title">Undertaking for Minimum Marking Fee</h1>
<div class="mmf-page-indicator">Page 01 of 01</div>`;
}

function buildLetterIntroHtml(data: UndertakingMinimumMarkingFeeLetterData): string {
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<div class="mmf-to-row">
  <div class="mmf-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standards<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="mmf-date-block">
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildDetailsTableHtml(document: UndertakingMinimumMarkingFeeStored): string {
  const lbl =
    "border:1px solid #111;padding:6px 8px;font-size:10px;font-weight:700;vertical-align:middle;background:#eef2f7;width:42%;";
  const val =
    "border:1px solid #111;padding:6px 8px;font-size:10px;font-weight:600;vertical-align:middle;";

  const rows: { label: string; value: string }[] = [
    { label: "Unit of Sale", value: document.unit_of_sale },
    { label: "Annual Production Capacity", value: document.annual_production_capacity },
    { label: "Value of Production (Per Unit)", value: document.value_of_production_per_unit },
    { label: "Cost of Production (Per Unit)", value: document.cost_of_production_per_unit },
    {
      label: "Cost (Market Cost) of Most Common Variety",
      value: document.market_cost_most_common_variety,
    },
  ];

  const body = rows
    .map(
      (row, index) => `
    <tr>
      <td style="${lbl}">${index + 1}. ${esc(row.label)}</td>
      <td style="${val}width:4%;text-align:center;">:</td>
      <td style="${val}">${blankOr(row.value, "&nbsp;")}</td>
    </tr>`,
    )
    .join("");

  return `
<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:12px 0 16px;">
  <tbody>
    ${body}
  </tbody>
</table>`;
}

function buildSignatoryBlockHtml(data: UndertakingMinimumMarkingFeeLetterData): string {
  const sigName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.firmRepDesignation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "mmf-signatory-block",
    forClass: "mmf-signatory-for",
    sigWrapClass: "mmf-signatory-sig",
    lineClass: "mmf-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildBodyHtml(data: UndertakingMinimumMarkingFeeLetterData): string {
  const doc = data.document;

  return `
${buildLetterIntroHtml(data)}

<p class="mmf-salutation">Respected / Sir,</p>

<p class="mmf-intro">
  I/We hereby undertake to pay the minimum marking fee as per Scheme-I of Schedule-II in BIS
  (Conformity Assessment) Regulations, 2018. The details of production and cost are furnished below
  for the purpose of determination of minimum marking fee:
</p>

${buildDetailsTableHtml(doc)}

<p class="mmf-closing">
  I/We further undertake that the above information is true and correct to the best of our knowledge
  and belief and we shall abide by all the directions issued by the Bureau in this regard.
</p>

${buildSignatoryBlockHtml(data)}`;
}

function buildFormBody(data: UndertakingMinimumMarkingFeeLetterData): string {
  return `
<div class="mmf-sheet">
  ${buildTitleHtml()}
  ${buildBodyHtml(data)}
</div>`;
}

export function buildUndertakingMinimumMarkingFeeCompany(
  data: UndertakingMinimumMarkingFeeLetterData,
): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultUndertakingMinimumMarkingFeePrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    show_letterhead: true,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 11,
  };
}

export function buildUndertakingMinimumMarkingFeeHtml(
  data: UndertakingMinimumMarkingFeeLetterData,
  settings: PrintSettings,
): string {
  const styles = `
    .mmf-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
    }
    .mmf-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      line-height: 1.35;
    }
    .mmf-page-indicator {
      text-align: right;
      font-size: 10px;
      font-weight: 600;
      margin: 2px 0 8px;
    }
    .mmf-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 12px;
    }
    .mmf-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.55;
    }
    .mmf-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.55;
    }
    .mmf-salutation,
    .mmf-intro,
    .mmf-closing {
      margin: 0 0 10px;
      font-size: 10px;
      line-height: 1.55;
      text-align: justify;
    }
    .mmf-signatory-block {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .mmf-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .mmf-signatory-sig {
      margin-top: 32px;
      min-width: 200px;
      text-align: right;
    }
    .mmf-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
  `;

  return buildPrintDocument({
    title: "Undertaking for Minimum Marking Fee",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings,
    company: buildUndertakingMinimumMarkingFeeCompany(data),
  });
}

export function iframeSizeForUndertakingMinimumMarkingFeePrintSettings(
  settings: PrintSettings,
): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
