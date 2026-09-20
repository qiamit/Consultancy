import ExcelJS from "exceljs";
import { triggerBlobDownload } from "@backend/shared/spreadsheet/excel";
import { formatDisplayDate } from "@backend/shared/format-date";

export type RenewalExportPeriodRow = {
  from: string;
  to: string;
  totalProduction: number;
  rejection: number;
  conforming: number;
  approxValue: number;
  markingFee: number;
};

export type RenewalExportSlabRow = {
  label: string;
  rangeLabel: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type RenewalExportData = {
  clientName: string;
  isNumber: string;
  cmLNumber: string;
  isTitle: string;
  firmScale: string;
  mmfFee: string;
  unit: string;
  validity: string;
  periodFrom: string;
  periodTo: string;
  unitRate: number;
  renewalYears: string;
  productionDecimals: number;
  hasProductionTable: boolean;
  periodRows: RenewalExportPeriodRow[];
  productionTotals: {
    totalProduction: number;
    rejection: number;
    conforming: number;
    approxValue: number;
    markingFee: number;
  };
  slabRows: RenewalExportSlabRow[];
  mmf: number;
  applicationFee: number;
  annualLicenseFee: number;
  lateFee: number;
  previousDues: number;
  gst: number;
  total: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDMY(dateStr: string): string {
  return formatDisplayDate(dateStr);
}

function formatInrPlain(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQty(n: number, decimals: number): string {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function titleOfIsAsPerNumber(data: RenewalExportData): string {
  if (data.isNumber && data.isTitle && data.isTitle !== "—") {
    return `${data.isNumber} — ${data.isTitle}`;
  }
  return data.isNumber || data.isTitle || "—";
}

function infoField(label: string, value: string, wide = false): string {
  return `<div class="info-cell${wide ? " wide" : ""}"><div class="info-label">${escapeHtml(label)}</div><div class="info-value">${escapeHtml(value || "—")}</div></div>`;
}

function buildLicenseInfoGrid(data: RenewalExportData): string {
  return `<div class="info-grid">
    ${infoField("Firm Name", data.clientName, true)}
    ${infoField("CM/L Number", data.cmLNumber)}
    ${infoField("Title of IS as per IS Number", titleOfIsAsPerNumber(data), true)}
    ${infoField("Firm Scale", data.firmScale)}
    ${infoField("MMF Fee", data.mmfFee)}
    ${infoField("Unit", data.unit)}
    ${infoField("Validity", data.validity)}
  </div>`;
}

function buildPeriodInfoGrid(data: RenewalExportData): string {
  return `<div class="info-grid period-grid">
    ${infoField("From", fmtDMY(data.periodFrom))}
    ${infoField("To", fmtDMY(data.periodTo))}
    ${infoField("Unit Rate (₹)", data.unitRate ? `₹ ${formatInrPlain(data.unitRate)}` : "—")}
    ${infoField("Period of Renewal", `${data.renewalYears} Year${data.renewalYears === "1" ? "" : "s"}`)}
  </div>`;
}

function buildProductionTableHtml(data: RenewalExportData, tableClass: string): string {
  if (!data.hasProductionTable || data.periodRows.length === 0) {
    return `<p class="muted">Production table not generated.</p>`;
  }

  const head = `
    <tr>
      <th class="col-date">From<br>Date</th>
      <th class="col-date">To<br>Date</th>
      <th>Total Production<br>(Licensed for CM)</th>
      <th class="col-num">Qualitative<br>Rejection</th>
      <th>Conforming<br>Production</th>
      <th class="col-money">Approx. Value<br>(₹)</th>
      <th class="col-money">Calculated Marking Fee<br>(₹)</th>
    </tr>`;

  const body = data.periodRows
    .map(
      (r) => `<tr>
        <td class="center">${fmtDMY(r.from)}</td>
        <td class="center">${fmtDMY(r.to)}</td>
        <td class="right">${formatQty(r.totalProduction, data.productionDecimals)}</td>
        <td class="right">${formatQty(r.rejection, data.productionDecimals)}</td>
        <td class="right">${formatQty(r.conforming, data.productionDecimals)}</td>
        <td class="right">₹ ${formatInrPlain(r.approxValue)}</td>
        <td class="right">₹ ${formatInrPlain(r.markingFee)}</td>
      </tr>`,
    )
    .join("");

  const totals = data.productionTotals;
  const totalRow = `<tr class="total-row">
    <td colspan="2" class="center"><strong>Total</strong></td>
    <td class="right"><strong>${formatQty(totals.totalProduction, data.productionDecimals)}</strong></td>
    <td class="right"><strong>${formatQty(totals.rejection, data.productionDecimals)}</strong></td>
    <td class="right"><strong>${formatQty(totals.conforming, data.productionDecimals)}</strong></td>
    <td class="right"><strong>₹ ${formatInrPlain(totals.approxValue)}</strong></td>
    <td class="right"><strong>₹ ${formatInrPlain(totals.markingFee)}</strong></td>
  </tr>`;

  return `<table class="${tableClass}"><thead>${head}</thead><tbody>${body}${totalRow}</tbody></table>`;
}

function buildSlabTableHtml(data: RenewalExportData, tableClass: string): string {
  const rows =
    data.slabRows.length > 0
      ? data.slabRows
          .map(
            (s) => `<tr>
              <td>${escapeHtml(s.label)}</td>
              <td>${escapeHtml(s.rangeLabel)}</td>
              <td class="center">${formatQty(s.quantity, 2)}</td>
              <td class="center">₹ ${formatInrPlain(s.rate)}</td>
              <td class="right">₹ ${formatInrPlain(s.amount)}</td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="5" class="center muted">No slab data</td></tr>`;

  return `<table class="${tableClass}">
    <thead>
      <tr>
        <th>Slab</th>
        <th>Quantity</th>
        <th class="center">Actual Qty</th>
        <th class="center">Rate (₹)</th>
        <th class="right">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildSummaryTableHtml(data: RenewalExportData): string {
  const renewalYearsNum = Number(data.renewalYears) || 1;
  return `<table class="data-table summary-table">
    <tbody>
      <tr><td>Final Marking Fee Based on Production</td><td class="right">₹ ${formatInrPlain(data.mmf)}</td></tr>
      <tr><td>Application Fee</td><td class="right">₹ ${formatInrPlain(data.applicationFee)}</td></tr>
      <tr><td>Annual License Fee (${renewalYearsNum} Year${renewalYearsNum === 1 ? "" : "s"})</td><td class="right">₹ ${formatInrPlain(data.annualLicenseFee)}</td></tr>
      <tr><td>Late Fee</td><td class="right">₹ ${formatInrPlain(data.lateFee)}</td></tr>
      <tr><td>Previous Due</td><td class="right">₹ ${formatInrPlain(data.previousDues)}</td></tr>
      <tr><td>GST @ 18% (on MMF + Application Fee + Annual License Fee + Late Fee + Previous Due)</td><td class="right">₹ ${formatInrPlain(data.gst)}</td></tr>
      <tr class="grand-total"><td>Total Amount Payable to BIS</td><td class="right">₹ ${formatInrPlain(data.total)}</td></tr>
    </tbody>
  </table>`;
}

function productionTableFontSize(rowCount: number): string {
  if (rowCount > 12) return "6.5pt";
  if (rowCount > 8) return "7pt";
  if (rowCount > 5) return "7.5pt";
  return "8pt";
}

/** Print / PDF HTML (no auto-print). */
export function buildRenewalPrintHtml(data: RenewalExportData, opts?: { autoPrint?: boolean }): string {
  const title = `Renewal Application — ${data.clientName}`;
  const prodRows = data.periodRows.length;
  const prodFont = productionTableFontSize(prodRows);
  const autoPrint = opts?.autoPrint === true;
  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Segoe UI", Arial, Helvetica, sans-serif;
        color: #0f172a;
        font-size: 8.5pt;
        line-height: 1.25;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background: #fff;
      }
      .sheet { width: 100%; padding: 2mm; }
      .doc-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 2.5px solid #0369a1;
        padding-bottom: 6px;
        margin-bottom: 8px;
      }
      .doc-header h1 {
        font-size: 14pt;
        margin: 0;
        line-height: 1.15;
        color: #0c4a6e;
        letter-spacing: 0.02em;
      }
      .doc-header .meta { font-size: 8pt; color: #475569; text-align: right; line-height: 1.35; }
      .doc-header .meta strong { color: #0f172a; }
      .section-title {
        font-size: 8.5pt;
        font-weight: 700;
        color: #0c4a6e;
        background: linear-gradient(90deg, #e0f2fe 0%, #f8fafc 100%);
        border-left: 3.5px solid #0284c7;
        padding: 3px 8px;
        margin: 0 0 5px;
      }
      .top-columns {
        display: grid;
        grid-template-columns: 1.4fr 0.6fr;
        gap: 10px;
        margin-bottom: 8px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 5px;
      }
      .info-grid.period-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .info-cell {
        border: 1px solid #cbd5e1;
        border-radius: 3px;
        padding: 3px 6px;
        min-height: 30px;
        background: #fff;
      }
      .info-cell.wide { grid-column: span 2; }
      .info-label {
        font-size: 6.5pt;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 1px;
      }
      .info-value { font-size: 8pt; font-weight: 600; word-break: break-word; color: #0f172a; }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0;
      }
      .data-table th,
      .data-table td {
        border: 1px solid #94a3b8;
        padding: 3px 5px;
        vertical-align: middle;
        word-wrap: break-word;
      }
      .data-table th {
        background: #e2e8f0;
        font-size: 7pt;
        font-weight: 700;
        text-align: center;
        line-height: 1.2;
        color: #1e293b;
      }
      .production-table th,
      .production-table td { font-size: ${prodFont}; }
      .production-table .col-date { width: 8%; }
      .production-table .col-num { width: 10%; }
      .production-table .col-money { width: 12%; }
      .slab-table th,
      .slab-table td { font-size: 7.5pt; }
      .center { text-align: center; }
      .right { text-align: right; font-variant-numeric: tabular-nums; }
      .muted { color: #64748b; font-style: italic; font-size: 7.5pt; }
      .total-row td { background: #f1f5f9; font-weight: 700; }
      .bottom-columns {
        display: grid;
        grid-template-columns: 1.35fr 0.65fr;
        gap: 10px;
        margin-top: 8px;
        align-items: start;
      }
      .summary-table td {
        font-size: 7.5pt;
        padding: 4px 6px;
      }
      .summary-table .grand-total td {
        font-weight: 700;
        font-size: 9pt;
        background: #e0f2fe;
        border-top: 2px solid #0284c7;
        color: #0c4a6e;
      }
      .production-block { margin-bottom: 8px; }
      .footer-note {
        margin-top: 8px;
        font-size: 6.5pt;
        color: #64748b;
        border-top: 1px solid #e2e8f0;
        padding-top: 4px;
        display: flex;
        justify-content: space-between;
      }
      @media print {
        body { zoom: 1; }
        .sheet { page-break-inside: avoid; }
        .production-block,
        .bottom-columns,
        .top-columns { page-break-inside: avoid; }
      }
    </style></head><body>
    <div class="sheet">
      <div class="doc-header">
        <div>
          <h1>Apply for Renewal</h1>
        </div>
        <div class="meta">
          <div><strong>${escapeHtml(data.clientName)}</strong></div>
          <div>${escapeHtml(data.cmLNumber)} · ${escapeHtml(data.isNumber)}</div>
          <div>Generated ${escapeHtml(generatedAt)}</div>
        </div>
      </div>

      <div class="top-columns">
        <div>
          <div class="section-title">License Information</div>
          ${buildLicenseInfoGrid(data)}
        </div>
        <div>
          <div class="section-title">Period Covered by Report</div>
          ${buildPeriodInfoGrid(data)}
        </div>
      </div>

      <div class="production-block">
        <div class="section-title">Production Details (in Tonnes)</div>
        ${buildProductionTableHtml(data, "data-table production-table")}
      </div>

      <div class="bottom-columns">
        <div>
          <div class="section-title">Calculation of Marking Fee (Unit Rate Basis)</div>
          ${buildSlabTableHtml(data, "data-table slab-table")}
        </div>
        <div>
          <div class="section-title">Amount Payable to BIS</div>
          ${buildSummaryTableHtml(data)}
        </div>
      </div>

      <div class="footer-note">
        <span>Consultancy Pro — BIS License Renewal</span>
        <span>${escapeHtml(data.cmLNumber)} · ${escapeHtml(titleOfIsAsPerNumber(data))}</span>
      </div>
    </div>
    ${autoPrint ? "<script>window.onload=function(){window.print();}</script>" : ""}
    </body></html>`;
}

export function openRenewalPrintWindow(data: RenewalExportData): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildRenewalPrintHtml(data, { autoPrint: true }));
  w.document.close();
  return true;
}

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

function renewalFilenameBase(data: RenewalExportData): string {
  return `Renewal_${safeFilePart(data.clientName)}_${data.isNumber.replace(/\s+/g, "")}`;
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF94A3B8" } },
  left: { style: "thin", color: { argb: "FF94A3B8" } },
  bottom: { style: "thin", color: { argb: "FF94A3B8" } },
  right: { style: "thin", color: { argb: "FF94A3B8" } },
};

function styleTitle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 16, color: { argb: "FF0C4A6E" } };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function styleSection(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 11, color: { argb: "FF0C4A6E" } };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2FE" },
  };
  cell.alignment = { vertical: "middle", horizontal: "left" };
}

