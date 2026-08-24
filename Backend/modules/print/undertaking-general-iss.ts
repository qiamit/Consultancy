import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type { UndertakingGeneralIssStored } from "@backend/modules/bis/undertaking-general-iss";
import { formatWeeklyOffForUndertaking } from "@backend/modules/bis/undertaking-general-iss";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type UndertakingGeneralIssLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  markingClause: string;
  packagingClause: string;
  weeklyOff: string[];
  document: UndertakingGeneralIssStored;
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

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function buildPageIndicatorHtml(): string {
  return `<div class="ugi-page-indicator">Page ${padPageNum(1)} of ${padPageNum(1)}</div>`;
}

function buildLetterIntroHtml(data: UndertakingGeneralIssLetterData): string {
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<h1 class="ugi-title">Undertaking for General &amp; ISS</h1>
<div class="ugi-to-row">
  <div class="ugi-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standard<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="ugi-date-block">
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildSignatoryBlockHtml(data: UndertakingGeneralIssLetterData): string {
  const sigName =
    esc(data.document.signatory_name) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.document.signatory_designation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "ugi-signatory-block",
    forClass: "ugi-signatory-for",
    sigWrapClass: "ugi-signatory-sig",
    lineClass: "ugi-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildUndertakingPointsHtml(data: UndertakingGeneralIssLetterData): string {
  const points = resolveUndertakingGeneralIssPoints(data);

  return `
<p class="ugi-intro"><strong>We hereby undertake that:</strong></p>
<div class="ugi-points">
  ${points.map((text, i) => `<p><strong>${i + 1}.</strong> ${esc(text)}</p>`).join("")}
</div>`;
}

function buildFormBody(data: UndertakingGeneralIssLetterData): string {
  return `
<div class="ugi-sheet">
  ${buildLetterIntroHtml(data)}
  ${buildUndertakingPointsHtml(data)}
  ${buildSignatoryBlockHtml(data)}
  ${buildPageIndicatorHtml()}
</div>`;
}

export function buildUndertakingGeneralIssCompany(
  data: UndertakingGeneralIssLetterData,
): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultUndertakingGeneralIssPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 10,
  };
}

export function buildUndertakingGeneralIssHtml(
  data: UndertakingGeneralIssLetterData,
  settings: PrintSettings,
): string {
  const sheetMinHeight = `calc(297mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm)`;
  const styles = `
    .ugi-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 4mm;
    }
    .ugi-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .ugi-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      line-height: 1.35;
    }
    .ugi-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 12px;
    }
    .ugi-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.55;
    }
    .ugi-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.55;
    }
    .ugi-intro {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 700;
    }
    .ugi-points p {
      margin: 5px 0;
      font-size: 10.5px;
      line-height: 1.5;
      text-align: justify;
    }
    .ugi-signatory-block {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .ugi-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .ugi-signatory-sig {
      margin-top: 32px;
      min-width: 200px;
      text-align: right;
    }
    .ugi-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
  `;

  return buildPrintDocument({
    title: "Undertaking for General & ISS",
    bodyHtml: buildFormBody(data),
    extraStyles: styles,
    settings: { ...settings, show_page_numbers: false },
    company: buildUndertakingGeneralIssCompany(data),
  });
}

export function iframeSizeForUndertakingGeneralIssPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}

export function undertakingGeneralIssPointTexts(
  data: UndertakingGeneralIssLetterData,
): string[] {
  const isCode = data.isNumber?.trim() || "________________";
  const markingRef = data.markingClause.trim() || "Clause 13";
  const packagingRef = data.packagingClause.trim() || "Clause 14";
  const { closeOn, holidayPhrase } = formatWeeklyOffForUndertaking(data.weeklyOff);

  return [
    "We are having adequate electric power supply and water to run the factory as well as we are having generator set respectively. The manufacturing machinery testing equipment's available in the factory are owned by us",
    "We have our own arrangement of water supply & Pollution Control system",
    "We will inform to the B.I.S. office when we will be shifting any testing arrangement, or Manufacturing Machinery, or addition of any new machine in the factory",
    "We shall inform BIS with respect to change of quality control person / leave of quality control person and will not make the materials with ISI marked during his leave period",
    "In case of stop marking is imposed on us any time after grant of license, we shall stop marking immediately and shall restart marking only after getting permission",
    "We Inform to BIS regarding consignee details to whom product with ISI Mark will be supplied",
    "We extend all possible co-operation to the BIS Inspecting Officer in checking production line and records, testing in factory premises and drawl of samples for independent testing",
    `We hereby declare that ${holidayPhrase}, and our firm will remain close on ${closeOn}. This is for your kind information please`,
    "The above Information is true to the best of my knowledge and belief. I shall be responsible for any misleading information in the application. I understand and agree that in case of any wrong information in the application, the application shall be liable for rejection. I also agree that, if the license is granted based on information which is later found to be incorrect, the license shall be liable for cancellation",
    `We will Follow Marking Clause as per ${markingRef} of ${isCode}`,
    `We will Follow Packaging Clause as per ${packagingRef} of ${isCode}`,
    "We will be disposed the Non – Confirming product in a manner that it cannot be used for any other purpose and same record will be retained",
    "We always purchased ISI Mark Material (If Available) with Test Certificate and record of same will be retained",
  ];
}

export function resolveUndertakingGeneralIssPoints(
  data: UndertakingGeneralIssLetterData,
): string[] {
  const stored = data.document.undertaking_points
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (stored.length > 0) return stored;
  return undertakingGeneralIssPointTexts(data);
}
