export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      try {
        return Number.isFinite(n) ? String.fromCodePoint(n) : _;
      } catch {
        return _;
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = parseInt(hex, 16);
      try {
        return Number.isFinite(n) ? String.fromCodePoint(n) : _;
      } catch {
        return _;
      }
    });
}

export function cleanPlainEmailText(text: string): string {
  let cleaned = text
    .replace(/^[^\s@]+@[^\s@]+\.[^\s@]+\s+(?=\S)/i, "")
    .replace(/^[^\s@]+@[^\s@]+\.[^\s@]+\s*\n+/i, "")
    .trim();

  cleaned = cleaned
    .split("\n")
    .filter((line) => {
      const s = line.trim();
      if (!s) return true;
      if (/^[-a-z][-a-z0-9]*:\s*.+;?\s*$/i.test(s)) return false;
      if (/^(?:\/\*|@media|\.|#|mso-|webkit-|ms-)/i.test(s)) return false;
      if (/background(?:-position|-size|-color)?|font-family|text-size-adjust/i.test(s) && s.includes(";"))
        return false;
      return true;
    })
    .join("\n")
    .replace(/\(\s*\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"')\]]+/gi;

function normalizeUrl(url: string): string {
  return url.replace(/[.,;:!?)>\]]+$/, "").trim();
}

function isImageUrl(url: string): boolean {
  return (
    /\.(png|jpe?g|gif|webp|svg|ico|bmp)(\?|$)/i.test(url) ||
    /(?:googleusercontent|ggpht|stripe-images\.s3\.amazonaws|ci\d+\.googleusercontent)\.com/i.test(url)
  );
}

export function linkifyPlainTextToHtml(text: string): string {
  return plainTextToHtmlWithViewLinks(text);
}

const VIEW_LINK_BTN_CLASS =
  "email-view-link group/viewlink inline-flex max-w-[min(100%,20rem)] align-middle rounded-md border border-sky-300 bg-sky-50 px-2 py-0.5 mx-0.5 text-[11px] font-medium text-sky-700 no-underline hover:border-sky-400 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-950/70";

const VIEW_IMAGE_BTN_CLASS =
  "email-view-image group/viewimg inline-flex max-w-[min(100%,20rem)] align-middle rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 mx-0.5 text-[11px] font-medium text-emerald-700 no-underline hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70";

const IMAGE_PLACEHOLDER_RE = /\[image:\s*([^\]|]+)(?:\|([^\]]+))?\]/gi;

function viewLinkMarkup(url: string): string {
  const safe = escapeHtml(url);
  return `<a href="${safe}" target="_blank" rel="noopener noreferrer" title="${safe}" class="${VIEW_LINK_BTN_CLASS}"><span class="truncate group-hover/viewlink:hidden">View Link</span><span class="hidden max-w-full truncate group-hover/viewlink:inline">${safe}</span></a>`;
}

function viewImageMarkup(url: string, label?: string): string {
  const safe = escapeHtml(url);
  const title = label ? `${escapeHtml(label.trim())} — ${safe}` : safe;
  return `<a href="${safe}" target="_blank" rel="noopener noreferrer" title="${title}" class="${VIEW_IMAGE_BTN_CLASS}"><span class="truncate group-hover/viewimg:hidden">View Image</span><span class="hidden max-w-full truncate group-hover/viewimg:inline">${safe}</span></a>`;
}

function extractImageSources(html: string): Array<{ src: string; alt?: string }> {
  const images: Array<{ src: string; alt?: string }> = [];
  const re = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const tag = match[0];
    const altMatch = tag.match(/alt=["']([^"']*)["']/i);
    images.push({
      src: normalizeUrl(match[1]),
      alt: altMatch?.[1]?.trim() || undefined,
    });
  }
  return images;
}

export function injectImageUrlsFromHtml(plain: string, html: string): string {
  if (!plain || !html) return plain;
  const images = extractImageSources(html);
  if (images.length === 0) return plain;

  let index = 0;
  return plain.replace(/\[image:\s*([^\]|]+)\](?!\|)/gi, (_m, label: string) => {
    const img = images[index++];
    if (!img?.src) return _m;
    return `[image:${label.trim()}|${img.src}]`;
  });
}

function replaceImagePlaceholders(text: string): string {
  return text.replace(IMAGE_PLACEHOLDER_RE, (_m, label: string, url?: string) => {
    const trimmedUrl = url?.trim();
    if (trimmedUrl && trimmedUrl.startsWith("http")) {
      return viewImageMarkup(normalizeUrl(trimmedUrl), label);
    }
    return `<span class="text-xs text-zinc-500">${escapeHtml(label.trim())}</span>`;
  });
}

function replaceBareUrlsWithViewLinks(fragment: string): string {
  return fragment.replace(URL_IN_TEXT_RE, (match) => {
    const url = normalizeUrl(match);
    if (!url.startsWith("http")) return match;
    if (isImageUrl(url)) return viewImageMarkup(url);
    return viewLinkMarkup(url);
  });
}