function styleHeaderRow(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c += 1) {
    const cell = row.getCell(c);
    cell.font = { bold: true, size: 10, color: { argb: "FF1E293B" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
    cell.border = thinBorder;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }
  row.height = 28;
}

function styleLabelValue(labelCell: ExcelJS.Cell, valueCell: ExcelJS.Cell) {
  labelCell.font = { bold: true, size: 10, color: { argb: "FF475569" } };
  labelCell.border = thinBorder;
  labelCell.alignment = { vertical: "middle", horizontal: "left" };
  valueCell.font = { size: 10, color: { argb: "FF0F172A" } };
  valueCell.border = thinBorder;
  valueCell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
}

function styleMoneyCell(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '₹#,##0.00';
  cell.border = thinBorder;
  cell.alignment = { vertical: "middle", horizontal: "right" };
}

function styleQtyCell(cell: ExcelJS.Cell, value: number, decimals: number) {
  cell.value = value;
  cell.numFmt = decimals > 0 ? `#,##0.${"0".repeat(decimals)}` : "#,##0";
  cell.border = thinBorder;
  cell.alignment = { vertical: "middle", horizontal: "right" };
}

function styleDataCell(cell: ExcelJS.Cell, value: string | number, align: "left" | "center" | "right" = "left") {
  cell.value = value;
  cell.border = thinBorder;
  cell.alignment = { vertical: "middle", horizontal: align, wrapText: true };
  cell.font = { size: 10 };
}

/** Full-detail styled Excel workbook for renewal application. */
export async function downloadRenewalExcel(data: RenewalExportData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Consultancy Pro";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Renewal Application", {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  ws.columns = [
    { width: 28 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 20 },
    { width: 22 },
  ];

  let r = 1;

  // Title
  ws.mergeCells(r, 1, r, 7);
  styleTitle(ws.getCell(r, 1));
  ws.getCell(r, 1).value = "Apply for Renewal — BIS License";
  ws.getRow(r).height = 26;
  r += 1;

  ws.mergeCells(r, 1, r, 7);
  ws.getCell(r, 1).value = `${data.clientName}  ·  ${data.cmLNumber}  ·  ${data.isNumber}`;
  ws.getCell(r, 1).font = { size: 10, color: { argb: "FF475569" } };
  r += 2;

  // License Information
  ws.mergeCells(r, 1, r, 7);
  styleSection(ws.getCell(r, 1));
  ws.getCell(r, 1).value = "License Information";
  r += 1;

  const licenseRows: [string, string][] = [
    ["Firm Name", data.clientName],
    ["CM/L Number", data.cmLNumber],
    ["Title of IS as per IS Number", titleOfIsAsPerNumber(data)],
    ["Firm Scale", data.firmScale],
    ["MMF Fee", data.mmfFee],
    ["Unit", data.unit],
    ["Validity", data.validity],
  ];
  for (const [label, value] of licenseRows) {
    styleLabelValue(ws.getCell(r, 1), ws.getCell(r, 2));
    ws.getCell(r, 1).value = label;
    ws.mergeCells(r, 2, r, 7);
    ws.getCell(r, 2).value = value || "—";
    if (label.startsWith("Title")) ws.getRow(r).height = 32;
    r += 1;
  }
  r += 1;

  // Period
  ws.mergeCells(r, 1, r, 7);
  styleSection(ws.getCell(r, 1));
  ws.getCell(r, 1).value = "Period Covered by Report";
  r += 1;

  const periodRows: [string, string | number][] = [
    ["From", fmtDMY(data.periodFrom)],
    ["To", fmtDMY(data.periodTo)],
    ["Unit Rate (₹)", data.unitRate],
    [
      "Period of Renewal",
      `${data.renewalYears} Year${data.renewalYears === "1" ? "" : "s"}`,
    ],
  ];
  for (const [label, value] of periodRows) {
    styleLabelValue(ws.getCell(r, 1), ws.getCell(r, 2));
    ws.getCell(r, 1).value = label;
    ws.mergeCells(r, 2, r, 3);
    if (label.startsWith("Unit Rate") && typeof value === "number") {
      styleMoneyCell(ws.getCell(r, 2), value);
    } else {
      ws.getCell(r, 2).value = value || "—";
    }
    r += 1;
  }
  r += 1;

  // Production
  ws.mergeCells(r, 1, r, 7);
  styleSection(ws.getCell(r, 1));
  ws.getCell(r, 1).value = "Production Details (in Tonnes)";
  r += 1;

  if (data.hasProductionTable && data.periodRows.length > 0) {
    const headerRow = ws.getRow(r);
    const headers = [
      "From Date",
      "To Date",
      "Total Production (Licensed for CM)",
      "Qualitative Rejection",
      "Conforming Production",
      "Approx. Production Value (₹)",
      "Calculated Marking Fee (₹)",
    ];
    headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
    });
    styleHeaderRow(headerRow, 7);
    r += 1;

    for (const row of data.periodRows) {
      styleDataCell(ws.getCell(r, 1), fmtDMY(row.from), "center");
      styleDataCell(ws.getCell(r, 2), fmtDMY(row.to), "center");
      styleQtyCell(ws.getCell(r, 3), row.totalProduction, data.productionDecimals);
      styleQtyCell(ws.getCell(r, 4), row.rejection, data.productionDecimals);
      styleQtyCell(ws.getCell(r, 5), row.conforming, data.productionDecimals);
      styleMoneyCell(ws.getCell(r, 6), row.approxValue);
      styleMoneyCell(ws.getCell(r, 7), row.markingFee);
      r += 1;
    }

    // Totals
    ws.getCell(r, 1).value = "Total";
    ws.getCell(r, 1).font = { bold: true, size: 10 };
    ws.getCell(r, 1).border = thinBorder;
    ws.getCell(r, 1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    ws.getCell(r, 1).alignment = { horizontal: "center", vertical: "middle" };
    ws.mergeCells(r, 1, r, 2);
    ws.getCell(r, 2).border = thinBorder;
    ws.getCell(r, 2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    styleQtyCell(ws.getCell(r, 3), data.productionTotals.totalProduction, data.productionDecimals);
    styleQtyCell(ws.getCell(r, 4), data.productionTotals.rejection, data.productionDecimals);
    styleQtyCell(ws.getCell(r, 5), data.productionTotals.conforming, data.productionDecimals);
    styleMoneyCell(ws.getCell(r, 6), data.productionTotals.approxValue);
    styleMoneyCell(ws.getCell(r, 7), data.productionTotals.markingFee);
    for (let c = 3; c <= 7; c += 1) {
      ws.getCell(r, c).font = { bold: true, size: 10 };
      ws.getCell(r, c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };
    }
    r += 2;
  } else {
    ws.mergeCells(r, 1, r, 7);
    ws.getCell(r, 1).value = "Production table not generated.";
    ws.getCell(r, 1).font = { italic: true, color: { argb: "FF64748B" } };
    r += 2;
  }

  // Marking fee slabs
  ws.mergeCells(r, 1, r, 7);
  styleSection(ws.getCell(r, 1));
  ws.getCell(r, 1).value = "Calculation of Marking Fee (Unit Rate Basis)";
  r += 1;

  const slabHeader = ws.getRow(r);
  ["Slab", "Quantity", "Actual Quantity", "Rate (₹)", "Amount (₹)"].forEach((h, i) => {
    slabHeader.getCell(i + 1).value = h;
  });
  styleHeaderRow(slabHeader, 5);
  r += 1;

  if (data.slabRows.length > 0) {
    for (const s of data.slabRows) {
      styleDataCell(ws.getCell(r, 1), s.label);
      styleDataCell(ws.getCell(r, 2), s.rangeLabel);
      styleQtyCell(ws.getCell(r, 3), s.quantity, 2);
      styleMoneyCell(ws.getCell(r, 4), s.rate);
      styleMoneyCell(ws.getCell(r, 5), s.amount);
      r += 1;
    }
  } else {
    ws.mergeCells(r, 1, r, 5);
    ws.getCell(r, 1).value = "No slab data";
    ws.getCell(r, 1).font = { italic: true, color: { argb: "FF64748B" } };
    r += 1;
  }
  r += 1;

  // Summary
  ws.mergeCells(r, 1, r, 7);
  styleSection(ws.getCell(r, 1));
  ws.getCell(r, 1).value = "Amount Payable to BIS";
  r += 1;

  const renewalYearsNum = Number(data.renewalYears) || 1;
  const summary: [string, number][] = [
    ["Final Marking Fee Based on Production", data.mmf],
    ["Application Fee", data.applicationFee],
    [
      `Annual License Fee (${renewalYearsNum} Year${renewalYearsNum === 1 ? "" : "s"})`,
      data.annualLicenseFee,
    ],
    ["Late Fee", data.lateFee],
    ["Previous Due", data.previousDues],
    ["GST @ 18%", data.gst],
  ];
  for (const [label, value] of summary) {
    styleLabelValue(ws.getCell(r, 1), ws.getCell(r, 2));
    ws.mergeCells(r, 1, r, 4);
    ws.getCell(r, 1).value = label;
    ws.mergeCells(r, 5, r, 6);
    styleMoneyCell(ws.getCell(r, 5), value);
    r += 1;
  }

  // Grand total
  styleLabelValue(ws.getCell(r, 1), ws.getCell(r, 2));
  ws.mergeCells(r, 1, r, 4);
  ws.getCell(r, 1).value = "Total Amount Payable to BIS";
  ws.getCell(r, 1).font = { bold: true, size: 12, color: { argb: "FF0C4A6E" } };
  ws.getCell(r, 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2FE" },
  };
  ws.mergeCells(r, 5, r, 6);
  styleMoneyCell(ws.getCell(r, 5), data.total);
  ws.getCell(r, 5).font = { bold: true, size: 12, color: { argb: "FF0C4A6E" } };
  ws.getCell(r, 5).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0F2FE" },
  };
  r += 2;

  ws.mergeCells(r, 1, r, 7);
  ws.getCell(r, 1).value = `Generated by Consultancy Pro · ${new Date().toLocaleString("en-IN")}`;
  ws.getCell(r, 1).font = { size: 8, italic: true, color: { argb: "FF64748B" } };

  const buffer = await workbook.xlsx.writeBuffer();
  triggerBlobDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${renewalFilenameBase(data)}.xlsx`,
  );
}

export function renewalExportFilenameBase(data: RenewalExportData): string {
  return renewalFilenameBase(data);
}
