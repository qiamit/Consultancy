export type FinanceQuotationLineRow = {
  id: string;
  quotation_id: string;
  sort_order: number;
  product_master_item_id: string | null;
  item_description: string | null;
  unit_of_item: string | null;
  qty: number;
  unit_rate: number;
  line_discount: string | null;
  gst_rate: string | null;
  line_subtotal: number;
  line_tax: number;
  line_total: number;
};

export type FinanceQuotationRow = {
  id: string;
  quotation_number: string;
  quotation_status: "pending" | "accepted" | "cancelled";
  quotation_date: string;
  expiry_date: string;
  client_id: string | null;
  quotation_type: "service" | "supply";
  notes: string | null;
  terms_and_conditions: string | null;
  scope_of_work: string | null;
  bank_details: string | null;
  seal_and_sign: string | null;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    company_name: string | null;
  } | null;
  finance_quotation_lines?: FinanceQuotationLineRow[];
};

export type ProductMasterOptionRow = {
  id: string;
  item_code: string;
  name: string;
  description: string | null;
  unit_of_item: string;
  sale_price: number;
  gst_rate: string;
  category: string;
};
