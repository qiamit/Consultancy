export function splitProformaInvoiceNumberForForm(full: string): {
  proforma_invoice_number_prefix: string;
  proforma_invoice_number_value: string;
} {
  const t = full.trim();
  if (!t) {
    return { proforma_invoice_number_prefix: "", proforma_invoice_number_value: "" };
  }
  const i = t.lastIndexOf("-");
  if (i <= 0) {
    return { proforma_invoice_number_prefix: "", proforma_invoice_number_value: t };
  }
  return {
    proforma_invoice_number_prefix: t.slice(0, i + 1),
    proforma_invoice_number_value: t.slice(i + 1),
  };
}

export function joinProformaInvoiceNumberParts(prefix: string, value: string): string {
  return `${prefix.trim()}${value.trim()}`;
}
