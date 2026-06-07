import type { FinanceProformaInvoiceRow } from "@/lib/types/finance-proforma-invoice";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function clientLabel(r: FinanceProformaInvoiceRow): string {
  const c = r.clients;
  if (!c) return "—";
  const company = (c.company_name ?? "").trim();
  return company ? `${c.name} (${company})` : c.name;
}

const PRINT_STYLES = `<style>
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#f1f5f9;color:#0f172a;font:11px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
.wrap{max-width:1100px;margin:0 auto;padding:16px 14px 32px;}
.doc-head{margin:0 0 14px;padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%);color:#fff;box-shadow:0 4px 14px rgba(14,165,233,.35);}
.doc-head h1{margin:0;font-size:18px;font-weight:700;letter-spacing:-.02em;}
.doc-head .meta{margin:6px 0 0;font-size:12px;opacity:.92;}
.tbl{width:100%;border-collapse:collapse;font-size:11px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.08);}
.tbl th,.tbl td{padding:8px 10px;border:1px solid #e2e8f0;text-align:left;vertical-align:top;}
.tbl th{background:#f8fafc;font-weight:600;color:#64748b;}
.tbl td.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;}
.tbl td.num{text-align:right;font-variant-numeric:tabular-nums;}
@media print{
  html,body{background:#fff;}
  .wrap{max-width:none;padding:0;}
  .doc-head{print-color-adjust:exact;-webkit-print-color-adjust:exact;box-shadow:none;}
  @page{size:A4;margin:10mm;}
}
</style>`;

function wrapPrintDocument(
  title: string,
  subtitle: string,
  bodyHtml: string,
): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
${PRINT_STYLES}
</head><body>
<div class="wrap">
<header class="doc-head">
<h1>${esc(title)}</h1>
<p class="meta">${esc(subtitle)}</p>
</header>
${bodyHtml}
</div>
</body></html>`;
}

function listTableHtml(rows: FinanceProformaInvoiceRow[]): string {
  const head =
    "<thead><tr><th>#</th><th>Proforma #</th><th>Date</th><th>Valid until</th><th>Linked SO</th><th>Client</th><th>Type</th><th class=\"num\">Total</th></tr></thead>";
  const body = rows
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td><td class="mono">${esc(r.proforma_invoice_number)}</td><td>${esc(r.proforma_date)}</td><td>${esc(r.valid_until_date)}</td><td class="mono">${esc(r.finance_sales_orders?.sales_order_number ?? "—")}</td><td>${esc(clientLabel(r))}</td><td>${esc(r.invoice_type)}</td><td class="num">${esc(
          Number(r.grand_total).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        )}</td></tr>`,
    )
    .join("");
  return `<table class="tbl">${head}<tbody>${body}</tbody></table>`;
}

function openPrintWindow(html: string): void {
  const existing = document.getElementById("finance-proforma-invoices-print-root");
  existing?.remove();

  const root = document.createElement("div");
  root.id = "finance-proforma-invoices-print-root";
  root.setAttribute(
    "style",
    [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "background:rgba(15,23,42,0.45)",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:12px",
      "box-sizing:border-box",
    ].join(";"),
  );

  const panel = document.createElement("div");
  panel.setAttribute(
    "style",
    [
      "display:flex",
      "flex-direction:column",
      "width:min(1120px,calc(100vw - 24px))",
      "height:min(92vh,900px)",
      "background:#fff",
      "border-radius:14px",
      "box-shadow:0 25px 50px rgba(0,0,0,0.35)",
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
    "List matches the table. Use Print… if the dialog does not open.";
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
  iframe.setAttribute("title", "Finance quotations print preview");
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

/** Print selected / filtered proforma invoices — tabular list. */
export function printFinanceProformaInvoicesList(rows: FinanceProformaInvoiceRow[]): void {
  if (rows.length === 0) return;

  const now = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const subtitle = `${rows.length} record(s) · Generated ${now}`;
  const html = wrapPrintDocument(
    "Proforma invoice — print",
    subtitle,
    listTableHtml(rows),
  );
  openPrintWindow(html);
}
