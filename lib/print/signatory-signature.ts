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

export function buildRightAlignedSignatoryBlockHtml(options: {
  companyName: string;
  sigName: string;
  sigDesig: string;
  signatureImageUrl?: string;
  sigTextAlign?: "left" | "right";
}): string {
  const sigAlign = options.sigTextAlign ?? "right";
  const overlay = signatorySignatureOverlayHtml(options.signatureImageUrl);

  return `
  <div style="margin-top:36px;text-align:right;">
      <div style="font-weight:700;">For ${options.companyName}</div>
      <div style="position:relative;margin-top:32px;display:inline-block;min-width:200px;text-align:${sigAlign};">
        ${overlay}
        <div style="position:relative;z-index:1;border-top:1px solid #94a3b8;padding-top:2px;font-size:11px;line-height:1.35;text-align:${sigAlign};">
          <div><strong>Name:</strong> ${options.sigName}</div>
          <div><strong>Designation:</strong> ${options.sigDesig}</div>
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

  return `
<div class="${options.blockClass}">
  <div class="${options.forClass}">For ${options.companyName || "—"}</div>
  <div class="${options.sigWrapClass}" style="position:relative;">
    ${overlay}
    <div class="${options.lineClass}" style="position:relative;z-index:1;">
      <div><strong>Name:</strong> ${options.sigName}</div>
      <div><strong>Designation:</strong> ${options.sigDesig}</div>
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
