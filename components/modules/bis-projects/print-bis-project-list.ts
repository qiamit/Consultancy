import { bisIsCodeDisplayLabel } from "@/lib/bis-project-is-code-label";
import type { BisProjectMasterRow } from "@/lib/types/bis-project-master";
import {
  computeLicenseDisplayStatus,
  formatCmDisplay,
} from "@/lib/bis-project-license-status";
import { projectKindLabel } from "./constants";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clientLabel(r: BisProjectMasterRow): string {
  const c = r.clients;
  if (!c) return "—";
  const company = (c.company_name ?? "").trim();
  if (company) return company;
  const name = (c.name ?? "").trim();
  return name || "—";
}

function isLabel(r: BisProjectMasterRow): string {
  const i = r.is_codes;
  if (!i) return "—";
  return bisIsCodeDisplayLabel(i);
}

function validityCell(r: BisProjectMasterRow): string {
  if (r.project_kind === "application") return "—";
  const d = r.license_validity_date;
  return d == null || d === "" ? "—" : d;
}

export function printBisProjectsMasterList(rows: BisProjectMasterRow[]) {
  const rowsHtml = rows
    .map((r) => {
      const lic = computeLicenseDisplayStatus(
        r.project_kind,
        r.license_validity_date,
      );
      return `<tr>
  <td>${esc(isLabel(r))}<br/>${esc(projectKindLabel(r.project_kind))}</td>
  <td style="text-align:center">${esc(clientLabel(r))}</td>
  <td style="text-align:center">${esc(formatCmDisplay(r.project_kind, r.cm_l_digits))}<br/>${esc(lic)}</td>
  <td style="text-align:center">${esc(validityCell(r))}</td>
  <td style="text-align:center">${esc(String(r.billing_amount ?? ""))}</td>
  <td style="text-align:center">${esc(r.billing_frequency ?? "—")}</td>
</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>BIS Projects</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 16px; color: #18181b; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; font-weight: 600; }
  h1 { font-size: 18px; margin-bottom: 12px; }
</style></head><body>
<h1>BIS Projects</h1>
<table>
<thead><tr>
<th>IS Code &amp; Type</th><th style="text-align:center">Name of the Client</th><th style="text-align:center">CM/L</th><th style="text-align:center">License Validity</th><th style="text-align:center">Billing</th><th style="text-align:center">Frequency</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
<script>window.onload=function(){window.print();};</script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    window.alert("Pop-up blocked. Allow pop-ups to print.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
