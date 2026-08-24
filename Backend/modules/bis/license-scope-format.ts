export type LicenseScopeFormat = "plain" | "table";

export type LicenseScopeRow = {
  id: string;
  component: string;
  value: string;
};

export type StoredLicenseScopeRow = {
  component: string;
  value: string;
};

export function createLicenseScopeRow(
  partial?: Partial<Pick<LicenseScopeRow, "component" | "value">>,
): LicenseScopeRow {
  return {
    id: crypto.randomUUID(),
    component: partial?.component ?? "",
    value: partial?.value ?? "",
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
  return rows.map(({ component, value }) => ({ component, value }));
}

export function serializeLicenseScopeText(
  format: LicenseScopeFormat,
  plain: string,
  rows: LicenseScopeRow[],
): string {
  if (format === "plain") return plain.trim();
  return rows
    .filter((r) => r.component.trim() || r.value.trim())
    .map((r, i) => {
      const component = r.component.trim();
      const value = r.value.trim();
      if (component && value) return `${i + 1}. ${component}: ${value}`;
      if (component) return `${i + 1}. ${component}`;
      return `${i + 1}. ${value}`;
    })
    .join("\n");
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
      return createLicenseScopeRow({
        component: body.slice(0, colonIdx).trim(),
        value: body.slice(colonIdx + 1).trim(),
      });
    }
    return createLicenseScopeRow({ component: body, value: "" });
  });
}

export function buildLicenseScopeTableHtml(rows: LicenseScopeRow[]): string {
  const filled = rows.filter((r) => r.component.trim() || r.value.trim());
  if (filled.length === 0) return "—";

  const esc = (s: string) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const body = filled
    .map(
      (r, i) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;width:48px;">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;">${esc(r.component.trim() || "—")}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;">${esc(r.value.trim() || "—")}</td>
    </tr>`,
    )
    .join("");

  return `
<table style="width:100%;border-collapse:collapse;font-size:12px;line-height:1.5;">
  <thead>
    <tr style="background:#e2e8f0;">
      <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;width:48px;">Sr No</th>
      <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Component</th>
      <th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left;">Value</th>
    </tr>
  </thead>
  <tbody>${body}</tbody>
</table>`;
}
