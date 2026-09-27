import { buildLetterheadHtml, buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import type {
  SitTestRow,
  UpdatedSchemeOfInspectionStored,
} from "@backend/modules/bis/updated-scheme-of-inspection";
import { USIT_ANNEX_SECTIONS, USIT_NOTE_SECTIONS } from "@backend/modules/bis/updated-scheme-of-inspection";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import {
  printPageIndicatorHtml,
} from "@backend/modules/print/paged-preview";
import { formatDisplayDate } from "@backend/shared/format-date";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import { buildRightAlignedSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type UpdatedSchemeOfInspectionLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  document: UpdatedSchemeOfInspectionStored;
  dateOfApplication?: string;
};

export type UsitPrintSlot =
  | { kind: "annex"; header: string; text: string; index: number }
  | { kind: "table_row"; row: SitTestRow }
  | { kind: "note"; header: string; text: string };

export type UsitPrintPage = {
  kind: "annex" | "table";
  slots: UsitPrintSlot[];
  showTitle?: boolean;
  showSignatory?: boolean;
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textBlock(text: string): string {
  return esc(text)
    .split("\n")
    .map((line) => `<p class="usit-para">${line || "&nbsp;"}</p>`)
    .join("");
}

/** Drop leading "HEADER -" / "HEADER –" when a separate header is printed. */
function normalizeHeaderLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripLeadingSectionHeader(text: string, header: string): string {
  const raw = text.trim();
  if (!raw || !header.trim()) return raw;
  const m = raw.match(/^(.{1,80}?)\s*[-–—:]\s+/);
  if (m && normalizeHeaderLabel(m[1]) === normalizeHeaderLabel(header)) {
    return raw.slice(m[0].length).trim();
  }
  // Also strip "Note-1" / "Note 1" style labels without requiring exact header match.
  const noteLike = raw.match(/^(note[\s-]*\d+)\s*[-–—:]\s+/i);
  if (
    noteLike &&
    normalizeHeaderLabel(noteLike[1]) === normalizeHeaderLabel(header)
  ) {
    return raw.slice(noteLike[0].length).trim();
  }
  const escaped = header.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return raw
    .replace(new RegExp(`^${escaped}\\s*[-–—:]\\s*`, "i"), "")
    .trim();
}

function annexSectionHtml(header: string, text: string, index?: number): string {
  const body = stripLeadingSectionHeader(text, header);
  if (!header.trim() && !body.trim()) return "";
  const label = header.trim()
    ? index != null
      ? `${index}. ${header.trim().toUpperCase()}`
      : header.trim().toUpperCase()
    : "";
  return `
${label ? `<p class="usit-annex-header"><strong>${esc(label)}</strong></p>` : ""}
${body.trim() ? textBlock(body) : ""}`;
}

function cellMultiline(value: string): string {
  return esc(value)
    .split("\n")
    .join("<br/>");
}

function buildTableRowsHtml(rows: SitTestRow[]): string {
  const td =
    "border:1px solid #111;padding:4px 5px;font-size:8px;vertical-align:middle;line-height:1.35;";
  const tdCenter = `${td}text-align:center;`;
  const tdLeft = `${td}text-align:left;`;

  return rows
    .map((row) => {
      if (row.row_kind === "section") {
        return `
      <tr>
        <td style="${tdCenter}font-weight:700;" colspan="7">${cellMultiline(row.requirement || row.clause_no)}</td>
      </tr>`;
      }
      if (row.row_kind === "group") {
        return `
      <tr>
        <td style="${tdCenter}">${cellMultiline(row.clause_no)}</td>
        <td style="${tdLeft}font-weight:700;" colspan="6">${cellMultiline(row.requirement)}</td>
      </tr>`;
      }

      return `
      <tr>
        <td style="${tdCenter}">${cellMultiline(row.clause_no) || "&nbsp;"}</td>
        <td style="${tdLeft}">${cellMultiline(row.requirement) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.test_methods_ref) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.equipment_req) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.sample_count) || "&nbsp;"}</td>
        <td style="${tdCenter}">${cellMultiline(row.frequency) || "&nbsp;"}</td>
        <td style="${tdLeft}">${cellMultiline(row.remarks) || "&nbsp;"}</td>
      </tr>`;
    })
    .join("");
}

function buildTableHtml(rows: SitTestRow[]): string {
  const th =
    "border:1px solid #111;padding:5px 4px;font-size:8px;font-weight:700;text-align:center;vertical-align:middle;background:#eef2f7;line-height:1.3;";

  // Content-based widths: short codes narrow, text columns wider.
  const colWidths = ["5%", "24%", "14%", "5%", "9%", "14%", "29%"];

  return `
<p class="usit-table-title"><strong>TABLE 1</strong></p>
<table class="usit-test-table" style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0;">
  <colgroup>
    ${colWidths.map((w) => `<col style="width:${w};" />`).join("")}
  </colgroup>
  <thead>
    <tr>
      <th style="${th}" colspan="3">(1) Test Details</th>
      <th style="${th}" colspan="4">(2) Test equipment requirement — R: Required (or) S: Subcontracting permitted &nbsp;&nbsp;|&nbsp;&nbsp; (3) Levels of Control</th>
    </tr>
    <tr>
      <th style="${th}">Cl.</th>
      <th style="${th}">Requirement</th>
      <th style="${th}">Test Methods<br/>Reference</th>
      <th style="${th}">R/S</th>
      <th style="${th}">No. of<br/>Sample</th>
      <th style="${th}">Frequency</th>
      <th style="${th}">Remarks</th>
    </tr>
  </thead>
  <tbody>
    ${buildTableRowsHtml(rows)}
  </tbody>
</table>`;
}

function usitTextLineCount(value: string, charsPerLine: number): number {
  const parts = String(value ?? "").trim().split(/\n/);
  if (!parts.length || (parts.length === 1 && !parts[0])) return 1;
  return parts.reduce(
    (sum, part) =>
      sum + Math.ceil(Math.max(1, part.length) / Math.max(8, charsPerLine)),
    0,
  );
}

function usitSheetBudgetMm(settings: PrintSettings, extraMm: number): number {
  const { heightMm } = iframeSizeForPrintSettings({
    ...settings,
    orientation: "portrait",
  });
  const usable = Math.max(
    80,
    heightMm - settings.margin_top - settings.margin_bottom,
  );
  const letterhead = settings.show_letterhead ? 28 : 0;
  const meta = 18;
  const pageNum = 6;
  const slack = 3;
  return Math.max(
    48,
    usable - letterhead - meta - pageNum - slack - extraMm,
  );
}

function estimateUsitAnnexSlotMm(header: string, text: string): number {
  const headerMm = header.trim() ? 5.2 : 0;
  const lines = usitTextLineCount(text, 98);
  return headerMm + lines * 3.25 + 1.2;
}

function estimateUsitTableRowMm(row: SitTestRow): number {
  const padMm = 2.3;
  const lineMm = 3.15;
  if (row.row_kind === "section") {
    return padMm + usitTextLineCount(row.requirement || row.clause_no, 86) * lineMm;
  }
  const lines = Math.max(
    usitTextLineCount(row.clause_no, 7),
    usitTextLineCount(row.requirement, 32),
    usitTextLineCount(row.test_methods_ref, 16),
    usitTextLineCount(row.equipment_req, 6),
    usitTextLineCount(row.sample_count, 10),
    usitTextLineCount(row.frequency, 16),
    usitTextLineCount(row.remarks, 36),
  );
  return padMm + lines * lineMm;
}

function splitTextToBudget(
  text: string,
  header: string,
  budgetMm: number,
): string[] {
  const raw = text.trim();
  if (!raw) return [""];
  // Keep a section on one page unless it is truly taller than the sheet.
  if (estimateUsitAnnexSlotMm(header, raw) <= budgetMm * 0.98) return [raw];

  const chunks: string[] = [];
  const paras = raw.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  let current = "";
  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  const fits = (next: string) =>
    estimateUsitAnnexSlotMm(header, next) <= budgetMm;

  for (const para of paras) {
    const candidate = current ? `${current}\n${para}` : para;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    pushCurrent();
    if (fits(para)) {
      current = para;
      continue;
    }
    const words = para.split(/\s+/);
    let piece = "";
    for (const word of words) {
      const next = piece ? `${piece} ${word}` : word;
      if (fits(next)) {
        piece = next;
      } else {
        if (piece) chunks.push(piece);
        piece = word;
      }
    }
    current = piece;
  }
  pushCurrent();
  return chunks.length > 0 ? chunks : [raw];
}

function usitSlotHeightMm(slot: UsitPrintSlot): number {
  if (slot.kind === "table_row") return estimateUsitTableRowMm(slot.row);
  if (slot.kind === "note") return estimateUsitAnnexSlotMm(slot.header, slot.text);
  if (slot.kind === "annex") return estimateUsitAnnexSlotMm(slot.header, slot.text);
  return 0;
}

/** Pull leftover table rows back so each sheet fills, then spills. */
function justifyTablePages(pages: UsitPrintPage[], budgetMm: number): void {
  for (let i = 0; i < pages.length - 1; i++) {
    const current = pages[i];
    const next = pages[i + 1];
    if (current.kind !== "table" || next.kind !== "table") continue;
    let used = current.slots.reduce((sum, slot) => sum + usitSlotHeightMm(slot), 0);
    while (next.slots[0]?.kind === "table_row") {
      const height = usitSlotHeightMm(next.slots[0]);
      const leftover = budgetMm - used;
      // Estimates run a little fat on later rows — take the row when most of it fits.
      if (leftover < height && leftover < height * 0.82) break;
      current.slots.push(next.slots.shift()!);
      used += Math.min(height, Math.max(leftover, 0));
    }
  }
  for (let i = pages.length - 1; i >= 0; i--) {
    if (pages[i]?.kind === "table" && pages[i].slots.length === 0) {
      pages.splice(i, 1);
    }
  }
}

function takeNotesForBudget(
  notes: UsitPrintSlot[],
  budgetMm: number,
): { taken: UsitPrintSlot[]; rest: UsitPrintSlot[] } {
  const taken: UsitPrintSlot[] = [];
  const rest = notes.slice();
  let leftover = budgetMm;
  while (rest[0]?.kind === "note" && leftover >= 10) {
    const slot = rest[0];
    const height = estimateUsitAnnexSlotMm(slot.header, slot.text);
    if (height <= leftover) {
      taken.push(rest.shift()!);
      leftover -= height;
      continue;
    }
    const chunks = splitTextToBudget(slot.text, slot.header, leftover);
    const first = (chunks[0] ?? "").trim();
    const restText = chunks.slice(1).join("\n").trim();
    if (
      !first ||
      first === slot.text.trim() ||
      estimateUsitAnnexSlotMm(slot.header, first) > leftover
    ) {
      break;
    }
    taken.push({ kind: "note", header: slot.header, text: first });
    if (restText) rest[0] = { kind: "note", header: slot.header, text: restText };
    else rest.shift();
    leftover = 0;
  }
  return { taken, rest };
}

function attachUsitNotes(
  pages: UsitPrintPage[],
  noteSlots: UsitPrintSlot[],
  tableBudgetMm: number,
  lastTableBudgetMm: number,
  notePageBudgetMm: number,
  lastNoteBudgetMm: number,
): void {
  if (noteSlots.length === 0) return;
  let remaining = noteSlots.slice();
  const last = pages[pages.length - 1];
  if (last?.kind === "table") {
    const used = last.slots.reduce((sum, slot) => sum + usitSlotHeightMm(slot), 0);
    const allNotesMm = remaining.reduce(
      (sum, slot) => sum + usitSlotHeightMm(slot),
      0,
    );
    const fillBudget =
      used + allNotesMm <= lastTableBudgetMm ? lastTableBudgetMm : tableBudgetMm;
    const { taken, rest } = takeNotesForBudget(
      remaining,
      Math.max(0, fillBudget - used),
    );
    last.slots.push(...taken);
    remaining = rest;
  }
  if (remaining.length === 0) return;
  const expanded: UsitPrintSlot[] = [];
  for (const slot of remaining) {
    if (slot.kind !== "note") continue;
    for (const chunk of splitTextToBudget(slot.text, slot.header, notePageBudgetMm)) {
      if (chunk.trim()) {
        expanded.push({ kind: "note", header: slot.header, text: chunk });
      }
    }
  }
  const notePages = packUsitSlots(
    expanded,
    notePageBudgetMm,
    usitSlotHeightMm,
    lastNoteBudgetMm,
  );
  for (const notePage of notePages) {
    if (notePage.length === 0) continue;
    pages.push({ kind: "table", slots: notePage, showSignatory: false });
  }
}

function packUsitSlots(
  slots: UsitPrintSlot[],
  budgetMm: number,
  estimate: (slot: UsitPrintSlot) => number,
  nextBudgetMm = budgetMm,
): UsitPrintSlot[][] {
  if (slots.length === 0) return [[]];
  const pages: UsitPrintSlot[][] = [];
  let page: UsitPrintSlot[] = [];
  let used = 0;
  let budget = budgetMm;
  for (const slot of slots) {
    const height = estimate(slot);
    if (page.length > 0 && used + height > budget) {
      pages.push(page);
      page = [];
      used = 0;
      budget = nextBudgetMm;
    }
    page.push(slot);
    used += height;
  }
  if (page.length) pages.push(page);
  return pages;
}

function collectAnnexSlots(doc: UpdatedSchemeOfInspectionStored): UsitPrintSlot[] {
  const slots: UsitPrintSlot[] = [];
  const push = (header: string, text: string, index: number) => {
    const body = stripLeadingSectionHeader(text, header);
    if (!header.trim() && !body.trim()) return;
    slots.push({ kind: "annex", header, text: body, index });
  };
  USIT_ANNEX_SECTIONS.forEach((section, i) => {
    push(section.header, doc[section.key] ?? "", i + 1);
  });
  (doc.annex_extra_rows ?? []).forEach((row, i) => {
    push(row.header, row.text, USIT_ANNEX_SECTIONS.length + i + 1);
  });
  return slots;
}

function collectNoteSlots(doc: UpdatedSchemeOfInspectionStored): UsitPrintSlot[] {
  const slots: UsitPrintSlot[] = [];
  USIT_NOTE_SECTIONS.forEach((section) => {
    const body = stripLeadingSectionHeader(doc[section.key] ?? "", section.header);
    if (!section.header.trim() && !body.trim()) return;
    slots.push({ kind: "note", header: section.header, text: body });
  });
  (doc.note_extra_rows ?? []).forEach((row) => {
    const body = stripLeadingSectionHeader(row.text, row.header);
    if (!row.header.trim() && !body.trim()) return;
    slots.push({ kind: "note", header: row.header, text: body });
  });
  return slots;
}

/** Annex pages first (fill then spill), then Table 1 + Notes pages. */
export function paginateUsitForPrint(
  doc: UpdatedSchemeOfInspectionStored,
  settings: PrintSettings,
): UsitPrintPage[] {
  const annexTitleMm = 12;
  const annexBudget = usitSheetBudgetMm(settings, annexTitleMm);
  const tableHeaderMm = 24;
  const signatoryMm = 22;
  const tableBudget = usitSheetBudgetMm(settings, tableHeaderMm);
  const lastTableBudget = usitSheetBudgetMm(settings, tableHeaderMm + signatoryMm);
  const annexSource = collectAnnexSlots(doc);
  const annexSlots: UsitPrintSlot[] = [];
  for (const slot of annexSource) {
    if (slot.kind !== "annex") continue;
    for (const chunk of splitTextToBudget(slot.text, slot.header, annexBudget)) {
      annexSlots.push({ ...slot, text: chunk });
    }
  }
  const annexContBudget = usitSheetBudgetMm(settings, 0);
  const annexPages = packUsitSlots(
    annexSlots,
    annexBudget,
    (slot) =>
      slot.kind === "annex" ? estimateUsitAnnexSlotMm(slot.header, slot.text) : 0,
    annexContBudget,
  ).map((slots, i) => ({
    kind: "annex" as const,
    slots,
    showTitle: i === 0,
    showSignatory: false,
  }));

  const tableSlots: UsitPrintSlot[] = (doc.test_rows ?? []).map((row) => ({
    kind: "table_row" as const,
    row,
  }));
  const noteSlots = collectNoteSlots(doc);
  const tablePages = packUsitSlots(
    tableSlots,
    tableBudget,
    (slot) => (slot.kind === "table_row" ? estimateUsitTableRowMm(slot.row) : 0),
  );

  const lastAnnex = annexPages[annexPages.length - 1];
  if (lastAnnex) lastAnnex.showSignatory = true;

  const pages: UsitPrintPage[] = annexPages.length
    ? annexPages
    : [{ kind: "annex", slots: [], showSignatory: true }];

  if (tablePages.length === 0) {
    if (noteSlots.length) {
      pages.push({ kind: "table", slots: noteSlots, showSignatory: false });
    }
    const lastAnnexOnly = pages[pages.length - 1];
    if (lastAnnexOnly) lastAnnexOnly.showSignatory = true;
    return pages;
  }

  tablePages.forEach((slots) => {
    pages.push({
      kind: "table",
      slots,
      showSignatory: false,
    });
  });
  justifyTablePages(pages, tableBudget);
  const notePageBudget = usitSheetBudgetMm(settings, 0);
  const lastNoteBudget = usitSheetBudgetMm(settings, signatoryMm);
  attachUsitNotes(
    pages,
    noteSlots,
    tableBudget,
    lastTableBudget,
    notePageBudget,
    lastNoteBudget,
  );

  pages.forEach((page, i) => {
    if (page.kind === "table") page.showSignatory = i === pages.length - 1;
  });
  const lastPage = pages[pages.length - 1];
  if (lastPage) lastPage.showSignatory = true;
  return pages;
}

export function usitPrintPageCount(
  data: UpdatedSchemeOfInspectionLetterData,
  settings: PrintSettings,
): number {
  return Math.max(
    1,
    paginateUsitForPrint(
      data.document,
      updatedSchemeOfInspectionLetterheadSettings({
        ...settings,
        orientation: "portrait",
        show_letterhead: true,
      }),
    ).length,
  );
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
  return parts.join(", ");
}

function formatApplicationNo(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function buildUsitMetaHeaderHtml(data: UpdatedSchemeOfInspectionLetterData): string {
  const doc = data.document;
  const branchName = (data.bisBranchName ?? "").trim() || "Raipur Branch Office";
  const bisBranchLine = formatBisBranchLine(
    branchName,
    data.bisBranchState ?? "",
    data.bisBranchCountry ?? "India",
  );
  const dateApp =
    formatDisplayDate(data.dateOfApplication, "") || "________________";
  const appNo = formatApplicationNo(data.applicationNumber);
  const pmNo =
    esc(doc.pm_reference).trim() || "PM/ IS __________/1/__________";

  return `
<div class="usit-meta-row">
  <div class="usit-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standards<br/>
    ${esc(bisBranchLine)}
  </div>
  <div class="usit-date-block">
    <div><strong>Date of Application:</strong> ${esc(dateApp)}</div>
    <div><strong>Application Number:</strong> ${esc(appNo)}</div>
    <div><strong>PM Number:</strong> ${pmNo}</div>
  </div>
</div>`;
}

function buildUsitSignatoryHtml(data: UpdatedSchemeOfInspectionLetterData): string {
  const sigName =
    esc(data.signatoryName ?? "") || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.signatoryDesignation ?? "") || "—";
  return `
${buildRightAlignedSignatoryBlockHtml({
  companyName: esc(data.companyName),
  sigName,
  sigDesig,
  signatureImageUrl: data.signatureImageUrl,
})}
<div class="usit-auth-signatory">Authorized Signatory</div>`;
}

function buildUsitPageHtml(
  data: UpdatedSchemeOfInspectionLetterData,
  page: UsitPrintPage,
  pageNum: number,
  totalPages: number,
  settings: PrintSettings,
  company: PrintCompanyInfo,
): string {
  const letterheadHtml = buildLetterheadHtml(company, {
    ...settings,
    show_letterhead: true,
  });
  const metaHeader = buildUsitMetaHeaderHtml(data);
  const signatoryHtml = buildUsitSignatoryHtml(data);
  const annexSlots = page.slots.filter(
    (slot): slot is Extract<UsitPrintSlot, { kind: "annex" }> =>
      slot.kind === "annex",
  );
  const tableRows = page.slots
    .filter(
      (slot): slot is Extract<UsitPrintSlot, { kind: "table_row" }> =>
        slot.kind === "table_row",
    )
    .map((slot) => slot.row);
  const noteSlots = page.slots.filter(
    (slot): slot is Extract<UsitPrintSlot, { kind: "note" }> => slot.kind === "note",
  );

  const titleHtml =
    page.kind === "annex" && page.showTitle !== false
      ? `<h1 class="usit-title">ANNEX C</h1>
    <h2 class="usit-subtitle">Scheme of Inspection and Testing</h2>`
      : "";
  const annexHtml = annexSlots
    .map((slot) => annexSectionHtml(slot.header, slot.text, slot.index))
    .join("");
  const tableHtml = tableRows.length > 0 ? buildTableHtml(tableRows) : "";
  const notesHtml = noteSlots
    .map((slot) => annexSectionHtml(slot.header, slot.text))
    .join("");
  const showSignatory = page.showSignatory === true || pageNum === totalPages;

  return `
<div class="usit-sheet${pageNum > 1 ? " page-break" : ""}">
  <div class="usit-sheet-body">
    ${letterheadHtml}
    ${metaHeader}
    ${titleHtml}
    ${annexHtml}
    ${tableHtml}
    ${notesHtml}
    ${showSignatory ? signatoryHtml : ""}
  </div>
  ${printPageIndicatorHtml(pageNum, totalPages)}
</div>`;
}

function buildFormBody(
  data: UpdatedSchemeOfInspectionLetterData,
  settings: PrintSettings,
  company: PrintCompanyInfo,
  onlyPage?: number,
): string {
  const pages = paginateUsitForPrint(data.document, settings);
  const totalPages = Math.max(1, pages.length);
  const wanted =
    onlyPage && onlyPage >= 1 && onlyPage <= totalPages ? onlyPage : 0;
  const sheets = pages
    .map((page, i) => {
      const pageNum = i + 1;
      if (wanted && wanted !== pageNum) return "";
      return buildUsitPageHtml(
        data,
        page,
        pageNum,
        totalPages,
        settings,
        company,
      );
    })
    .join("");
  return `<div class="usit-sheets">${sheets}</div>`;
}

export type UpdatedSchemeOfInspectionPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

export function buildUpdatedSchemeOfInspectionCompany(
  data: UpdatedSchemeOfInspectionLetterData,
  assets?: UpdatedSchemeOfInspectionPrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Letterhead matches Top Management / Plant & Machinery — text-only / no logo tile.
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

export function defaultUpdatedSchemeOfInspectionPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    letterhead_layout: "logo-na",
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 10,
    orientation: "portrait",
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 15,
    margin_right: 5,
  };
}

/** Force no-logo letterhead for Updated SIT preview / Word (same as Top Management). */
export function updatedSchemeOfInspectionLetterheadSettings(
  settings: PrintSettings,
): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

function pageSizeCssForOrientation(
  settings: PrintSettings,
  orientation: "portrait" | "landscape",
): string {
  const { widthMm, heightMm } = iframeSizeForPrintSettings({
    ...settings,
    orientation,
  });
  return `${widthMm}mm ${heightMm}mm`;
}

export function buildUpdatedSchemeOfInspectionHtml(
  data: UpdatedSchemeOfInspectionLetterData,
  settings: PrintSettings,
  assets?: UpdatedSchemeOfInspectionPrintAssets,
  opts?: { onlyPage?: number },
): string {
  const letterheadSettings = updatedSchemeOfInspectionLetterheadSettings({
    ...settings,
    orientation: "portrait",
  });
  const company = buildUpdatedSchemeOfInspectionCompany(data, assets);
  const pageSize = iframeSizeForPrintSettings({
    ...letterheadSettings,
    orientation: "portrait",
  });
  const sheetPad = `${letterheadSettings.margin_top}mm ${letterheadSettings.margin_right}mm ${letterheadSettings.margin_bottom}mm ${letterheadSettings.margin_left}mm`;
  const fs = letterheadSettings.font_size || 10;
  const titleFs = Math.max(fs + 2, 13);
  const subtitleFs = Math.max(fs + 1, 12);
  const tableFs = Math.max(fs - 1, 8);

  const styles = `
    @page usit-portrait {
      size: ${pageSizeCssForOrientation(letterheadSettings, "portrait")};
      margin: 0;
    }
    .doc-page {
      padding: 0 !important;
      max-width: none !important;
    }
    .usit-sheets {
      width: ${pageSize.widthMm}mm;
    }
    .usit-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: ${fs}px;
      line-height: 1.45;
      position: relative;
      width: ${pageSize.widthMm}mm;
      height: ${pageSize.heightMm}mm;
      min-height: ${pageSize.heightMm}mm;
      max-height: ${pageSize.heightMm}mm;
      overflow: hidden;
      box-sizing: border-box;
      padding: ${sheetPad};
      display: flex;
      flex-direction: column;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .usit-sheet-body {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      padding-bottom: 6mm;
    }
    .usit-sheet .lh-wrap {
      flex-shrink: 0;
      margin-bottom: 6px !important;
      padding-top: 4px !important;
      padding-bottom: 6px !important;
    }
    .print-sheet-page-indicator {
      position: absolute;
      right: 5mm;
      bottom: 5mm;
      margin: 0;
      padding: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
      line-height: 1.2;
      z-index: 3;
      background: #fff;
    }
    .print-sheet-page-gap {
      display: none !important;
    }
    .page-break { page-break-before: auto; break-before: auto; }
    @media screen {
      html, body, .doc-page {
        background: #52525b !important;
      }
      .usit-sheets {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3mm;
        background: transparent;
      }
      .usit-sheet {
        background: #fff;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
      }
    }
    @media print {
      html, body {
        width: ${pageSize.widthMm}mm;
        margin: 0 !important;
        padding: 0 !important;
      }
      .usit-sheet {
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .usit-sheets > .usit-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
    .usit-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin: 0 0 8px;
      font-size: ${fs}px;
      line-height: 1.45;
      flex-shrink: 0;
    }
    .usit-to-block {
      flex: 1;
      min-width: 0;
      text-align: left;
    }
    .usit-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
    }
    .usit-date-block div + div {
      margin-top: 3px;
    }
    .usit-auth-signatory {
      margin-top: 4px;
      text-align: right;
      font-size: ${fs}px;
      font-weight: 700;
    }
    .usit-title {
      text-align: center;
      font-size: ${titleFs}px;
      font-weight: 700;
      margin: 0 0 4px;
      flex-shrink: 0;
    }
    .usit-subtitle {
      text-align: center;
      font-size: ${subtitleFs}px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 8px;
      flex-shrink: 0;
    }
    .usit-annex-header {
      margin: 8px 0 2px;
      text-align: left;
      font-size: ${fs}px;
      font-weight: 700;
      line-height: 1.35;
    }
    .usit-para {
      margin: 0 0 6px;
      text-align: justify;
      font-size: ${fs}px;
      line-height: 1.4;
    }
    .usit-table-title {
      margin: 6px 0 4px;
      font-size: ${subtitleFs}px;
      text-align: center;
      flex-shrink: 0;
    }
    .usit-test-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin: 4px 0;
      flex: 0 0 auto;
    }
    .usit-test-table th,
    .usit-test-table td {
      font-size: ${tableFs}px !important;
      vertical-align: middle !important;
      padding: 1mm 4px !important;
    }
    .usit-test-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  `;

  return buildPrintDocument({
    title: "Updated Scheme of Inspection & Testing",
    bodyHtml: buildFormBody(
      data,
      { ...letterheadSettings, show_letterhead: true },
      company,
      opts?.onlyPage,
    ),
    extraStyles: styles,
    settings: { ...letterheadSettings, show_letterhead: false },
    company,
  });
}

export function iframeSizeForUpdatedSchemeOfInspectionPrintSettings(
  settings: PrintSettings,
): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings({
    ...settings,
    orientation: "portrait",
  });
}
