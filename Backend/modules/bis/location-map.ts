export type LocationMapStored = {
  from_location_name: string;
  from_latitude: string;
  from_longitude: string;
  to_location_name: string;
  to_latitude: string;
  to_longitude: string;
  map_zoom: string;
};

export const MAP_ZOOM_FIT = "fit";
/** Legacy numeric default — treated as fit-to-route when loading older documents. */
export const LEGACY_DEFAULT_MAP_ZOOM = 12;
export const MIN_MAP_ZOOM = 1;
export const MAX_MAP_ZOOM = 21;
/** @deprecated Use MAP_ZOOM_FIT — kept for older imports / footer copy. */
export const DEFAULT_MAP_ZOOM = MAP_ZOOM_FIT;

export function defaultLocationMapDocument(): LocationMapStored {
  return {
    from_location_name: "",
    from_latitude: "",
    from_longitude: "",
    to_location_name: "",
    to_latitude: "",
    to_longitude: "",
    map_zoom: MAP_ZOOM_FIT,
  };
}

export function parseCoordinate(raw: string): number | null {
  const value = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (!value) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

/** Keep only characters valid while typing a decimal coordinate. */
export function sanitizeCoordinateInput(raw: string): string {
  let cleaned = raw.replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const negative = cleaned.startsWith("-");
  cleaned = cleaned.replace(/-/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  return negative ? `-${cleaned}` : cleaned;
}

export function isMapZoomFit(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return !v || v === "fit" || v === "auto";
}

/** Normalize stored zoom: empty / legacy default 12 → fit-to-route. */
export function normalizeMapZoom(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v || v === "fit" || v === "auto") return MAP_ZOOM_FIT;
  if (v === String(LEGACY_DEFAULT_MAP_ZOOM)) return MAP_ZOOM_FIT;
  const parsed = parseCoordinate(raw);
  if (parsed === null) return MAP_ZOOM_FIT;
  return String(Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, Math.round(parsed))));
}

export function resolveMapZoom(raw: string): number {
  if (isMapZoomFit(raw) || normalizeMapZoom(raw) === MAP_ZOOM_FIT) {
    return LEGACY_DEFAULT_MAP_ZOOM;
  }
  const parsed = parseCoordinate(raw);
  if (parsed === null) return LEGACY_DEFAULT_MAP_ZOOM;
  return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, Math.round(parsed)));
}

/** Approximate zoom that fits both points in a typical embed viewport. */
export function computeFitZoom(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mapWidthPx = 640,
  mapHeightPx = 520,
): number {
  const latSpan = Math.max(Math.abs(fromLat - toLat) * 1.45, 0.015);
  const lngSpan = Math.max(Math.abs(fromLng - toLng) * 1.45, 0.015);
  const zoomLng = Math.log2((360 * mapWidthPx) / (lngSpan * 256));
  const midLatRad = (((fromLat + toLat) / 2) * Math.PI) / 180;
  const latWorld = (latSpan * 256) / Math.max(0.2, Math.cos(midLatRad));
  const zoomLat = Math.log2((180 * mapHeightPx) / latWorld);
  const zoom = Math.floor(Math.min(zoomLng, zoomLat));
  return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, zoom));
}

export function isValidLatitude(value: number): boolean {
  return value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return value >= -180 && value <= 180;
}

export function locationMapHasValidRoute(doc: LocationMapStored): boolean {
  const fromLat = parseCoordinate(doc.from_latitude);
  const fromLng = parseCoordinate(doc.from_longitude);
  const toLat = parseCoordinate(doc.to_latitude);
  const toLng = parseCoordinate(doc.to_longitude);
  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return false;
  }
  return (
    isValidLatitude(fromLat) &&
    isValidLongitude(fromLng) &&
    isValidLatitude(toLat) &&
    isValidLongitude(toLng)
  );
}

export function documentHasContent(doc: LocationMapStored): boolean {
  return (
    doc.from_location_name.trim().length > 0 ||
    doc.from_latitude.trim().length > 0 ||
    doc.from_longitude.trim().length > 0 ||
    doc.to_location_name.trim().length > 0 ||
    doc.to_latitude.trim().length > 0 ||
    doc.to_longitude.trim().length > 0
  );
}

