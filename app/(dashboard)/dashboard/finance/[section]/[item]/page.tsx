import { notFound } from "next/navigation";
import { FinanceQuotationsServer } from "@/components/modules/finance-quotations";
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
  const liveQuotationEstimate =
    section.id === "sales" &&
    item.slug === "quotation-estimate" &&
    item.implemented;

  if (liveQuotationEstimate) {
    return <FinanceQuotationsServer searchParams={searchParams} />;
  }

  if (livePaymentIn) {
    return (
      <div className="space-y-4">
        {errMsg ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {errMsg}
          </p>
        ) : null}
        <FinanceModuleShell
          breadcrumb={breadcrumb}
          title={item.label}
          description={item.description}
        >
          <div className="space-y-6">
            <FinanceTransactionNewForm paymentFlow="in" redirectPath={href} />
            <div>
              <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Recent receipts
              </h2>
              <FinanceTransactionTable flow="in" />
            </div>
          </div>
        </FinanceModuleShell>
      </div>
    );
  }

  if (livePaymentOut) {
    return (
      <div className="space-y-4">
        {errMsg ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {errMsg}
          </p>
        ) : null}
        <FinanceModuleShell
          breadcrumb={breadcrumb}
          title={item.label}
          description={item.description}
        >
          <div className="space-y-6">
            <FinanceTransactionNewForm paymentFlow="out" redirectPath={href} />
            <div>
              <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Recent payments
              </h2>
              <FinanceTransactionTable flow="out" />
            </div>
          </div>
        </FinanceModuleShell>
      </div>
    );
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
