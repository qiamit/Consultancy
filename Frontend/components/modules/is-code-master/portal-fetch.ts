import { PDFDocument } from "pdf-lib";

export type IsCodePortalFile = {
  name: string;
  mime?: string;
  base64: string;
};

export type IsCodePortalPayload = {
  fields?: Record<string, string>;
  files?: IsCodePortalFile[];
  notes?: string[];
  partial?: boolean;
  done?: boolean;
};

const MONEY_KEYS = new Set([
  "testing_charges",
  "mmf_large_scale",
  "mmf_medium_scale",
  "mmf_small_scale",
  "mmf_micro_scale",
  "slab_1_rate",
  "slab_2_rate",
  "slab_3_rate",
]);

const UNIT_ALIASES: Record<string, string> = {
  tonne: "Tonne",
  ton: "Tonne",
  tons: "Tonne",
  mt: "Tonne",
  "metric tonne": "Tonne",
  "metric ton": "Tonne",
  t: "Tonne",
  pcs: "Pcs",
  pc: "Pcs",
  piece: "Pcs",
  pieces: "Pcs",
  nos: "Nos",
  no: "Nos",
  "nos.": "Nos",
  number: "Nos",
  numbers: "Nos",
  "kilo litre": "Kilo Litre",
  kilolitre: "Kilo Litre",
  kl: "Kilo Litre",
  litre: "Litre",
  liter: "Litre",
  litres: "Litre",
  liters: "Litre",
  ltr: "Litre",
  l: "Litre",
  kg: "Kg",
  kgs: "Kg",
  kilogram: "Kg",
  kilograms: "Kg",
};

function normalizeAspect(raw: string): string {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (/test method|methods? of tests?/.test(key)) return "Test Method";
  if (/code of practice/.test(key)) return "Code of Practice";
  if (/specification/.test(key)) return "Specification";
  if (["specification", "test method", "code of practice", "others"].includes(key)) {
    return raw.trim();
  }
  return key ? "Others" : "";
}

function normalizeUnit(raw: string): string {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^\d+\s+/, "");
  if (UNIT_ALIASES[key]) return UNIT_ALIASES[key];
  const exact = ["Tonne", "Pcs", "Nos", "Kilo Litre", "Litre", "Kg"].find(
    (unit) => unit.toLowerCase() === key,
  );
  return exact || "";
}

function normalizeSlabQty(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!key || key === "-" || key === "—" || key === "na" || key === "n/a" || key === "n.a.") {
    return "N/A";
  }
  if (/^(for all|all|all qty|all quantity|all quantities)$/i.test(key)) {
    return "All Quantities";
  }
  return raw.trim();
}

export function fileFromBase64(
  name: string,
  base64: string,
  mime = "application/pdf",
): File {
  const clean = base64.replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

export async function mergePdfFiles(
  files: File[],
  fileName: string,
): Promise<File> {
  const out = await PDFDocument.create();
  for (const file of files) {
    try {
      const src = await PDFDocument.load(await file.arrayBuffer(), {
        ignoreEncryption: true,
      });
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((page) => out.addPage(page));
    } catch {
      /* encrypted / FileOpen PDFs stay as separate attachments */
    }
  }
  if (out.getPageCount() < 1) return files[0];
  const bytes = await out.save();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy], fileName, { type: "application/pdf" });
}

function isManualFileName(name: string) {
  return /product_manual/i.test(name);
}

function isStandardPackName(name: string) {
  return /(?:_Standard|_Amendment|Standard_and_Amendments)/i.test(name);
}

function sortAmendmentThenStandard(files: File[]) {
  return [...files].sort((a, b) => {
    const score = (name: string) => {
      if (/_Standard(?!_and)/i.test(name) && !/amend/i.test(name)) return 0;
      const match = name.match(/Amendment[_\s-]*(\d+)/i);
      return match ? Number(match[1]) : 0;
    };
    return score(b.name) - score(a.name);
  });
}

async function inflatePdfText(bytes: Uint8Array): Promise<string> {
  const raw = new TextDecoder("latin1").decode(bytes);
  const chunks = [raw];
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    let payload = match[1];
    if (payload.startsWith("\r\n")) payload = payload.slice(2);
    else if (payload.startsWith("\n")) payload = payload.slice(1);
    const u8 = new Uint8Array(payload.length);
    for (let i = 0; i < payload.length; i += 1) u8[i] = payload.charCodeAt(i);
    for (const format of ["deflate", "deflate-raw"] as const) {
      try {
        const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream(format));
        const dec = new Uint8Array(await new Response(stream).arrayBuffer());
        chunks.push(new TextDecoder("latin1").decode(dec));
        break;
      } catch {
        /* try the next decoder */
      }
    }
  }
  return chunks.join("\n");
}

