import type { TestParameterMasterRow } from "@backend/shared/types/test-parameter-master";
import { isCodeLabelFromRow } from "./constants";

function csvCell(value: string): string {
  const s = value.replace(/"/g, '""');
  return `"${s}"`;
}

export function buildTestParameterExportCsv(
  rows: TestParameterMasterRow[],
): string {
  const header = [
    "IS Code",
    "Name of the Test",
    "Clause No",
    "Test Method",
    "Unit",
    "Specified Value",
  ]
    .map(csvCell)
    .join(",");
  const body = rows
    .map((r) =>
      [
        isCodeLabelFromRow(r),
        r.test_name,
        r.clause_no,
        r.test_method,
        r.unit,
        r.specified_value,
      ]
        .map((v) => csvCell(String(v ?? "")))
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function printTestParameterList(rows: TestParameterMasterRow[]) {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${esc(isCodeLabelFromRow(r))}</td>
        <td>${esc(r.test_name ?? "")}</td>
        <td>${esc(r.clause_no ?? "")}</td>
        <td>${esc(r.test_method ?? "")}</td>
        <td>${esc(r.unit ?? "")}</td>
        <td>${esc(r.specified_value ?? "")}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Test Parameter</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 12px; margin: 16px; }
  h1 { font-size: 16px; margin: 0 0 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; font-weight: 600; }
</style></head><body>
<h1>Test Parameter</h1>
<table>
<thead><tr>
  <th>IS Code</th>
  <th>Name of the Test</th>
  <th>Clause No</th>
  <th>Test Method</th>
  <th>Unit</th>
  <th>Specified Value</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
<script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    window.alert("Pop-up blocked. Allow pop-ups to print the list.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
