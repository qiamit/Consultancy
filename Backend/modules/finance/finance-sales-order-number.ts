/** Split stored sales_order_number at the last hyphen for prefix / value fields. */
export function splitSalesOrderNumberForForm(full: string): {
  sales_order_number_prefix: string;
  sales_order_number_value: string;
} {
  const t = full.trim();
  if (!t) {
    return { sales_order_number_prefix: "", sales_order_number_value: "" };
  }
  const i = t.lastIndexOf("-");
  if (i <= 0) {
    return { sales_order_number_prefix: "", sales_order_number_value: t };
  }
  return {
    sales_order_number_prefix: t.slice(0, i + 1),
    sales_order_number_value: t.slice(i + 1),
  };
}

export function joinSalesOrderNumberParts(prefix: string, value: string): string {
  return `${prefix.trim()}${value.trim()}`;
}
