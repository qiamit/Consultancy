import type { PrintCompanyInfo, PrintSettings } from "./types";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hex2rgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

function lighten(hex: string, amount = 0.92): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * amount);
  const g = Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * amount);
  const b = Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * amount);
  return `rgb(${r},${g},${b})`;
}

/** Build a page size value for @page CSS rule */
function pageSizeCss(s: PrintSettings): string {
  const map: Record<string, string> = { A4: "210mm 297mm", A5: "148mm 210mm", Letter: "8.5in 11in", Legal: "8.5in 14in" };
  const dim = map[s.paper_size] ?? "210mm 297mm";
  return s.orientation === "landscape" ? dim.split(" ").reverse().join(" ") : dim;
}

export function buildLetterheadHtml(c: PrintCompanyInfo, s: PrintSettings): string {
  if (!s.show_letterhead) return "";

  if (c.letterhead_upper_url) {
    return `<div class="lh-wrap"><img src="${esc(c.letterhead_upper_url)}" alt="Letterhead" style="width:100%;max-height:110px;object-fit:contain;display:block;"/></div>`;
  }

  const logoHtml = c.logo_url
    ? `<img src="${esc(c.logo_url)}" alt="Logo" style="height:72px;max-width:200px;object-fit:contain;display:block;"/>`
    : `<div style="width:72px;height:72px;background:${esc(s.primary_color)};border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:800;">${esc((c.name || "C").charAt(0).toUpperCase())}</div>`;

  const contactItems: string[] = [];
  if (s.letterhead_show_gst && c.gst_number) contactItems.push(`<b>GST:</b> ${esc(c.gst_number)}`);
  if (s.letterhead_show_contact && c.email) contactItems.push(`<b>Email:</b> ${esc(c.email)}`);
  if (s.letterhead_show_contact && c.phone) contactItems.push(`<b>Tel:</b> ${esc(c.phone)}`);

  const addressParts = [c.address, c.city, c.state, c.pin_code, c.country].filter(Boolean);
  const addressLine = addressParts.join(", ");
  const addressHtml =
    s.letterhead_show_address && addressLine
      ? `<div style="font-size:10px;color:#555;margin-top:4px;line-height:1.5;">${esc(addressLine)}</div>`
      : "";

  const pc = esc(s.primary_color);

  if (s.letterhead_layout === "logo-na") {
    return `
<div class="lh-wrap" style="text-align:center;padding:16px 0 12px;">
  <div style="font-size:22px;font-weight:800;color:${pc};letter-spacing:-.4px;line-height:1.1;">${esc(c.name)}</div>
  ${addressHtml}
  ${s.letterhead_tagline ? `<div style="font-size:11px;color:#666;font-style:italic;margin-top:3px;">${esc(s.letterhead_tagline)}</div>` : ""}
  ${contactItems.length ? `<div style="font-size:10px;color:#555;margin-top:5px;line-height:1.8;">${contactItems.join(" &nbsp;|&nbsp; ")}</div>` : ""}
</div>`;
  }

  if (s.letterhead_layout === "logo-center") {
    return `
<div class="lh-wrap" style="text-align:center;padding:16px 0 12px;">
  <div style="display:inline-block;margin-bottom:8px;">${logoHtml}</div>
  <div style="font-size:22px;font-weight:800;color:${pc};letter-spacing:-.4px;line-height:1.1;">${esc(c.name)}</div>
  ${addressHtml}
  ${s.letterhead_tagline ? `<div style="font-size:11px;color:#666;font-style:italic;margin-top:3px;">${esc(s.letterhead_tagline)}</div>` : ""}
  ${contactItems.length ? `<div style="font-size:10px;color:#555;margin-top:5px;line-height:1.8;">${contactItems.join(" &nbsp;|&nbsp; ")}</div>` : ""}
</div>`;
  }

  const logoRight = s.letterhead_layout === "logo-right";
  const infoAlign = logoRight ? "text-align:left;" : "text-align:right;";
  const infoPad = logoRight ? "padding-right:14px;" : "padding-left:14px;";

  const infoBlock = `
<div style="flex:1;${infoPad}${infoAlign}">
  <div style="font-size:32px;font-weight:900;color:${pc};letter-spacing:-.5px;line-height:1.1;">${esc(c.name)}</div>
  ${addressHtml}
  ${s.letterhead_tagline ? `<div style="font-size:11px;color:#888;font-style:italic;margin-top:2px;">${esc(s.letterhead_tagline)}</div>` : ""}
  ${contactItems.length ? `<div style="font-size:10px;color:#555;margin-top:6px;line-height:1.7;">${contactItems.join(" &nbsp;&nbsp;|&nbsp;&nbsp; ")}</div>` : ""}
</div>`;

  const logoBlock = `<div style="flex-shrink:0;">${logoHtml}</div>`;

  return `
<div class="lh-wrap" style="display:flex;align-items:flex-start;gap:14px;padding:14px 0 12px;${logoRight ? "flex-direction:row-reverse;" : ""}">
  ${logoBlock}${infoBlock}
</div>`;
}

