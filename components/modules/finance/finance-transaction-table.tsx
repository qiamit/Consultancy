import { createClient } from "@/lib/supabase/server";

type TxnRow = {
  id: string;
  amount: string | number;
  currency: string;
  txn_date: string;
  status: string;
  description: string | null;
  payment_flow: string | null;
  clients: unknown;
};

function clientLabel(raw: unknown): string {
  const client = Array.isArray(raw)
    ? (raw[0] as { name: string; company_name: string | null } | undefined)
    : (raw as { name: string; company_name: string | null } | null);
  if (!client) return "—";
  return client.company_name
    ? `${client.name} (${client.company_name})`
    : client.name;
}

export async function FinanceTransactionTable({
  flow,
  limit = 100,
}: {
  /** When set, filter by `payment_flow`; omit for cash/bank book (all). */
  flow?: "in" | "out";
  limit?: number;
}) {
  const supabase = await createClient();
  let q = supabase
    .from("transactions")
    .select(
      "id,amount,currency,txn_date,status,description,payment_flow,clients(name,company_name)",
    );
  if (flow) {
    q = q.eq("payment_flow", flow);
  }
  const { data: rows, error } = await q
    .order("txn_date", { ascending: false })
    .limit(limit);

  const list = (rows ?? []) as unknown as TxnRow[];

  const emptyMessage =
    flow === "in"
      ? "No payment receipts yet. Use New entry above."
      : flow === "out"
        ? "No outward payments yet. Use New entry above."
        : "No cash or bank movements yet. Record receipts under Sales → Payment IN and payments under Purchase → Payment OUT.";

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
      {error ? (
        <p className="px-4 py-4 text-sm text-red-700 dark:text-red-300">
          {error.message}
        </p>
      ) : (
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              {!flow ? (
                <th className="px-4 py-3">Direction</th>
              ) : null}
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {list.length === 0 ? (
              <tr>
                <td
                  colSpan={flow ? 5 : 6}
                  className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              list.map((r) => {
                const pf = (r.payment_flow ?? "in") === "out" ? "out" : "in";
                return (
                  <tr
                    key={r.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    {!flow ? (
                      <td className="px-4 py-3">
                        <span
                          className={
                            pf === "in"
                              ? "rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                              : "rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                          }
                        >
                          {pf === "in" ? "IN" : "OUT"}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {r.txn_date}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {clientLabel(r.clients)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-900 dark:text-zinc-100">
                      {r.amount} {r.currency}
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-300">
                      {r.status}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.description ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
