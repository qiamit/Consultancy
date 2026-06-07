export type FinancePaymentOutRow = {
  id: string;
  client_id: string | null;
  payment_flow: "out";
  txn_date: string;
  amount: number;
  currency: string;
  mode_of_payment:
    | "cash"
    | "bank"
    | "upi"
    | "card"
    | "cheque"
    | "neft_rtgs"
    | "other";
  status: "pending" | "paid" | "partial" | "written_off";
  description: string | null;
  notes: string | null;
  created_at: string;
  clients?: {
    name: string;
    company_name: string | null;
  } | null;
};


