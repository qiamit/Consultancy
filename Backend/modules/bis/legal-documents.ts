export type LegalDocumentStored = {
  description: string;
  document_ref: string;
};

export type LegalDocumentRow = LegalDocumentStored & { id: string };

export function defaultLegalDocumentEntry(): LegalDocumentStored {
  return {
    description: "",
    document_ref: "",
  };
}

let legalDocumentRowSeq = 0;

export function createLegalDocumentRow(): LegalDocumentRow {
  legalDocumentRowSeq += 1;
  return {
    id: `legal-doc-${Date.now()}-${legalDocumentRowSeq}`,
    ...defaultLegalDocumentEntry(),
  };
}

export function rowHasContent(row: LegalDocumentStored): boolean {
  return row.description.trim().length > 0 || row.document_ref.trim().length > 0;
}

export function parseLegalDocuments(raw: unknown): LegalDocumentStored[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      return {
        description: String(r.description ?? "").trim(),
        document_ref: String(r.document_ref ?? "").trim(),
      };
    })
    .filter((r): r is LegalDocumentStored => r !== null);
}

export function editorRowsFromStored(stored: LegalDocumentStored[]): LegalDocumentRow[] {
  const rows = stored.filter(rowHasContent);
  if (rows.length === 0) return [createLegalDocumentRow()];
  return rows.map((row, i) => ({
    id: `legal-doc-loaded-${i}`,
    ...row,
  }));
}

export function storedFromEditor(rows: LegalDocumentRow[]): LegalDocumentStored[] {
  return rows
    .map(({ description, document_ref }) => ({
      description,
      document_ref,
    }))
    .filter(rowHasContent);
}
