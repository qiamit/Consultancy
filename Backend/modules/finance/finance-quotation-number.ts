/** Split stored quotation_number at the last hyphen for prefix / value fields. */
export function splitQuotationNumberForForm(full: string): {
  quotation_number_prefix: string;
  quotation_number_value: string;
} {
  const t = full.trim();
  if (!t) {
    return { quotation_number_prefix: "", quotation_number_value: "" };
  }
  const i = t.lastIndexOf("-");
  if (i <= 0) {
    return { quotation_number_prefix: "", quotation_number_value: t };
  }
  return {
    quotation_number_prefix: t.slice(0, i + 1),
    quotation_number_value: t.slice(i + 1),
  };
}

export function joinQuotationNumberParts(prefix: string, value: string): string {
  return `${prefix.trim()}${value.trim()}`;
}
