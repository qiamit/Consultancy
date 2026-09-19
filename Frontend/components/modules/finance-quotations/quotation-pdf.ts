"use client";

import { formatDisplayDate } from "@backend/shared/format-date";
import type { ProductMasterOptionRow } from "@backend/shared/types/finance-quotation";
import {
  DEFAULT_PRINT_SETTINGS,
  type PrintSettings,
} from "@backend/modules/print/types";
import type { QuotationFormState, QuotationLineForm } from "./constants";

export type QuotationPdfClient = {
  name: string;
  company_name: string | null;
  gst_number: string | null;
  contact_person_name: string | null;
  email: string | null;
  phone_country_code: string | null;
  phone: string | null;
  address: string | null;
  pin_code: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
};

export type QuotationPdfInput = {
  form: QuotationFormState;
  quotationNumber: string;
  client: QuotationPdfClient | null;
  productById?: Map<string, ProductMasterOptionRow>;
  printSettings?: PrintSettings;
  sealSignImageUrl?: string | null;
  letterheadUpperImageUrl?: string | null;
  letterheadLowerImageUrl?: string | null;
};

function parseGstPercent(raw: string): number {
  const m = String(raw ?? "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.min(n, 100) : 0;
}

function linePreview(L: QuotationLineForm) {
  const qty = Math.max(0, Number(L.qty) || 0);
  const rate = Math.max(0, Number(L.unit_rate) || 0);
  const gross = Math.round(qty * rate * 100) / 100;
  const discPct = parseGstPercent(L.line_discount);
  const discAmt = Math.round(gross * (discPct / 100) * 100) / 100;
  const sub = Math.max(0, Math.round((gross - discAmt) * 100) / 100);
  const tax = Math.round(sub * (parseGstPercent(L.gst_rate) / 100) * 100) / 100;
  const tot = Math.round((sub + tax) * 100) / 100;
  return { sub, tax, tot };
}

function numberToIndianWords(amount: number): string {
  const ones = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];

  function twoDigit(n: number): string {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ""}`.trim();
  }

  function threeDigit(n: number): string {
    const h = Math.floor(n / 100);
    const r = n % 100;
    if (!h) return twoDigit(r);
    return `${ones[h]} hundred${r ? ` ${twoDigit(r)}` : ""}`;
  }

  function integerToWords(n: number): string {
    if (n === 0) return "zero";
    const crore = Math.floor(n / 10000000);
    const lakh = Math.floor((n % 10000000) / 100000);
    const thousand = Math.floor((n % 100000) / 1000);
    const hundred = n % 1000;
    const parts: string[] = [];
    if (crore) parts.push(`${twoDigit(crore)} crore`);
    if (lakh) parts.push(`${twoDigit(lakh)} lakh`);
    if (thousand) parts.push(`${twoDigit(thousand)} thousand`);
    if (hundred) parts.push(threeDigit(hundred));
    return parts.join(" ").trim();
  }

  const safe = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const rupees = Math.floor(safe);
  const paise = Math.round((safe - rupees) * 100);
  const rupeesWords = integerToWords(rupees);
  const paiseWords = paise ? ` and ${integerToWords(paise)} paise` : "";
  return `Rupees ${rupeesWords}${paiseWords} only`;
}

function toInr(n: number): string {
  return Number(n || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function esc(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nl2br(v: string): string {
  return esc(v).replaceAll("\n", "<br/>");
}

function computeTotals(lines: QuotationLineForm[]) {
  let basic = 0;
  let gst = 0;
  let grand = 0;
  for (const L of lines) {
    const pv = linePreview(L);
    basic += pv.sub;
    gst += pv.tax;
    grand += pv.tot;
  }
  return {
    basic: Math.round(basic * 100) / 100,
    gst: Math.round(gst * 100) / 100,
    grand: Math.round(grand * 100) / 100,
  };
}

export function buildQuotationDocumentParts(input: QuotationPdfInput): {
  styles: string;
  docInner: string;
} {
  const {
    form,
    quotationNumber,
    client,
    productById = new Map(),
    printSettings = DEFAULT_PRINT_SETTINGS,
    sealSignImageUrl = null,
  } = input;

  const totalsPreview = computeTotals(form.lines);
  const hasDiscount = form.lines.some((l) => {
    const d = parseFloat(String(l.line_discount ?? "0").replace("%", "").trim());
    return Number.isFinite(d) && d > 0;
  });
  const cellPad = printSettings.table_compact ? "4px 7px" : "6px 7px";
  const clientAddress = [
    client?.address,
    client?.city,
    client?.state,
    client?.pin_code,
    client?.country,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(", ");

  const lineRows = form.lines
    .map((line, idx) => {
      const pv = linePreview(line);
      const product = productById.get(line.product_master_item_id);
      const descText = printSettings.table_show_description
        ? product?.description?.trim() || ""
        : "";
      const nameCell = descText
        ? `<div style="font-weight:600">${esc(line.item_description || "-")}</div><div style="font-size:10px;color:#6b7280;margin-top:2px">${esc(descText)}</div>`
        : `<div style="font-weight:600">${esc(line.item_description || "-")}</div>`;
      return `<tr>
          <td style="text-align:center;width:28px;padding:${cellPad}">${idx + 1}</td>
          <td style="padding:${cellPad}">${nameCell}</td>
          <td style="text-align:center;padding:${cellPad}">${esc(line.unit_of_item || "-")}</td>
          <td style="text-align:center;padding:${cellPad}">${esc(line.qty || "0")}</td>
          <td style="text-align:right;padding:${cellPad}">${toInr(Number(line.unit_rate) || 0)}</td>
          ${hasDiscount ? `<td style="text-align:center;padding:${cellPad}">${esc(line.line_discount || "0%")}</td>` : ""}
          <td style="text-align:right;padding:${cellPad}">${toInr(pv.sub)}</td>
          <td style="text-align:right;font-weight:600;padding:${cellPad}">${toInr(pv.tot)}</td>
        </tr>`;
    })
    .join("");

  const S = {
    border: "1px solid #d1d5db",
    borderDark: "2px solid #1e3a8a",
    labelStyle:
      "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:3px",
    valueStyle: "font-size:11px;line-height:1.55;color:#111",
    sectionPad: "padding:10px 12px",
    cellLeft:
      "display:table-cell;width:60%;vertical-align:top;padding:10px 12px;border-right:1px solid #d1d5db",
    cellRight: "display:table-cell;width:40%;vertical-align:top;padding:10px 12px",
  };

  const styles = `
  @page { size: A4; margin: 10mm; }
  body,.finance-quotation-pdf-mount{font-family:Arial,sans-serif;color:#111;margin:0}
  .doc{max-width:190mm;margin:0 auto}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#eef2fb;color:#1e3a8a;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:6px 7px;border:1px solid #c7d2f0}
  td{padding:6px 7px;border:1px solid #e5e7eb;vertical-align:top}
  tr:nth-child(even) td{background:#fafbff}
  tfoot th{background:#dde5f8;font-size:11px}
  .right{text-align:right}.center{text-align:center}
  .headimg{width:100%;max-height:90px;object-fit:contain;display:block}`;

  const docInner = `
  <!-- QUOTATION TITLE -->
  <div style="text-align:center;padding:10px 12px 8px;border-bottom:${S.borderDark};background:#f0f4ff">
    <div style="font-size:${printSettings.title_font_size}px;font-weight:900;letter-spacing:4px;color:#1e3a8a;text-transform:uppercase;line-height:1">QUOTATION</div>
  </div>

  <!-- CLIENT + QUOTATION DETAILS (2-col) -->
  <div style="display:table;width:100%;table-layout:fixed;border-collapse:collapse;border-bottom:${S.border}">
    <div style="${S.cellLeft}">
      <div style="${S.labelStyle}">Client Details</div>
      <div style="${S.valueStyle}">
        <div style="font-size:13px;font-weight:800;color:#111;margin-bottom:4px">${esc(client?.company_name?.trim() || client?.name?.trim() || "-")}</div>
        <b>Address:</b> ${esc(clientAddress || "-")}<br/>
        <div style="display:table;width:100%;margin-top:6px;font-size:10px;color:#555;border-top:1px solid #e5e7eb;padding-top:5px">
          <div style="display:table-row">
            <div style="display:table-cell;padding:2px 8px 2px 0;white-space:nowrap"><span style="font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">GST:</span> ${esc(client?.gst_number?.trim() || "-")}</div>
            <div style="display:table-cell;padding:2px 0;white-space:nowrap"><span style="font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">Contact:</span> ${esc(client?.contact_person_name?.trim() || client?.name?.trim() || "-")}</div>
          </div>
          <div style="display:table-row">
            <div style="display:table-cell;padding:2px 8px 2px 0;white-space:nowrap"><span style="font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">Email:</span> ${esc(client?.email?.trim() || "-")}</div>
            <div style="display:table-cell;padding:2px 0;white-space:nowrap"><span style="font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">Mobile:</span> ${esc(([String(client?.phone_country_code ?? "").trim(), String(client?.phone ?? "").trim()].filter(Boolean).join(" ")) || "-")}</div>
          </div>
        </div>
      </div>
    </div>
    <div style="${S.cellRight};text-align:right">
      <div style="border-bottom:1px solid #e5e7eb;margin-bottom:8px;padding-bottom:4px"></div>
      <div style="font-size:10px;color:#555;line-height:1.9">
        <div><span style="font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;margin-right:6px">Quot. No.</span><span style="font-size:13px;font-weight:800;font-family:monospace;color:#1e3a8a">${esc(quotationNumber || "-")}</span></div>
        <div><span style="font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;margin-right:6px">Date:</span>${esc(formatDisplayDate(form.quotation_date, "-"))}</div>
        <div><span style="font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;margin-right:6px">Valid Until:</span>${esc(formatDisplayDate(form.expiry_date, "-"))}</div>
      </div>
    </div>
  </div>

  <!-- PRODUCT TABLE -->
  <div style="${S.sectionPad};border-bottom:${S.border}">
    <div style="${S.labelStyle};margin-bottom:6px">Product &amp; Services</div>
    <table>
      <thead><tr>
        <th style="text-align:center;width:28px;font-weight:800">Sr.</th>
        <th style="text-align:center;font-weight:800">Name of Product</th>
        <th style="text-align:center;font-weight:800">Unit</th>
        <th style="text-align:center;font-weight:800">Qty</th>
        <th style="text-align:center;font-weight:800">Rate</th>
        ${hasDiscount ? `<th style="text-align:center;font-weight:800">Discount</th>` : ""}
        <th style="text-align:center;font-weight:800">Taxable Value</th>
        <th style="text-align:center;font-weight:800">Total</th>
      </tr></thead>
      <tbody>${lineRows}</tbody>
      <tfoot>
        <tr><th colspan="${hasDiscount ? 6 : 5}" style="text-align:right;font-size:10px;font-weight:600;color:#555">Subtotal</th><th style="text-align:right">${toInr(totalsPreview.basic)}</th><th style="text-align:right">${toInr(totalsPreview.grand)}</th></tr>
      </tfoot>
    </table>
    <!-- GST SUMMARY -->
    <div style="display:table;width:100%;margin-top:8px">
      <div style="display:table-cell;width:60%;vertical-align:top;padding-right:12px">
        <div style="font-size:10px;color:#6b7280;font-style:italic">All amounts are inclusive of applicable GST as per line items.</div>
        <div style="margin-top:6px;font-size:10px;color:#444;font-style:italic"><b>Amount in Words:</b> ${esc(numberToIndianWords(totalsPreview.grand))}</div>
      </div>
      <div style="display:table-cell;width:40%;vertical-align:top">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <tbody>
            <tr><td style="border:none;padding:3px 8px;text-align:right;color:#555">Taxable Amount</td><td style="border:none;padding:3px 0;text-align:right;font-weight:600">${toInr(totalsPreview.basic)}</td></tr>
            <tr><td style="border:none;padding:3px 8px;text-align:right;color:#555">GST Amount</td><td style="border:none;padding:3px 0;text-align:right;font-weight:600">${toInr(totalsPreview.gst)}</td></tr>
            <tr style="border-top:2px solid #1e3a8a"><td style="border:none;padding:5px 8px;text-align:right;font-size:13px;font-weight:800;color:#1e3a8a">Grand Total</td><td style="border:none;padding:5px 0;text-align:right;font-size:13px;font-weight:800;color:#1e3a8a">${toInr(totalsPreview.grand)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- BOTTOM 2-COL: Left = Scope 70% | Right = Term+Notes+Bank 30% -->
  <div style="display:table;width:100%;table-layout:fixed;border-collapse:collapse;border-bottom:${S.border}">
    <div style="display:table-cell;width:55%;vertical-align:top;padding:10px 12px;border-right:1px solid #d1d5db">
      <div style="${S.labelStyle}">Scope of Works</div>
      <div style="${S.valueStyle}">${nl2br(form.scope_of_work || "-")}</div>
    </div>
    <div style="display:table-cell;width:45%;vertical-align:top;padding:10px 12px">
      <div style="${S.labelStyle}">Term &amp; Conditions</div>
      <div style="${S.valueStyle};margin-bottom:12px">${nl2br(form.terms_and_conditions || "-")}</div>
      <div style="${S.labelStyle}">Notes</div>
      <div style="${S.valueStyle};margin-bottom:12px">${nl2br(form.notes || "-")}</div>
      <div style="${S.labelStyle}">Bank Details</div>
      <div style="${S.valueStyle};margin-bottom:12px">${nl2br(form.bank_details || "-")}</div>
      ${
        sealSignImageUrl
          ? `<div style="text-align:right;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb"><img style="max-width:180px;max-height:80px;object-fit:contain" src="${sealSignImageUrl}" alt="Seal and sign"/><div style="font-size:10px;color:#666;margin-top:4px">Authorised Signatory</div></div>`
          : ""
      }
    </div>
  </div>
  `;

  return { styles, docInner };
}

function waitForImages(root: HTMLElement): Promise<void[]> {
  const imgs = [...root.querySelectorAll("img")];
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          window.setTimeout(done, 4000);
        }),
    ),
  );
}

/** Build a formatted quotation PDF blob (same layout as the quotation form Download). */
export async function createQuotationPdfBlob(
  input: QuotationPdfInput,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("PDF download is only available in the browser.");
  }

  const html2pdf = (await import("html2pdf.js")).default;
  const { styles, docInner } = buildQuotationDocumentParts(input);
  const quotationNumber = (input.quotationNumber || "quotation").trim() || "quotation";
  const upper = input.letterheadUpperImageUrl?.trim() || "";
  const lower = input.letterheadLowerImageUrl?.trim() || "";

  const mount = document.createElement("div");
  mount.className = "finance-quotation-pdf-mount";
  mount.style.cssText =
    "position:fixed;left:0;top:0;width:210mm;opacity:0;pointer-events:none;z-index:-1;";
  mount.innerHTML = `<style>${styles}</style><div class="doc">${
    upper ? `<img class="headimg" src="${upper}" alt="Letterhead"/>` : ""
  }${docInner}${
    lower ? `<img class="headimg" src="${lower}" alt="Footer letterhead"/>` : ""
  }</div>`;
  document.body.appendChild(mount);

  const target = mount.querySelector(".doc") as HTMLElement | null;
  if (!target) {
    mount.remove();
    throw new Error("Quotation PDF mount missing .doc root");
  }

  try {
    await waitForImages(target);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    const blob = (await html2pdf()
      .from(target)
      .set({
        margin: [6, 6, 6, 6],
        filename: `${quotationNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .outputPdf("blob")) as Blob;
    return blob;
  } finally {
    mount.remove();
  }
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadQuotationPdf(
  input: QuotationPdfInput,
): Promise<void> {
  const blob = await createQuotationPdfBlob(input);
  const name = `${(input.quotationNumber || "quotation").trim() || "quotation"}.pdf`;
  triggerBlobDownload(blob, name);
}
