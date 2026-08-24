import type { IsCodeMasterRow } from "@backend/shared/types/is-code-master";
import { formatReaffirmationDisplay } from "./constants";
import { formatPrintTimestamp } from "@backend/shared/format-date";

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

function formatInr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function compactTileHtml(r: IsCodeMasterRow): string {
  const id = esc(r.is_number);
  const title = esc(dash(r.is_code_title));
  const rev = esc(String(r.revision_year));
  const ra = esc(formatReaffirmationDisplay(r.reaffirmation_year));
  const amd = esc(dash(r.amendment_number));
  const aspect = esc(dash(r.aspect_of_is));
  const unit = esc(dash(r.unit_of_is));
  const slab1 = esc(`${dash(r.slab_1_quantity)} / ${formatInr(r.slab_1_rate)}`);
  const slab2 = esc(`${dash(r.slab_2_quantity)} / ${formatInr(r.slab_2_rate)}`);
  const slab3 = esc(`${dash(r.slab_3_quantity)} / ${formatInr(r.slab_3_rate)}`);
  const charges = esc(formatInr(r.testing_charges));
  const mmfLm = esc(
    `L - ${formatInr(r.mmf_large_scale)} | M - ${formatInr(r.mmf_medium_scale)}`,
  );
  const mmfSu = esc(
    `S - ${formatInr(r.mmf_small_scale)} | µ - ${formatInr(r.mmf_micro_scale)}`,
  );
  const n = r.files?.length ?? 0;
  const files = esc(n === 0 ? "—" : `${n} file(s)`);
  return `<article class="tile">
  <header class="tile-hd">${id}: ${rev}</header>
  <p class="tile-meta">${ra} | ${amd}</p>
  <p class="tile-line">${aspect}</p>
  <p class="tile-line tile-title">${title}</p>
  <p class="tile-line text-xs">${slab1}</p>
  <p class="tile-line text-xs">${slab2}</p>
  <p class="tile-line text-xs">${slab3}</p>
  <p class="tile-line">${mmfLm}</p>
  <p class="tile-line">${mmfSu}</p>
  <p class="tile-line"><strong>Files & Charges</strong> ${files}</p>
  <p class="tile-line text-xs">${unit}</p>
  <p class="tile-line">${charges}</p>
</article>`;
}

function listBodyHtml(rows: IsCodeMasterRow[]): string {
  const bundles = chunk(rows, 4)
    .map(
      (group) =>
        `<section class="page-bundle"><div class="quad-grid">${group
          .map((r) => compactTileHtml(r))
          .join("")}</div></section>`,
    )
    .join("");
  return `<div class="bundles">${bundles}</div>`;
}

function wrapPrintDocument(title: string, subtitle: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
@page { size: A4; margin: 12mm; }
*{box-sizing:border-box}
body{margin:0;font:13px/1.45 system-ui,-apple-system,sans-serif;color:#0f172a;background:#f8fafc}
.bundles{display:flex;flex-direction:column;gap:0}
.page-bundle{break-after:page;padding:4mm 0}
.page-bundle:last-child{break-after:auto}
.quad-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:10px;min-height:240mm}
.tile{border:1px solid #bae6fd;border-left:4px solid #0ea5e9;border-radius:10px;padding:10px 12px;background:#fff;box-shadow:0 1px 2px #e2e8f0}
.tile-hd{font:700 14px/1.2 system-ui,sans-serif;color:#0c4a6e;margin:0 0 6px}
.tile-meta{font:12px system-ui,sans-serif;color:#64748b;margin:0 0 6px}
.tile-line{margin:4px 0;font:12px system-ui,sans-serif;color:#334155}
.tile-title{font-weight:600;color:#0f172a}
</style></head><body>
<header style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:linear-gradient(90deg,#0ea5e9,#0369a1);color:#fff">
<h1 style="margin:0;font-size:16px">${esc(title)}</h1>
<p style="margin:4px 0 0;font-size:12px;opacity:.95">${esc(subtitle)}</p>
</header>
${body}
</body></html>`;
}

function openPrintWindow(html: string): void {
  const root = document.createElement("div");
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
    "Up to 4 IS codes per printed page. Use Print… if the dialog does not open.";
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
  iframe.setAttribute("title", "IS code master print preview");
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

export function printIsCodeMasterList(rows: IsCodeMasterRow[]): void {
  if (rows.length === 0) return;
  const now = formatPrintTimestamp();
  const subtitle = `${rows.length} record(s) · Up to 4 per page · Generated ${now}`;
  const html = wrapPrintDocument(
    "IS Code master — print",
    subtitle,
    listBodyHtml(rows),
  );
  openPrintWindow(html);
}
