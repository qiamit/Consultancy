import { normalizeIsNumber, parseIsReferenceFromText } from "./parse-is-reference";

export const FILE_PATH_HEADER_ALIASES = new Set([
  "file_path",
  "filepath",
  "file path",
  "files",
  "related_files",
  "related files",
  "pdf_path",
  "pdf path",
  "standard_file",
  "standard file",
  "standard_pdf",
  "standard pdf",
  "product_manual_file",
  "product manual file",
  "product_manual_pdf",
  "product manual pdf",
  "document_path",
  "document path",
]);

export function normalizeImportHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isFilePathHeader(raw: string): boolean {
  const key = raw.trim().toLowerCase();
  return FILE_PATH_HEADER_ALIASES.has(key) || FILE_PATH_HEADER_ALIASES.has(normalizeImportHeader(raw));
}

export function splitImportFilePaths(raw: string): string[] {
  return String(raw || "")
    .split(/[;|\n]+/)
    .map((part) => part.replace(/^["']+|["']+$/g, "").trim())
    .filter(Boolean);
}

export function importPathBasename(path: string): string {
  const trimmed = String(path || "")
    .replace(/^["']+|["']+$/g, "")
    .trim();
  const parts = trimmed.split(/[/\\]/);
  return (parts[parts.length - 1] || "").trim();
}

export function isNumberFromFileName(fileName: string): string | null {
  const spaced = fileName.replace(/_/g, " ");
  const ref = parseIsReferenceFromText(spaced);
  if (ref?.isNumber) return ref.isNumber;
  const loose = /\b(\d{4,6})\b/.exec(spaced);
  return loose ? loose[1] : null;
}

export function yearFromFileName(fileName: string): number | null {
  const spaced = fileName.replace(/_/g, " ");
  const ref = parseIsReferenceFromText(spaced);
  return ref?.revisionYear ?? null;
}

export type ImportFileTarget = {
  key: string;
  year?: number;
  basenames: Set<string>;
};

export function matchFilesToImportTargets<T extends File>(
  targets: ImportFileTarget[],
  files: T[],
): { assigned: Map<number, T[]>; unmatched: T[] } {
  const assigned = new Map<number, T[]>();
  const unmatched: T[] = [];

  const push = (index: number, file: T) => {
    const list = assigned.get(index) ?? [];
    list.push(file);
    assigned.set(index, list);
  };

  for (const file of files) {
    const base = file.name.trim().toLowerCase();
    const relative = String(
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || "",
    )
      .trim()
      .toLowerCase();
    const pathHits = targets
      .map((target, index) => ({ target, index }))
      .filter(
        ({ target }) =>
          target.basenames.has(base) ||
          (relative && [...target.basenames].some((name) => relative.endsWith(name))),
      );

    if (pathHits.length === 1) {
      push(pathHits[0].index, file);
      continue;
    }
    if (pathHits.length > 1) {
      const year = yearFromFileName(file.name);
      const yearHit = pathHits.find(({ target }) => year && target.year === year);
      push((yearHit ?? pathHits[0]).index, file);
      continue;
    }

    const isKey = isNumberFromFileName(file.name);
    if (!isKey) {
      unmatched.push(file);
      continue;
    }
    const hits = targets
      .map((target, index) => ({ target, index }))
      .filter(({ target }) => target.key === isKey);
    if (hits.length === 0) {
      unmatched.push(file);
      continue;
    }
    if (hits.length === 1) {
      push(hits[0].index, file);
      continue;
    }
    const year = yearFromFileName(file.name);
    const yearHit = hits.find(({ target }) => year && target.year === year);
    push((yearHit ?? hits[0]).index, file);
  }

  return { assigned, unmatched };
}

export function targetKeyFromIsNumber(isNumber: string): string {
  return normalizeIsNumber(isNumber);
}