export function parseLocationMap(raw: unknown): LocationMapStored {
  if (!raw || typeof raw !== "object") return defaultLocationMapDocument();
  const r = raw as Record<string, unknown>;
  return {
    from_location_name: String(r.from_location_name ?? "").trim(),
    from_latitude: String(r.from_latitude ?? "").trim(),
    from_longitude: String(r.from_longitude ?? "").trim(),
    to_location_name: String(r.to_location_name ?? "").trim(),
    to_latitude: String(r.to_latitude ?? "").trim(),
    to_longitude: String(r.to_longitude ?? "").trim(),
    map_zoom: normalizeMapZoom(String(r.map_zoom ?? MAP_ZOOM_FIT)),
  };
}

export function resolveLocationMapDefaults(input: {
  companyName: string;
  bisBranchName: string;
  bisBranchState: string;
}): Partial<LocationMapStored> {
  const branchParts = [input.bisBranchName.trim(), input.bisBranchState.trim()].filter(Boolean);
  const toName =
    branchParts.length > 0
      ? `Bureau of Indian Standards, ${branchParts.join(", ")}`
      : "Bureau of Indian Standards";

  return {
    from_location_name: input.companyName.trim(),
    to_location_name: toName,
  };
}

export function mergeLocationMapWithDefaults(
  stored: LocationMapStored,
  defaults: Partial<LocationMapStored>,
): LocationMapStored {
  return {
    from_location_name: stored.from_location_name || defaults.from_location_name || "",
    from_latitude: stored.from_latitude || defaults.from_latitude || "",
    from_longitude: stored.from_longitude || defaults.from_longitude || "",
    to_location_name: stored.to_location_name || defaults.to_location_name || "",
    to_latitude: stored.to_latitude || defaults.to_latitude || "",
    to_longitude: stored.to_longitude || defaults.to_longitude || "",
    map_zoom: normalizeMapZoom(
      stored.map_zoom || defaults.map_zoom || MAP_ZOOM_FIT,
    ),
  };
}

function formatCoord(value: number): string {
  // 6 dp is enough for maps and avoids iframe remount thrash from float noise.
  return String(Number(value.toFixed(6)));
}

export function buildGoogleMapsDirectionsUrl(doc: LocationMapStored): string | null {
  const fromLat = parseCoordinate(doc.from_latitude);
  const fromLng = parseCoordinate(doc.from_longitude);
  const toLat = parseCoordinate(doc.to_latitude);
  const toLng = parseCoordinate(doc.to_longitude);
  if (
    fromLat === null ||
    fromLng === null ||
    toLat === null ||
    toLng === null ||
    !locationMapHasValidRoute(doc)
  ) {
    return null;
  }

  const origin = `${formatCoord(fromLat)},${formatCoord(fromLng)}`;
  const destination = `${formatCoord(toLat)},${formatCoord(toLng)}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

export function buildGoogleMapsEmbedUrl(doc: LocationMapStored): string | null {
  const fromLat = parseCoordinate(doc.from_latitude);
  const fromLng = parseCoordinate(doc.from_longitude);
  const toLat = parseCoordinate(doc.to_latitude);
  const toLng = parseCoordinate(doc.to_longitude);
  if (
    fromLat === null ||
    fromLng === null ||
    toLat === null ||
    toLng === null ||
    !locationMapHasValidRoute(doc)
  ) {
    return null;
  }

  const origin = `${formatCoord(fromLat)},${formatCoord(fromLng)}`;
  const destination = `${formatCoord(toLat)},${formatCoord(toLng)}`;
  const zoomMode = normalizeMapZoom(doc.map_zoom);
  const fit = zoomMode === MAP_ZOOM_FIT;
  const zoom = fit
    ? computeFitZoom(fromLat, fromLng, toLat, toLng)
    : resolveMapZoom(zoomMode);
  const apiKey =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim()
      : undefined;

  if (apiKey) {
    const params = new URLSearchParams({
      key: apiKey,
      origin,
      destination,
      mode: "driving",
      maptype: "roadmap",
    });
    // Embed API directions auto-frames the route when zoom is omitted.
    if (!fit) params.set("zoom", String(zoom));
    return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
  }

  // Directions embed — Google builds a valid pb internally.
  // Fit mode: omit z so the full From→To route is framed.
  // Manual zoom: pass z explicitly.
  const params = new URLSearchParams({
    saddr: origin,
    daddr: destination,
    hl: "en",
    output: "embed",
  });
  if (!fit) params.set("z", String(zoom));
  return `https://maps.google.com/maps?${params.toString()}`;
}
