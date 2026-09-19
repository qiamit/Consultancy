"use client";

import { formatDisplayDate } from "@backend/shared/format-date";
import {
  buildLetterheadHtml,
} from "@backend/modules/print/engine";
import type { ProductMasterOptionRow } from "@backend/shared/types/finance-quotation";
import type { FinanceQuotationRow } from "@backend/shared/types/finance-quotation";
import {
  DEFAULT_PRINT_SETTINGS,
  type PrintCompanyInfo,
  type PrintSettings,
} from "@backend/modules/print/types";
import {
  emptyLine,
  rowToForm,
  type QuotationFormState,
  type QuotationLineForm,
} from "./constants";

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

export type QuotationPdfStoredTotals = {
  basic: number;
  gst: number;
  grand: number;
};

export type QuotationPdfInput = {
  form: QuotationFormState;
  quotationNumber: string;
  client: QuotationPdfClient | null;
  productById?: Map<string, ProductMasterOptionRow>;
  printSettings?: PrintSettings;
  printCompany?: PrintCompanyInfo | null;
  sealSignImageUrl?: string | null;
  letterheadUpperImageUrl?: string | null;
  letterheadLowerImageUrl?: string | null;
  /** Prefer DB header totals when line math is empty/zero. */
  storedTotals?: QuotationPdfStoredTotals | null;
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
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
  ];
  const tens = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
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

function resolveTotals(
  lines: QuotationLineForm[],
  stored?: QuotationPdfStoredTotals | null,
) {
  const calc = computeTotals(lines);
  if (calc.grand > 0) return calc;
  if (stored && Number(stored.grand) > 0) {
    return {
      basic: Math.round(Number(stored.basic) * 100) / 100,
      gst: Math.round(Number(stored.gst) * 100) / 100,
      grand: Math.round(Number(stored.grand) * 100) / 100,
    };
  }
  return calc;
}

/** Enrich blank line descriptions from product master. */
function enrichLines(
  lines: QuotationLineForm[],
  productById: Map<string, ProductMasterOptionRow>,
): QuotationLineForm[] {
  return lines.map((line) => {
    const product = line.product_master_item_id
      ? productById.get(line.product_master_item_id)
      : undefined;
    if (!product) return line;
    return {
      ...line,
      item_description:
        line.item_description.trim() || product.name || line.item_description,
      unit_of_item: line.unit_of_item.trim() || product.unit_of_item || line.unit_of_item,
      unit_rate:
        Number(line.unit_rate) > 0
          ? line.unit_rate
          : String(product.sale_price ?? line.unit_rate),
      gst_rate:
        line.gst_rate.trim() && line.gst_rate !== "0%"
          ? line.gst_rate
          : product.gst_rate || line.gst_rate,
    };
  });
}

async function urlToDataUrl(url: string | null | undefined): Promise<string | null> {
  const src = url?.trim();
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, { mode: "cors", credentials: "omit" });
    if (!res.ok) return src;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || src));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

function waitForImages(root: ParentNode): Promise<void[]> {
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
          window.setTimeout(done, 5000);
        }),
    ),
  );
}

