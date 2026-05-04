export type ProductMasterRow = {
  id: string;
  category: "product" | "service";
  item_code: string;
  name: string;
  description: string | null;
  make: string | null;
  unit_of_item: string;
  hsn_code: string | null;
  gst_rate: string;
  mrp: number | null;
  sale_price: number | null;
  purchase_price: number | null;
  opening_stock: string | null;
  low_stock_value: string | null;
  created_at: string;
};