function buildFooter(c: PrintCompanyInfo, s: PrintSettings): string {
  const addressParts = [c.address, c.city, c.state, c.pin_code, c.country].filter(Boolean);
  const addressLine = addressParts.join(", ");

  const footerLeft = s.show_footer_line
    ? s.footer_left || (addressLine ? addressLine : "")
    : (s.footer_left ?? "").trim();
  const footerCenter = s.show_footer_line
    ? s.footer_center || (c.website ? c.website : "")
    : (s.footer_center ?? "").trim();

  const left = footerLeft.replace("{company}", c.name).replace("{gst}", c.gst_number);
  const center = footerCenter.replace("{company}", c.name).replace("{gst}", c.gst_number);

  const showBar = s.show_footer_line && !!(left || center);
  const showPageNum = s.show_page_numbers;

  if (!showBar && !showPageNum) return "";

  const pc = esc(s.primary_color);

  const barHtml = showBar
    ? `
<div class="print-footer-bar" style="margin-top:12px;">
  <div style="background:${pc};padding:6px 12px;border-radius:3px;text-align:center;">
    <div style="font-size:9.5px;color:#fff;font-weight:600;letter-spacing:.04em;line-height:1.6;">
      ${left ? `<span>${esc(left)}</span>` : ""}
      ${left && center ? `<span style="opacity:.5;margin:0 8px">|</span>` : ""}
      ${center ? `<span>${esc(center)}</span>` : ""}
    </div>
  </div>
</div>`
    : "";

  const pageNumHtml = showPageNum
    ? `<div class="print-page-number" aria-hidden="true"><span class="page-num-screen">Page 01 of 01</span></div>`
    : "";

  return `${barHtml}${pageNumHtml}`;
}


/**
 * Generate a complete HTML document string for any finance document.
 * @param title         Document title (e.g. "Quotation QT-2026-00001")
 * @param bodyHtml      The inner HTML of the document body (content area)
 * @param settings      Print / page settings
 * @param company       Company info for letterhead / footer
 * @param extraStyles   Optional additional CSS to inject
 */
export function buildPrintDocument({
  title,
  bodyHtml,
  settings: s,
  company: c,
  extraStyles = "",
}: {
  title: string;
  bodyHtml: string;
  settings: PrintSettings;
  company: PrintCompanyInfo;
  extraStyles?: string;
}): string {
  const pc = s.primary_color;
  const pcRgb = hex2rgb(pc);
  const pcLight = lighten(pc, 0.92);

  const pageSize = pageSizeCss(s);
  const margins = `${s.margin_top}mm ${s.margin_right}mm ${s.margin_bottom}mm ${s.margin_left}mm`;

  const letterheadHtml = buildLetterheadHtml(c, s);
  const footerHtml = buildFooter(c, s);

  const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; }
