/** Browser client for the Playwright PDF service (same Chromium print engine as LIMS). */

export type PlaywrightPdfFormat = "a4" | "a5" | "letter" | "legal";

export type PlaywrightPdfRequest = {
  html: string;
  filename: string;
  format?: PlaywrightPdfFormat;
  landscape?: boolean;
  /** CSS margin strings, e.g. "12mm". Prefer 0 when HTML already has page padding. */
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
};

function pdfServiceUrl(): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_PDF_SERVICE_URL ||
    process.env.PDF_SERVICE_URL ||
    ""
  ).trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "/api/pdf";
}

export function mapPageSizeToPlaywrightFormat(
  pageSize: string,
): PlaywrightPdfFormat {
  const s = pageSize.trim().toLowerCase();
  if (s === "letter") return "letter";
  if (s === "legal") return "legal";
  if (s === "a5") return "a5";
  return "a4";
}

/** Trigger a browser download from PDF bytes. */
export function triggerPdfDownload(blob: Blob, filename: string): void {
  const safe =
    filename.replace(/[\\/:*?"<>|]+/g, "_").trim() || "document.pdf";
  const outName = safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = outName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

function friendlyPdfServiceError(detail: string, status?: number): string {
  const raw = detail.trim();
  const lower = raw.toLowerCase();
  if (
    lower.includes("executable doesn") ||
    lower.includes("playwright install") ||
    lower.includes("browsertype.launch")
  ) {
    return "PDF browser is missing. In pdf-service run: npm run install-browser";
  }
  if (
    status === 502 ||
    status === 504 ||
    lower.includes("econnrefused") ||
    lower.includes("not running") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror")
  ) {
    return "PDF service is not running. Start it with: cd pdf-service && npm run start";
  }
  if (raw && !raw.startsWith("<!") && raw.length < 400) return raw;
  if (status) {
    return `PDF service error (${status}). Check NEXT_PUBLIC_PDF_SERVICE_URL.`;
  }
  return "PDF download failed. Check the Playwright PDF service.";
}

/** Render HTML → PDF bytes via Playwright service (does not trigger a download). */
export async function renderPdfViaPlaywright(
  request: PlaywrightPdfRequest,
): Promise<Blob> {
  const endpoint = pdfServiceUrl();
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html: request.html,
        filename: request.filename,
        format: request.format ?? "a4",
        landscape: request.landscape === true,
        margin: request.margin ?? {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
      }),
    });
  } catch {
    throw new Error(friendlyPdfServiceError("failed to fetch"));
  }

  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { error?: string };
      detail = j.error?.trim() || "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(friendlyPdfServiceError(detail, res.status));
  }

  const blob = await res.blob();
  if (!blob.size) throw new Error("PDF service returned an empty file");
  if (blob.type.includes("text/html")) {
    throw new Error(friendlyPdfServiceError("PDF service is not running"));
  }
  return blob;
}

/**
 * Render HTML → PDF via Playwright service and download the file.
 * Throws a clear error if the service is not running or Chromium is missing.
 */
export async function downloadPdfViaPlaywright(
  request: PlaywrightPdfRequest,
): Promise<void> {
  const blob = await renderPdfViaPlaywright(request);
  triggerPdfDownload(blob, request.filename);
}
