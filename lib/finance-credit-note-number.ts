export function splitProformaInvoiceNumberForForm(full: string): {
  credit_note_number_prefix: string;
  credit_note_number_value: string;
} {
  const t = full.trim();
  if (!t) {
    return { credit_note_number_prefix: "", credit_note_number_value: "" };
  }
  const i = t.lastIndexOf("-");
  if (i <= 0) {
    return { credit_note_number_prefix: "", credit_note_number_value: t };
  }
  return {
    credit_note_number_prefix: t.slice(0, i + 1),
    credit_note_number_value: t.slice(i + 1),
  };
}

export function joinProformaInvoiceNumberParts(prefix: string, value: string): string {
  return `${prefix.trim()}${value.trim()}`;
}