@page {
  size: ${pageSize};
  margin: 0;
}
html, body {
  margin: 0; padding: 0;
  font-family: '${esc(s.font_family)}', Arial, sans-serif;
  font-size: ${s.font_size}px; line-height: 1.5; color: #111;
  background: #fff;
}
.doc-page { max-width: 100%; padding: ${s.margin_top}mm ${s.margin_right}mm ${s.margin_bottom}mm ${s.margin_left}mm; }
.lh-wrap { border-bottom: 2px solid ${esc(pc)}; margin-bottom: 10px; }
.doc-title-bar {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 10px 0; margin-bottom: 10px;
}
.doc-type-label {
  font-size: 26px; font-weight: 700; letter-spacing: .5px;
  color: ${esc(pc)};
}
.doc-ref-block { font-size: 12px; }
.doc-ref-num { font-size: 18px; font-weight: 700; font-family: monospace; }
.section { margin-bottom: 10px; }
.section-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .06em; color: ${esc(pc)}; padding: 4px 0;
  border-bottom: 1px solid rgba(${pcRgb},.25); margin-bottom: 6px;
}
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.field-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #888; }
.field-value { font-size: 11px; margin-top: 1px; }
table { width: 100%; border-collapse: collapse; }
th { background: ${esc(pcLight)}; color: ${esc(pc)}; font-size: 9px; font-weight: 700;
     text-transform: uppercase; letter-spacing: .05em; padding: 6px 7px;
     border: 1px solid rgba(${pcRgb},.2); }
td { padding: 6px 7px; border: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
tr:nth-child(even) td { background: rgba(${pcRgb},.04); }
tfoot td, tfoot th { background: rgba(${pcRgb},.08); font-weight: 700; }
.right { text-align: right; }
.center { text-align: center; }
.mono { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 10.5px; }
.grand-total-row td { background: rgba(${pcRgb},.12) !important; font-weight: 700; font-size: 12px; }
.amount-words { font-size: 11px; font-style: italic; color: #444; padding: 6px 8px;
  background: rgba(${pcRgb},.05); border-radius: 4px; margin-top: 8px; }
.seal-row { display: flex; justify-content: flex-end; margin-top: 16px; }
.seal-box { text-align: center; }
.seal-box img { max-width: 220px; max-height: 100px; object-fit: contain; }
.seal-label { font-size: 10px; color: #666; margin-top: 4px; }
.print-page-number {
  position: fixed;
  bottom: ${Math.max(4, s.margin_bottom * 0.35)}mm;
  right: ${s.margin_right}mm;
  font-size: 10px;
  color: #555;
  text-align: right;
  z-index: 5;
  pointer-events: none;
}
.print-page-number .page-num-screen { display: inline; }
@media print {
  .print-page-number .page-num-screen { display: none !important; }
  .print-page-number::after {
    content: "Page " counter(page, decimal-leading-zero) " of " counter(pages, decimal-leading-zero);
  }
}
${s.show_watermark && s.watermark_text ? `
.watermark {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%,-50%) rotate(-35deg);
  font-size: 80px; font-weight: 900; letter-spacing: 10px;
  color: rgba(0,0,0,.06); pointer-events: none; z-index: 9999;
  text-transform: uppercase; white-space: nowrap; user-select: none;
}
@media print { .watermark { position: fixed; } }
` : ""}
${extraStyles}
@media print {
  .print-footer-bar { display: block; }
}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<style>${styles}</style>
</head>
<body>
${s.show_watermark && s.watermark_text ? `<div class="watermark">${esc(s.watermark_text)}</div>` : ""}
<div class="doc-page">
  ${letterheadHtml}
  ${bodyHtml}
  ${c.letterhead_lower_url ? `<div style="margin-top:16px;"><img src="${esc(c.letterhead_lower_url)}" alt="Footer letterhead" style="width:100%;max-height:80px;object-fit:contain;"/></div>` : ""}
</div>
${footerHtml}
</body>
</html>`;
}