function buildCompanyFromInput(input: QuotationPdfInput): PrintCompanyInfo {
  const base = input.printCompany ?? {
    name: "Quality Engineering",
    address: "",
    city: "",
    state: "",
    pin_code: "",
    country: "",
    gst_number: "",
    email: "",
    phone: "",
    contact_person: "",
    website: "",
    logo_url: null,
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
  return {
    ...base,
    letterhead_upper_url:
      input.letterheadUpperImageUrl ?? base.letterhead_upper_url,
    letterhead_lower_url:
      input.letterheadLowerImageUrl ?? base.letterhead_lower_url,
    seal_sign_url: input.sealSignImageUrl ?? base.seal_sign_url,
  };
}

export function buildQuotationBodyHtml(input: QuotationPdfInput): {
  styles: string;
  bodyHtml: string;
} {
  const settings = input.printSettings ?? DEFAULT_PRINT_SETTINGS;
  const productById = input.productById ?? new Map();
  const lines = enrichLines(input.form.lines, productById).filter((l, idx, arr) => {
    // Keep at least one line; drop trailing blank-only extras
    const blank =
      !l.item_description.trim() &&
      !l.product_master_item_id &&
      !(Number(l.unit_rate) > 0);
    if (!blank) return true;
    return arr.length === 1 && idx === 0;
  });
  const form = { ...input.form, lines: lines.length ? lines : [emptyLine()] };
  const totals = resolveTotals(form.lines, input.storedTotals);
  const quotationNumber = input.quotationNumber;
  const client = input.client;
  const sealSignImageUrl = input.sealSignImageUrl ?? null;
  const primary = settings.primary_color || "#0f4c81";

  const hasDiscount = form.lines.some((l) => {
    const d = parseFloat(String(l.line_discount ?? "0").replace("%", "").trim());
    return Number.isFinite(d) && d > 0;
  });
  const cellPad = settings.table_compact ? "5px 6px" : "7px 8px";
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
      const descText = settings.table_show_description
        ? product?.description?.trim() || ""
        : "";
      const nameCell = descText
        ? `<div style="font-weight:600;color:#111">${esc(line.item_description || "-")}</div><div style="font-size:10px;color:#64748b;margin-top:2px">${esc(descText)}</div>`
        : `<div style="font-weight:600;color:#111">${esc(line.item_description || "-")}</div>`;
      return `<tr>
          <td style="text-align:center;width:28px;padding:${cellPad};color:#111;background:#fff">${idx + 1}</td>
          <td style="padding:${cellPad};background:#fff">${nameCell}</td>
          <td style="text-align:center;padding:${cellPad};color:#111;background:#fff">${esc(line.unit_of_item || "-")}</td>
          <td style="text-align:center;padding:${cellPad};color:#111;background:#fff">${esc(line.qty || "0")}</td>
          <td style="text-align:right;padding:${cellPad};color:#111;background:#fff">${toInr(Number(line.unit_rate) || 0)}</td>
          ${hasDiscount ? `<td style="text-align:center;padding:${cellPad};color:#111;background:#fff">${esc(line.line_discount || "0%")}</td>` : ""}
          <td style="text-align:right;padding:${cellPad};color:#111;background:#fff">${toInr(pv.sub)}</td>
          <td style="text-align:right;font-weight:700;padding:${cellPad};color:#111;background:#fff">${toInr(pv.tot)}</td>
        </tr>`;
    })
    .join("");

  const styles = `
    * { box-sizing: border-box; }
    html, body {
      margin: 0; padding: 0;
      background: #ffffff !important;
      color: #111111 !important;
      color-scheme: light !important;
      font-family: Arial, Helvetica, sans-serif;
    }
    .doc {
      width: 190mm;
      max-width: 190mm;
      margin: 0 auto;
      background: #ffffff !important;
      color: #111111 !important;
    }
    .lh-wrap { border-bottom: 2.5px solid ${esc(primary)}; margin-bottom: 0; }
    .lh-wrap img { width: 100%; max-height: 96px; object-fit: contain; display: block; }
    table { width: 100%; border-collapse: collapse; background: #fff !important; }
    th {
      background: #e8eef7 !important;
      color: ${esc(primary)} !important;
      font-size: 9.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .04em;
      padding: 7px 8px; border: 1px solid #c5d0e6 !important;
    }
    td {
      background: #ffffff !important;
      color: #111111 !important;
      border: 1px solid #dbe3f0 !important;
      vertical-align: top;
    }
    .foot-img { width: 100%; max-height: 72px; object-fit: contain; display: block; margin-top: 8px; }
  `;

  const bodyHtml = `
  <div class="title-bar" style="text-align:center;padding:12px 10px 10px;background:linear-gradient(180deg,#f4f7fc 0%,#ffffff 100%);border-bottom:1px solid #dbe3f0">
    <div style="font-size:${Math.max(18, Math.min(settings.title_font_size, 28))}px;font-weight:900;letter-spacing:3px;color:${esc(primary)};text-transform:uppercase;line-height:1.1">QUOTATION</div>
  </div>

  <div style="display:table;width:100%;table-layout:fixed;border-bottom:1px solid #dbe3f0">
    <div style="display:table-cell;width:58%;vertical-align:top;padding:12px 12px;border-right:1px solid #dbe3f0">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${esc(primary)};margin-bottom:6px">Bill To</div>
      <div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:4px">${esc(client?.company_name?.trim() || client?.name?.trim() || "-")}</div>
      <div style="font-size:11px;line-height:1.55;color:#334155">${esc(clientAddress || "-")}</div>
      <div style="margin-top:8px;font-size:10.5px;color:#475569;line-height:1.7">
        <div><span style="font-weight:700;color:#64748b">GSTIN:</span> ${esc(client?.gst_number?.trim() || "-")}</div>
        <div><span style="font-weight:700;color:#64748b">Contact:</span> ${esc(client?.contact_person_name?.trim() || client?.name?.trim() || "-")}</div>
        <div><span style="font-weight:700;color:#64748b">Email:</span> ${esc(client?.email?.trim() || "-")}</div>
        <div><span style="font-weight:700;color:#64748b">Mobile:</span> ${esc(([String(client?.phone_country_code ?? "").trim(), String(client?.phone ?? "").trim()].filter(Boolean).join(" ")) || "-")}</div>
      </div>
    </div>
    <div style="display:table-cell;width:42%;vertical-align:top;padding:12px 12px;background:#f8fafc">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${esc(primary)};margin-bottom:8px">Quotation Details</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="border:none !important;padding:4px 0;font-size:10px;color:#64748b;font-weight:700;width:42%">Quot. No.</td>
          <td style="border:none !important;padding:4px 0;font-size:13px;font-weight:800;font-family:ui-monospace,monospace;color:${esc(primary)};text-align:right">${esc(quotationNumber || "-")}</td>
        </tr>
        <tr>
          <td style="border:none !important;padding:4px 0;font-size:10px;color:#64748b;font-weight:700">Date</td>
          <td style="border:none !important;padding:4px 0;font-size:12px;font-weight:600;color:#0f172a;text-align:right">${esc(formatDisplayDate(form.quotation_date, "-"))}</td>
        </tr>
        <tr>
          <td style="border:none !important;padding:4px 0;font-size:10px;color:#64748b;font-weight:700">Valid Until</td>
          <td style="border:none !important;padding:4px 0;font-size:12px;font-weight:600;color:#0f172a;text-align:right">${esc(formatDisplayDate(form.expiry_date, "-"))}</td>
        </tr>
        <tr>
          <td style="border:none !important;padding:4px 0;font-size:10px;color:#64748b;font-weight:700">Type</td>
          <td style="border:none !important;padding:4px 0;font-size:12px;font-weight:600;color:#0f172a;text-align:right;text-transform:capitalize">${esc(form.quotation_type || "-")}</td>
        </tr>
      </table>
    </div>
  </div>

  <div style="padding:12px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${esc(primary)};margin-bottom:8px">Product &amp; Services</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:center;width:28px">Sr.</th>
          <th style="text-align:left">Description</th>
          <th style="text-align:center">Unit</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Rate</th>
          ${hasDiscount ? `<th style="text-align:center">Disc.</th>` : ""}
          <th style="text-align:right">Taxable</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <div style="display:table;width:100%;margin-top:10px">
      <div style="display:table-cell;width:55%;vertical-align:top;padding-right:14px">
        <div style="font-size:10px;color:#64748b;font-style:italic;line-height:1.5">Amounts include applicable GST as per line items.</div>
        <div style="margin-top:8px;font-size:11px;color:#0f172a;line-height:1.45"><b>Amount in Words:</b> ${esc(numberToIndianWords(totals.grand))}</div>
      </div>
      <div style="display:table-cell;width:45%;vertical-align:top">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="border:1px solid #dbe3f0 !important;padding:7px 10px;background:#fff !important;color:#475569 !important;font-size:11px">Taxable Amount</td>
            <td style="border:1px solid #dbe3f0 !important;padding:7px 10px;background:#fff !important;color:#0f172a !important;text-align:right;font-weight:700;font-size:11px">${toInr(totals.basic)}</td>
          </tr>
          <tr>
            <td style="border:1px solid #dbe3f0 !important;padding:7px 10px;background:#fff !important;color:#475569 !important;font-size:11px">GST Amount</td>
            <td style="border:1px solid #dbe3f0 !important;padding:7px 10px;background:#fff !important;color:#0f172a !important;text-align:right;font-weight:700;font-size:11px">${toInr(totals.gst)}</td>
          </tr>
          <tr>
            <td style="border:1px solid ${esc(primary)} !important;padding:9px 10px;background:${esc(primary)} !important;color:#ffffff !important;font-size:12px;font-weight:800">Grand Total</td>
            <td style="border:1px solid ${esc(primary)} !important;padding:9px 10px;background:${esc(primary)} !important;color:#ffffff !important;text-align:right;font-size:13px;font-weight:800">${toInr(totals.grand)}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <div style="display:table;width:100%;table-layout:fixed;border-top:1px solid #dbe3f0">
    <div style="display:table-cell;width:52%;vertical-align:top;padding:12px;border-right:1px solid #dbe3f0">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${esc(primary)};margin-bottom:6px">Scope of Work</div>
      <div style="font-size:11px;line-height:1.55;color:#334155">${nl2br(form.scope_of_work || "-")}</div>
    </div>
    <div style="display:table-cell;width:48%;vertical-align:top;padding:12px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${esc(primary)};margin-bottom:6px">Terms &amp; Conditions</div>
      <div style="font-size:11px;line-height:1.55;color:#334155;margin-bottom:10px">${nl2br(form.terms_and_conditions || "-")}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${esc(primary)};margin-bottom:6px">Notes</div>
      <div style="font-size:11px;line-height:1.55;color:#334155;margin-bottom:10px">${nl2br(form.notes || "-")}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${esc(primary)};margin-bottom:6px">Bank Details</div>
      <div style="font-size:11px;line-height:1.55;color:#334155;margin-bottom:12px">${nl2br(form.bank_details || "-")}</div>
      ${
        sealSignImageUrl
          ? `<div style="text-align:right;margin-top:8px;padding-top:10px;border-top:1px solid #e2e8f0">
              <img style="max-width:160px;max-height:72px;object-fit:contain" src="${esc(sealSignImageUrl)}" alt="Seal and sign"/>
              <div style="font-size:10px;color:#64748b;margin-top:4px">Authorised Signatory</div>
            </div>`
          : `<div style="text-align:right;margin-top:18px;padding-top:10px;border-top:1px solid #e2e8f0">
              <div style="height:48px"></div>
              <div style="font-size:10px;color:#64748b">Authorised Signatory</div>
            </div>`
      }
    </div>
  </div>
  `;

  return { styles, bodyHtml };
}

