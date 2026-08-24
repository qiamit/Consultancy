"use client";

import Link from "next/link";
import type { PrintSettings, PrintCompanyInfo } from "@backend/modules/print/types";
import { DEFAULT_PRINT_SETTINGS } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { FinanceFormOverlayHeader } from "@/components/modules/finance/finance-form-overlay-header";
import { CLIENT_FIELD_LABEL_BLOCK_CLASS } from "@/components/modules/client-master/constants";
import { DROPDOWN_KEY_FINANCE_TAX_INVOICE_CLIENT } from "@backend/shared/dropdown-keys";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import type { CompanyTextTemplateRow } from "@backend/shared/types/company-text-template";
import type { ProductMasterOptionRow } from "@backend/shared/types/finance-quotation";
import {
  deleteFinanceTaxInvoiceForm,
  saveFinanceTaxInvoice,
} from "@backend/actions/finance-tax-invoices";
import {
  updateFinanceQuotationNoteTemplate,
  updateFinanceQuotationScopeTemplate,
  updateFinanceQuotationTermTemplate,
} from "@backend/actions/finance-quotations";
import type { TaxInvoiceFormState, TaxInvoiceLineForm } from "./constants";
import { ProductLineCombobox } from "./product-line-combobox";
import { CompanyTemplateSearchBox } from "@/components/modules/finance/company-template-search-box";
import { pickDefaultTemplate } from "@backend/modules/finance/template-defaults";
import { useFinanceTextTemplateSelection } from "@/components/modules/finance/use-finance-text-template-selection";
import { ClientMasterEmbedModal } from "@/components/modules/finance/client-master-embed-modal";
import { ProductMasterEmbedModal } from "@/components/modules/finance/product-master-embed-modal";

