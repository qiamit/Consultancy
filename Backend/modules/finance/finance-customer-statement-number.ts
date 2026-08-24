export function splitProformaInvoiceNumberForForm(full: string): {
  customer_statement_number_prefix: string;
  customer_statement_number_value: string;
} {
  const t = full.trim();
  if (!t) {
    return { customer_statement_number_prefix: "", customer_statement_number_value: "" };
  }
  const i = t.lastIndexOf("-");
  if (i <= 0) {
    return { customer_statement_number_prefix: "", customer_statement_number_value: t };
  }
  return {
    customer_statement_number_prefix: t.slice(0, i + 1),
    customer_statement_number_value: t.slice(i + 1),
  };
}

export function joinProformaInvoiceNumberParts(prefix: string, value: string): string {
  return `${prefix.trim()}${value.trim()}`;
}
