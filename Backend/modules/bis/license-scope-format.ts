export const LICENSE_SCOPE_FORMATS = ["plain", "table", "plain_table"] as const;
export type LicenseScopeFormat = (typeof LICENSE_SCOPE_FORMATS)[number];

export const LICENSE_SCOPE_MIN_COLUMNS = 1;
export const LICENSE_SCOPE_MAX_COLUMNS = 20;
export const LICENSE_SCOPE_DEFAULT_COLUMNS = 2;

export type LicenseScopeRow = {
  id: string;
  component: string;
  value: string;
  extra?: string[];
};

export type StoredLicenseScopeRow = {
  component: string;
  value: string;
  extra?: string[];
};

export type LicenseScopeTableRow = StoredLicenseScopeRow;

export function parseLicenseScopeFormat(raw: unknown): LicenseScopeFormat {
  const v = String(raw ?? "").trim();
  if (v === "table" || v === "plain_table") return v;
  return "plain";
}

export function licenseScopeUsesTable(format: LicenseScopeFormat): boolean {
  return format === "table" || format === "plain_table";
}

export function licenseScopeUsesPlain(format: LicenseScopeFormat): boolean {
  return format === "plain" || format === "plain_table";
}

export function clampLicenseScopeColumnCount(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return LICENSE_SCOPE_DEFAULT_COLUMNS;
  return Math.min(
    LICENSE_SCOPE_MAX_COLUMNS,
    Math.max(LICENSE_SCOPE_MIN_COLUMNS, n),
  );
}

export function licenseScopeColumnHeaders(columnCount: number): string[] {
  const count = clampLicenseScopeColumnCount(columnCount);
  if (count === 2) return ["Scope Component", "Component Value"];
  return Array.from({ length: count }, (_, i) => `Column ${i + 1}`);
}

export function licenseScopePrintHeaders(columnCount: number): string[] {
  const count = clampLicenseScopeColumnCount(columnCount);
  if (count === 2) return ["Component", "Value"];
  return Array.from({ length: count }, (_, i) => `Column ${i + 1}`);
}

export function parseLicenseScopeColumnHeaders(
  raw: unknown,
  columnCount: unknown = LICENSE_SCOPE_DEFAULT_COLUMNS,
): string[] {
  const count = clampLicenseScopeColumnCount(columnCount);
  const defaults = licenseScopeColumnHeaders(count);
  const custom = Array.isArray(raw)
    ? raw.map((header) => String(header ?? ""))
    : [];
  return Array.from({ length: count }, (_, i) =>
    i < custom.length ? custom[i]! : defaults[i]!,
  );
}

export function resolveLicenseScopeHeaders(
  columnCount: number,
  customHeaders?: string[] | null,
): string[] {
  const defaults = licenseScopeColumnHeaders(columnCount);
  return parseLicenseScopeColumnHeaders(customHeaders, columnCount).map(
    (header, i) => header.trim() || defaults[i]!,
  );
}

export function licenseScopeRowCells(
  row: Pick<StoredLicenseScopeRow, "component" | "value" | "extra">,
  columnCount: number,
): string[] {
  const extra = Array.isArray(row.extra) ? row.extra : [];
  const all = [row.component ?? "", row.value ?? "", ...extra];
  return Array.from({ length: clampLicenseScopeColumnCount(columnCount) }, (_, i) =>
    String(all[i] ?? ""),
  );
}

export function cellsToStoredLicenseScopeRow(cells: string[]): StoredLicenseScopeRow {
  const extra = cells.slice(2);
  return {
    component: cells[0] ?? "",
    value: cells[1] ?? "",
    extra: extra.length > 0 ? extra : undefined,
  };
}

export function licenseScopeRowHasContent(
  row: Pick<StoredLicenseScopeRow, "component" | "value" | "extra">,
): boolean {
  if (String(row.component ?? "").trim() || String(row.value ?? "").trim()) return true;
  return (row.extra ?? []).some((cell) => String(cell ?? "").trim().length > 0);
}

export function parseStoredLicenseScopeRow(row: unknown): StoredLicenseScopeRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (Array.isArray(r.cells)) {
    return cellsToStoredLicenseScopeRow(r.cells.map((cell) => String(cell ?? "")));
  }
  const extra = Array.isArray(r.extra)
    ? r.extra.map((cell) => String(cell ?? ""))
    : undefined;
  return {
    component: String(r.component ?? ""),
    value: String(r.value ?? ""),
    extra,
  };
}

export function parseStoredLicenseScopeRows(raw: unknown): StoredLicenseScopeRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(parseStoredLicenseScopeRow)
    .filter((row): row is StoredLicenseScopeRow => row != null);
}

