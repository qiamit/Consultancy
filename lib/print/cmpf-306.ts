import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import {
  buildPageSlots,
  CMPF306_SEPARATE_SHEET_LABEL,
  type Cmpf306PageSlot,
  type Cmpf306Stored,
} from "@/lib/cmpf-306";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";

export type Cmpf306LetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  inspectionOfficerName: string;
  inspectionOfficerDesignation: string;
  firmRepName: string;
  firmRepDesignation: string;
  document: Cmpf306Stored;
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

function formatAddressWithIndia(address: string, city: string, state: string): string {
  const parts = [address.trim(), city.trim(), state.trim()].filter(Boolean);
  const line = parts.length > 0 ? parts.join(", ") : "______________________________";
  return `${esc(line)}, INDIA`;
}

function formatBisBranchLine(branchName: string, state: string): string {
  const branch = branchName.trim() || "________________";
  const st = state.trim() || "________________";
  return `${esc(branch)}, ${esc(st)}, INDIA`;
}

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function buildHeaderGridHtml(data: Cmpf306LetterData, pageNum: number, totalPages: number): string {
  const appNo = formatApplicationNo(data.applicationNumber);
  const dateApp = formatMetaDate(data.dateOfApplication);
  const dateInsp = formatMetaDate(data.dateOfInspection);
  const isCode = esc(data.isNumber) || "—";
  const applicant = esc(data.companyName) || "—";

  const cell =
    "border:1px solid #111;padding:4px 6px;font-size:10px;vertical-align:middle;line-height:1.35;";
  const lbl = `${cell}font-weight:700;width:18%;background:#eef2f7;`;
  const val = `${cell}font-weight:600;`;

  return `
<div class="cmpf-form-id">Form - II</div>
<h1 class="cmpf-title">Declaration Regarding Testing Equipments</h1>
<table class="cmpf-header-grid" style="width:100%;border-collapse:collapse;margin-bottom:4px;">
  <tr>
    <td style="${lbl}">Applicant Name</td>
    <td style="${val}" colspan="3">${applicant}</td>
  </tr>
  <tr>
    <td style="${lbl}">Applicant Address</td>
    <td style="${val}" colspan="3">${formatAddressWithIndia(data.address, data.city, data.bisBranchState)}</td>
  </tr>
  <tr>
    <td style="${lbl}">Application No.</td>
    <td style="${val}">${esc(appNo)}</td>
    <td style="${lbl}width:22%;">Date of Application</td>
    <td style="${val}">${esc(dateApp)}</td>
  </tr>
  <tr>
    <td style="${lbl}">IS Code</td>
    <td style="${val}">${isCode}</td>
    <td style="${lbl}">Date of Inspection</td>
    <td style="${val}">${esc(dateInsp)}</td>
  </tr>
</table>
<div class="cmpf-page-indicator">Page ${padPageNum(pageNum)} of ${padPageNum(totalPages)}</div>`;
}

function slotToRowHtml(
  slot: Cmpf306PageSlot,
  td: string,
  tdLeft: string,
  tdSr: string,
  tdCompact: string,
): string {
  if (slot.kind === "separate_sheet") {
    return `<tr>
      <td class="${tdSr}">${slot.srNo}</td>
      <td class="${td} cmpf-separate-sheet" colspan="7">${esc(CMPF306_SEPARATE_SHEET_LABEL)}</td>
    </tr>`;
  }
  if (slot.kind === "equipment") {
    return `<tr>
      <td class="${tdSr}">${slot.srNo}</td>
      <td class="${tdLeft}">${esc(slot.row.equipment_name) || "&nbsp;"}</td>
      <td class="${tdCompact}">${esc(slot.row.make) || "&nbsp;"}</td>
      <td class="${tdCompact}">${esc(slot.row.least_count) || "&nbsp;"}</td>
      <td class="${tdCompact}">${esc(slot.row.range) || "&nbsp;"}</td>
      <td class="${tdCompact}">${esc(slot.row.calibration_details) || "&nbsp;"}</td>
      <td class="${tdCompact}">${esc(slot.row.clause_number) || "&nbsp;"}</td>
      <td class="${tdCompact}">${esc(slot.row.quantity) || "&nbsp;"}</td>
    </tr>`;
  }
  return `<tr>
    <td class="${tdSr}">${slot.srNo}</td>
    <td class="${tdLeft}">&nbsp;</td>
    <td class="${tdCompact}">&nbsp;</td>
    <td class="${tdCompact}">&nbsp;</td>
    <td class="${tdCompact}">&nbsp;</td>
    <td class="${tdCompact}">&nbsp;</td>
    <td class="${tdCompact}">&nbsp;</td>
    <td class="${tdCompact}">&nbsp;</td>
  </tr>`;
}

