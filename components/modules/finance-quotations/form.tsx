"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ClientDropdownField } from "@/components/modules/client-master/client-dropdown-field";
import { DialogCloseXButton } from "@/components/modules/client-master/dialog-close-x";
import { CLIENT_FIELD_LABEL_BLOCK_CLASS } from "@/components/modules/client-master/constants";
import { DROPDOWN_KEY_FINANCE_QUOTATION_CLIENT } from "@/lib/dropdown-keys";
import type { AppDropdownOptionRow } from "@/lib/types/app-dropdown-option";
import type { CompanyTextTemplateRow } from "@/lib/types/company-text-template";
import type { ProductMasterOptionRow } from "@/lib/types/finance-quotation";
import {
  deleteFinanceQuotationForm,
  saveFinanceQuotation,
} from "@/lib/actions/finance-quotations";
import type { QuotationFormState, QuotationLineForm } from "./constants";
import { ProductLineCombobox } from "./product-line-combobox";

const fieldClass =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

/** Same width as date columns (`min-w-[10.5rem]`) so inputs align in the row. */
const quotationNumberSplitShell =
  "flex h-[38px] w-[10.5rem] shrink-0 items-stretch overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-within:ring-sky-500/30";

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

function CompanyTemplateSelect({
  templates,
  onPick,
  ariaLabel,
}: {
  templates: CompanyTextTemplateRow[];
  onPick: (body: string) => void;
  ariaLabel: string;
}) {
  const [resetKey, setResetKey] = useState(0);
  if (templates.length === 0) return null;
  return (
    <select
      key={resetKey}
      aria-label={ariaLabel}
      defaultValue=""
      onChange={(e) => {
        const code = e.target.value;
        if (!code) return;
        const t = templates.find((x) => x.code === code);
        if (t) onPick(t.body);
        setResetKey((k) => k + 1);
      }}
      className={`${fieldClass} py-1.5 text-xs`}
    >
      <option value="">Load from company settings…</option>
      {templates.map((t) => (
        <option key={t.id} value={t.code}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

function CompanyTemplateSearchBox({
  templates,
  onPick,
  ariaLabel,
  placeholder,
  listId,
}: {
  templates: CompanyTextTemplateRow[];
  onPick: (body: string) => void;
  ariaLabel: string;
  placeholder: string;
  listId: string;
}) {
  const [query, setQuery] = useState("");
  if (templates.length === 0) return null;

  return (
    <div className="space-y-1">
      <input
        list={listId}
        aria-label={ariaLabel}
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          const t = templates.find(
            (x) =>
              x.name.toLowerCase() === next.toLowerCase() ||
              x.code.toLowerCase() === next.toLowerCase(),
          );
          if (t) onPick(t.body);
        }}
        placeholder={placeholder}
        className={`${fieldClass} py-1.5 text-xs`}
      />
      <datalist id={listId}>
        {templates.map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>
    </div>
  );
}

export function FinanceQuotationForm({
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
  onQuotationDateChange,
  quotationReturnUrl,
  sealSignImageUrl,
  notesTemplates = [],
  termsTemplates = [],
  scopeTemplates = [],
}: {
  visible: boolean;
  overlay?: boolean;
  formValues: QuotationFormState;
  isNewParam: boolean;
  idParam: string | null;
  clientOptions: AppDropdownOptionRow[];
  productOptions: AppDropdownOptionRow[];
  productById: Map<string, ProductMasterOptionRow>;
  onClose: () => void;
  onAddNew: () => void;
  onUpdateField: (key: keyof QuotationFormState, value: string) => void; // quotation_type: 'service' | 'supply'
  onUpdateLine: (index: number, patch: Partial<QuotationLineForm>) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  onQuotationDateChange: (iso: string) => void;
  /** Current quotation URL (path + ?new=1 or ?id=) for “add client” return navigation. */
  quotationReturnUrl: string;
  sealSignImageUrl: string | null;
  notesTemplates?: CompanyTextTemplateRow[];
  termsTemplates?: CompanyTextTemplateRow[];
  scopeTemplates?: CompanyTextTemplateRow[];
}) {
  const router = useRouter();

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
    ? "px-4 py-5"
    : "rounded-b-lg border-t border-zinc-200 bg-zinc-50/90 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900/40";

  return (
    <div className={rootClass}>
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
          <div>
            <h2
              id="finance-quotation-form-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {isNewParam
                ? "New quotation"
                : idParam
                  ? "Edit quotation"
                  : "Quotation"}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isNewParam ? (
              <button
                type="button"
                onClick={onAddNew}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Add New Quotation
              </button>
            ) : null}
            <DialogCloseXButton onClick={onClose} />
          </div>
        </div>

        <form action={saveFinanceQuotation} className="space-y-5">
          <input type="hidden" name="id" value={formValues.id} />
          <input type="hidden" name="lines_json" value={linesJson} />

          <div className="flex flex-col gap-4">
            {/* Line 1: quotation number, dates, type */}
            <div className="flex min-w-0 flex-col gap-2">
              <div className="-mx-0.5 flex flex-nowrap items-end gap-3 overflow-x-auto pb-0.5 pt-0.5 sm:gap-4">
                <div className="min-w-0 shrink-0 space-y-1.5">
                  <span className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>
                    Quotation Number
                  </span>
                  <div
                    className={quotationNumberSplitShell}
                    role="group"
                    aria-label="Quotation number"
                  >
                    <input
                      id="finance-quotation-number-prefix"
                      name="quotation_number_prefix"
                      type="text"
                      aria-label="Prefix"
                      value={formValues.quotation_number_prefix}
                      onChange={(e) =>
                        onUpdateField(
                          "quotation_number_prefix",
                          e.target.value,
                        )
                      }
                      placeholder={formValues.id ? undefined : "QT-2026-"}
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
                      name="quotation_number_value"
                      type="text"
                      aria-label="Number"
                      value={formValues.quotation_number_value}
                      onChange={(e) =>
                        onUpdateField(
                          "quotation_number_value",
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
                <div className="min-w-[10.5rem] shrink-0 space-y-1.5">
                  <label
                    className={CLIENT_FIELD_LABEL_BLOCK_CLASS}
                    htmlFor="finance-quotation-date"
                  >
                    Date of Quotation
                  </label>
                  <input
                    id="finance-quotation-date"
                    type="date"
                    name="quotation_date"
                    required
                    value={formValues.quotation_date}
                    onChange={(e) => {
                      const v = e.target.value;
                      onQuotationDateChange(v);
                    }}
                    className={fieldClass}
                  />
                </div>
                <div className="min-w-[10.5rem] shrink-0 space-y-1.5">
                  <label
                    className={CLIENT_FIELD_LABEL_BLOCK_CLASS}
                    htmlFor="finance-quotation-expiry"
                  >
                    Date of Expire
                  </label>
                  <input
                    id="finance-quotation-expiry"
                    type="date"
                    name="expiry_date"
                    required
                    value={formValues.expiry_date}
                    onChange={(e) =>
                      onUpdateField("expiry_date", e.target.value)
                    }
                    className={fieldClass}
                  />
                </div>
                <div className="min-w-[9rem] shrink-0 space-y-1.5">
                  <label
                    className={CLIENT_FIELD_LABEL_BLOCK_CLASS}
                    htmlFor="finance-quotation-type"
                  >
                    Type
                  </label>
                  <select
                    id="finance-quotation-type"
                    name="quotation_type"
                    value={formValues.quotation_type}
                    onChange={(e) =>
                      onUpdateField("quotation_type", e.target.value)
                    }
                    className={fieldClass}
                  >
                    <option value="service">Service</option>
                    <option value="supply">Supply</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line 2: client */}
            <div className="min-w-0 space-y-2">
              <ClientDropdownField
                optionKey={DROPDOWN_KEY_FINANCE_QUOTATION_CLIENT}
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
                onSuffixButtonClick={() => {
                  const rt = encodeURIComponent(quotationReturnUrl);
                  router.push(
                    `/dashboard/clients?new=1&return_to=${rt}`,
                  );
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>
              Product &amp; Services
            </label>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col style={{ width: "40%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "1.5rem" }} />
                </colgroup>
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <tr>
                    <th className="px-2 py-2 text-left">Item</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">Unit</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">Qty</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">Rate</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">Discount</th>
                    <th className="whitespace-nowrap px-2 py-2 text-center">GST</th>
                    <th className="whitespace-nowrap px-2 py-2 text-right">Total</th>
                    <th className="whitespace-nowrap px-1 py-2 text-center" aria-hidden="true" />
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
                                    return (
                                      <>
                                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                          {title}
                                        </p>
                                        {p?.description?.trim() ? (
                                          <p className="text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                                            {p.description.trim()}
                                          </p>
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
                          />
                        </td>
                        <td className="min-w-0 px-2 py-1.5 align-top text-center">
                          <input
                            value={L.qty}
                            onChange={(e) => onUpdateLine(i, { qty: e.target.value })}
                            inputMode="decimal"
                            className={`${fieldClass} min-w-0 text-center`}
                          />
                        </td>
                        <td className="min-w-0 px-2 py-1.5 align-top text-center">
                          <input
                            value={L.unit_rate}
                            onChange={(e) =>
                              onUpdateLine(i, { unit_rate: e.target.value })
                            }
                            inputMode="decimal"
                            className={`${fieldClass} min-w-0 text-center`}
                          />
                        </td>
                        <td className="min-w-0 px-2 py-1.5 align-top text-center">
                          <input
                            value={L.line_discount}
                            onChange={(e) =>
                              onUpdateLine(i, { line_discount: e.target.value })
                            }
                            placeholder="0%"
                            className={`${fieldClass} min-w-0 text-center`}
                          />
                        </td>
                        <td className="min-w-0 px-2 py-1.5 align-top text-center">
                          <input
                            value={L.gst_rate}
                            onChange={(e) => onUpdateLine(i, { gst_rate: e.target.value })}
                            className={`${fieldClass} min-w-0 text-center`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center tabular-nums text-zinc-800 dark:text-zinc-200 align-top">
                          {pv.tot.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="w-min px-[0.225rem] py-[0.36rem] text-center align-middle">
                          {isLastRow ? (
                            <button
                              type="button"
                              onClick={onAddLine}
                              className="rounded p-1 text-[1.3em] leading-none text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40"
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
                    {totalsPreview.basic.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
                <p className="text-right font-medium">
                  GST -{" "}
                  <span className="tabular-nums">
                    {totalsPreview.gst.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
                <p className="text-right font-semibold">
                  Grand Total -{" "}
                  <span className="tabular-nums">
                    {totalsPreview.grand.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
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
              <CompanyTemplateSearchBox
                templates={notesTemplates}
                onPick={(body) => onUpdateField("notes", body)}
                ariaLabel="Search notes from company settings template"
                placeholder="Search Company Setting Notes..."
                listId="company-notes-template-list"
              />
              <textarea
                name="notes"
                rows={5}
                value={formValues.notes}
                onChange={(e) => onUpdateField("notes", e.target.value)}
                className={`${fieldClass} min-h-[8rem]`}
              />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col space-y-2">
              <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Term &amp; Condition</label>
              <CompanyTemplateSelect
                templates={termsTemplates}
                onPick={(body) => onUpdateField("terms_and_conditions", body)}
                ariaLabel="Insert terms and conditions from company settings template"
              />
              <textarea
                name="terms_and_conditions"
                rows={5}
                value={formValues.terms_and_conditions}
                onChange={(e) => onUpdateField("terms_and_conditions", e.target.value)}
                className={`${fieldClass} min-h-[8rem]`}
              />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col space-y-2">
              <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Scope of Work</label>
              <CompanyTemplateSelect
                templates={scopeTemplates}
                onPick={(body) => onUpdateField("scope_of_work", body)}
                ariaLabel="Insert scope of work from company settings template"
              />
              <textarea
                name="scope_of_work"
                rows={5}
                value={formValues.scope_of_work}
                onChange={(e) => onUpdateField("scope_of_work", e.target.value)}
                className={`${fieldClass} min-h-[8rem]`}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Bank Details</label>
              <textarea
                name="bank_details"
                rows={4}
                value={formValues.bank_details}
                onChange={(e) => onUpdateField("bank_details", e.target.value)}
                className={fieldClass}
                placeholder={"Bank Name -\nAccount No -\nIFSC Code -\nBranch Name -"}
              />
            </div>
            <div className="space-y-2">
              <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Seal &amp; sign</label>
              {sealSignImageUrl ? (
                <div className="flex justify-end rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/60">
                  <img
                    src={sealSignImageUrl}
                    alt="Company seal and sign"
                    className="max-h-40 max-w-full rounded-md border border-zinc-200 object-contain dark:border-zinc-700"
                  />
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No seal &amp; sign image found in Company Settings.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
            >
              Save quotation
            </button>
          </div>
        </form>

        {formValues.id ? (
          <form action={deleteFinanceQuotationForm} className="mt-3 flex flex-wrap gap-3">
            <input type="hidden" name="id" value={formValues.id} />
            <button
              type="submit"
              className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Delete quotation
            </button>
          </form>
        ) : null}
    </div>
  );
}
