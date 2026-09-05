import { buildPrintDocument } from "@backend/modules/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildGoogleMapsEmbedUrl,
  computeFitZoom,
  isMapZoomFit,
  locationMapHasValidRoute,
  MAP_ZOOM_FIT,
  normalizeMapZoom,
  parseCoordinate,
  resolveMapZoom,
  type LocationMapStored,
} from "@backend/modules/bis/location-map";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";
import { buildClassSignatoryBlockHtml } from "@backend/modules/print/signatory-signature";

export type LocationMapLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
> & {
  applicationNumber: string;
  dateOfApplication: string;
  document: LocationMapStored;
  embedUrl: string | null;
  directionsUrl: string | null;
  firmRepName: string;
  firmRepDesignation: string;
};

export type LocationMapPrintAssets = Partial<
  Pick<
    PrintCompanyInfo,
    "logo_url" | "letterhead_upper_url" | "letterhead_lower_url" | "seal_sign_url"
  >
>;

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCoordDisplay(raw: string): string {
  const value = parseCoordinate(raw);
  return value === null ? "—" : String(value);
}

function formatMetaDate(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "N/A";
  return formatDisplayDate(v, "N/A");
}

function formatApplicationNo(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v || v.toUpperCase() === "N/A" || v === "—") return "CM/A - N/A";
  return formatApplicationNumberDisplay(v);
}

function formatBisBranchLine(branchName: string, state: string): string {
  const branch = branchName.trim() || "________________";
  const st = state.trim() || "________________";
  return `${esc(branch)}, ${esc(st)}, INDIA`;
}

function padPageNum(n: number): string {
  return String(n).padStart(2, "0");
}

function buildPageIndicatorHtml(): string {
  return `<div class="loc-page-indicator">Page ${padPageNum(1)} of ${padPageNum(1)}</div>`;
}

function buildLetterIntroHtml(data: LocationMapLetterData): string {
  const letterDate = formatMetaDate(data.dateOfApplication);
  const appNo = formatApplicationNo(data.applicationNumber);

  return `
<div class="loc-to-row">
  <div class="loc-to-block">
    To<br/>
    The Director &amp; Head<br/>
    Bureau of Indian Standards<br/>
    ${formatBisBranchLine(data.bisBranchName, data.bisBranchState)}
  </div>
  <div class="loc-date-block">
    <div><strong>Date:</strong> ${esc(letterDate)}</div>
    <div><strong>Application No.:</strong> ${esc(appNo)}</div>
  </div>
</div>`;
}

