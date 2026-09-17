import type { PrintSettings } from "@backend/modules/print/types";
import { iframeSizeForPrintSettings } from "@backend/modules/print/manufacturing-scope-declaration";

export function padPrintPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

export function printPageIndicatorHtml(pageNum: number, totalPages: number): string {
  return `<div class="print-sheet-page-indicator">Page ${padPrintPageNum(pageNum)} of ${padPrintPageNum(totalPages)}</div>`;
}

export function printPageGapHtml(pageNum: number, totalPages: number): string {
  if (pageNum <= 1 || totalPages <= 1) return "";
  return `<div class="print-sheet-page-gap" aria-hidden="true">Page break · ${padPrintPageNum(pageNum - 1)} → ${padPrintPageNum(pageNum)}</div>`;
}

/** Approximate outer `.lh-wrap` height when letterhead sits above the first sheet.
 *  Keep generous — long company addresses easily exceed 32mm. */
export const PRINT_OUTER_LETTERHEAD_RESERVE_MM = 48;

/**
 * CSS min-height for a print sheet that fills one paper page inside `.doc-page` padding.
 * When `reserveOuterLetterhead` is true (default if `show_letterhead`), subtracts space for
 * the document-level letterhead so the sheet does not overflow onto a blank second page.
 */
export function printSheetMinHeightCss(
  settings: PrintSettings,
  opts?: { reserveOuterLetterhead?: boolean; pageHeightMm?: number },
): string {
  const pageHeightMm =
    opts?.pageHeightMm ?? iframeSizeForPrintSettings(settings).heightMm;
  const reserveOuter =
    opts?.reserveOuterLetterhead ?? Boolean(settings.show_letterhead);
  const reserveMm = reserveOuter ? PRINT_OUTER_LETTERHEAD_RESERVE_MM : 0;
  return `calc(${pageHeightMm}mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm - ${reserveMm}mm)`;
}

/** Iframe height for N paper-sized preview sheets (+ labeled gaps). */
export function iframeSizeForPagedPrintSettings(
  settings: PrintSettings,
  pageCount = 1,
): { widthMm: number; heightMm: number } {
  const base = iframeSizeForPrintSettings(settings);
  const pages = Math.max(1, pageCount);
  const gapMm = pages > 1 ? (pages - 1) * 12 : 0;
  return {
    widthMm: base.widthMm,
    heightMm: base.heightMm * pages + gapMm + 4,
  };
}

/** Shared sheet / page-break CSS used by letter-style BIS previews. */
export function pagedPrintSheetStyles(settings: PrintSettings): string {
  const sheetMinHeight = printSheetMinHeightCss(settings, { reserveOuterLetterhead: false });
  const firstSheetMinHeight = printSheetMinHeightCss(settings);
  return `
    .print-sheet {
      position: relative;
      width: 100%;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 6mm;
      display: flex;
      flex-direction: column;
      page-break-after: auto;
      break-after: auto;
    }
    .print-sheet:first-of-type {
      min-height: ${firstSheetMinHeight};
    }
    /* Short single-page letters: never force a full-page min-height (avoids blank page 2). */
    .print-sheet.print-sheet-natural,
    .print-sheet-natural {
      min-height: 0 !important;
      height: auto !important;
      padding-bottom: 2mm;
    }
    .print-sheet-natural .print-sheet-page-indicator {
      position: static;
      margin-top: 14px;
      bottom: auto;
    }
    .print-sheet-body {
      flex: 1 1 auto;
      min-height: 0;
    }
    .print-sheet-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .print-sheet-page-gap {
      display: none;
    }
    .print-sheet-page-break {
      page-break-before: always;
      break-before: page;
    }
    @media screen {
      .print-sheet-page-gap {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 10mm;
        margin: 4mm 0;
        color: #64748b;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        border-top: 2px dashed #94a3b8;
        border-bottom: 2px dashed #94a3b8;
      }
    }
    @media print {
      .print-sheet-page-gap {
        display: none !important;
      }
      .print-sheet {
        page-break-after: always;
        break-after: page;
      }
      .print-sheet:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }
      .print-sheet-natural {
        page-break-after: auto;
        break-after: auto;
      }
    }
  `;
}
