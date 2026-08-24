export type FinanceSalesOrderLineRow = {
  id: string;
  sales_order_id: string;
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

export type FinanceSalesOrderRow = {
  id: string;
  sales_order_number: string;
  order_status: "pending" | "accepted" | "cancelled";
  order_date: string;
  expected_delivery_date: string;
  client_id: string | null;
  quotation_id: string | null;
  order_type: "service" | "supply";
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
  /** Embedded FK row when `quotation_id` is set. */
  finance_quotations?: { quotation_number: string } | null;
  finance_sales_order_lines?: FinanceSalesOrderLineRow[];
};
