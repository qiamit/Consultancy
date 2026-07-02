import { buildPrintDocument } from "@/lib/print/engine";
import {
  buildManufacturingScopeCompany,
  defaultDeclarationPrintSettings,
  iframeSizeForPrintSettings,
  type ManufacturingScopeDeclarationData,
} from "@/lib/print/manufacturing-scope-declaration";
import {
  locationMapHasValidRoute,
  parseCoordinate,
  resolveMapZoom,
  type LocationMapStored,
} from "@/lib/location-map";
import { formatApplicationNumberDisplay } from "@/lib/application-checklist-notes";
import type { PrintCompanyInfo, PrintSettings } from "@/lib/print/types";
import { formatDisplayDate } from "@/lib/format-date";
import { buildClassSignatoryBlockHtml } from "@/lib/print/signatory-signature";

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
  const zoom = String(resolveMapZoom(doc.map_zoom));
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

  if (staticMapUrl) {
    return `
<div class="loc-map-visual">
  <img src="${esc(staticMapUrl)}" alt="Location map route" style="width:100%;max-height:420px;object-fit:contain;border:1px solid #cbd5e1;display:block;" />
</div>`;
  }

  if (data.embedUrl) {
    return `
<div class="loc-map-visual">
  <iframe
    title="Location map route"
    src="${esc(data.embedUrl)}"
    style="width:100%;height:420px;border:1px solid #cbd5e1;display:block;"
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
  ></iframe>
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

export function buildLocationMapCompany(data: LocationMapLetterData): PrintCompanyInfo {
  return buildManufacturingScopeCompany({ ...data, licenseScope: "" });
}

export function defaultLocationMapPrintSettings(): PrintSettings {
  return {
    ...defaultDeclarationPrintSettings(),
    orientation: "portrait",
    show_letterhead: true,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Times New Roman",
    font_size: 11,
  };
}

export function buildLocationMapHtml(
  data: LocationMapLetterData,
  settings: PrintSettings,
): string {
  const sheetMinHeight = `calc(297mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm)`;
  const styles = `
    .loc-sheet {
      font-family: "Times New Roman", Times, serif;
      color: #111;
      font-size: 10px;
      position: relative;
      min-height: ${sheetMinHeight};
      box-sizing: border-box;
      padding-bottom: 4mm;
    }
    .loc-page-indicator {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 10px;
      font-weight: 600;
      text-align: right;
    }
    .loc-title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      text-decoration: underline;
      margin: 0 0 16px;
      line-height: 1.35;
    }
    .loc-to-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin: 0 0 12px;
    }
    .loc-to-block {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.55;
    }
    .loc-date-block {
      flex-shrink: 0;
      text-align: right;
      white-space: nowrap;
      font-size: 11px;
      line-height: 1.55;
    }
    .loc-salutation,
    .loc-declaration,
    .loc-truth-declaration {
      margin: 0 0 10px;
      font-size: 10px;
      line-height: 1.55;
      text-align: justify;
    }
    .loc-truth-declaration {
      margin-top: 14px;
    }
    .loc-map-visual {
      margin: 0 0 12px;
    }
    .loc-map-placeholder {
      border: 1px dashed #94a3b8;
      min-height: 180px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .loc-signatory-block {
      margin-top: 28px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: 10px;
      line-height: 1.6;
      text-align: right;
    }
    .loc-signatory-for {
      font-weight: 700;
      text-align: right;
    }
    .loc-signatory-sig {
      margin-top: 32px;
      min-width: 200px;
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
    settings: { ...settings, show_page_numbers: false },
    company: buildLocationMapCompany(data),
  });
}

export function iframeSizeForLocationMapPrintSettings(settings: PrintSettings): {
  widthMm: number;
  heightMm: number;
} {
  return iframeSizeForPrintSettings(settings);
}
