import Link from "next/link";
import {
  FINANCE_SECTIONS,
  financeItemPath,
} from "@/components/modules/finance";
import { FinanceQEButton } from "@/components/modules/finance/finance-qe-button";

const SECTION_META: Record<
  string,
  { icon: string; accent: string; cardBg: string; cardBorder: string; cardHover: string; iconBg: string; titleColor: string; badgeBg: string; arrowColor: string }
> = {
  sales: {
    icon: "💰",
    accent: "from-sky-900/60 to-sky-950/80 border-sky-800/60",
    cardBg: "bg-sky-950/20 dark:bg-sky-950/30",
    cardBorder: "border-sky-800/40",
    cardHover: "hover:bg-sky-900/30 hover:border-sky-700/60",
    iconBg: "bg-sky-900/50",
    titleColor: "text-sky-300",
    badgeBg: "bg-sky-900/60 text-sky-200 ring-sky-700/50",
    arrowColor: "text-sky-500",
  },
  purchase: {
    icon: "🛒",
    accent: "from-violet-900/60 to-violet-950/80 border-violet-800/60",
    cardBg: "bg-violet-950/20 dark:bg-violet-950/30",
    cardBorder: "border-violet-800/40",
    cardHover: "hover:bg-violet-900/30 hover:border-violet-700/60",
    iconBg: "bg-violet-900/50",
    titleColor: "text-violet-300",
    badgeBg: "bg-violet-900/60 text-violet-200 ring-violet-700/50",
    arrowColor: "text-violet-500",
  },
  accounting: {
    icon: "📒",
    accent: "from-emerald-900/60 to-emerald-950/80 border-emerald-800/60",
    cardBg: "bg-emerald-950/20 dark:bg-emerald-950/30",
    cardBorder: "border-emerald-800/40",
    cardHover: "hover:bg-emerald-900/30 hover:border-emerald-700/60",
    iconBg: "bg-emerald-900/50",
    titleColor: "text-emerald-300",
    badgeBg: "bg-emerald-900/60 text-emerald-200 ring-emerald-700/50",
    arrowColor: "text-emerald-500",
  },
  reports: {
    icon: "📊",
    accent: "from-amber-900/60 to-amber-950/80 border-amber-800/60",
    cardBg: "bg-amber-950/20 dark:bg-amber-950/30",
    cardBorder: "border-amber-800/40",
    cardHover: "hover:bg-amber-900/30 hover:border-amber-700/60",
    iconBg: "bg-amber-900/50",
    titleColor: "text-amber-300",
    badgeBg: "bg-amber-900/60 text-amber-200 ring-amber-700/50",
    arrowColor: "text-amber-500",
  },
  taxation: {
    icon: "🧾",
    accent: "from-rose-900/60 to-rose-950/80 border-rose-800/60",
    cardBg: "bg-rose-950/20 dark:bg-rose-950/30",
    cardBorder: "border-rose-800/40",
    cardHover: "hover:bg-rose-900/30 hover:border-rose-700/60",
    iconBg: "bg-rose-900/50",
    titleColor: "text-rose-300",
    badgeBg: "bg-rose-900/60 text-rose-200 ring-rose-700/50",
    arrowColor: "text-rose-500",
  },
};

const MODULE_ICONS: Record<string, string> = {
  "quotation-estimate": "📋",
  "sales-order": "📦",
  "proforma-invoice": "🧾",
  "tax-invoice": "🏷️",
  "credit-note": "↩️",
  "payment-in": "⬇️",
  "customer-statement": "📄",
  "purchase-requisition": "📝",
  "purchase-order": "🛍️",
  "purchase-invoice": "🧾",
  "debit-note": "📌",
  "payment-out": "⬆️",
  "expense-management": "💸",
  "chart-of-accounts": "🗂️",
  "journal-entries": "📓",
  "general-ledger": "📚",
  "bank-reconciliation": "🏦",
  "cash-bank-book": "💵",
  "trial-balance": "⚖️",
  "profit-and-loss": "📈",
  "balance-sheet": "🏛️",
  "accounts-receivable": "📥",
  "accounts-payable": "📤",
  "cash-flow-statement": "🌊",
  "gst-vat-reports": "🧮",
  "tds-tcs-management": "📑",
  "audit-logs": "🔍",
};

export default function FinanceOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Finance Management
        </h1>
        <FinanceQEButton />
      </div>

      {/* Section blocks */}
      {FINANCE_SECTIONS.map((section) => {
        const meta = SECTION_META[section.id];
        return (
          <div key={section.id} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{meta.icon}</span>
              <h2 className={`text-base font-bold ${meta.titleColor}`}>
                {section.title}
              </h2>
              <span
                className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${meta.badgeBg}`}
              >
                {section.items.length} modules
              </span>
            </div>

            {/* Module cards grid */}
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {section.items.map((item) => {
                const href = financeItemPath(section.id, item.slug);
                const moduleIcon = MODULE_ICONS[item.slug] ?? "📄";
                return (
                  <Link
                    key={item.slug}
                    href={href}
                    className={`group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 shadow-sm transition ${meta.cardBg} ${meta.cardBorder} ${meta.cardHover}`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm ${meta.iconBg}`}
                    >
                      {moduleIcon}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-100">
                      {item.label}
                    </p>
                    <span className={`shrink-0 text-xs font-bold transition group-hover:translate-x-0.5 ${meta.arrowColor}`}>
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