function equipmentTableColgroup(settings: PrintSettings): string {
  const widths =
    settings.orientation === "landscape"
      ? [4, 28, 10, 10, 10, 12, 10, 8]
      : [5, 26, 11, 11, 11, 13, 10, 9];
  return `<colgroup>${widths.map((w) => `<col style="width:${w}%" />`).join("")}</colgroup>`;
}

function buildEquipmentTableHtml(
  slots: Cmpf306PageSlot[],
  startEquipIndex: number,
  settings: PrintSettings,
): { html: string; nextEquipIndex: number } {
  const th = "cmpf-cell cmpf-th";
  const td = "cmpf-cell cmpf-td";
  const tdLeft = "cmpf-cell cmpf-td cmpf-col-equip";
  const thSr = `${th} cmpf-col-sr`;
  const tdSr = `${td} cmpf-col-sr`;
  const thEquip = `${th} cmpf-col-equip`;
  const thCompact = `${th} cmpf-col-compact`;
  const tdCompact = `${td} cmpf-col-compact`;

  let equipIndex = startEquipIndex;
  for (const slot of slots) {
    if (slot.kind === "equipment") equipIndex += 1;
  }

  const body = slots
    .map((slot) => slotToRowHtml(slot, td, tdLeft, tdSr, tdCompact))
    .join("");

  return {
    html: `<table class="cmpf-equipment-table">
    ${equipmentTableColgroup(settings)}
    <thead>
      <tr>
        <th class="${thSr}">Sr No.</th>
        <th class="${thEquip}">Test Equipments / Chemicals</th>
        <th class="${thCompact}">Make</th>
        <th class="${thCompact}">Least Count</th>
        <th class="${thCompact}">Range</th>
        <th class="${thCompact}">Calibration Status</th>
        <th class="${thCompact}">Clause No.</th>
        <th class="${thCompact}">Quantity</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`,
    nextEquipIndex: equipIndex,
  };
}

function buildFooterHtml(data: Cmpf306LetterData): string {
  const firmName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const firmDesig = esc(data.firmRepDesignation) || "—";
  const bisName = esc(data.inspectionOfficerName) || "----";
  const bisDesig = esc(data.inspectionOfficerDesignation) || "----";
  const dateInsp = formatMetaDate(data.dateOfInspection);

  const box =
    "border:1px solid #111;padding:8px 10px;font-size:9px;line-height:1.45;vertical-align:top;width:50%;";
  const sigLine = "margin-top:14px;font-size:9px;line-height:1.6;";

  return `
<p class="cmpf-extra-note"><em>Note: Attach Extra Sheet, If Required</em></p>
<table style="width:100%;border-collapse:collapse;margin-top:6px;">
  <tr>
    <td style="${box}">
      <p style="margin:0 0 8px;text-align:justify;">
        I hereby declare that the Equipments of which details are given overleaf is owned by me and are actually installed in the premises.*
      </p>
      <p style="margin:0 0 8px;text-align:justify;">
        I also declare that in case of grant of licence, I will send prior intimation to BIS whenever any machinery is takenout of the premises of the firm due to any reason.
      </p>
      <div style="${sigLine}">
        <div>Sig. of Firm's Representative :-</div>
        <div>Name :- ${firmName}</div>
        <div>Designation :- ${firmDesig}</div>
        <div>Date :- ${esc(dateInsp)}</div>
      </div>
    </td>
    <td style="${box}">
      <p style="margin:0 0 8px;text-align:justify;">
        I have checked and found that Equipments of which details are given overleaf was available during my Inspection
      </p>
      <div style="${sigLine}">
        <div>Sig. of BIS Certification Officer :-</div>
        <div>Name :- ${bisName}</div>
        <div>Designation :- ${bisDesig}</div>
        <div>Date :- ${esc(dateInsp)}</div>
      </div>
    </td>
  </tr>
</table>
<p class="cmpf-footnote">
  * If Any Part of the Testing Activity is Out Sourced, Details of Test Equipments used for Out Sourced Activity shall be Indicated in a Saparate form Along with Complete Address of the Out Sourced Premises
</p>`;
}