function buildStaticMapImageUrl(doc: LocationMapStored): string | null {
  if (!locationMapHasValidRoute(doc)) return null;

  const fromLat = parseCoordinate(doc.from_latitude);
  const fromLng = parseCoordinate(doc.from_longitude);
  const toLat = parseCoordinate(doc.to_latitude);
  const toLng = parseCoordinate(doc.to_longitude);
  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return null;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY?.trim();
  if (!apiKey) return null;

  const origin = `${fromLat},${fromLng}`;
  const destination = `${toLat},${toLng}`;
  const zoom = String(
    isMapZoomFit(doc.map_zoom) || normalizeMapZoom(doc.map_zoom) === MAP_ZOOM_FIT
      ? computeFitZoom(fromLat, fromLng, toLat, toLng)
      : resolveMapZoom(doc.map_zoom),
  );
  const params = new URLSearchParams({
    size: "720x420",
    maptype: "roadmap",
    zoom,
    path: `color:0x2563eb|weight:5|${origin}|${destination}`,
    markers: `color:green|label:A|${origin}`,
    key: apiKey,
  });
  params.append("markers", `color:red|label:B|${destination}`);

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function blankOr(value: string, fallback = "________________"): string {
  const v = esc(value.trim());
  return v || fallback;
}

function buildCoordinatesTableHtml(doc: LocationMapStored): string {
  const cell =
    "border:1px solid #111;padding:6px 8px;font-size:10px;vertical-align:middle;line-height:1.35;";
  const lbl = `${cell}font-weight:700;width:22%;background:#eef2f7;`;
  const val = `${cell}font-weight:600;`;

  return `
<table style="width:100%;border-collapse:collapse;margin:12px 0 16px;">
  <tr>
    <td style="${lbl}">From Location Name</td>
    <td style="${val}" colspan="3">${blankOr(doc.from_location_name, "&nbsp;")}</td>
  </tr>
  <tr>
    <td style="${lbl}">From Latitude</td>
    <td style="${val}">${esc(formatCoordDisplay(doc.from_latitude))}</td>
    <td style="${lbl}">From Longitude</td>
    <td style="${val}">${esc(formatCoordDisplay(doc.from_longitude))}</td>
  </tr>
  <tr>
    <td style="${lbl}">To Location Name</td>
    <td style="${val}" colspan="3">${blankOr(doc.to_location_name, "&nbsp;")}</td>
  </tr>
  <tr>
    <td style="${lbl}">To Latitude</td>
    <td style="${val}">${esc(formatCoordDisplay(doc.to_latitude))}</td>
    <td style="${lbl}">To Longitude</td>
    <td style="${val}">${esc(formatCoordDisplay(doc.to_longitude))}</td>
  </tr>
</table>`;
}

function buildMapVisualHtml(data: LocationMapLetterData): string {
  const staticMapUrl = buildStaticMapImageUrl(data.document);
  const embed =
    data.embedUrl ||
    (locationMapHasValidRoute(data.document)
      ? buildGoogleMapsEmbedUrl(data.document)
      : null);

  if (staticMapUrl) {
    return `
<div class="loc-map-visual">
  <img src="${esc(staticMapUrl)}" alt="Location map route" style="width:100%;max-height:420px;object-fit:contain;border:1px solid #cbd5e1;display:block;" />
</div>`;
  }

  if (embed) {
    const linkHtml = data.directionsUrl
      ? `<p class="loc-map-link" style="margin:8px 0 0;font-size:10px;">
  <a href="${esc(data.directionsUrl)}" style="color:#1d4ed8;">Open route in Google Maps</a>
</p>`
      : "";

    return `
<div class="loc-map-visual">
  <div class="loc-gmap-wrap" style="position:relative;width:100%;height:125mm;border:1px solid #cbd5e1;background:#e2e8f0;">
    <iframe
      class="loc-gmap-frame"
      title="Location map route"
      src="${esc(embed)}"
      style="position:absolute;inset:0;width:100%;height:100%;border:0;display:block;"
      loading="eager"
      referrerpolicy="no-referrer-when-downgrade"
      allowfullscreen
    ></iframe>
  </div>
  ${linkHtml}
</div>`;
  }

  return `
<div class="loc-map-placeholder">
  Enter valid From and To coordinates to display the route map.
</div>`;
}

function buildSignatoryBlockHtml(data: LocationMapLetterData): string {
  const sigName = esc(data.firmRepName) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.firmRepDesignation) || "—";

  return buildClassSignatoryBlockHtml({
    blockClass: "loc-signatory-block",
    forClass: "loc-signatory-for",
    sigWrapClass: "loc-signatory-sig",
    lineClass: "loc-signatory-line",
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildBodyHtml(data: LocationMapLetterData): string {
  return `
<h1 class="loc-title">Location Map</h1>
${buildLetterIntroHtml(data)}
<p class="loc-salutation">Respected / Sir,</p>
<p class="loc-declaration">
  We hereby submit the location map indicating the route from our manufacturing unit to the Bureau of
  Indian Standards branch office. The geographical coordinates and route map are furnished below for
  your kind reference in connection with our BIS licence application.
</p>
${buildCoordinatesTableHtml(data.document)}
${buildMapVisualHtml(data)}
<p class="loc-truth-declaration">
  We hereby declare that all information furnished above is true and correct to the best of our
  knowledge and belief.
</p>
${buildSignatoryBlockHtml(data)}`;
}

export function buildLocationMapCompany(
  data: LocationMapLetterData,
  assets?: LocationMapPrintAssets,
): PrintCompanyInfo {
  return {
    ...buildManufacturingScopeCompany({ ...data, licenseScope: "" }),
    ...assets,
    // Location Map letterhead matches Top Management — text-only / no logo tile.
    logo_url: null,
  };
}

export function defaultLocationMapPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    show_letterhead: true,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 11,
    margin_top: 5,
    margin_bottom: 5,
    margin_left: 15,
    margin_right: 10,
  };
}

/** Force no-logo letterhead for Location Map preview / Word. */
export function locationMapLetterheadSettings(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    letterhead_layout: "logo-na",
    show_page_numbers: false,
  };
}

