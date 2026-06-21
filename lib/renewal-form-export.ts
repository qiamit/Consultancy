import * as XLSX from "xlsx";

export type RenewalExportPeriodRow = {
  from: string;
  to: string;
  totalProduction: number;
  rejection: number;
  conforming: number;
  approxValue: number;
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
  firmAddress: string;
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
  };
  slabRows: RenewalExportSlabRow[];
  mmf: number;
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
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
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

function infoField(label: string, value: string, wide = false): string {
  return `<div class="info-cell${wide ? " wide" : ""}"><div class="info-label">${escapeHtml(label)}</div><div class="info-value">${escapeHtml(value || "—")}</div></div>`;
}

function buildLicenseInfoGrid(data: RenewalExportData): string {
  return `<div class="info-grid">
    ${infoField("Firm Name", data.clientName, true)}
    ${infoField("IS Number", data.isNumber)}
    ${infoField("CM/L Number", data.cmLNumber)}
    ${infoField("Title of IS", data.isTitle, true)}
    ${infoField("Address of the Firm", data.firmAddress, true)}
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
  return `<table class="data-table summary-table">
    <tbody>
      <tr><td>Final Marking Fee Based on Production</td><td class="right">₹ ${formatInrPlain(data.mmf)}</td></tr>
      <tr><td>Late Fee</td><td class="right">₹ ${formatInrPlain(data.lateFee)}</td></tr>
      <tr><td>Previous Due</td><td class="right">₹ ${formatInrPlain(data.previousDues)}</td></tr>
      <tr><td>GST @ 18%</td><td class="right">₹ ${formatInrPlain(data.gst)}</td></tr>
      <tr class="grand-total"><td>Total Payable to BIS</td><td class="right">₹ ${formatInrPlain(data.total)}</td></tr>
    </tbody>
  </table>`;
}

function productionTableFontSize(rowCount: number): string {
  if (rowCount > 12) return "6pt";
  if (rowCount > 8) return "6.5pt";
  if (rowCount > 5) return "7pt";
  return "7.5pt";
}

export function buildRenewalPrintHtml(data: RenewalExportData): string {
  const title = `Renewal Application — ${data.clientName}`;
  const prodRows = data.periodRows.length;
  const prodFont = productionTableFontSize(prodRows);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 7mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: Arial, Helvetica, sans-serif;
        color: #111;
        font-size: 8pt;
        line-height: 1.2;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sheet { width: 100%; padding: 0; }
      .doc-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 2px solid #0284c7;
        padding-bottom: 4px;
        margin-bottom: 6px;
      }
      .doc-header h1 { font-size: 13pt; margin: 0; line-height: 1.1; }
      .doc-header .meta { font-size: 8pt; color: #555; text-align: right; }
      .section-title {
        font-size: 8pt;
        font-weight: 700;
        color: #1e3a5f;
        background: #eef6fc;
        border-left: 3px solid #0284c7;
        padding: 2px 6px;
        margin: 0 0 4px;
      }
      .top-columns {
        display: grid;
        grid-template-columns: 1.35fr 0.65fr;
        gap: 8px;
        margin-bottom: 6px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 4px;
      }
      .info-grid.period-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .info-cell {
        border: 1px solid #ccc;
        border-radius: 2px;
        padding: 2px 5px;
        min-height: 28px;
        background: #fff;
      }
      .info-cell.wide { grid-column: span 2; }
      .info-label {
        font-size: 6.5pt;
        font-weight: 700;
        color: #666;
        text-transform: none;
        margin-bottom: 1px;
      }
      .info-value { font-size: 7.5pt; font-weight: 600; word-break: break-word; }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0;
      }
      .data-table th,
      .data-table td {
        border: 1px solid #bbb;
        padding: 2px 4px;
        vertical-align: middle;
        word-wrap: break-word;
      }
      .data-table th {
        background: #f4f4f5;
        font-size: 6.5pt;
        font-weight: 700;
        text-align: center;
        line-height: 1.15;
      }
      .production-table th,
      .production-table td { font-size: ${prodFont}; }
      .production-table .col-date { width: 7%; }
      .production-table .col-num { width: 10%; }
      .production-table .col-money { width: 12%; }
      .slab-table th,
      .slab-table td { font-size: 7pt; }
      .center { text-align: center; }
      .right { text-align: right; }
      .muted { color: #777; font-style: italic; font-size: 7pt; }
      .total-row td { background: #fafafa; font-weight: 700; }
      .bottom-columns {
        display: grid;
        grid-template-columns: 1.4fr 0.6fr;
        gap: 8px;
        margin-top: 6px;
        align-items: start;
      }
      .summary-table td {
        font-size: 7pt;
        padding: 3px 5px;
      }
      .summary-table .grand-total td {
        font-weight: 700;
        font-size: 8pt;
        background: #eef6fc;
        border-top: 2px solid #0284c7;
      }
      .production-block { margin-bottom: 6px; }
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
        <h1>Apply for Renewal</h1>
        <div class="meta">${escapeHtml(data.clientName)} · ${escapeHtml(data.isNumber)} · ${escapeHtml(data.cmLNumber)}</div>
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
    </div>

    <script>window.onload=function(){window.print();}</script>
    </body></html>`;
}

