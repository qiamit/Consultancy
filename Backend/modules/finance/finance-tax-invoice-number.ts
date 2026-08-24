export function splitProformaInvoiceNumberForForm(full: string): {
  tax_invoice_number_prefix: string;
  tax_invoice_number_value: string;
} {
  const t = full.trim();
  if (!t) {
    return { tax_invoice_number_prefix: "", tax_invoice_number_value: "" };
  }
  const i = t.lastIndexOf("-");
  if (i <= 0) {
    return { tax_invoice_number_prefix: "", tax_invoice_number_value: t };
  }
  return {
    tax_invoice_number_prefix: t.slice(0, i + 1),
    tax_invoice_number_value: t.slice(i + 1),
  };
}

export function joinProformaInvoiceNumberParts(prefix: string, value: string): string {
  return `${prefix.trim()}${value.trim()}`;
}