export function buildLocationMapHtml(
  data: LocationMapLetterData,
  settings: PrintSettings,
  assets?: LocationMapPrintAssets,
): string {
  const pageSize = iframeSizeForPrintSettings(settings);
  const contentHeightMm = Math.max(
    80,
    pageSize.heightMm - settings.margin_top - settings.margin_bottom,
  );
  const styles = `
    html, body {
      overflow: hidden !important;
      height: ${pageSize.heightMm}mm;
      max-height: ${pageSize.heightMm}mm;
    }
    .doc-page {
      height: ${pageSize.heightMm}mm;
      max-height: ${pageSize.heightMm}mm;
      overflow: hidden;
      box-sizing: border-box;
    }
    .loc-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      height: ${contentHeightMm}mm;
      max-height: ${contentHeightMm}mm;
      overflow: hidden;
      box-sizing: border-box;
      padding-bottom: 2mm;
    }
    .loc-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 9px;
      font-weight: 600;
      text-align: right;
    }
    .loc-title {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 8px;
      line-height: 1.3;
    }
    .loc-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin: 0 0 6px;
    }
    .loc-to-block {
      flex: 1;
      min-width: 0;
      font-size: 10px;
      line-height: 1.4;
    }
    .loc-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 10px;
      line-height: 1.4;
    }
    .loc-salutation,
    .loc-declaration,
    .loc-truth-declaration {
      margin: 0 0 6px;
      font-size: 10px;
      line-height: 1.4;
      text-align: justify;
    }
    .loc-truth-declaration {
      margin-top: 8px;
    }
    .loc-map-visual {
      margin: 0 0 6px;
      width: 100%;
    }
    .loc-gmap-wrap {
      page-break-inside: avoid;
      width: 100% !important;
      height: 125mm !important;
      max-height: 125mm;
    }
    .loc-map-link {
      margin: 4px 0 0 !important;
      font-size: 9px !important;
    }
    .loc-map-placeholder {
      border: 1px dashed #94a3b8;
      width: 100%;
      height: 125mm;
      max-height: 125mm;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 12px;
      font-size: 10px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .loc-sheet table {
      margin: 6px 0 8px !important;
    }
    .loc-sheet table td {
      padding: 4px 6px !important;
      font-size: 9px !important;
    }
    .loc-signatory-block {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.45;
      text-align: right;
    }
    .loc-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .loc-signatory-sig {
      margin-top: 18px;
      min-width: 180px;
      text-align: right;
    }
    .loc-signatory-line {
      border-top: 1px solid #94a3b8;
      padding-top: 2px;
      font-size: 10px;
      line-height: 1.35;
      text-align: right;
    }
  `;

  return buildPrintDocument({
    title: "Location Map",
    bodyHtml: `<div class="loc-sheet">${buildBodyHtml(data)}${buildPageIndicatorHtml()}</div>`,
    extraStyles: styles,
    settings: locationMapLetterheadSettings(settings),
    company: buildLocationMapCompany(data, assets),
  });
}

export function iframeSizeForLocationMapPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
