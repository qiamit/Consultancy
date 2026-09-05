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
  const pageSize = iframeSizeForPrintSettings(settings);
  const sheetMinHeight = `calc(${pageSize.heightMm}mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm)`;
  return `
    .print-sheet {
      position: relative;
      width: 100%;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 6mm;
      display: flex;
      flex-direction: column;
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
    }
  `;
}