type ClientDetailsPreview = {
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

const fieldClass =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

/** Same width as date columns (`min-w-[10.5rem]`) so inputs align in the row. */
const quotationNumberSplitShell =
  "flex h-[38px] w-full shrink-0 items-stretch overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-within:ring-sky-500/30";

const quotationNumberSplitInner =
  "min-w-0 flex-1 border-0 bg-transparent px-2 py-0 text-sm font-mono text-zinc-900 outline-none ring-0 placeholder:text-zinc-400 focus:ring-0 dark:bg-transparent dark:text-zinc-100 dark:placeholder:text-zinc-500";

function parseGstPercent(raw: string): number {
  const m = String(raw ?? "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.min(n, 100) : 0;
}

function linePreview(L: TaxInvoiceLineForm) {
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

function formatInrCurrency(amount: number): string {
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function FinanceTaxInvoiceForm({
  visible,
  overlay,
  formValues,
  isNewParam,
  idParam,
  clientOptions,
  productOptions,
  productById,
  onClose,
  onAddNew,
  onUpdateField,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
  onTaxDateChange,
  taxInvoiceReturnUrl,
  sealSignImageUrl,
  letterheadUpperImageUrl,
  letterheadLowerImageUrl,
  selectedClientDetails,
  notesTemplates = [],
  termsTemplates = [],
  scopeTemplates = [],
  printSettings,
  printCompany,
}: {
  visible: boolean;
  overlay?: boolean;
  formValues: TaxInvoiceFormState;
  isNewParam: boolean;
  idParam: string | null;
  clientOptions: AppDropdownOptionRow[];
  productOptions: AppDropdownOptionRow[];
  productById: Map<string, ProductMasterOptionRow>;
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (key: keyof TaxInvoiceFormState, value: string) => void; // invoice_type: 'service' | 'supply'
  onUpdateLine: (index: number, patch: Partial<TaxInvoiceLineForm>) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  onTaxDateChange: (iso: string) => void;
  /** Current quotation URL (path + ?new=1 or ?id=) for “add client” return navigation. */
  taxInvoiceReturnUrl: string;
  sealSignImageUrl: string | null;
  letterheadUpperImageUrl: string | null;
  letterheadLowerImageUrl: string | null;
  selectedClientDetails: ClientDetailsPreview | null;
  notesTemplates?: CompanyTextTemplateRow[];
  termsTemplates?: CompanyTextTemplateRow[];
  scopeTemplates?: CompanyTextTemplateRow[];
  printSettings?: PrintSettings;
  printCompany?: PrintCompanyInfo;
}) {
  const router = useRouter();
  const [quickAddClientOpen, setQuickAddClientOpen] = useState(false);
  const [quickAddProduct, setQuickAddProduct] = useState<{ lineIndex: number; prefill: string } | null>(null);
  const [editingDescLine, setEditingDescLine] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesSaveError, setNotesSaveError] = useState<string | null>(null);
  const [isSavingNotesTemplate, startSaveNotesTemplate] = useTransition();
  const [showTerms, setShowTerms] = useState(false);
  const [termsDraft, setTermsDraft] = useState("");
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsSaveError, setTermsSaveError] = useState<string | null>(null);
  const [isSavingTermsTemplate, startSaveTermsTemplate] = useTransition();
  const [showScope, setShowScope] = useState(false);
  const [scopeDraft, setScopeDraft] = useState("");
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [scopeSaveError, setScopeSaveError] = useState<string | null>(null);
  const [isSavingScopeTemplate, startSaveScopeTemplate] = useTransition();
  const defaultNotesTemplate = useMemo(
    () => pickDefaultTemplate(notesTemplates, ["quotation_notes", "quotation notes"]),
    [notesTemplates],
  );
  const defaultTermsTemplate = useMemo(
    () => pickDefaultTemplate(termsTemplates, ["quotation_term_condition", "quotation term & condition"]),
    [termsTemplates],
  );
  const defaultScopeTemplate = useMemo(
    () => pickDefaultTemplate(scopeTemplates, ["quotation_scope_of_work", "quotation scope of work"]),
    [scopeTemplates],
  );
  const { notes: notesTemplate, terms: termsTemplate, scope: scopeTemplate } =
    useFinanceTextTemplateSelection({
      visible,
      isNewParam,
      defaultNotesTemplate,
      defaultTermsTemplate,
      defaultScopeTemplate,
    });


  useEffect(() => {
    if (!isNewParam) return;
    try {
      const entries: { id: string; name: string; prefix: string; suffix: string }[] =
        JSON.parse(localStorage.getItem("app_named_prefix_suffix_entries") ?? "[]");
      const name = (e: { name: string }) => e.name.toLowerCase();
      const match =
        entries.find((e) => name(e).includes("tax invoice")) ??
        entries.find((e) => name(e).includes("tax") && !name(e).includes("proforma")) ??
        entries.find((e) => name(e) === "invoice") ??
        entries.find((e) => name(e).includes("inv") && !name(e).includes("proforma"));
      if (match?.prefix && !formValues.tax_invoice_number_prefix) {
        onUpdateField("tax_invoice_number_prefix", match.prefix);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewParam]);


  const linesJson = useMemo(
    () =>
      JSON.stringify(
        formValues.lines.map((L) => ({
          product_master_item_id: L.product_master_item_id || null,
          item_description: L.item_description,
          unit_of_item: L.unit_of_item,
          qty: Number(L.qty) || 0,
          unit_rate: Number(L.unit_rate) || 0,
          gst_rate: L.gst_rate,
        })),
      ),
    [formValues.lines],
  );

  const totalsPreview = useMemo(() => {
    let basic = 0;
    let gst = 0;
    let grand = 0;
    for (const L of formValues.lines) {
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
  }, [formValues.lines]);

  function handleProductPick(index: number, productId: string) {
    const p = productById.get(productId);
    if (p) {
      onUpdateLine(index, {
        product_master_item_id: productId,
        item_description: p.name,
        unit_of_item: p.unit_of_item,
        unit_rate: String(p.sale_price),
        gst_rate: p.gst_rate || "0%",
      });
    } else {
      onUpdateLine(index, { product_master_item_id: productId });
    }
  }

  if (!visible) return null;

  const rootClass = overlay
    ? "px-4 pb-5 pt-0"
    : "rounded-b-lg border-t border-zinc-200 bg-zinc-50/90 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/40";
  const taxDisplayNumber =
    `${formValues.tax_invoice_number_prefix}${formValues.tax_invoice_number_value}`.trim();
  const toInr = (n: number) =>
    Number(n || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const esc = (v: string) =>
    v
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  const nl2br = (v: string) => esc(v).replaceAll("\n", "<br/>");
  const clientAddress = [
    selectedClientDetails?.address,
    selectedClientDetails?.city,
    selectedClientDetails?.state,
    selectedClientDetails?.pin_code,
    selectedClientDetails?.country,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .join(", ");

  const buildTaxInvoiceDocumentParts = () => {
    const lineRows = formValues.lines
      .map((line, idx) => {
        const pv = linePreview(line);
        return `<tr>
          <td>${idx + 1}</td>
          <td>${esc(line.item_description || "-")}</td>
          <td>${esc(line.unit_of_item || "-")}</td>
          <td>${esc(line.qty || "0")}</td>
          <td>${toInr(Number(line.unit_rate) || 0)}</td>
          <td>${esc(line.line_discount || "0%")}</td>
          <td>${esc(line.gst_rate || "0%")}</td>
          <td>${toInr(pv.sub)}</td>
          <td>${toInr(pv.tax)}</td>
          <td>${toInr(pv.tot)}</td>
        </tr>`;
      })
      .join("");
    const styles = `
  @page { size: A4; margin: 10mm; }
  body,.finance-tax-invoice-pdf-mount{font-family:Arial,sans-serif;color:#111;margin:0}
  .doc{max-width:190mm;margin:0 auto;border:1px solid #222}
  .pad{padding:10px}
  .headimg{width:100%;max-height:90px;object-fit:contain}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .title{font-size:32px;font-weight:700;letter-spacing:.6px}
  .section{border-top:1px solid #222;padding:10px}
  .label{font-size:12px;font-weight:700;margin-bottom:4px}
  .muted{font-size:12px;line-height:1.5}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th,td{border:1px solid #444;padding:6px;vertical-align:top}
  th{background:#f2efe3;font-weight:700}
  .right{text-align:right}.center{text-align:center}`;
    const docInner = `
  ${letterheadUpperImageUrl ? `<img class="headimg" src="${letterheadUpperImageUrl}" alt="Upper letterhead"/>` : ""}
  <div class="pad grid">
    <div><div class="label">Tax invoice no.</div><div>${esc(taxDisplayNumber || "-")}</div></div>
    <div class="right"><div class="title">PROFORMA INVOICE</div><div class="muted">Date: ${esc(formatDisplayDate(formValues.tax_date, "-"))} | Valid until: ${esc(formatDisplayDate(formValues.valid_until_date, "-"))}</div></div>
  </div>
  <div class="section">
    <div class="label">Client Details</div>
    <div class="muted">
      <b>Name:</b> ${esc(selectedClientDetails?.company_name?.trim() || selectedClientDetails?.name?.trim() || "-")}<br/>
      <b>Address:</b> ${esc(clientAddress || "-")}<br/>
      <b>GST:</b> ${esc(selectedClientDetails?.gst_number?.trim() || "-")}<br/>
      <b>Contact Person:</b> ${esc(selectedClientDetails?.contact_person_name?.trim() || selectedClientDetails?.name?.trim() || "-")}<br/>
      <b>Email:</b> ${esc(selectedClientDetails?.email?.trim() || "-")}<br/>
      <b>Mobile:</b> ${esc(([String(selectedClientDetails?.phone_country_code ?? "").trim(), String(selectedClientDetails?.phone ?? "").trim()].filter(Boolean).join(" ")) || "-")}
    </div>
  </div>
  <div class="section">
    <div class="label">Product & Services</div>
    <table><thead><tr><th>Sr.</th><th>Name of Product</th><th>Unit</th><th>Qty</th><th>Rate</th><th>Discount</th><th>GST</th><th>Taxable Value</th><th>GST Amount</th><th>Total</th></tr></thead>
    <tbody>${lineRows}</tbody>
    <tfoot><tr><th colspan="7" class="right">Grand Total</th><th class="right">${toInr(totalsPreview.basic)}</th><th class="right">${toInr(totalsPreview.gst)}</th><th class="right">${toInr(totalsPreview.grand)}</th></tr></tfoot>
    </table>
  </div>
  <div class="section grid">
    <div><div class="label">Notes</div><div class="muted">${nl2br(formValues.notes || "-")}</div></div>
    <div><div class="label">Term & Conditions</div><div class="muted">${nl2br(formValues.terms_and_conditions || "-")}</div></div>
  </div>
  <div class="section grid">
    <div><div class="label">Scope of Works</div><div class="muted">${nl2br(formValues.scope_of_work || "-")}</div></div>
    <div><div class="label">Bank Details</div><div class="muted">${nl2br(formValues.bank_details || "-")}</div></div>
  </div>
  <div class="section grid">
    <div>${letterheadLowerImageUrl ? `<img class="headimg" src="${letterheadLowerImageUrl}" alt="Lower letterhead"/>` : ""}</div>
    <div class="right">${sealSignImageUrl ? `<img style="max-width:240px;max-height:120px;object-fit:contain" src="${sealSignImageUrl}" alt="Seal and sign"/>` : ""}</div>
  </div>`;
    return { styles, docInner };
  };

  const buildTaxInvoiceDocumentHtml = () => {
    const { styles, docInner } = buildTaxInvoiceDocumentParts();
    return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Tax invoice ${esc(taxDisplayNumber || "")}</title>
<style>${styles}</style></head><body>
<div class="doc">${docInner}</div></body></html>`;
  };
  const printTaxInvoice = async () => {
    const { openPrintPreview } = await import("@backend/modules/print/preview");
    const { buildPrintDocument } = await import("@backend/modules/print/engine");
    const settings = printSettings ?? DEFAULT_PRINT_SETTINGS;
    const company = printCompany ?? ({} as PrintCompanyInfo);
    openPrintPreview({
      buildDoc: (s, c) => buildPrintDocument({
        title: `Tax Invoice ${taxDisplayNumber || ""}`,
        bodyHtml: buildTaxInvoiceDocumentParts().docInner,
        settings: s,
        company: c,
        extraStyles: "",
      }),
      initialSettings: settings,
      company,
    });
  };
  const createTaxInvoicePdfBlob = async (): Promise<Blob> => {
    const html2pdf = (await import("html2pdf.js")).default;
    const { styles, docInner } = buildTaxInvoiceDocumentParts();
    const mount = document.createElement("div");
    mount.className = "finance-tax-invoice-pdf-mount";
    mount.style.cssText =
      "position:fixed;left:0;top:0;width:210mm;opacity:0;pointer-events:none;z-index:-1;";
    mount.innerHTML = `<style>${styles}</style><div class="doc">${docInner}</div>`;
    document.body.appendChild(mount);
    const target = mount.querySelector(".doc") as HTMLElement | null;
    if (!target) {
      mount.remove();
      throw new Error("Tax invoice PDF mount missing .doc root");
    }
    const waitForImages = (root: HTMLElement) => {
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
    };
    try {
      await waitForImages(target);
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const blob = (await html2pdf()
        .from(target)
        .set({
          margin: [6, 6, 6, 6],
          filename: `${taxDisplayNumber || "tax-invoice"}.pdf`,
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
  };
  const downloadTaxInvoicePdf = async () => {
    const blob = await createTaxInvoicePdfBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${taxDisplayNumber || "tax-invoice"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const shareTaxInvoice = async () => {
    const shareText = `Tax invoice ${taxDisplayNumber || formValues.id}`;
    try {
      const blob = await createTaxInvoicePdfBlob();
      const file = new File([blob], `${taxDisplayNumber || "tax-invoice"}.pdf`, {
        type: "application/pdf",
      });
      if (navigator.share && (navigator as Navigator & { canShare?: (data: ShareData) => boolean }).canShare?.({ files: [file] })) {
        await navigator.share({ title: "Tax invoice", text: shareText, files: [file] });
        return;
      }
      await navigator.clipboard.writeText(
        typeof window !== "undefined" ? window.location.href : shareText,
      );
      window.alert("Tax invoice link copied to clipboard.");
    } catch {
      window.alert("Unable to share right now.");
    }
  };

  return (
    <div className={rootClass}>
        <FinanceFormOverlayHeader
          titleId="finance-tax-invoice-form-title"
          title={
            isNewParam
              ? "New Tax Invoice"
              : idParam
                ? "Edit tax invoice"
                : "Tax Invoice"
          }
          onClose={onClose}
          showAddNew={!isNewParam}
          addNewLabel="Add New Tax Invoice"
          onAddNew={onAddNew}
        />

        <form action={saveFinanceTaxInvoice} className="space-y-5">
          <input type="hidden" name="id" value={formValues.id} />
          <input type="hidden" name="quotation_id" value={formValues.quotation_id} />
          <input type="hidden" name="sales_order_id" value={formValues.sales_order_id} />
          <input
            type="hidden"
            name="proforma_invoice_id"
            value={formValues.proforma_invoice_id}
          />
          <input type="hidden" name="lines_json" value={linesJson} />
          <input type="hidden" name="valid_until_date" value={formValues.valid_until_date} />
          <input type="hidden" name="notes" value={formValues.notes} />
          <input
            type="hidden"
            name="terms_and_conditions"
            value={formValues.terms_and_conditions}
          />
          <input type="hidden" name="scope_of_work" value={formValues.scope_of_work} />

          <div className="flex flex-col gap-4">
            {/* Line 1: quotation number, dates, type */}
            <div className="flex min-w-0 flex-col gap-2">
              <div className="-mx-0.5 flex flex-nowrap items-end gap-3 overflow-x-auto pb-0.5 pt-0.5 sm:gap-4">
                <div className="min-w-[10.5rem] shrink-0 space-y-1.5 lg:w-[17.5%]">
                  <span className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>
                    Tax invoice number
                  </span>
                  <div
                    className={quotationNumberSplitShell}
                    role="group"
                    aria-label="Tax invoice number"
                  >
                    <input
                      id="finance-quotation-number-prefix"
                      name="tax_invoice_number_prefix"
                      type="text"
                      aria-label="Prefix"
                      value={formValues.tax_invoice_number_prefix}
                      onChange={(e) =>
                        onUpdateField(
                          "tax_invoice_number_prefix",
                          e.target.value,
                        )
                      }
                      placeholder={formValues.id ? undefined : "TI-2026-"}
                      autoComplete="off"
                      spellCheck={false}
                      className={`${quotationNumberSplitInner} rounded-none`}
                    />
                    <div
                      className="w-px shrink-0 self-stretch bg-zinc-200 dark:bg-zinc-600"
                      aria-hidden
                    />
                    <input
                      id="finance-quotation-number-value"
                      name="tax_invoice_number_value"
                      type="text"
                      aria-label="Number"
                      value={formValues.tax_invoice_number_value}
                      onChange={(e) =>
                        onUpdateField(
                          "tax_invoice_number_value",
                          e.target.value,
                        )
                      }
                      placeholder={formValues.id ? undefined : "00001"}
                      autoComplete="off"
                      spellCheck={false}
                      className={`${quotationNumberSplitInner} rounded-none`}
                    />
                  </div>
                </div>
                <div className="min-w-[125px] shrink-0 space-y-1.5 lg:w-[8.75%]">
                  <label
                    className={CLIENT_FIELD_LABEL_BLOCK_CLASS}
                    htmlFor="finance-quotation-date"
                  >
                    Order date
                  </label>
                  <input
                    id="finance-quotation-date"
                    type="date"
                    name="tax_date"
                    required
                    value={formValues.tax_date}
                    onChange={(e) => {
                      const v = e.target.value;
                      onTaxDateChange(v);
                    }}
                    className={fieldClass}
                  />
                </div>
                <div className="min-w-[125px] shrink-0 space-y-1.5 lg:w-[8.75%]">
                  <label
                    className={CLIENT_FIELD_LABEL_BLOCK_CLASS}
                    htmlFor="finance-quotation-type"
                  >
                    Type
                  </label>
                  <select
                    id="finance-quotation-type"
                    name="invoice_type"
                    value={formValues.invoice_type}
                    onChange={(e) =>
                      onUpdateField("invoice_type", e.target.value)
                    }
                    className={fieldClass}
                  >
                    <option value="service">Service</option>
                    <option value="supply">Supply</option>
                  </select>
                </div>
              </div>
            </div>
            {formValues.quotation_id || formValues.sales_order_id || formValues.proforma_invoice_id ? (
              <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                {formValues.quotation_id ? (
                  <p>
                    Linked quotation:{" "}
                    <Link
                      href={`/dashboard/finance/sales/quotation-estimate?id=${encodeURIComponent(formValues.quotation_id)}`}
                      className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                    >
                      Open quotation
                    </Link>
                  </p>
                ) : null}
                {formValues.sales_order_id ? (
                  <p>
                    Linked sales order:{" "}
                    <Link
                      href={`/dashboard/finance/sales/sales-order?id=${encodeURIComponent(formValues.sales_order_id)}`}
                      className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                    >
                      Open sales order
                    </Link>
                  </p>
                ) : null}
                {formValues.proforma_invoice_id ? (
                  <p>
                    Linked proforma:{" "}
                    <Link
                      href={`/dashboard/finance/sales/proforma-invoice?id=${encodeURIComponent(formValues.proforma_invoice_id)}`}
                      className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
                    >
                      Open proforma
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Line 2: client */}
            <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,450px)_minmax(0,1fr)]">
              <div className="min-w-0 max-w-full space-y-2">
                <ClientDropdownField
                  optionKey={DROPDOWN_KEY_FINANCE_TAX_INVOICE_CLIENT}
                  name="client_id"
                  label="Client"
                  dialogTitle="Clients"
                  addPlaceholder="Add client value"
                  manageAriaLabel="Add new client"
                  value={formValues.client_id}
                  onChange={(v) => onUpdateField("client_id", v)}
                  options={clientOptions}
                  selectedValue={formValues.client_id}
                  onClearSelection={() => onUpdateField("client_id", "")}
                  searchPlaceholder="Search company name…"
                  emptySelectLabel="— Select client —"
                  suffixButtonClassName="px-1.5 py-1 text-[10px]"
                  blankInputWhenNoSelection
                  onSuffixButtonClick={() => setQuickAddClientOpen(true)}
                />
              </div>
              <div className="-mt-[20mm] space-y-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                {selectedClientDetails ? (
                  <>
                    <p>
                      <span className="font-semibold">Name:</span>{" "}
                      {selectedClientDetails.company_name?.trim() ||
                        selectedClientDetails.name?.trim() ||
                        "—"}
                    </p>
                    <p>
                      <span className="font-semibold">Address:</span>{" "}
                      {[
                        selectedClientDetails.address,
                        selectedClientDetails.city,
                        selectedClientDetails.state,
                        selectedClientDetails.pin_code,
                        selectedClientDetails.country,
                      ]
                        .map((v) => String(v ?? "").trim())
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                    <p>
                      <span className="font-semibold">GST:</span>{" "}
                      {selectedClientDetails.gst_number?.trim() || "—"}
                    </p>
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
                      <p>
                        <span className="font-semibold">Contact Person:</span>{" "}
                        {selectedClientDetails.contact_person_name?.trim() ||
                          selectedClientDetails.name?.trim() ||
                          "—"}
                      </p>
                      <p>
                        <span className="font-semibold">Mobile:</span>{" "}
                        {[
                          String(selectedClientDetails.phone_country_code ?? "").trim(),
                          String(selectedClientDetails.phone ?? "").trim(),
                        ]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </p>
                    </div>
                    <p>
                      <span className="font-semibold">Email:</span>{" "}
                      {selectedClientDetails.email?.trim() || "—"}
                    </p>
                  </>
                ) : (
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Select a client to see details on the right.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>
              Product &amp; Services
            </label>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <colgroup>
                  <col style={{ width: "auto" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "60px" }} />
                  <col style={{ width: "110px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "32px" }} />
                </colgroup>
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <tr>
                    <th className="w-full px-2 py-2 text-left">Item</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">Unit</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">Qty</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">Rate</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">Discount</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right">Total</th>
                    <th className="whitespace-nowrap px-1 py-2 text-right" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {formValues.lines.map((L, i) => {
                    const pv = linePreview(L);
                    const isLastRow = i === formValues.lines.length - 1;
                    return (
                      <tr key={i} className="align-top">
                        <td className="min-w-0 px-2 py-1.5 align-top">
                          <div className="flex min-w-0 flex-col gap-1.5 break-words">
                            {!L.product_master_item_id ? (
                              <>
                                <ProductLineCombobox
                                  options={productOptions}
                                  value={L.product_master_item_id}
                                  onPick={(id) => handleProductPick(i, id)}
                                  onAddNew={(label) => onUpdateLine(i, { item_description: label })}
                                  onOpenProductModal={(prefill) => setQuickAddProduct({ lineIndex: i, prefill })}
                                  idSuffix={`${formValues.id || "new"}_${i}`}
                                />
                                {L.item_description?.trim() ? (
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                    {L.item_description.trim()}
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <>
                                <div
                                  className="space-y-1 border-l-2 border-sky-200 pl-2 text-left dark:border-sky-800"
                                  aria-live="polite"
                                >
                                  {(() => {
                                    const p = productById.get(
                                      L.product_master_item_id,
                                    );
                                    const title =
                                      p?.name?.trim() ||
                                      L.item_description?.trim() ||
                                      "—";
                                    const baseDescription = p?.description?.trim() || "";
                                    const customDescription =
                                      L.item_description?.trim() &&
                                      L.item_description.trim() !== (p?.name?.trim() || "")
                                        ? L.item_description.trim()
                                        : "";
                                    const shownDescription =
                                      customDescription || baseDescription;
                                    return (
                                      <>
                                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                          {title}
                                        </p>
                                        {editingDescLine === i ? (
                                          <div className="mt-1 flex flex-col gap-1">
                                            <textarea
                                              autoFocus
                                              rows={3}
                                              defaultValue={shownDescription}
                                              onBlur={(e) => {
                                                const trimmed = e.target.value.trim();
                                                onUpdateLine(i, { item_description: trimmed || (p?.name ?? "") });
                                                setEditingDescLine(null);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === "Escape") { setEditingDescLine(null); e.preventDefault(); }
                                                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                                  const trimmed = e.currentTarget.value.trim();
                                                  onUpdateLine(i, { item_description: trimmed || (p?.name ?? "") });
                                                  setEditingDescLine(null);
                                                  e.preventDefault();
                                                }
                                              }}
                                              className="w-full rounded border border-sky-400 bg-white px-2 py-1.5 text-xs text-zinc-800 outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-sky-600 dark:bg-zinc-800 dark:text-zinc-100"
                                            />
                                            <p className="text-[10px] text-zinc-400">Ctrl+Enter to save · Esc to cancel</p>
                                          </div>
                                        ) : shownDescription ? (
                                          <div className="flex items-center gap-2">
                                            <p className="text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                                              {shownDescription}
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() => setEditingDescLine(i)}
                                              className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                                            >
                                              Edit
                                            </button>
                                          </div>
                                        ) : null}
                                      </>
                                    );
                                  })()}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="min-w-0 px-2 py-1.5 align-top text-center">
                          <input
                            value={L.unit_of_item}
                            onChange={(e) =>
                              onUpdateLine(i, { unit_of_item: e.target.value })
                            }
                            className={`${fieldClass} min-w-0 text-center`}
                            style={{ width: "64.66px", height: "36.56px" }}
                          />
                        </td>
                        <td className="min-w-0 px-2 py-1.5 align-top text-center">
                          <input
                            value={L.qty}
                            onChange={(e) => onUpdateLine(i, { qty: e.target.value })}
                            inputMode="decimal"
                            className={`${fieldClass} min-w-0 text-center`}
                            style={{ width: "50px", height: "36.56px" }}
                          />
                        </td>
                        <td className="min-w-0 px-2 py-1.5 align-top text-center">
                          <input
                            value={L.unit_rate}
                            onChange={(e) =>
                              onUpdateLine(i, { unit_rate: e.target.value })
                            }
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            aria-label="Rate (currency)"
                            className={`${fieldClass} min-w-0 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                            style={{ width: "80px", height: "36.56px" }}
                          />
                        </td>
                        <td className="min-w-0 px-2 py-1.5 align-top text-center">
                          <input
                            value={L.line_discount}
                            onChange={(e) =>
                              onUpdateLine(i, { line_discount: e.target.value })
                            }
                            placeholder="0%"
                            className={`${fieldClass} min-w-0 w-[75px] text-center`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right align-middle tabular-nums text-zinc-800 dark:text-zinc-200">
                          {formatInrCurrency(pv.tot)}
                        </td>
                        <td className="w-min px-[0.225rem] py-[0.36rem] text-right align-middle">
                          {isLastRow ? (
                            <button
                              type="button"
                              onClick={onAddLine}
                              className="flex h-[25px] w-[25px] flex-wrap items-center justify-center rounded p-1 text-[1.3em] leading-none text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
                              aria-label="Add line"
                            >
                              +
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onRemoveLine(i)}
                              className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                              aria-label="Remove line"
                            >
                              −
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="space-y-1 border-t border-zinc-200 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-800 dark:text-zinc-100">
                <p className="text-right font-medium">
                  Total Basic Amount -{" "}
                  <span className="tabular-nums">
                    {formatInrCurrency(totalsPreview.basic)}
                  </span>
                </p>
                <p className="text-right font-medium">
                  GST -{" "}
                  <span className="tabular-nums">
                    {formatInrCurrency(totalsPreview.gst)}
                  </span>
                </p>
                <p className="text-right font-semibold">
                  Grand Total -{" "}
                  <span className="tabular-nums">
                    {formatInrCurrency(totalsPreview.grand)}
                  </span>
                </p>
                <p className="text-left">
                  Amount in Words:{" "}
                  <span className="font-medium capitalize">
                    {numberToIndianWords(totalsPreview.grand)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
            <div className="flex min-h-0 min-w-0 flex-col space-y-2">
              <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Notes</label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <CompanyTemplateSearchBox
                    templates={notesTemplates}
                    onPick={(body) => onUpdateField("notes", body)}
                    onTemplatePick={(template) => {
                      notesTemplate.pickTemplate(template);
                      setNotesDraft(template.body);
                      setNotesSaveError(null);
                    }}
                    ariaLabel="Search notes from company settings template"
                    placeholder="Search Company Setting Notes..."
                    listId="company-notes-template-list"
                    defaultQuery={
                      notesTemplate.templateName || notesTemplate.defaultTemplate?.name || undefined
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNotesDraft(formValues.notes);
                    setNotesSaveError(null);
                    setNotesModalOpen(true);
                  }}
                  className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  View Notes
                </button>
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-col space-y-2">
              <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Term &amp; Condition</label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <CompanyTemplateSearchBox
                    templates={termsTemplates}
                    onPick={(body) => onUpdateField("terms_and_conditions", body)}
                    onTemplatePick={(template) => {
                      termsTemplate.pickTemplate(template);
                      setTermsDraft(template.body);
                      setTermsSaveError(null);
                    }}
                    ariaLabel="Insert terms and conditions from company settings template"
                    placeholder="Search Company Setting Terms..."
                    listId="company-terms-template-list"
                    defaultQuery={
                      termsTemplate.templateName || termsTemplate.defaultTemplate?.name || undefined
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTermsDraft(formValues.terms_and_conditions);
                    setTermsSaveError(null);
                    setTermsModalOpen(true);
                  }}
                  className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  View Terms
                </button>
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-col space-y-2">
              <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Scope of Work</label>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <CompanyTemplateSearchBox
                    templates={scopeTemplates}
                    onPick={(body) => onUpdateField("scope_of_work", body)}
                    onTemplatePick={(template) => {
                      scopeTemplate.pickTemplate(template);
                      setScopeDraft(template.body);
                      setScopeSaveError(null);
                    }}
                    ariaLabel="Insert scope of work from company settings template"
                    placeholder="Search Company Setting Scope..."
                    listId="company-scope-template-list"
                    defaultQuery={
                      scopeTemplate.templateName || scopeTemplate.defaultTemplate?.name || undefined
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setScopeDraft(formValues.scope_of_work);
                    setScopeSaveError(null);
                    setScopeModalOpen(true);
                  }}
                  className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  View Scope
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Bank Details</label>
              <textarea
                value={formValues.bank_details}
                onChange={(e) => onUpdateField("bank_details", e.target.value)}
                rows={4}
                className={`${fieldClass} min-h-[110px] resize-y`}
                placeholder="Bank details"
              />
            </div>
            <div className="space-y-2">
              {sealSignImageUrl ? (
                <div className="ml-auto flex w-1/2 justify-end rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/60">
                  <img
                    src={sealSignImageUrl}
                    alt="Company seal and sign"
                    className="max-h-20 max-w-full rounded-md border border-zinc-200 object-contain dark:border-zinc-700"
                  />
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No seal &amp; sign image found in Company Settings.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {formValues.id ? (
              <>
                <button
                  type="button"
                  onClick={downloadTaxInvoicePdf}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => void printTaxInvoice()}
                  className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/60"
                >
                  🖨 Print Preview
                </button>
                <button
                  type="button"
                  onClick={shareTaxInvoice}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Share
                </button>
              </>
            ) : null}
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
            >
              Save Tax Invoice
            </button>
            {formValues.id ? (
              <button
                type="submit"
                formAction={deleteFinanceTaxInvoiceForm}
                className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Delete Tax Invoice
              </button>
            ) : null}
          </div>
        </form>

        {notesModalOpen ? (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/60 p-4 dark:bg-black/70"
            role="presentation"
            onClick={() => setNotesModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="View and update notes"
              className="w-full max-w-2xl rounded-xl border border-zinc-300 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Notes
                  {notesTemplate.templateName ? ` - ${notesTemplate.templateName}` : ""}
                </h3>
                <button
                  type="button"
                  onClick={() => setNotesModalOpen(false)}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
              <textarea
                value={notesDraft}
                onChange={(e) => {
                  const next = e.target.value;
                  setNotesDraft(next);
                  onUpdateField("notes", next);
                }}
                rows={10}
                className={`${fieldClass} min-h-[14rem]`}
              />
              {notesSaveError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{notesSaveError}</p>
              ) : null}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNotesModalOpen(false)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingNotesTemplate}
                  onClick={() => {
                    if (!notesTemplate.templateId) {
                      setNotesSaveError(
                        "Pick a notes template first, then update it from this window.",
                      );
                      return;
                    }
                    startSaveNotesTemplate(async () => {
                      const result = await updateFinanceQuotationNoteTemplate({
                        id: notesTemplate.templateId,
                        body: notesDraft,
                      });
                      if (!result.ok) {
                        setNotesSaveError(result.error);
                        return;
                      }
                      setNotesSaveError(null);
                      setNotesModalOpen(false);
                    });
                  }}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingNotesTemplate ? "Updating..." : "Update Notes Template"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {termsModalOpen ? (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/60 p-4 dark:bg-black/70"
            role="presentation"
            onClick={() => setTermsModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="View and update terms"
              className="w-full max-w-2xl rounded-xl border border-zinc-300 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Term &amp; Condition
                  {termsTemplate.templateName ? ` - ${termsTemplate.templateName}` : ""}
                </h3>
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(false)}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
              <textarea
                value={termsDraft}
                onChange={(e) => {
                  const next = e.target.value;
                  setTermsDraft(next);
                  onUpdateField("terms_and_conditions", next);
                }}
                rows={10}
                className={`${fieldClass} min-h-[14rem]`}
              />
              {termsSaveError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{termsSaveError}</p>
              ) : null}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(false)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingTermsTemplate}
                  onClick={() => {
                    if (!termsTemplate.templateId) {
                      setTermsSaveError(
                        "Pick a terms template first, then update it from this window.",
                      );
                      return;
                    }
                    startSaveTermsTemplate(async () => {
                      const result = await updateFinanceQuotationTermTemplate({
                        id: termsTemplate.templateId,
                        body: termsDraft,
                      });
                      if (!result.ok) {
                        setTermsSaveError(result.error);
                        return;
                      }
                      setTermsSaveError(null);
                      setTermsModalOpen(false);
                    });
                  }}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingTermsTemplate ? "Updating..." : "Update Terms Template"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {scopeModalOpen ? (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/60 p-4 dark:bg-black/70"
            role="presentation"
            onClick={() => setScopeModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="View and update scope"
              className="w-full max-w-2xl rounded-xl border border-zinc-300 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Scope of Work
                  {scopeTemplate.templateName ? ` - ${scopeTemplate.templateName}` : ""}
                </h3>
                <button
                  type="button"
                  onClick={() => setScopeModalOpen(false)}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
              <textarea
                value={scopeDraft}
                onChange={(e) => {
                  const next = e.target.value;
                  setScopeDraft(next);
                  onUpdateField("scope_of_work", next);
                }}
                rows={10}
                className={`${fieldClass} min-h-[14rem]`}
              />
              {scopeSaveError ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{scopeSaveError}</p>
              ) : null}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScopeModalOpen(false)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingScopeTemplate}
                  onClick={() => {
                    if (!scopeTemplate.templateId) {
                      setScopeSaveError(
                        "Pick a scope template first, then update it from this window.",
                      );
                      return;
                    }
                    startSaveScopeTemplate(async () => {
                      const result = await updateFinanceQuotationScopeTemplate({
                        id: scopeTemplate.templateId,
                        body: scopeDraft,
                      });
                      if (!result.ok) {
                        setScopeSaveError(result.error);
                        return;
                      }
                      setScopeSaveError(null);
                      setScopeModalOpen(false);
                    });
                  }}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingScopeTemplate ? "Updating..." : "Update Scope Template"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      {quickAddClientOpen && (
        <ClientMasterEmbedModal
          onClose={() => setQuickAddClientOpen(false)}
          onSuccess={(id) => {
            onUpdateField("client_id", id);
            setQuickAddClientOpen(false);
            router.refresh();
          }}
        />
      )}
      {quickAddProduct && (
        <ProductMasterEmbedModal
          prefillName={quickAddProduct.prefill}
          onClose={() => setQuickAddProduct(null)}
          onSuccess={(p) => {
            onUpdateLine(quickAddProduct.lineIndex, {
              product_master_item_id: p.id,
              item_description: p.name,
              unit_of_item: p.unit_of_item,
              unit_rate: String(p.sale_price),
              gst_rate: p.gst_rate,
            });
            setQuickAddProduct(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
