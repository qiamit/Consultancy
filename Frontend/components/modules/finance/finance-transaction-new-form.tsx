import { createTransaction } from "@backend/actions/finance";
import { ClientSelect } from "@/components/dashboard/client-select";
import { CLIENT_FIELD_LABEL_BLOCK_CLASS } from "@/components/modules/client-master/constants";
import { FINANCE_FIELD_CLASS } from "./constants";

export async function FinanceTransactionNewForm({
  paymentFlow,
  redirectPath,
}: {
  paymentFlow: "in" | "out";
  redirectPath: string;
}) {
  const flowLabel = paymentFlow === "in" ? "receipt" : "payment";

  return (
    <section className="rounded-md border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:p-5">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        New entry
      </h2>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        Record a {flowLabel} linked to a client where applicable. Amounts are stored
        as positive numbers; direction is tracked as{" "}
        {paymentFlow === "in" ? "Payment IN" : "Payment OUT"}.
      </p>
      <form
        action={createTransaction}
        className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <input type="hidden" name="payment_flow" value={paymentFlow} />
        <input type="hidden" name="redirect_path" value={redirectPath} />
        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Client</label>
          <ClientSelect />
        </div>
        <div className="space-y-2">
          <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Amount</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            required
            className={FINANCE_FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Currency</label>
          <input
            name="currency"
            defaultValue="INR"
            className={FINANCE_FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Date</label>
          <input
            name="txn_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={FINANCE_FIELD_CLASS}
          />
        </div>
        <div className="space-y-2">
          <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Status</label>
          <select name="status" defaultValue="pending" className={FINANCE_FIELD_CLASS}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="written_off">Written off</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Description</label>
          <input name="description" className={FINANCE_FIELD_CLASS} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className={CLIENT_FIELD_LABEL_BLOCK_CLASS}>Notes</label>
          <textarea name="notes" rows={2} className={FINANCE_FIELD_CLASS} />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
          >
            Save entry
          </button>
        </div>
      </form>
    </section>
  );
}
