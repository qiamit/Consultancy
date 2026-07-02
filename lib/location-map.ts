export type LocationMapStored = {
  from_location_name: string;
  from_latitude: string;
  from_longitude: string;
  to_location_name: string;
  to_latitude: string;
  to_longitude: string;
  map_zoom: string;
};

export const DEFAULT_MAP_ZOOM = 12;
export const MIN_MAP_ZOOM = 1;
export const MAX_MAP_ZOOM = 21;

export function defaultLocationMapDocument(): LocationMapStored {
  return {
    from_location_name: "",
    from_latitude: "",
    from_longitude: "",
    to_location_name: "",
    to_latitude: "",
    to_longitude: "",
    map_zoom: String(DEFAULT_MAP_ZOOM),
  };
}

export function parseCoordinate(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

export function resolveMapZoom(raw: string): number {
  const parsed = parseCoordinate(raw);
  if (parsed === null) return DEFAULT_MAP_ZOOM;
  return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, Math.round(parsed)));
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
    map_zoom: String(r.map_zoom ?? DEFAULT_MAP_ZOOM).trim() || String(DEFAULT_MAP_ZOOM),
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
    map_zoom: stored.map_zoom || defaults.map_zoom || String(DEFAULT_MAP_ZOOM),
  };
}

function formatCoord(value: number): string {
  return String(value);
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
  const zoom = String(resolveMapZoom(doc.map_zoom));

  const params = new URLSearchParams({
    saddr: origin,
    daddr: destination,
    hl: "en",
    z: zoom,
    output: "embed",
  });
  return `https://maps.google.com/maps?${params.toString()}`;
}