export function htmlWithInlineViewLinks(html: string): string {
  let fragment = html.replace(
    /<img[^>]*src=["']([^"']+)["'][^>]*>/gi,
    (_m, src: string) => viewImageMarkup(normalizeUrl(src)),
  );

  fragment = fragment.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, label: string) => {
      const url = normalizeUrl(href);
      if (!url.startsWith("http")) {
        const text = decodeHtmlEntities(label.replace(/<[^>]+>/g, "").trim());
        return text ? `<span>${escapeHtml(text)}</span>` : "";
      }
      if (isImageUrl(url)) return viewImageMarkup(url, decodeHtmlEntities(label.replace(/<[^>]+>/g, "").trim()));
      const text = decodeHtmlEntities(label.replace(/<[^>]+>/g, "").trim());
      const btn = viewLinkMarkup(url);
      if (text && text !== href && !/^https?:\/\//i.test(text)) {
        return `${escapeHtml(text)} ${btn}`;
      }
      return btn;
    },
  );

  return replaceBareUrlsWithViewLinks(fragment).trim();
}

function linkifyPlainSegment(text: string): string {
  const re = new RegExp(URL_IN_TEXT_RE.source, "gi");
  let result = "";
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    result += escapeHtml(text.slice(last, match.index)).replace(/\n/g, "<br />");
    const url = normalizeUrl(match[0]);
    if (url.startsWith("http")) {
      result += isImageUrl(url) ? viewImageMarkup(url) : viewLinkMarkup(url);
    } else {
      result += escapeHtml(match[0]);
    }
    last = match.index + match[0].length;
  }

  result += escapeHtml(text.slice(last)).replace(/\n/g, "<br />");
  return result;
}

export function plainTextToHtmlWithViewLinks(text: string): string {
  const withImages = replaceImagePlaceholders(text);
  const parts = withImages.split(/(<a[\s\S]*?<\/a>|<span[\s\S]*?<\/span>)/gi);
  return parts
    .map((part) => {
      if (/^<(a|span)\b/i.test(part)) return part;
      return linkifyPlainSegment(part);
    })
    .join("");
}

export function normalizeEmailHtml(html: string): string {
  let fragment = html.trim();
  if (!fragment) return "";

  fragment = fragment.replace(/<!DOCTYPE[^>]*>/gi, "");

  const bodyMatch = fragment.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    fragment = bodyMatch[1];
  }

  fragment = fragment
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "");

  return fragment.trim();
}

export function sanitizeEmailHtmlForDisplay(html: string): string {
  let fragment = normalizeEmailHtml(html);
  if (!fragment) return "";

  fragment = fragment
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/<meta[^>]*>/gi, "");

  fragment = fragment.replace(/<a\b([^>]*?)>/gi, (_match, attrs: string) => {
    if (/target=/i.test(attrs)) return `<a${attrs}>`;
    return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
  });

  return fragment.trim();
}

export function htmlToPlainText(html: string): string {
  const normalized = normalizeEmailHtml(html);
  const withImages = normalized.replace(
    /<img[^>]*src=["']([^"']+)["'][^>]*>/gi,
    (_m, src: string) => {
      const altMatch = _m.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch?.[1]?.trim() || "Image";
      return `[image:${alt}|${normalizeUrl(src)}]`;
    },
  );
  const withLinks = withImages.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, label: string) => {
      const text = decodeHtmlEntities(label.replace(/<[^>]+>/g, "").trim());
      return text && text !== href ? `${text} (${href})` : href;
    },
  );

  return decodeHtmlEntities(
    withLinks
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\sstyle=["'][^"']*["']/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

export function wrapEmailHtml(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" rel="noopener noreferrer" />
  <style>
    html, body {
      margin: 0;
      padding: 12px;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      font-size: 14px;
      line-height: 1.55;
      color: #18181b;
      word-break: break-word;
      background: #fff;
      overflow: auto;
      max-height: 100%;
    }
    img { max-width: 100% !important; height: auto !important; }
    table { max-width: 100% !important; table-layout: fixed; }
    pre { white-space: pre-wrap; }
    a { color: #0284c7; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

export const EMAIL_BODY_CONTENT_CLASS =
  'email-message-content w-full max-w-full overflow-x-auto break-words [overflow-wrap:anywhere] [font-family:system-ui,-apple-system,"Segoe_UI",Roboto,"Noto_Sans","Noto_Sans_Devanagari",sans-serif] text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 [&_*]:!max-w-full [&_img]:my-2 [&_img]:max-h-28 [&_img]:h-auto [&_img]:w-auto [&_table]:!w-full [&_td]:align-top [&_*]:!bg-transparent [&_*]:!text-inherit';
