/** Optional signature image from Top Management Sr 1 (when apply-on-documents is Yes). */
export type SignatorySignatureFields = {
  signatureImageUrl?: string;
};

export type SignatureOverlayPosition = {
  top?: string;
  right?: string;
  left?: string;
  bottom?: string;
  maxHeight?: string;
  maxWidth?: string;
};

export function signatorySignatureOverlayHtml(
  signatureImageUrl?: string,
  position?: SignatureOverlayPosition,
): string {
  const url = signatureImageUrl?.trim() ?? "";
  if (!url) return "";
  const top = position?.top ?? "-62px";
  const right = position?.right ?? "0";
  const left = position?.left ?? "auto";
  const bottom = position?.bottom ?? "auto";
  const maxHeight = position?.maxHeight ?? "72px";
  const maxWidth = position?.maxWidth ?? "180px";
  return `<img src="${url.replace(/"/g, "&quot;")}" alt="Signature" style="position:absolute;right:${right};left:${left};top:${top};bottom:${bottom};max-height:${maxHeight};max-width:${maxWidth};width:auto;object-fit:contain;z-index:2;pointer-events:none;" />`;
}

/** Collapse dash-only placeholders (---, ----, —) so the block looks filled cleanly. */
export function normalizeSignatoryField(value: string, fallback = "—"): string {
  const v = String(value ?? "").trim();
  if (!v || /^[-–—._\s]+$/.test(v)) return fallback;
  return v;
}

export function buildRightAlignedSignatoryBlockHtml(options: {
  companyName: string;
  sigName: string;
  sigDesig: string;
  signatureImageUrl?: string;
  sigTextAlign?: "left" | "right";
}): string {
  const sigAlign = options.sigTextAlign ?? "right";
  const overlay = signatorySignatureOverlayHtml(options.signatureImageUrl);
  const company = normalizeSignatoryField(options.companyName, "—");
  const sigName = normalizeSignatoryField(options.sigName);
  const sigDesig = normalizeSignatoryField(options.sigDesig);

  // One inline column so "For …", the signature line, and Name/Designation share the same width.
  return `
  <div style="margin-top:36px;text-align:right;">
      <div style="display:inline-block;min-width:220px;text-align:${sigAlign};">
        <div style="font-weight:700;">For ${company}</div>
        <div style="position:relative;margin-top:36px;text-align:${sigAlign};">
          ${overlay}
          <div style="position:relative;z-index:1;border-top:1px solid #111;padding-top:4px;font-size:11px;line-height:1.35;text-align:${sigAlign};">
            <div><strong>Name:</strong> ${sigName}</div>
            <div><strong>Designation:</strong> ${sigDesig}</div>
          </div>
        </div>
      </div>
  </div>`;
}

export function buildClassSignatoryBlockHtml(options: {
  blockClass: string;
  forClass: string;
  sigWrapClass: string;
  lineClass: string;
  companyName: string;
  sigName: string;
  sigDesig: string;
  signatureImageUrl?: string;
}): string {
  const overlay = signatorySignatureOverlayHtml(options.signatureImageUrl);
  const company = normalizeSignatoryField(options.companyName, "—");
  const sigName = normalizeSignatoryField(options.sigName);
  const sigDesig = normalizeSignatoryField(options.sigDesig);

  return `
<div class="${options.blockClass}">
  <div class="${options.blockClass}-inner" style="display:inline-block;min-width:220px;text-align:right;">
    <div class="${options.forClass}">For ${company}</div>
    <div class="${options.sigWrapClass}" style="position:relative;">
      ${overlay}
      <div class="${options.lineClass}" style="position:relative;z-index:1;">
        <div><strong>Name:</strong> ${sigName}</div>
        <div><strong>Designation:</strong> ${sigDesig}</div>
      </div>
    </div>
  </div>
</div>`;
}

export function buildSignatureTableCellInnerHtml(options: {
  signatureImageUrl?: string;
  bodyHtml: string;
}): string {
  const overlay = signatorySignatureOverlayHtml(options.signatureImageUrl);
  if (!overlay) return options.bodyHtml;

  return `
    <div style="position:relative;">
      ${overlay}
      <div style="position:relative;z-index:1;">${options.bodyHtml}</div>
    </div>`;
}