export function openRenewalPrintWindow(data: RenewalExportData): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildRenewalPrintHtml(data));
  w.document.close();
  return true;
}

function safeFilePart(value: string): string {
  return value.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 60);
}

export function downloadRenewalExcel(data: RenewalExportData): void {
  const rows: (string | number)[][] = [];

  rows.push(["Apply for Renewal"]);
  rows.push([data.clientName, data.isNumber, data.cmLNumber]);
  rows.push([]);

  rows.push(["License Information"]);
  rows.push(["Field", "Value"]);
  rows.push(["Firm Name", data.clientName]);
  rows.push(["IS Number", data.isNumber]);
  rows.push(["CM/L Number", data.cmLNumber]);
  rows.push(["Title of IS", data.isTitle]);
  rows.push(["Address of the Firm", data.firmAddress]);
  rows.push(["Firm Scale", data.firmScale]);
  rows.push(["MMF Fee", data.mmfFee]);
  rows.push(["Unit", data.unit]);
  rows.push(["Validity", data.validity]);
  rows.push([]);

  rows.push(["Period Covered by Report"]);
  rows.push(["From", fmtDMY(data.periodFrom)]);
  rows.push(["To", fmtDMY(data.periodTo)]);
  rows.push(["Unit Rate (₹)", data.unitRate]);
  rows.push(["Period of Renewal", `${data.renewalYears} Year${data.renewalYears === "1" ? "" : "s"}`]);
  rows.push([]);

  rows.push(["Production Details (in Tonnes)"]);
  if (data.hasProductionTable && data.periodRows.length > 0) {
    rows.push([
      "From Date",
      "To Date",
      "Total Production (Licensed for CM)",
      "Qualitative Rejection",
      "Conforming to Indian Standards",
      "Approx. Production Value (₹)",
    ]);
    for (const r of data.periodRows) {
      rows.push([
        fmtDMY(r.from),
        fmtDMY(r.to),
        r.totalProduction,
        r.rejection,
        r.conforming,
        r.approxValue,
      ]);
    }
    rows.push([
      "Total",
      "",
      data.productionTotals.totalProduction,
      data.productionTotals.rejection,
      data.productionTotals.conforming,
      data.productionTotals.approxValue,
    ]);
  } else {
    rows.push(["Production table not generated"]);
  }
  rows.push([]);

  rows.push(["Calculation of Marking Fee (Unit Rate Basis)"]);
  rows.push(["Slab", "Quantity", "Actual Quantity", "Rate (₹)", "Amount (₹)"]);
  if (data.slabRows.length > 0) {
    for (const s of data.slabRows) {
      rows.push([s.label, s.rangeLabel, s.quantity, s.rate, s.amount]);
    }
  } else {
    rows.push(["No slab data"]);
  }
  rows.push([]);

  rows.push(["Summary"]);
  rows.push(["Final Marking Fee Based on Production", data.mmf]);
  rows.push(["Late Fee", data.lateFee]);
  rows.push(["Previous Due", data.previousDues]);
  rows.push(["GST @ 18%", data.gst]);
  rows.push(["Total Amount Payable to BIS", data.total]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 42 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Renewal Application");

  const filename = `Renewal_${safeFilePart(data.clientName)}_${data.isNumber.replace(/\s+/g, "")}.xlsx`;
  XLSX.writeFile(wb, filename);
}
