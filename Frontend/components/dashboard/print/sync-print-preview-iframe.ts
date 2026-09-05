import type { CSSProperties } from "react";

/**
 * Grow the print-preview iframe to the full document height and disable
 * internal scrolling. The outer modal pane (`overflow-y-auto`) scrolls instead.
 * When content is paginated into multiple sheets, pass an explicit heightMm.
 */
export function syncPrintPreviewIframe(
  iframe: HTMLIFrameElement | null,
  opts?: { minHeightMm?: number },
): void {
  if (!iframe) return;
  const doc = iframe.contentDocument;
  if (!doc) return;

  const html = doc.documentElement;
  const body = doc.body;
  if (html) html.style.overflow = "hidden";
  if (body) body.style.overflow = "hidden";

  const contentPx = Math.max(html?.scrollHeight ?? 0, body?.scrollHeight ?? 0, 1);
  const minPx =
    opts?.minHeightMm != null
      ? Math.round((opts.minHeightMm * 96) / 25.4)
      : 0;
  iframe.style.height = `${Math.max(contentPx, minPx)}px`;
  iframe.style.overflow = "hidden";
  iframe.setAttribute("scrolling", "no");
}

export function printPreviewIframeStyle(widthMm: number, heightMm: number): CSSProperties {
  return {
    width: `min(100%, ${widthMm}mm)`,
    height: `${heightMm}mm`,
    minHeight: `${heightMm}mm`,
    overflow: "hidden",
    display: "block",
  };
}
