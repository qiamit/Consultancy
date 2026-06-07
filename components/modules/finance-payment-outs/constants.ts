import type { FinancePaymentOutRow } from "@/lib/types/finance-payment-out";

export const PAYMENT_OUT_LIST_PATH = "/dashboard/finance/purchase/payment-out";

export type PaymentInFormState = {
  id: string;
  client_id: string;
  amount: string;
  currency: string;
  mode_of_payment:
    | "cash"
    | "bank"
    | "upi"
    | "card"
    | "cheque"
    | "neft_rtgs"
    | "other";
  txn_date: string;
  status: "pending" | "paid" | "partial" | "written_off";
  description: string;
  notes: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyForm(): PaymentInFormState {
  return {
    id: "",
    client_id: "",
    amount: "0",
    currency: "INR",
    mode_of_payment: "bank",
    txn_date: todayISO(),
    status: "pending",
    description: "",
    notes: "",
  };
}

export function rowToForm(row: FinancePaymentOutRow): PaymentInFormState {
  return {
    id: row.id,
    client_id: row.client_id ?? "",
    amount: String(row.amount),
    currency: row.currency ?? "INR",
    mode_of_payment: row.mode_of_payment ?? "bank",
    txn_date: row.txn_date,
    status: row.status ?? "pending",
    description: row.description ?? "",
    notes: row.notes ?? "",
  };
}


