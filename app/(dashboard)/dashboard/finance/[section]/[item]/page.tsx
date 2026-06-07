import { notFound } from "next/navigation";
import { FinanceQuotationsServer } from "@/components/modules/finance-quotations";
import { FinanceCreditNotesServer } from "@/components/modules/finance-credit-notes";
import { FinanceCustomerStatementsServer } from "@/components/modules/finance-customer-statements";
import { FinancePaymentInsServer } from "@/components/modules/finance-payment-ins";
import { FinancePaymentOutsServer } from "@/components/modules/finance-payment-outs";
import { FinanceProformaInvoicesServer } from "@/components/modules/finance-proforma-invoices";
import { FinanceSalesOrdersServer } from "@/components/modules/finance-sales-orders";
import { FinanceTaxInvoicesServer } from "@/components/modules/finance-tax-invoices";
import {
  FinanceModuleShell,
  FinancePlaceholderPanel,
  FinanceTransactionNewForm,
  FinanceTransactionTable,
  findFinanceNavItem,
  financeItemPath,
} from "@/components/modules/finance";

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

const QUERY_ERROR_MESSAGES: Record<string, string> = {
  amount: "Enter a valid amount.",
  db: "Could not save the entry. Check your connection and try again.",
  upload: "Upload failed.",
  dates: "Quotation and expiry dates are required.",
  type: "Invalid quotation type.",
  lines: "Add at least one line with quantity, rate, or product.",
  quotation_number_required: "Quotation number is required.",
  quotation_number_duplicate:
    "That quotation number is already in use. Choose a different number.",
  sales_order_number_required: "Sales order number is required.",
  sales_order_number_duplicate:
    "That sales order number is already in use. Choose a different number.",
  proforma_invoice_number_required: "Proforma number is required.",
  proforma_invoice_number_duplicate:
    "That proforma number is already in use. Choose a different number.",
  tax_invoice_number_required: "Tax invoice number is required.",
  tax_invoice_number_duplicate:
    "That tax invoice number is already in use. Choose a different number.",
  credit_note_number_required: "Credit note number is required.",
  credit_note_number_duplicate:
    "That credit note number is already in use. Choose a different number.",
  customer_statement_number_required: "Customer statement number is required.",
  customer_statement_number_duplicate:
    "That customer statement number is already in use. Choose a different number.",
};

export default async function FinanceModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; item: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section: sectionId, item: itemSlug } = await params;
  const sp = await searchParams;
  const meta = findFinanceNavItem(sectionId, itemSlug);
  if (!meta) notFound();

  const { section, item } = meta;
  const breadcrumb = `Finance / ${section.title} / ${item.label}`;
  const href = financeItemPath(section.id, item.slug);
  const queryError = firstSearchParam(sp, "error");
  const errMsg = queryError ? QUERY_ERROR_MESSAGES[queryError] ?? null : null;

  const livePaymentIn =
    section.id === "sales" && item.slug === "payment-in" && item.implemented;
  const livePaymentOut =
    section.id === "purchase" && item.slug === "payment-out" && item.implemented;
  const liveCashBook =
    section.id === "accounting" &&
    item.slug === "cash-bank-book" &&
    item.implemented;
  const livePurchaseRequisition =
    section.id === "purchase" &&
    item.slug === "purchase-requisition" &&
    item.implemented;
  const livePurchaseOrder =
    section.id === "purchase" &&
    item.slug === "purchase-order" &&
    item.implemented;
  const livePurchaseInvoice =
    section.id === "purchase" &&
    item.slug === "purchase-invoice" &&
    item.implemented;
  const livePurchaseDebitNote =
    section.id === "purchase" &&
    item.slug === "debit-note" &&
    item.implemented;
  const liveExpenseManagement =
    section.id === "purchase" &&
    item.slug === "expense-management" &&
    item.implemented;
  const liveQuotationEstimate =
    section.id === "sales" &&
    item.slug === "quotation-estimate" &&
    item.implemented;

  const liveSalesOrder =
    section.id === "sales" &&
    item.slug === "sales-order" &&
    item.implemented;

  const liveProformaInvoice =
    section.id === "sales" &&
    item.slug === "proforma-invoice" &&
    item.implemented;
  const liveTaxInvoice =
    section.id === "sales" &&
    item.slug === "tax-invoice" &&
    item.implemented;
  const liveCreditNote =
    section.id === "sales" &&
    item.slug === "credit-note" &&
    item.implemented;
  const liveCustomerStatement =
    section.id === "sales" &&
    item.slug === "customer-statement" &&
    item.implemented;

  if (liveCustomerStatement) {
    return <FinanceCustomerStatementsServer searchParams={searchParams} />;
  }

  if (liveCreditNote) {
    return <FinanceCreditNotesServer searchParams={searchParams} />;
  }

  if (liveTaxInvoice) {
    return <FinanceTaxInvoicesServer searchParams={searchParams} />;
  }

  if (livePaymentIn) {
    return <FinancePaymentInsServer searchParams={searchParams} />;
  }

  if (livePurchaseRequisition) {
    return <FinanceQuotationsServer searchParams={searchParams} />;
  }

  if (livePurchaseOrder) {
    return <FinanceSalesOrdersServer searchParams={searchParams} />;
  }

  if (livePurchaseInvoice) {
    return <FinanceTaxInvoicesServer searchParams={searchParams} />;
  }

  if (livePurchaseDebitNote) {
    return <FinanceCreditNotesServer searchParams={searchParams} />;
  }

  if (liveExpenseManagement) {
    return <FinanceCustomerStatementsServer searchParams={searchParams} />;
  }

  if (liveProformaInvoice) {
    return <FinanceProformaInvoicesServer searchParams={searchParams} />;
  }

  if (liveSalesOrder) {
    return <FinanceSalesOrdersServer searchParams={searchParams} />;
  }

  if (liveQuotationEstimate) {
    return <FinanceQuotationsServer searchParams={searchParams} />;
  }

  if (livePaymentOut) {
    return <FinancePaymentOutsServer searchParams={searchParams} />;
  }

  if (liveCashBook) {
    return (
      <FinanceModuleShell
        breadcrumb={breadcrumb}
        title={item.label}
        description={item.description}
      >
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Record new lines from{" "}
          <a
            href={financeItemPath("sales", "payment-in")}
            className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
          >
            Sales → Payment IN
          </a>{" "}
          or{" "}
          <a
            href={financeItemPath("purchase", "payment-out")}
            className="font-medium text-sky-600 underline-offset-2 hover:underline dark:text-sky-400"
          >
            Purchase → Payment OUT
          </a>
          . This register shows everything together.
        </p>
        <FinanceTransactionTable />
      </FinanceModuleShell>
    );
  }

  return (
    <FinancePlaceholderPanel
      breadcrumb={breadcrumb}
      title={item.label}
      description={item.description}
    />
  );
}
