import { bisIsCodeDisplayLabel } from "@/lib/bis-project-is-code-label";
import type { BisNewApplicationMasterRow } from "@/lib/types/bis-new-application-master";
import {
  computeLicenseDisplayStatus,
  formatCmDisplay,
} from "@/lib/bis-project-license-status";
import { projectKindLabel } from "./constants";
import { formatDisplayDate } from "@/lib/format-date";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clientLabel(r: BisNewApplicationMasterRow): string {
  const c = r.clients;
  if (!c) return "—";
  const company = (c.company_name ?? "").trim();
  if (company) return company;
  const name = (c.name ?? "").trim();
  return name || "—";
}

function isLabel(r: BisNewApplicationMasterRow): string {
  const i = r.is_codes;
  if (!i) return "—";
  return bisIsCodeDisplayLabel(i);
}

function validityCell(r: BisNewApplicationMasterRow): string {
  if (r.project_kind === "application") return "—";
  return formatDisplayDate(r.license_validity_date);
}

/**
 * Print preview in an in-page iframe (same pattern as client / product / IS code
 * masters). Avoids `window.open(..., "noopener")`, which returns `null` per HTML.
 */
function openPrintWindow(html: string): void {
  const existing = document.getElementById("bis-new-applications-print-root");
  existing?.remove();

  const root = document.createElement("div");
  root.id = "bis-new-applications-print-root";
  root.setAttribute(
    "style",
    [
      "position:fixed",
      "inset:0",
      "z-index:2147483646",
      "background:rgba(15,23,42,.45)",
      "display:flex",
      "align-items:flex-start",
      "justify-content:center",
      "padding:16px",
      "overflow:auto",
    ].join(";"),
  );

  const panel = document.createElement("div");
  panel.setAttribute(
    "style",
    [
      "width:min(1100px,calc(100vw - 32px))",
      "height:min(92vh,calc(100vh - 32px))",
      "margin-top:8px",
      "background:#fff",
      "border-radius:12px",
      "box-shadow:0 25px 50px -12px rgba(0,0,0,.35)",
      "display:flex",
      "flex-direction:column",
      "overflow:hidden",
    ].join(";"),
  );

  const bar = document.createElement("div");
  bar.setAttribute(
    "style",
    [
      "flex-shrink:0",
      "display:flex",
      "gap:8px",
      "align-items:center",
      "padding:10px 12px",
      "border-bottom:1px solid #e2e8f0",
      "background:linear-gradient(180deg,#f8fafc,#fff)",
    ].join(";"),
  );
  const left = document.createElement("div");
  left.setAttribute(
    "style",
    "flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;",
  );
  const title = document.createElement("span");
  title.textContent = "Print preview";
  title.setAttribute(
    "style",
    "font:600 14px system-ui,-apple-system,sans-serif;color:#0f172a;",
  );
  const hint = document.createElement("span");
  hint.textContent =
    "BIS new applications list. Use Print… if the dialog does not open automatically.";
  hint.setAttribute("style", "font:12px system-ui,sans-serif;color:#64748b;");
  left.appendChild(title);
  left.appendChild(hint);

  const btnPrint = document.createElement("button");
  btnPrint.type = "button";
  btnPrint.textContent = "Print…";
  btnPrint.setAttribute(
    "style",
    [
      "cursor:pointer",
      "border-radius:8px",
      "border:none",
      "background:linear-gradient(180deg,#0ea5e9,#0284c7)",
      "color:#fff",
      "padding:8px 16px",
      "font:600 13px system-ui,sans-serif",
    ].join(";"),
  );

  const btnClose = document.createElement("button");
  btnClose.type = "button";
  btnClose.textContent = "Close";
  btnClose.setAttribute(
    "style",
    [
      "cursor:pointer",
      "border-radius:8px",
      "border:1px solid #cbd5e1",
      "background:#fff",
      "color:#334155",
      "padding:8px 14px",
      "font:500 13px system-ui,sans-serif",
    ].join(";"),
  );

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "BIS new applications print preview");
  iframe.setAttribute(
    "style",
    "flex:1;width:100%;border:0;min-height:0;background:#f1f5f9;",
  );

  const cleanup = () => {
    document.removeEventListener("keydown", onKey);
    if (root.isConnected) root.remove();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") cleanup();
  };
  document.addEventListener("keydown", onKey);

  btnClose.addEventListener("click", cleanup);

  const runPrint = () => {
    const cw = iframe.contentWindow;
    if (!cw) return;
    try {
      cw.focus();
      cw.print();
    } catch {
      /* ignore */
    }
  };

  btnPrint.addEventListener("click", runPrint);

  bar.appendChild(left);
  bar.appendChild(btnPrint);
  bar.appendChild(btnClose);
  panel.appendChild(bar);
  panel.appendChild(iframe);
  root.appendChild(panel);
  document.body.appendChild(root);

  root.addEventListener("click", (e) => {
    if (e.target === root) cleanup();
  });

  const doc = iframe.contentDocument;
  if (!doc) {
    cleanup();
    window.alert(
      "Could not prepare print preview. Try again or use another browser.",
    );
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const cw = iframe.contentWindow;
  if (cw) {
    cw.addEventListener("afterprint", cleanup);
  }

  window.setTimeout(runPrint, 450);
}

export function printBisNewApplicationsMasterList(rows: BisNewApplicationMasterRow[]) {
  if (rows.length === 0) return;

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
<html><head><meta charset="utf-8"/><title>BIS New Applications</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 16px; color: #18181b; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f4f4f5; font-weight: 600; }
  h1 { font-size: 18px; margin-bottom: 12px; }
</style></head><body>
<h1>BIS New Applications</h1>
<table>
<thead><tr>
<th>IS Code &amp; Type</th><th style="text-align:center">Name of the Client</th><th style="text-align:center">CM/L</th><th style="text-align:center">License Validity</th><th style="text-align:center">Billing</th><th style="text-align:center">Frequency</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</body></html>`;

  openPrintWindow(html);
}
