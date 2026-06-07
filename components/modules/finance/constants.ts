/** Shared field styling (aligned with Client Master forms). */
export const FINANCE_FIELD_CLASS =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

export type FinanceSectionId =
  | "sales"
  | "purchase"
  | "accounting"
  | "reports"
  | "taxation";

export type FinanceNavItem = {
  slug: string;
  label: string;
  description: string;
  /** Wired to real data / actions; others show a Client Master–style placeholder. */
  implemented: boolean;
};

export type FinanceSection = {
  id: FinanceSectionId;
  title: string;
  subtitle: string;
  items: FinanceNavItem[];
};

export const FINANCE_SECTIONS: FinanceSection[] = [
  {
    id: "sales",
    title: "Sales",
    subtitle: "Quotations, orders, invoices, and receipts",
    items: [
      {
        slug: "quotation-estimate",
        label: "Quotation / Estimate",
        description:
          "Prepare and track quotations before converting to orders or invoices.",
        implemented: true,
      },
      {
        slug: "sales-order",
        label: "Sales Order",
        description: "Confirm customer orders and delivery terms.",
        implemented: true,
      },
      {
        slug: "proforma-invoice",
        label: "Proforma Invoice",
        description: "Issue proforma invoices for advance or customs use.",
        implemented: true,
      },
      {
        slug: "tax-invoice",
        label: "Tax Invoice",
        description: "GST-compliant tax invoices and numbering.",
        implemented: true,
      },
      {
        slug: "credit-note",
        label: "Credit Note",
        description: "Record sales returns and credit adjustments.",
        implemented: true,
      },
      {
        slug: "payment-in",
        label: "Payment IN",
        description:
          "Record customer receipts against invoices (linked to Client Master).",
        implemented: true,
      },
      {
        slug: "customer-statement",
        label: "Customer Statement",
        description: "Outstanding balances and transaction history by customer.",
        implemented: true,
      },
    ],
  },
  {
    id: "purchase",
    title: "Purchase",
    subtitle: "Requisitions, POs, vendor bills, and payments",
    items: [
      {
        slug: "purchase-requisition",
        label: "Purchase Requisition",
        description: "Internal requests before PO approval.",
        implemented: true,
      },
      {
        slug: "purchase-order",
        label: "Purchase Order (PO) / Work Order",
        description: "Vendor POs and work orders.",
        implemented: true,
      },
      {
        slug: "purchase-invoice",
        label: "Purchase Invoice",
        description: "Record vendor purchase invoices.",
        implemented: true,
      },
      {
        slug: "debit-note",
        label: "Debit Note",
        description: "Purchase-side debit notes and adjustments.",
        implemented: true,
      },
      {
        slug: "payment-out",
        label: "Payment OUT",
        description: "Record vendor payments and outflows.",
        implemented: true,
      },
      {
        slug: "expense-management",
        label: "Expense Management",
        description: "Categorise and approve operating expenses.",
        implemented: true,
      },
    ],
  },
  {
    id: "accounting",
    title: "Accounting & Banking",
    subtitle: "Books, journals, and bank control",
    items: [
      {
        slug: "chart-of-accounts",
        label: "Chart of Accounts",
        description: "Account heads and hierarchy for posting.",
        implemented: false,
      },
      {
        slug: "journal-entries",
        label: "Journal Entries",
        description: "Manual journals and adjustments.",
        implemented: false,
      },
      {
        slug: "general-ledger",
        label: "General Ledger",
        description: "Account-wise ledger movement.",
        implemented: false,
      },
      {
        slug: "bank-reconciliation",
        label: "Bank Reconciliation (BRS)",
        description: "Match bank statements with book entries.",
        implemented: false,
      },
      {
        slug: "cash-bank-book",
        label: "Cash / Bank Book",
        description: "All receipts and payments in one register.",
        implemented: true,
      },
    ],
  },
  {
    id: "reports",
    title: "Financial Reports",
    subtitle: "Statements and working reports",
    items: [
      {
        slug: "trial-balance",
        label: "Trial Balance",
        description: "Closing balances by account.",
        implemented: false,
      },
      {
        slug: "profit-and-loss",
        label: "Profit & Loss (P&L) Statement",
        description: "Income and expenses for a period.",
        implemented: false,
      },
      {
        slug: "balance-sheet",
        label: "Balance Sheet",
        description: "Assets, liabilities, and equity.",
        implemented: false,
      },
      {
        slug: "accounts-receivable",
        label: "Accounts Receivable (AR)",
        description: "Customer-wise ageing and collections.",
        implemented: false,
      },
      {
        slug: "accounts-payable",
        label: "Accounts Payable (AP)",
        description: "Vendor dues and payment planning.",
        implemented: false,
      },
      {
        slug: "cash-flow-statement",
        label: "Cash Flow Statement",
        description: "Operating, investing, and financing cash flows.",
        implemented: false,
      },
    ],
  },
  {
    id: "taxation",
    title: "Taxation",
    subtitle: "GST, TDS, and audit trail",
    items: [
      {
        slug: "gst-vat-reports",
        label: "GST / VAT Reports",
        description: "GSTR-style summaries and reconciliations.",
        implemented: false,
      },
      {
        slug: "tds-tcs-management",
        label: "TDS / TCS Management",
        description: "Withholding certificates and challans.",
        implemented: false,
      },
      {
        slug: "audit-logs",
        label: "Audit Logs",
        description: "Who changed what in finance masters.",
        implemented: false,
      },
    ],
  },
];

const SECTION_BY_ID = new Map(FINANCE_SECTIONS.map((s) => [s.id, s]));

export function financeItemPath(sectionId: FinanceSectionId, itemSlug: string) {
  return `/dashboard/finance/${sectionId}/${itemSlug}`;
}

export function findFinanceNavItem(
  sectionId: string,
  itemSlug: string,
): { section: FinanceSection; item: FinanceNavItem } | null {
  const section = SECTION_BY_ID.get(sectionId as FinanceSectionId);
  if (!section) return null;
  const item = section.items.find((i) => i.slug === itemSlug);
  if (!item) return null;
  return { section, item };
}

export function flattenFinanceNav(): {
  section: FinanceSection;
  item: FinanceNavItem;
  href: string;
}[] {
  const out: { section: FinanceSection; item: FinanceNavItem; href: string }[] =
    [];
  for (const section of FINANCE_SECTIONS) {
    for (const item of section.items) {
      out.push({
        section,
        item,
        href: financeItemPath(section.id, item.slug),
      });
    }
  }
  return out;
}