function buildSinglePageHtml(
  data: Cmpf306LetterData,
  slots: Cmpf306PageSlot[],
  pageNum: number,
  totalPages: number,
  isLastPage: boolean,
  startEquipIndex: number,
  settings: PrintSettings,
): { html: string; nextEquipIndex: number } {
  const toBlock = `
<div class="cmpf-to-block">
  To<br/>
  The Director &amp; Head<br/>
  Bureau of Indian Standard<br/>
  ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
</div>`;

  const table = buildEquipmentTableHtml(slots, startEquipIndex, settings);

  return {
    html: `
<div class="cmpf-sheet${pageNum > 1 ? " page-break" : ""}">
  ${buildHeaderGridHtml(data, pageNum, totalPages)}
  ${pageNum === 1 ? toBlock : ""}
  ${table.html}
  ${isLastPage ? buildFooterHtml(data) : ""}
</div>`,
    nextEquipIndex: table.nextEquipIndex,
  };
}

function buildFormBody(data: Cmpf306LetterData, settings: PrintSettings): string {
  const pages = buildPageSlots(
    data.document.equipment,
    data.document.separate_sheet_enclosed,
  );
  const totalPages = pages.length;

  let equipIndex = 0;
  return pages
    .map((slots, i) => {
      const page = buildSinglePageHtml(
        data,
        slots,
        i + 1,
        totalPages,
        i === totalPages - 1,
        equipIndex,
        settings,
      );
      equipIndex = page.nextEquipIndex;
      return page.html;
    })
    .join("");
}

export function buildCmpf306Company(data: Cmpf306LetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultCmpf306PrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    show_letterhead: false,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 10,
  };
}

export function buildCmpf306Html(data: Cmpf306LetterData, settings: PrintSettings): string {
  const styles = `
    .cmpf-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      width: 100%;
    }
    .cmpf-form-id {
      text-align: right;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .cmpf-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 12px;
      letter-spacing: 0.02em;
    }
    .cmpf-page-indicator {
      text-align: right;
      font-size: 10px;
      font-weight: 600;
      margin: 2px 0 8px;
    }
    .cmpf-to-block {
      font-size: 11px;
      line-height: 1.55;
      margin: 8px 0 4px;
    }
    .cmpf-extra-note {
      margin: 14px 0 4px;
      font-size: 10px;
      text-align: left;
    }
    .cmpf-footnote {
      margin: 10px 0 0;
      font-size: 8px;
      font-weight: 700;
      line-height: 1.4;
      text-align: justify;
    }
    .cmpf-equipment-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 10px;
    }
    .cmpf-equipment-table .cmpf-cell {
      border: 1px solid #111;
      padding: 4px 5px;
      vertical-align: middle;
      line-height: 1.3;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .cmpf-equipment-table .cmpf-th {
      font-size: 8px;
      font-weight: 700;
      text-align: center;
      background: #eef2f7;
      line-height: 1.25;
    }
    .cmpf-equipment-table .cmpf-td {
      font-size: 9px;
      text-align: center;
      min-height: 20px;
    }
    .cmpf-equipment-table .cmpf-col-sr {
      white-space: nowrap;
    }
    .cmpf-equipment-table .cmpf-col-compact {
      text-align: center;
    }
    .cmpf-equipment-table .cmpf-col-equip {
      text-align: left;
    }
    .cmpf-equipment-table .cmpf-separate-sheet {
      font-weight: 700;
      text-align: center;
    }
    .page-break { page-break-before: always; }
  `;

  return buildPrintDocument({
    title: "CMPF 306 — Declaration Regarding Testing Equipments",
    bodyHtml: buildFormBody(data, settings),
    extraStyles: styles,
    settings,
    company: buildCmpf306Company(data),
  });
}

export function iframeSizeForCmpf306PrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
