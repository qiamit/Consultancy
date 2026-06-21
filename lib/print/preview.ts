import type { PrintCompanyInfo, PrintSettings } from "./types";

type DocBuilder = (settings: PrintSettings, company: PrintCompanyInfo) => string;

const PANEL_ID = "global-print-preview-panel";

function label(text: string): HTMLLabelElement {
  const el = document.createElement("label");
  el.textContent = text;
  el.style.cssText = "font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:4px;";
  return el;
}

function sidebarSection(title: string): { wrap: HTMLDivElement; body: HTMLDivElement } {
  const wrap = document.createElement("div");
  wrap.style.cssText = "border-bottom:1px solid #27272a;padding:14px 16px;";
  const h = document.createElement("div");
  h.textContent = title;
  h.style.cssText = "font-size:11px;font-weight:700;color:#a1a1aa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;";
  const body = document.createElement("div");
  body.style.cssText = "display:flex;flex-direction:column;gap:8px;";
  wrap.appendChild(h);
  wrap.appendChild(body);
  return { wrap, body };
}

function select(
  options: { value: string; label: string }[],
  current: string,
  onChange: (v: string) => void,
): HTMLSelectElement {
  const el = document.createElement("select");
  el.style.cssText =
    "width:100%;padding:5px 8px;border-radius:6px;border:1px solid #3f3f46;background:#18181b;color:#f4f4f5;font-size:12px;outline:none;";
  options.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.value;
    opt.textContent = o.label;
    if (o.value === current) opt.selected = true;
    el.appendChild(opt);
  });
  el.addEventListener("change", () => onChange(el.value));
  return el;
}

function numberInput(value: number, min: number, max: number, onChange: (v: number) => void): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;align-items:center;gap:6px;";
  const inp = document.createElement("input");
  inp.type = "range";
  inp.min = String(min);
  inp.max = String(max);
  inp.value = String(value);
  inp.style.cssText = "flex:1;accent-color:#3b82f6;";
  const num = document.createElement("span");
  num.textContent = `${value}mm`;
  num.style.cssText = "font-size:11px;color:#a1a1aa;min-width:34px;text-align:right;";
  inp.addEventListener("input", () => {
    const v = Number(inp.value);
    num.textContent = `${v}mm`;
    onChange(v);
  });
  wrap.appendChild(inp);
  wrap.appendChild(num);
  return wrap;
}

function toggle(checked: boolean, onChange: (v: boolean) => void): HTMLLabelElement {
  const lbl = document.createElement("label");
  lbl.style.cssText = "display:flex;align-items:center;gap:8px;cursor:pointer;";
  const inp = document.createElement("input");
  inp.type = "checkbox";
  inp.checked = checked;
  inp.style.cssText = "accent-color:#3b82f6;width:14px;height:14px;";
  inp.addEventListener("change", () => onChange(inp.checked));
  lbl.appendChild(inp);
  return lbl;
}

function textInput(value: string, placeholder: string, onChange: (v: string) => void): HTMLInputElement {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.value = value;
  inp.placeholder = placeholder;
  inp.style.cssText =
    "width:100%;padding:5px 8px;border-radius:6px;border:1px solid #3f3f46;background:#18181b;color:#f4f4f5;font-size:12px;outline:none;";
  inp.addEventListener("input", () => onChange(inp.value));
  return inp;
}

function colorInput(value: string, onChange: (v: string) => void): HTMLInputElement {
  const inp = document.createElement("input");
  inp.type = "color";
  inp.value = value;
  inp.style.cssText = "width:40px;height:28px;border:none;background:none;cursor:pointer;padding:0;";
  inp.addEventListener("input", () => onChange(inp.value));
  return inp;
}

function btn(text: string, style: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.style.cssText = style;
  b.addEventListener("click", onClick);
  return b;
}

/**
 * Open the full-screen print preview modal.
 * @param buildDoc  Function that takes current settings + company and returns an HTML string
 * @param initialSettings  Starting print settings
 * @param company   Company info for letterhead/footer
 * @param onSaveDefaults  Optional callback to persist settings (passes updated settings back)
 */