/** Build PDF input from a list/database quotation row. */
export function quotationPdfInputFromRow(opts: {
  row: FinanceQuotationRow;
  client: QuotationPdfClient | null;
  productById?: Map<string, ProductMasterOptionRow>;
  defaultBankDetails?: string;
  printSettings?: PrintSettings;
  printCompany?: PrintCompanyInfo | null;
  sealSignImageUrl?: string | null;
  letterheadUpperImageUrl?: string | null;
  letterheadLowerImageUrl?: string | null;
}): QuotationPdfInput {
  const { row } = opts;
  const form = rowToForm(row, opts.defaultBankDetails);
  return {
    form,
    quotationNumber: (row.quotation_number || "").trim() || "quotation",
    client: opts.client,
    productById: opts.productById,
    printSettings: opts.printSettings,
    printCompany: opts.printCompany,
    sealSignImageUrl: opts.sealSignImageUrl,
    letterheadUpperImageUrl: opts.letterheadUpperImageUrl,
    letterheadLowerImageUrl: opts.letterheadLowerImageUrl,
    storedTotals: {
      basic: Number(row.subtotal) || 0,
      gst: Number(row.tax_total) || 0,
      grand: Number(row.grand_total) || 0,
    },
  };
}

export async function createQuotationPdfBlob(
  input: QuotationPdfInput,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("PDF download is only available in the browser.");
  }

  const html2pdf = (await import("html2pdf.js")).default;
  const settings = input.printSettings ?? DEFAULT_PRINT_SETTINGS;
  const company = buildCompanyFromInput(input);

  const [upperData, lowerData, logoData, sealData] = await Promise.all([
    urlToDataUrl(company.letterhead_upper_url),
    urlToDataUrl(company.letterhead_lower_url),
    urlToDataUrl(company.logo_url),
    urlToDataUrl(input.sealSignImageUrl ?? company.seal_sign_url),
  ]);

  const companyForHtml: PrintCompanyInfo = {
    ...company,
    letterhead_upper_url: upperData,
    letterhead_lower_url: lowerData,
    logo_url: logoData,
    seal_sign_url: sealData,
  };

  const letterheadHtml = buildLetterheadHtml(companyForHtml, {
    ...settings,
    show_letterhead: settings.show_letterhead !== false,
  });

  const { styles, bodyHtml } = buildQuotationBodyHtml({
    ...input,
    sealSignImageUrl: sealData,
    printCompany: companyForHtml,
  });

  const footerImage =
    settings.show_letterhead !== false &&
    settings.letterhead_layout !== "logo-na" &&
    lowerData
      ? `<img class="foot-img" src="${esc(lowerData)}" alt="Letterhead footer"/>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="color-scheme" content="light only"/>
<style>${styles}</style>
</head>
<body>
  <div class="doc" id="quotation-pdf-root">
    ${letterheadHtml}
    ${bodyHtml}
    ${footerImage}
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:0;top:0;width:210mm;height:297mm;opacity:0;pointer-events:none;border:0;z-index:-1;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  if (!idoc) {
    iframe.remove();
    throw new Error("Unable to create PDF document frame.");
  }

  idoc.open();
  idoc.write(html);
  idoc.close();

  const target = idoc.getElementById("quotation-pdf-root");
  if (!target) {
    iframe.remove();
    throw new Error("Quotation PDF root missing.");
  }

  try {
    await waitForImages(idoc);
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    const filename =
      `${(input.quotationNumber || "quotation").trim() || "quotation"}.pdf`;
    const blob = (await html2pdf()
      .from(target)
      .set({
        margin: [8, 8, 8, 8],
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 794,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .outputPdf("blob")) as Blob;
    return blob;
  } finally {
    iframe.remove();
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