function pdfLiteralStrings(text: string) {
  const out: string[] = [];
  const re = /\((?:\\.|[^\\)])+\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    out.push(
      match[0]
        .slice(1, -1)
        .replace(/\\n/g, " ")
        .replace(/\\(.)/g, "$1"),
    );
  }
  return out.join("");
}

export function parseProductManualNumber(text: string) {
  const compact = String(text || "").replace(/\s+/g, " ");
  const match = compact.match(
    /PM\s*\/\s*IS\s*\d{2,5}(?:\s*\([^)]+\))?(?:\s*\/\s*[A-Za-z0-9.-]+){0,5}/i,
  );
  if (!match) return "";
  return match[0]
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .replace(/PM\/IS/i, "PM/IS")
    .trim();
}

export async function extractProductManualNumberFromFile(file: File) {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const inflated = await inflatePdfText(bytes);
    return parseProductManualNumber(`${pdfLiteralStrings(inflated)} ${inflated}`);
  } catch {
    return "";
  }
}

export function attachFilesToInput(files: File[]) {
  const input = document.getElementById(
    "is_code_files",
  ) as HTMLInputElement | null;
  if (!input || files.length === 0) return;
  const dt = new DataTransfer();
  const seen = new Set<string>();
  const keep = Array.from(input.files || []).filter(
    (file) => !isStandardPackName(file.name),
  );
  for (const existing of keep) {
    dt.items.add(existing);
    seen.add(existing.name);
  }
  for (const file of files) {
    if (seen.has(file.name)) continue;
    dt.items.add(file);
    seen.add(file.name);
  }
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export async function applyIsCodePortalPayload(
  payload: IsCodePortalPayload,
  onUpdateField: (key: string, value: string) => void,
): Promise<string[]> {
  const notes = [...(payload.notes || [])];
  const fields = payload.fields || {};
  for (const [key, raw] of Object.entries(fields)) {
    const value = String(raw ?? "").trim();
    if (!value) continue;
    if (key === "aspect_of_is") {
      const aspect = normalizeAspect(value);
      if (aspect) onUpdateField(key, aspect);
      continue;
    }
    if (key === "unit_of_is") {
      const unit = normalizeUnit(value);
      if (unit) onUpdateField(key, unit);
      continue;
    }
    if (/_quantity$/.test(key)) {
      onUpdateField(key, normalizeSlabQty(value));
      continue;
    }
    onUpdateField(key, MONEY_KEYS.has(key) ? normalizeMoney(value) : value);
  }

  const incoming = (payload.files || [])
    .filter((f) => f.base64)
    .map((f) =>
      fileFromBase64(f.name || "document.pdf", f.base64, f.mime || "application/pdf"),
    );

  if (!fields.product_manual_number) {
    const manual = incoming.find((f) => isManualFileName(f.name));
    if (manual) {
      const pm = await extractProductManualNumberFromFile(manual);
      if (pm) onUpdateField("product_manual_number", pm);
    }
  }

  if (incoming.length === 0) return notes;

  const input = document.getElementById("is_code_files") as HTMLInputElement | null;
  const already = input ? Array.from(input.files || []) : [];
  const combined: File[] = [];
  const seen = new Set<string>();
  for (const file of [...already, ...incoming]) {
    if (seen.has(file.name)) continue;
    seen.add(file.name);
    combined.push(file);
  }

  const pdfs = combined.filter((f) => /pdf/i.test(f.type) || /\.pdf$/i.test(f.name));
  const manuals = pdfs.filter((f) => isManualFileName(f.name));
  const rest = sortAmendmentThenStandard(
    pdfs.filter((f) => !isManualFileName(f.name) && !/Standard_and_Amendments/i.test(f.name)),
  );
  const others = combined.filter((f) => !pdfs.includes(f));
  const attached: File[] = [...others, ...manuals];
  if (rest.length === 1) attached.push(rest[0]);
  if (rest.length > 1) {
    const isNo = String(fields.is_number || rest[0].name.replace(/_Standard.*$/i, "IS") || "IS").replace(
      /\s+/g,
      "_",
    );
    try {
      attached.push(await mergePdfFiles(rest, `${isNo}_Standard_and_Amendments.pdf`));
      notes.push("Standard and amendment PDFs were merged into one file.");
    } catch {
      attached.push(...rest);
      notes.push("Could not merge PDFs; files were attached separately.");
    }
  }
  attachFilesToInput(attached);
  notes.push(`Attached ${attached.length} file(s) to IS Code Related Files.`);
  return notes;
}

function normalizeMoney(raw: string): string {
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return raw;
  return (Math.round(n * 100) / 100).toFixed(2);
}
