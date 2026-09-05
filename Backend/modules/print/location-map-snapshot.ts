import {
  computeFitZoom,
  locationMapHasValidRoute,
  parseCoordinate,
  type LocationMapStored,
} from "@backend/modules/bis/location-map";

type LngLat = [number, number];

const TILE_SIZE = 256;

function lonToWorldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * TILE_SIZE * 2 ** zoom;
}

function latToWorldY(lat: number, zoom: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
  return y * TILE_SIZE * 2 ** zoom;
}

function loadTile(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Same-origin /api/map-tile — safe for canvas export.
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function fetchRouteCoordinates(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<LngLat[]> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("route failed");
    const data = (await res.json()) as {
      routes?: Array<{ geometry?: { coordinates?: LngLat[] } }>;
    };
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (coords && coords.length >= 2) return coords;
  } catch {
    // fall through
  }
  return [
    [fromLng, fromLat],
    [toLng, toLat],
  ];
}

function dataUrlToPngBytes(dataUrl: string): Uint8Array | null {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  const binary = atob(match[1]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function tileProxyUrl(z: number, x: number, y: number): string {
  return `/api/map-tile?z=${z}&x=${x}&y=${y}`;
}

/**
 * Build a Google-style route map PNG for Word export.
 * Google Maps iframe cannot be screenshotted (cross-origin), so we compose
 * Google roadmap tiles (via same-origin proxy) + driving route path.
 */
export async function captureLocationMapPng(
  doc: LocationMapStored,
  options?: { widthPx?: number; heightPx?: number },
): Promise<{ type: "png"; data: Uint8Array } | null> {
  if (typeof document === "undefined") return null;
  if (!locationMapHasValidRoute(doc)) return null;

  const fromLat = parseCoordinate(doc.from_latitude);
  const fromLng = parseCoordinate(doc.from_longitude);
  const toLat = parseCoordinate(doc.to_latitude);
  const toLng = parseCoordinate(doc.to_longitude);
  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return null;
  }

  const widthPx = Math.max(640, Math.round(options?.widthPx ?? 900));
  const heightPx = Math.max(360, Math.round(options?.heightPx ?? 472)); // ~125mm

  // Prefer official Google Static Maps when API key is configured.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  if (apiKey) {
    const zoom = computeFitZoom(fromLat, fromLng, toLat, toLng, widthPx, heightPx);
    const origin = `${fromLat},${fromLng}`;
    const destination = `${toLat},${toLng}`;
    const sizeW = Math.min(640, widthPx);
    const sizeH = Math.min(640, heightPx);
    const params = new URLSearchParams({
      size: `${sizeW}x${sizeH}`,
      scale: "2",
      maptype: "roadmap",
      zoom: String(Math.min(15, zoom)),
      path: `color:0x4285F4|weight:6|${origin}|${destination}`,
      markers: `color:0x34A853|label:A|${origin}`,
      key: apiKey,
    });
    params.append("markers", `color:0xEA4335|label:B|${destination}`);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params}`);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.length > 800) return { type: "png", data: bytes };
      }
    } catch {
      // fall through to tiled Google snapshot
    }
  }

  const route = await fetchRouteCoordinates(fromLat, fromLng, toLat, toLng);
  const lngs = [fromLng, toLng, ...route.map((c) => c[0])];
  const lats = [fromLat, toLat, ...route.map((c) => c[1])];
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const latPad = Math.max(0.012, (maxLat - minLat || 0.02) * 0.4);
  const lngPad = Math.max(0.012, (maxLng - minLng || 0.02) * 0.4);
  const west = minLng - lngPad;
  const east = maxLng + lngPad;
  const south = minLat - latPad;
  const north = maxLat + latPad;

  const zoom = Math.min(
    15,
    Math.max(9, computeFitZoom(fromLat, fromLng, toLat, toLng, widthPx, heightPx)),
  );

  const worldLeft = lonToWorldX(west, zoom);
  const worldRight = lonToWorldX(east, zoom);
  const worldTop = latToWorldY(north, zoom);
  const worldBottom = latToWorldY(south, zoom);
  const worldW = Math.max(1, worldRight - worldLeft);
  const worldH = Math.max(1, worldBottom - worldTop);

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Google Maps-like background while tiles load.
  ctx.fillStyle = "#e5e3df";
  ctx.fillRect(0, 0, widthPx, heightPx);

  const minTileX = Math.floor(worldLeft / TILE_SIZE);
  const maxTileX = Math.floor((worldRight - 1e-6) / TILE_SIZE);
  const minTileY = Math.floor(worldTop / TILE_SIZE);
  const maxTileY = Math.floor((worldBottom - 1e-6) / TILE_SIZE);
  const maxIndex = 2 ** zoom - 1;

  const tileJobs: Array<Promise<void>> = [];
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      if (tx < 0 || ty < 0 || tx > maxIndex || ty > maxIndex) continue;
      const tileUrl = tileProxyUrl(zoom, tx, ty);
      tileJobs.push(
        loadTile(tileUrl).then((img) => {
          if (!img) return;
          const x = ((tx * TILE_SIZE - worldLeft) / worldW) * widthPx;
          const y = ((ty * TILE_SIZE - worldTop) / worldH) * heightPx;
          const w = (TILE_SIZE / worldW) * widthPx + 0.5;
          const h = (TILE_SIZE / worldH) * heightPx + 0.5;
          ctx.drawImage(img, x, y, w, h);
        }),
      );
    }
  }
  await Promise.all(tileJobs.slice(0, 80));

  const project = (lng: number, lat: number) => ({
    x: ((lonToWorldX(lng, zoom) - worldLeft) / worldW) * widthPx,
    y: ((latToWorldY(lat, zoom) - worldTop) / worldH) * heightPx,
  });

  // Google Directions-style blue route
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(24, 84, 199, 0.35)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  route.forEach((coord, i) => {
    const p = project(coord[0], coord[1]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  ctx.strokeStyle = "#4285F4";
  ctx.lineWidth = 5;
  ctx.beginPath();
  route.forEach((coord, i) => {
    const p = project(coord[0], coord[1]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  const drawPin = (lng: number, lat: number, label: string, fill: string) => {
    const p = project(lng, lat);
    // teardrop pin
    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.moveTo(p.x, p.y);
    ctx.bezierCurveTo(p.x - 14, p.y - 18, p.x - 14, p.y - 36, p.x, p.y - 36);
    ctx.bezierCurveTo(p.x + 14, p.y - 36, p.x + 14, p.y - 18, p.x, p.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(p.x, p.y - 24, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fill;
    ctx.font = "bold 11px Arial,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, p.x, p.y - 23);
  };

  drawPin(fromLng, fromLat, "A", "#34A853");
  drawPin(toLng, toLat, "B", "#EA4335");

  // Directions-style card (top-left), similar to Google embed UI
  const fromName = (doc.from_location_name || "From").slice(0, 48);
  const toName = (doc.to_location_name || "To").slice(0, 48);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  const cardW = Math.min(340, widthPx - 24);
  const cardH = 64;
  ctx.beginPath();
  ctx.roundRect?.(12, 12, cardW, cardH, 8);
  if (!ctx.roundRect) {
    ctx.rect(12, 12, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#34A853";
  ctx.beginPath();
  ctx.arc(28, 32, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#202124";
  ctx.font = "600 12px Arial,sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(fromName, 42, 32);

  ctx.fillStyle = "#EA4335";
  ctx.beginPath();
  ctx.arc(28, 54, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#202124";
  ctx.fillText(toName, 42, 54);

  ctx.fillStyle = "rgba(32,33,36,0.65)";
  ctx.font = "10px Arial,sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Map data © Google", widthPx - 10, heightPx - 10);

  const dataUrl = canvas.toDataURL("image/png");
  const bytes = dataUrlToPngBytes(dataUrl);
  if (!bytes) return null;
  return { type: "png", data: bytes };
}