export function openPrintPreview({
  buildDoc,
  initialSettings,
  company,
  onSaveDefaults,
}: {
  buildDoc: DocBuilder;
  initialSettings: PrintSettings;
  company: PrintCompanyInfo;
  onSaveDefaults?: (s: PrintSettings) => void;
}): void {
  document.getElementById(PANEL_ID)?.remove();

  let settings: PrintSettings = { ...initialSettings };

  // ── Root overlay ──────────────────────────────────────────────
  const root = document.createElement("div");
  root.id = PANEL_ID;
  root.style.cssText =
    "position:fixed;inset:0;z-index:2147483640;display:flex;flex-direction:column;background:#09090b;font-family:system-ui,-apple-system,sans-serif;";

  // ── Top bar ───────────────────────────────────────────────────
  const topBar = document.createElement("div");
  topBar.style.cssText =
    "flex-shrink:0;display:flex;align-items:center;gap:10px;padding:10px 16px;background:#18181b;border-bottom:1px solid #27272a;";

  const titleSpan = document.createElement("span");
  titleSpan.textContent = "Print Preview";
  titleSpan.style.cssText = "font-size:14px;font-weight:600;color:#f4f4f5;flex:1;";

  const hint = document.createElement("span");
  hint.textContent = "Adjust settings on the right, then print";
  hint.style.cssText = "font-size:12px;color:#71717a;";

  const btnPrint = btn(
    "🖨  Print",
    "cursor:pointer;border-radius:8px;border:none;background:#2563eb;color:#fff;padding:8px 18px;font-size:13px;font-weight:600;",
    () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    },
  );

  const btnClose = btn(
    "✕  Close",
    "cursor:pointer;border-radius:8px;border:1px solid #3f3f46;background:#27272a;color:#d4d4d8;padding:8px 14px;font-size:13px;",
    () => root.remove(),
  );

  topBar.appendChild(titleSpan);
  topBar.appendChild(hint);
  if (onSaveDefaults) {
    const btnSave = btn(
      "💾  Save as Default",
      "cursor:pointer;border-radius:8px;border:1px solid #3f3f46;background:#27272a;color:#d4d4d8;padding:8px 14px;font-size:13px;",
      () => { onSaveDefaults(settings); },
    );
    topBar.appendChild(btnSave);
  }
  topBar.appendChild(btnPrint);
  topBar.appendChild(btnClose);

  // ── Main area (iframe + sidebar) ──────────────────────────────
  const mainArea = document.createElement("div");
  mainArea.style.cssText = "flex:1;display:flex;min-height:0;";

  // iframe preview
  const previewWrap = document.createElement("div");
  previewWrap.style.cssText = "flex:1;overflow-y:auto;background:#52525b;display:flex;justify-content:center;padding:24px;";

  const iframe = document.createElement("iframe");
  iframe.title = "Print preview";
  iframe.style.cssText =
    "width:210mm;min-height:297mm;background:#fff;border:none;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,.5);";

  previewWrap.appendChild(iframe);

  // settings sidebar
  const sidebar = document.createElement("div");
  sidebar.style.cssText =
    "width:280px;flex-shrink:0;background:#18181b;border-left:1px solid #27272a;overflow-y:auto;";

  const sidebarHeader = document.createElement("div");
  sidebarHeader.textContent = "Page & Print Settings";
  sidebarHeader.style.cssText =
    "font-size:13px;font-weight:700;color:#f4f4f5;padding:14px 16px;border-bottom:1px solid #27272a;";
  sidebar.appendChild(sidebarHeader);

  function refresh() {
    const html = buildDoc(settings, company);
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();

    // Update iframe size to match paper
    const isA5 = settings.paper_size === "A5";
    const isLetter = settings.paper_size === "Letter";
    const isLegal = settings.paper_size === "Legal";
    const landscape = settings.orientation === "landscape";
    let w = 210, h = 297;
    if (isA5) { w = 148; h = 210; }
    else if (isLetter) { w = 216; h = 279; }
    else if (isLegal) { w = 216; h = 356; }
    if (landscape) { [w, h] = [h, w]; }
    iframe.style.width = `${w}mm`;
    iframe.style.minHeight = `${h}mm`;
  }

  function addField(body: HTMLDivElement, labelText: string, control: HTMLElement) {
    const wrap = document.createElement("div");
    wrap.appendChild(label(labelText));
    wrap.appendChild(control);
    body.appendChild(wrap);
  }

  // ── Page Settings section ──────────────────────────────────────
  const { wrap: pageWrap, body: pageBody } = sidebarSection("Page");
  addField(pageBody, "Paper Size", select(
    [{ value: "A4", label: "A4 (210×297mm)" }, { value: "A5", label: "A5 (148×210mm)" },
     { value: "Letter", label: "Letter (8.5×11in)" }, { value: "Legal", label: "Legal (8.5×14in)" }],
    settings.paper_size, (v) => { settings = { ...settings, paper_size: v as PrintSettings["paper_size"] }; refresh(); },
  ));
  addField(pageBody, "Orientation", select(
    [{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }],
    settings.orientation, (v) => { settings = { ...settings, orientation: v as PrintSettings["orientation"] }; refresh(); },
  ));
  addField(pageBody, "Font", select(
    [{ value: "Arial", label: "Arial" }, { value: "Times New Roman", label: "Times New Roman" },
     { value: "Georgia", label: "Georgia" }, { value: "Calibri", label: "Calibri" },
     { value: "Verdana", label: "Verdana" }, { value: "Inter", label: "Inter" }],
    settings.font_family, (v) => { settings = { ...settings, font_family: v }; refresh(); },
  ));
  const colorRow = document.createElement("div");
  colorRow.style.cssText = "display:flex;align-items:center;gap:8px;";
  const clbl = label("Primary Colour");
  colorRow.appendChild(colorInput(settings.primary_color, (v) => { settings = { ...settings, primary_color: v }; refresh(); }));
  const clblWrap = document.createElement("div");
  clblWrap.appendChild(clbl);
  colorRow.appendChild(clblWrap);
  pageBody.appendChild(colorRow);
  sidebar.appendChild(pageWrap);

  // ── Margins section ────────────────────────────────────────────
  const { wrap: marginWrap, body: marginBody } = sidebarSection("Margins (mm)");
  addField(marginBody, "Top", numberInput(settings.margin_top, 5, 40, (v) => { settings = { ...settings, margin_top: v }; refresh(); }));
  addField(marginBody, "Bottom", numberInput(settings.margin_bottom, 5, 40, (v) => { settings = { ...settings, margin_bottom: v }; refresh(); }));
  addField(marginBody, "Left", numberInput(settings.margin_left, 5, 40, (v) => { settings = { ...settings, margin_left: v }; refresh(); }));
  addField(marginBody, "Right", numberInput(settings.margin_right, 5, 40, (v) => { settings = { ...settings, margin_right: v }; refresh(); }));
  sidebar.appendChild(marginWrap);

  // ── Typography section ─────────────────────────────────────────
  const { wrap: typoWrap, body: typoBody } = sidebarSection("Typography");
  addField(typoBody, "Font Size", select(
    [{ value: "9", label: "9px – Small" }, { value: "10", label: "10px – Compact" },
     { value: "11", label: "11px – Normal" }, { value: "12", label: "12px – Large" },
     { value: "13", label: "13px – Extra Large" }],
    String(settings.font_size),
    (v) => { settings = { ...settings, font_size: Number(v) }; refresh(); },
  ));
  addField(typoBody, "Title Size", select(
    [{ value: "22", label: "22px – Small" }, { value: "26", label: "26px – Medium" },
     { value: "30", label: "30px – Large" }, { value: "36", label: "36px – Extra Large" }],
    String(settings.title_font_size),
    (v) => { settings = { ...settings, title_font_size: Number(v) }; refresh(); },
  ));
  const accentRow = document.createElement("div");
  accentRow.style.cssText = "display:flex;align-items:center;gap:8px;";
  const accentLabel = label("Accent Colour");
  accentRow.appendChild(colorInput(settings.accent_color || settings.primary_color, (v) => { settings = { ...settings, accent_color: v }; refresh(); }));
  const accentLblWrap = document.createElement("div");
  accentLblWrap.appendChild(accentLabel);
  accentRow.appendChild(accentLblWrap);
  typoBody.appendChild(accentRow);
  sidebar.appendChild(typoWrap);

  // ── Letterhead section ─────────────────────────────────────────
  const { wrap: lhWrap, body: lhBody } = sidebarSection("Letterhead");

  function mkToggleRow(lbl: string, checked: boolean, onChange: (v: boolean) => void) {
    const t = toggle(checked, onChange);
    const sp = document.createElement("span"); sp.textContent = lbl; sp.style.cssText = "font-size:12px;color:#d4d4d8;";
    t.appendChild(sp); return t;
  }

  lhBody.appendChild(mkToggleRow("Show letterhead", settings.show_letterhead, (v) => { settings = { ...settings, show_letterhead: v }; refresh(); }));
  addField(lhBody, "Logo", select(
    [{ value: "logo-na", label: "N/A (No Logo)" }, { value: "logo-left", label: "Logo Left" }, { value: "logo-center", label: "Logo Centre" }, { value: "logo-right", label: "Logo Right" }],
    settings.letterhead_layout, (v) => { settings = { ...settings, letterhead_layout: v as PrintSettings["letterhead_layout"] }; refresh(); },
  ));
  addField(lhBody, "Tagline", textInput(settings.letterhead_tagline, "Your tagline…", (v) => { settings = { ...settings, letterhead_tagline: v }; refresh(); }));
  lhBody.appendChild(mkToggleRow("Show GST number", settings.letterhead_show_gst, (v) => { settings = { ...settings, letterhead_show_gst: v }; refresh(); }));
  lhBody.appendChild(mkToggleRow("Show contact info", settings.letterhead_show_contact, (v) => { settings = { ...settings, letterhead_show_contact: v }; refresh(); }));
  sidebar.appendChild(lhWrap);

  // ── Table section ──────────────────────────────────────────────
  const { wrap: tblWrap, body: tblBody } = sidebarSection("Table");
  tblBody.appendChild(mkToggleRow("Compact rows", settings.table_compact, (v) => { settings = { ...settings, table_compact: v }; refresh(); }));
  tblBody.appendChild(mkToggleRow("Show item description", settings.table_show_description, (v) => { settings = { ...settings, table_show_description: v }; refresh(); }));
  sidebar.appendChild(tblWrap);

  // ── Footer section ─────────────────────────────────────────────
  const { wrap: ftWrap, body: ftBody } = sidebarSection("Footer");
  ftBody.appendChild(mkToggleRow("Show footer bar", settings.show_footer_line, (v) => { settings = { ...settings, show_footer_line: v }; refresh(); }));
  ftBody.appendChild(mkToggleRow("Show page numbers", settings.show_page_numbers, (v) => { settings = { ...settings, show_page_numbers: v }; refresh(); }));
  addField(ftBody, "Left text", textInput(settings.footer_left, "Address / {company}", (v) => { settings = { ...settings, footer_left: v }; refresh(); }));
  addField(ftBody, "Centre text", textInput(settings.footer_center, "Website", (v) => { settings = { ...settings, footer_center: v }; refresh(); }));
  addField(ftBody, "Page # format", textInput(settings.footer_right, "Page {page} of {total}", (v) => { settings = { ...settings, footer_right: v }; refresh(); }));
  sidebar.appendChild(ftWrap);

  // ── Watermark section ──────────────────────────────────────────
  const { wrap: wmWrap, body: wmBody } = sidebarSection("Watermark");
  wmBody.appendChild(mkToggleRow("Show watermark", settings.show_watermark, (v) => { settings = { ...settings, show_watermark: v }; refresh(); }));
  addField(wmBody, "Watermark text", textInput(settings.watermark_text, "DRAFT / CONFIDENTIAL…", (v) => { settings = { ...settings, watermark_text: v }; refresh(); }));
  sidebar.appendChild(wmWrap);

  mainArea.appendChild(previewWrap);
  mainArea.appendChild(sidebar);

  root.appendChild(topBar);
  root.appendChild(mainArea);
  document.body.appendChild(root);

  // Escape key closes
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { root.remove(); document.removeEventListener("keydown", onKey); } };
  document.addEventListener("keydown", onKey);

  // Initial render
  refresh();
}
