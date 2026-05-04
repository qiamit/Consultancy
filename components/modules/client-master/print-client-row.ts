import type { ClientMasterRow } from "@/lib/types/client-master";
import { formatClientPhoneDisplay } from "./constants";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dash(v: string | null | undefined): string {
  if (v == null || String(v).trim() === "") return "—";
  return String(v);
}

/** Same as table `addressInline`: one flowing line (wraps) — address + city + PIN + state + country. */
function addressInline(c: ClientMasterRow): string {
  const parts = [c.address, c.city, c.pin_code, c.state, c.country]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPaymentTerm(term: string | null | undefined): string {
  if (!term) return "—";
  return term === "100% Advance" ? "100 % Advance" : term;
}

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return esc(iso);
    return esc(
      d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
  } catch {
    return esc(String(iso));
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Compact tile for grid (up to 4 per printed page). */
function compactClientTileHtml(c: ClientMasterRow): string {
  const company = esc(c.company_name ?? c.name ?? "Client");
  const gst = esc(dash(c.gst_number));
  const status = esc(dash(c.company_status));
  const typeScale = `${esc(dash(c.company_type))} · ${esc(dash(c.company_scale))}`;
  const contact = esc(dash(c.contact_person_name));
  const phone = esc(dash(formatClientPhoneDisplay(c) || null));
  const email = esc(dash(c.email));
  const addr = esc(addressInline(c));
  const bal = esc(formatInr(c.opening_balance));
  const dr = esc(dash(c.balance_type));
  const term = esc(formatPaymentTerm(c.payment_term ?? null));
  const notesRaw = dash(c.notes);
  const notes =
    notesRaw.length > 220 ? esc(notesRaw.slice(0, 217)) + "…" : esc(notesRaw);
  const created = formatDateShort(c.created_at);

  return `<article class="tile">
  <header class="tile-hd">${company}</header>
  <p class="tile-meta"><span class="mono">${gst}</span><span class="dot">·</span>${status}</p>
  <p class="tile-line">${typeScale}</p>
  <p class="tile-line"><strong>Contact</strong> ${contact} <span class="dot">·</span> <strong>Phone</strong> ${phone}</p>
  <p class="tile-line tile-email">${email}</p>
  <div class="tile-addr"><span class="addr-lbl">Address</span> ${addr}</div>
  <p class="tile-line"><strong>Op. bal.</strong> ${bal} <span class="dr">${dr}</span></p>
  <p class="tile-line"><strong>Pay term</strong> ${term}</p>
  <p class="tile-notes"><strong>Notes</strong> ${notes}</p>
  <p class="tile-id">ID ${esc(c.id)} · ${created}</p>
</article>`;
}

/** Full single-client sheet (still compact, one column). */
function fullClientSheetHtml(c: ClientMasterRow): string {
  const company = esc(c.company_name ?? c.name ?? "Client");
  const addr = esc(addressInline(c));
  const rows = [
    ["Client ID", esc(c.id)],
    ["Internal name", esc(c.name)],
    ["GST", esc(dash(c.gst_number))],
    ["Type / scale / status", `${esc(dash(c.company_type))} · ${esc(dash(c.company_scale))} · ${esc(dash(c.company_status))}`],
    ["Contact", esc(dash(c.contact_person_name))],
    ["Phone", esc(dash(formatClientPhoneDisplay(c) || null))],
    ["Email", esc(dash(c.email))],
    ["Address", addr],
    ["Opening balance", `${esc(formatInr(c.opening_balance))} ${esc(dash(c.balance_type))}`],
    ["Payment term", esc(formatPaymentTerm(c.payment_term ?? null))],
    ["Notes", esc(dash(c.notes))],
    ["Created", formatDateShort(c.created_at)],
  ]
    .map(
      ([k, v]) =>
        `<tr><th>${esc(k)}</th><td>${v === "" ? "—" : v}</td></tr>`,
    )
    .join("");

  return `<section class="single-sheet">
  <h1 class="single-title">${company}</h1>
  <table class="single-tbl"><tbody>${rows}</tbody></table>
</section>`;
}

const PRINT_STYLES = `<style>
*{box-sizing:border-box;}
html,body{margin:0;padding:0;background:#f1f5f9;color:#0f172a;font:11px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
.wrap{max-width:1100px;margin:0 auto;padding:16px 14px 32px;}
.doc-head{margin:0 0 14px;padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,#0ea5e9 0%,#0369a1 100%);color:#fff;box-shadow:0 4px 14px rgba(14,165,233,.35);}
.doc-head h1{margin:0;font-size:18px;font-weight:700;letter-spacing:-.02em;}
.doc-head .meta{margin:6px 0 0;font-size:12px;opacity:.92;}
.bundles{display:flex;flex-direction:column;gap:18px;}
.page-bundle{
  border-radius:14px;padding:12px;background:#fff;
  box-shadow:0 1px 3px rgba(15,23,42,.08),0 4px 12px rgba(15,23,42,.06);
  border:1px solid #e2e8f0;
}
.quad-grid{
  display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:start;
}
.quad-grid.single{grid-template-columns:1fr;max-width:520px;}
.tile{
  position:relative;border-radius:10px;padding:10px 10px 10px 12px;
  background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);
  border:1px solid #e2e8f0;
  border-left:3px solid #0ea5e9;
  min-height:0;
  page-break-inside:avoid;break-inside:avoid;
}
.tile-hd{font-size:12.5px;font-weight:700;color:#0f172a;margin:0 0 4px;line-height:1.25;}
.tile-meta{margin:0 0 6px;font-size:10.5px;color:#475569;}
.tile-meta .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}
.tile-meta .dot,.tile-line .dot{margin:0 5px;opacity:.45;}
.tile-line{margin:0 0 3px;font-size:10.5px;color:#334155;word-break:break-word;}
.tile-line strong{color:#64748b;font-weight:600;margin-right:3px;}
.tile-email{font-size:10px;color:#0369a1;}
.tile-addr{
  margin:6px 0 6px;padding:6px 8px;border-radius:8px;background:#f8fafc;border:1px dashed #cbd5e1;
  font-size:10px;line-height:1.45;color:#1e293b;word-wrap:break-word;overflow-wrap:anywhere;white-space:normal;
}
.addr-lbl{display:block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:3px;}
.tile-notes{margin:4px 0 0;font-size:9.5px;color:#475569;line-height:1.4;word-break:break-word;}
.tile-notes strong{color:#64748b;}
.tile-id{margin:6px 0 0;padding-top:6px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;font-family:ui-monospace,monospace;}
.dr{font-weight:700;}
.single-sheet{padding:16px;border-radius:14px;background:#fff;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(15,23,42,.06);}
.single-title{margin:0 0 12px;font-size:20px;color:#0f172a;border-left:4px solid #0ea5e9;padding-left:12px;}
.single-tbl{width:100%;border-collapse:collapse;font-size:12px;}
.single-tbl th{text-align:left;width:32%;padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-weight:600;}
.single-tbl td{padding:8px 10px;border:1px solid #e2e8f0;vertical-align:top;word-wrap:break-word;}
@media print{
  html,body{background:#fff;font-size:10px;}
  .wrap{max-width:none;padding:0;}
  .doc-head{print-color-adjust:exact;-webkit-print-color-adjust:exact;box-shadow:none;}
  .page-bundle{box-shadow:none;page-break-after:always;break-after:page;border:none;padding:8px 0;}
  .page-bundle:last-child{page-break-after:auto;break-after:auto;}
  .tile{box-shadow:none;border:1px solid #ccc;border-left:3px solid #0284c7;}
  .quad-grid{gap:8px;}
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

function listBodyHtml(rows: ClientMasterRow[]): string {
  const bundles = chunk(rows, 4)
    .map(
      (group) => `<section class="page-bundle"><div class="quad-grid">
${group.map((c) => compactClientTileHtml(c)).join("")}
</div></section>`,
    )
    .join("");
  return `<div class="bundles">${bundles}</div>`;
}

/**
 * Shows print preview in an in-page iframe, then opens the system print dialog.
 */
function openPrintWindow(html: string): void {
  const existing = document.getElementById("client-master-print-root");
  existing?.remove();

  const root = document.createElement("div");
  root.id = "client-master-print-root";
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
    "4 clients per printed page · Address matches table (inline wrap). Use Print… if the dialog does not open.";
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
  iframe.setAttribute("title", "Client master print preview");
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
    window.alert("Could not prepare print preview. Try again or use another browser.");
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

/** Opens print preview for one client. */
export function printClientMasterRow(c: ClientMasterRow): void {
  const title = c.company_name ?? c.name ?? "Client";
  const body = `<div class="bundles"><section class="page-bundle"><div class="quad-grid single">${fullClientSheetHtml(c)}</div></section></div>`;
  const html = wrapPrintDocument(
    `Client — ${title}`,
    "Full record",
    body,
  );
  openPrintWindow(html);
}

/** Print selected / filtered clients — 2×2 tiles, 4 per printed page. */
export function printClientMasterList(rows: ClientMasterRow[]): void {
  if (rows.length === 0) return;

  const now = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const subtitle = `${rows.length} record(s) · Up to 4 per page · Generated ${now}`;
  const html = wrapPrintDocument(
    "Client master — print",
    subtitle,
    listBodyHtml(rows),
  );
  openPrintWindow(html);
}
