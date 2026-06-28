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
  FinanceTransactionTable,
  findFinanceNavItem,
  financeItemPath,
} from "@/components/modules/finance";

export default async function FinanceModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string; item: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section: sectionId, item: itemSlug } = await params;
  const meta = findFinanceNavItem(sectionId, itemSlug);
  if (!meta) notFound();

  const { section, item } = meta;
  const breadcrumb = `Finance / ${section.title} / ${item.label}`;

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
      slug={item.slug}
    />
  );
}
