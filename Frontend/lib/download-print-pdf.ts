/** Shared Playwright PDF download for print-preview HTML (BIS document modals). */

import type { PrintSettings } from "@backend/modules/print/types";
import {
  downloadPdfViaPlaywright,
  mapPageSizeToPlaywrightFormat,
} from "@/lib/playwright-pdf-client";

export function safePdfFilenamePart(raw: string, fallback = "Company"): string {
  return (raw || fallback).replace(/[\\/:*?"<>|]+/g, "_").trim() || fallback;
}

export async function downloadPrintHtmlAsPdf(opts: {
  html: string;
  filename: string;
  settings: Pick<PrintSettings, "paper_size" | "orientation">;
}): Promise<void> {
  const html = opts.html.trim();
  if (!html) throw new Error("Nothing to export as PDF.");
  const filename = opts.filename.toLowerCase().endsWith(".pdf")
    ? opts.filename
    : `${opts.filename}.pdf`;
  await downloadPdfViaPlaywright({
    html,
    filename,
    format: mapPageSizeToPlaywrightFormat(opts.settings.paper_size),
    landscape: opts.settings.orientation === "landscape",
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });
}
