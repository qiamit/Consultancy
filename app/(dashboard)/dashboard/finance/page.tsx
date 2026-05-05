import Link from "next/link";
import {
  FINANCE_SECTIONS,
  financeItemPath,
} from "@/components/modules/finance";
import { createClient } from "@/lib/supabase/server";

export default async function FinanceOverviewPage() {
  const supabase = await createClient();

  const [inbound, outbound, allTx] = await Promise.all([
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("payment_flow", "in"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("payment_flow", "out"),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
  ]);

  const nIn = inbound.count ?? 0;
  const nOut = outbound.count ?? 0;
  const nAll = allTx.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Finance Management Dashboard
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href={financeItemPath("sales", "payment-in")}
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-700"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Payment IN
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {nIn}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Receipts recorded</p>
        </Link>
        <Link
          href={financeItemPath("purchase", "payment-out")}
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-700"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Payment OUT
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {nOut}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Payments recorded</p>
        </Link>
        <Link
          href={financeItemPath("accounting", "cash-bank-book")}
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-700"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Cash / Bank book
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {nAll}
          </p>
          <p className="mt-1 text-xs text-zinc-500">All movements</p>
        </Link>
      </div>

      <div className="space-y-6">
        {FINANCE_SECTIONS.map((section) => (
          <section
            key={section.id}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <header className="border-b border-zinc-200 bg-zinc-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-5">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {section.title}
              </h2>
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                {section.subtitle}
              </p>
            </header>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {section.items.map((item) => {
                const href = financeItemPath(section.id, item.slug);
                return (
                  <li key={item.slug}>
                    <Link
                      href={href}
                      className="flex flex-col gap-1 px-4 py-3 transition hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:hover:bg-zinc-800/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.label}
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {item.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.implemented ? (
                          <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                            Live
                          </span>
                        ) : (
                          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            Coming soon
                          </span>
                        )}
                        <span className="text-sky-600 text-sm font-medium dark:text-sky-400">
                          Open →
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
