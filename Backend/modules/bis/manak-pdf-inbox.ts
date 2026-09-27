import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type ManakPdfInboxEntry = {
  token: string;
  sampleId: string;
  createdAt: number;
  chunks: string[];
  chunkTotal: number;
  sample_code?: string;
  pdfName?: string;
  ref?: string;
};

const TTL_MS = 45 * 60 * 1000;
const DIR = join("/tmp", "qe-manak-pdf-inbox");

function fileFor(token: string) {
  const safe = token.replace(/[^\w.-]+/g, "_").slice(0, 80);
  return join(DIR, `${safe}.json`);
}

function ensureDir() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
}

function readEntry(token: string): ManakPdfInboxEntry | null {
  try {
    const raw = readFileSync(fileFor(token), "utf8");
    const entry = JSON.parse(raw) as ManakPdfInboxEntry;
    if (!entry || entry.token !== token) return null;
    if (Date.now() - (entry.createdAt || 0) > TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeEntry(entry: ManakPdfInboxEntry) {
  ensureDir();
  writeFileSync(fileFor(entry.token), JSON.stringify(entry));
}

export function registerManakPdfInbox(token: string, sampleId: string): ManakPdfInboxEntry {
  const entry: ManakPdfInboxEntry = {
    token,
    sampleId,
    createdAt: Date.now(),
    chunks: [],
    chunkTotal: 0,
  };
  writeEntry(entry);
  return entry;
}

export function getManakPdfInbox(token: string): ManakPdfInboxEntry | null {
  return readEntry(token);
}

export function putManakPdfChunk(
  token: string,
  index: number,
  total: number,
  chunk: string,
): ManakPdfInboxEntry | null {
  const entry = readEntry(token);
  if (!entry) return null;
  entry.chunkTotal = total;
  entry.chunks[index] = chunk;
  entry.createdAt = Date.now();
  writeEntry(entry);
  return entry;
}

export function assembledManakPdfBase64(entry: ManakPdfInboxEntry): string | null {
  if (!entry.chunkTotal || entry.chunks.filter((part) => typeof part === "string").length < entry.chunkTotal) {
    return null;
  }
  return entry.chunks.join("");
}

export function markManakPdfReady(
  token: string,
  info: { ref: string; pdfName: string; sample_code?: string },
): ManakPdfInboxEntry | null {
  const entry = readEntry(token);
  if (!entry) return null;
  entry.ref = info.ref;
  entry.pdfName = info.pdfName;
  entry.sample_code = info.sample_code || entry.sample_code;
  entry.chunks = [];
  entry.createdAt = Date.now();
  writeEntry(entry);
  return entry;
}
