export type RemoveSignatureBackgroundOptions = {
  /** Minimum RGB channel value treated as paper (0–255). Default 205 */
  whiteThreshold?: number;
  /** Soft edge blend below threshold. Default 30 */
  feather?: number;
  /** Max canvas dimension; larger images are scaled down. Default 1200 */
  maxDimension?: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function fitDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Removes light paper-like backgrounds from signature scans so ink/stamp
 * remains on a transparent PNG (client-side canvas).
 */
export async function removeSignatureImageBackground(
  dataUrl: string,
  options?: RemoveSignatureBackgroundOptions,
): Promise<string> {
  const whiteThreshold = options?.whiteThreshold ?? 205;
  const feather = options?.feather ?? 30;
  const maxDimension = options?.maxDimension ?? 1200;

  const image = await loadImage(dataUrl);
  const { width, height } = fitDimensions(image.width, image.height, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas is not supported in this browser.");
  }

  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];
    if (alpha === 0) continue;

    const minChannel = Math.min(r, g, b);
    const maxChannel = Math.max(r, g, b);
    const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;

    // Keep colored ink/stamp; remove bright neutral paper tones.
    const isPaperLike = minChannel >= whiteThreshold - feather && saturation < 0.22;
    if (!isPaperLike) continue;

    if (minChannel >= whiteThreshold) {
      data[i + 3] = 0;
    } else {
      const blend = (whiteThreshold - minChannel) / feather;
      data[i + 3] = Math.round(alpha * blend);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