export function createLicenseScopeRow(
  partial?: Partial<Pick<LicenseScopeRow, "component" | "value" | "extra">>,
): LicenseScopeRow {
  return {
    id: crypto.randomUUID(),
    component: partial?.component ?? "",
    value: partial?.value ?? "",
    extra: partial?.extra,
  };
}

export function defaultLicenseScopeRows(): LicenseScopeRow[] {
  return [createLicenseScopeRow()];
}

export function storedRowsToEditorRows(rows: StoredLicenseScopeRow[]): LicenseScopeRow[] {
  if (rows.length === 0) return defaultLicenseScopeRows();
  return rows.map((r) => createLicenseScopeRow(r));
}

export function editorRowsToStored(rows: LicenseScopeRow[]): StoredLicenseScopeRow[] {
  return rows.map(({ component, value, extra }) => ({
    component,
    value,
    extra: extra && extra.length > 0 ? extra : undefined,
  }));
}

function serializeRowLine(
  row: Pick<StoredLicenseScopeRow, "component" | "value" | "extra">,
  index: number,
): string {
  const cells = [
    row.component,
    row.value,
    ...(row.extra ?? []),
  ].map((cell) => String(cell ?? "").trim());
  while (cells.length > 1 && !cells[cells.length - 1]) cells.pop();
  const filled = cells.filter((cell) => cell.length > 0);
  if (filled.length === 0) return "";
  if (filled.length === 1) return `${index + 1}. ${filled[0]}`;
  return `${index + 1}. ${filled[0]}: ${filled.slice(1).join(" | ")}`;
}

export function serializeLicenseScopeText(
  format: LicenseScopeFormat,
  plain: string,
  rows: LicenseScopeRow[],
): string {
  if (format === "plain") return plain.trim();
  const tableText = rows
    .filter((r) => licenseScopeRowHasContent(r))
    .map((r, i) => serializeRowLine(r, i))
    .filter(Boolean)
    .join("\n");
  if (format === "plain_table") {
    const text = plain.trim();
    if (text && tableText) return `${text}\n\n${tableText}`;
    return text || tableText;
  }
  return tableText;
}

export function plainTextToValueScopeRows(plain: string): StoredLicenseScopeRow[] {
  const trimmed = plain.trim();
  if (!trimmed) return [];
  return [{ component: "", value: trimmed }];
}

export function parsePlainTextToRows(plain: string): LicenseScopeRow[] {
  const lines = plain
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return defaultLicenseScopeRows();

  return lines.map((line) => {
    const numbered = line.match(/^\d+[.)]\s*(.+)$/);
    const body = numbered?.[1] ?? line;
    const colonIdx = body.indexOf(":");
    if (colonIdx >= 0) {
      const rest = body.slice(colonIdx + 1).trim();
      const parts = rest.split(/\s+\|\s+/);
      return createLicenseScopeRow({
        component: body.slice(0, colonIdx).trim(),
        value: parts[0] ?? "",
        extra: parts.length > 1 ? parts.slice(1) : undefined,
      });
    }
    return createLicenseScopeRow({ component: body, value: "" });
  });
}

export function setLicenseScopeRowCell(
  row: LicenseScopeRow,
  index: number,
  value: string,
): LicenseScopeRow {
  const cells = licenseScopeRowCells(row, Math.max(index + 1, 2));
  cells[index] = value;
  return {
    ...row,
    ...cellsToStoredLicenseScopeRow(cells),
  };
}

export function buildLicenseScopeTableHtml(
  rows: LicenseScopeRow[],
  columnCount: number = LICENSE_SCOPE_DEFAULT_COLUMNS,
  customHeaders?: string[] | null,
): string {
  const count = clampLicenseScopeColumnCount(columnCount);
  const filled = rows.filter((r) => licenseScopeRowHasContent(r));
  if (filled.length === 0) return "—";

  const esc = (s: string) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const headers = resolveLicenseScopeHeaders(count, customHeaders);
  const head = headers
    .map(
      (label) =>
        `<th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;text-transform:none;letter-spacing:normal;font-weight:700;">${esc(label)}</th>`,
    )
    .join("");

  const body = filled
    .map((r) => {
      const cells = licenseScopeRowCells(r, count)
        .map(
          (cell) =>
            `<td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;">${esc(cell.trim() || "—")}</td>`,
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `
<table class="license-scope-table" style="width:100%;border-collapse:collapse;font-size:12px;line-height:1.5;">
  <thead>
    <tr style="background:#e2e8f0;">
      ${head}
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>`;
}
