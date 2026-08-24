export type FinanceProformaInvoiceLineRow = {
  id: string;
  proforma_invoice_id: string;
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

export type FinanceProformaInvoiceRow = {
  id: string;
  proforma_invoice_number: string;
  proforma_status: "pending" | "accepted" | "cancelled";
  proforma_date: string;
  valid_until_date: string;
  client_id: string | null;
  sales_order_id: string | null;
  invoice_type: "service" | "supply";
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
  finance_sales_orders?: { sales_order_number: string } | null;
  finance_proforma_invoice_lines?: FinanceProformaInvoiceLineRow[];
};
