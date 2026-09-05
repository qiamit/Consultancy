"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";

import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildLocationMapHtml,
  defaultLocationMapPrintSettings,
  iframeSizeForLocationMapPrintSettings,
  type LocationMapLetterData,
  type LocationMapPrintAssets,
} from "@backend/modules/print/location-map";
import { downloadLocationMapWord } from "@backend/modules/print/location-map-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  computeFitZoom,
  isMapZoomFit,
  MAP_ZOOM_FIT,
  locationMapHasValidRoute,
  MAX_MAP_ZOOM,
  mergeLocationMapWithDefaults,
  MIN_MAP_ZOOM,
  normalizeMapZoom,
  parseCoordinate,
  resolveLocationMapDefaults,
  resolveMapZoom,
  sanitizeCoordinateInput,
  type LocationMapStored,
} from "@backend/modules/bis/location-map";
import {
  resolvePrimaryTopManagementPerson,
  type TopManagementStored,
  withDocumentSignatureImage,
} from "@backend/modules/bis/top-management";

const LOCATION_MAP_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with Location Map documents submitted with BIS licence applications:
- From/To GPS coordinates for factory and BIS branch or reference location
- Route map requirements for BIS inspection applications
- How to obtain latitude and longitude from Google Maps
- Verifying coordinates before printing the location map

Be concise, practical, and use Indian BIS/ISI certification context.`;

const LOCATION_MAP_QE_STARTERS = [
  "How do I find latitude and longitude for our factory?",
  "What locations should the location map show for BIS?",
  "Help verify our route coordinates before printing",
];

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-400";

function CoordinateField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(sanitizeCoordinateInput(e.target.value))}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

function LocationNameField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}

export function LocationMapModal({
  letterData,
  applicationNumber,
  dateOfApplication,
  topManagement,
  storedDocument,
  onSave,
  onClose,
}: {
  letterData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >;
  applicationNumber: string;
  dateOfApplication: string;
  topManagement: TopManagementStored[];
  storedDocument: LocationMapStored;
  onSave: (document: LocationMapStored) => void;
  onClose: () => void;
}) {
  const resolvedDefaults = useMemo(
    () =>
      resolveLocationMapDefaults({
        companyName: letterData.companyName,
        bisBranchName: letterData.bisBranchName,
        bisBranchState: letterData.bisBranchState,
      }),
    [letterData.companyName, letterData.bisBranchName, letterData.bisBranchState],
  );

  const [document, setDocument] = useState<LocationMapStored>(() =>
    mergeLocationMapWithDefaults(storedDocument, resolvedDefaults),
  );
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultLocationMapPrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<LocationMapPrintAssets>({});
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setDocument(mergeLocationMapWithDefaults(storedDocument, resolvedDefaults));
  }, [storedDocument, resolvedDefaults]);

  useEffect(() => {
    let cancelled = false;
    void loadCompanyPrintContext().then(({ printSettings: fromDb, assetUrls }) => {
      if (cancelled) return;
      const {
        margin_top: _mt,
        margin_bottom: _mb,
        margin_left: _ml,
        margin_right: _mr,
        letterhead_layout: _layout,
        ...companySettings
      } = fromDb;
      const defaults = defaultLocationMapPrintSettings();
      setPrintSettings((prev) => ({
        ...prev,
        ...companySettings,
        font_family: defaults.font_family,
        show_letterhead: true,
        letterhead_layout: "logo-na",
        margin_top: defaults.margin_top,
        margin_bottom: defaults.margin_bottom,
        margin_left: defaults.margin_left,
        margin_right: defaults.margin_right,
        letterhead_show_address:
          companySettings.letterhead_show_address ?? prev.letterhead_show_address,
        letterhead_show_contact:
          companySettings.letterhead_show_contact ?? prev.letterhead_show_contact,
        letterhead_show_gst:
          companySettings.letterhead_show_gst ?? prev.letterhead_show_gst,
        primary_color: companySettings.primary_color || prev.primary_color,
        show_page_numbers: false,
        show_footer_line: false,
      }));
      setPrintAssets({
        letterhead_upper_url: assetUrls.letterhead_upper_url,
        letterhead_lower_url: assetUrls.letterhead_lower_url,
        seal_sign_url: assetUrls.seal_sign_url,
        logo_url: null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep Location Map margin defaults in sync (matches Top Management).
  useEffect(() => {
    const defaults = defaultLocationMapPrintSettings();
    setPrintSettings((prev) => ({
      ...prev,
      font_family: defaults.font_family,
      show_letterhead: true,
      margin_top: defaults.margin_top,
      margin_bottom: defaults.margin_bottom,
      margin_left: defaults.margin_left,
      margin_right: defaults.margin_right,
      letterhead_layout: "logo-na",
      }));
  }, []);

  const routeValid = useMemo(() => locationMapHasValidRoute(document), [document]);
  const liveEmbedUrl = useMemo(
    () => (routeValid ? buildGoogleMapsEmbedUrl(document) : null),
    [document, routeValid],
  );
  const directionsUrl = useMemo(
    () => (routeValid ? buildGoogleMapsDirectionsUrl(document) : null),
    [document, routeValid],
  );

  // Debounce Google Maps iframe remounts while typing coordinates / changing zoom.
  const [embedUrl, setEmbedUrl] = useState<string | null>(liveEmbedUrl);
  const [mapUpdating, setMapUpdating] = useState(false);

  useEffect(() => {
    if (liveEmbedUrl === embedUrl) {
      setMapUpdating(false);
      return;
    }
    if (!liveEmbedUrl) {
      setEmbedUrl(null);
      setMapUpdating(false);
      return;
    }
    setMapUpdating(true);
    const timer = window.setTimeout(() => {
      setEmbedUrl(liveEmbedUrl);
      setMapUpdating(false);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [liveEmbedUrl, embedUrl]);

  const { firmRepName, firmRepDesignation } = useMemo(() => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return {
      firmRepName: primary.person_name || letterData.contactPerson?.trim() || "",
      firmRepDesignation: primary.designation,
    };
  }, [topManagement, letterData.contactPerson]);

  const previewData = useMemo((): LocationMapLetterData  => {
    return withDocumentSignatureImage({
      ...letterData,
      applicationNumber,
      dateOfApplication,
      document,
      embedUrl,
      directionsUrl,
      firmRepName,
      firmRepDesignation,
    }, topManagement);
  }, [
    letterData,
    applicationNumber,
    dateOfApplication,
    document,
    embedUrl,
    directionsUrl,
    firmRepName,
    firmRepDesignation,
    topManagement]);

  const previewBlobUrlRef = useRef<string | null>(null);

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const html = buildLocationMapHtml(previewData, printSettings, printAssets);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
    }
    previewBlobUrlRef.current = url;
    iframe.onload = () => {
      requestAnimationFrame(() => syncPrintPreviewIframe(iframe));
    };
    iframe.src = url;
  }, [previewData, printSettings, printAssets]);

  useEffect(() => {
    return () => {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForLocationMapPrintSettings(printSettings);
  const isFullNumber = letterData.isNumber?.trim() || "—";
  const zoomIsFit = isMapZoomFit(normalizeMapZoom(document.map_zoom));
  const fromLatNum = parseCoordinate(document.from_latitude);
  const fromLngNum = parseCoordinate(document.from_longitude);
  const toLatNum = parseCoordinate(document.to_latitude);
  const toLngNum = parseCoordinate(document.to_longitude);
  const fitZoomValue =
    fromLatNum !== null &&
    fromLngNum !== null &&
    toLatNum !== null &&
    toLngNum !== null
      ? computeFitZoom(fromLatNum, fromLngNum, toLatNum, toLngNum)
      : 12;
  const mapZoom = zoomIsFit ? fitZoomValue : resolveMapZoom(document.map_zoom);

  function patchMapZoom(nextZoom: number) {
    const clamped = Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, Math.round(nextZoom)));
    patchDocument({ map_zoom: String(clamped) });
  }

  function patchMapZoomFit() {
    patchDocument({ map_zoom: MAP_ZOOM_FIT });
  }

  function patchDocument(patch: Partial<LocationMapStored>) {
    setDocument((prev) => ({ ...prev, ...patch }));
  }

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({
      ...prev,
      ...patch,
      // Keep letterhead logo-free even if Print Settings changes layout.
      letterhead_layout: "logo-na",
    }));
  }

  function handleSave() {
    startSave(() => {
      onSave(document);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handlePrint() {
    if (showPrintPreview && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
      return;
    }
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(buildLocationMapHtml(previewData, printSettings, printAssets));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  const [downloadingWord, setDownloadingWord] = useState(false);

  function handleDownloadWord() {
    if (downloadingWord) return;
    setDownloadingWord(true);
    void (async () => {
      try {
        await downloadLocationMapWord(previewData, printSettings, printAssets);
      } catch {
        window.alert("Unable to download Word file.");
      } finally {
        setDownloadingWord(false);
      }
    })();
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildLocationMapHtml(previewData, printSettings, printAssets);
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Location_Map_${safePdfFilenamePart(letterData.companyName)}.pdf`,
        settings: printSettings,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to download PDF.");
    } finally {
      setPdfDownloading(false);
    }
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <>
      <div className="fixed inset-0 z-[400] flex flex-col bg-zinc-950">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="min-w-0 shrink-0 flex-1 basis-48">
            <h2 className="truncate text-sm font-semibold text-white">Location Map</h2>
            <p className="truncate text-xs text-zinc-400">
              {letterData.companyName}
              {isFullNumber !== "—" ? ` · ${isFullNumber}` : ""}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {savedFlash && <span className="text-xs font-semibold text-emerald-400">Saved ✓</span>}
            {saving && <span className="text-xs text-zinc-400">Saving…</span>}
            {directionsUrl && (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
              >
                Open in Google Maps
              </a>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="shrink-0 whitespace-nowrap rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setShowPrintPreview((prev) => !prev)}
              className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                showPrintPreview
                  ? "border-sky-500 bg-sky-600 text-white"
                  : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              }`}
            >
              Print Preview
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Print
            </button>
            <button
              type="button"
              onClick={handleDownloadWord}
              disabled={downloadingWord}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            >
              {downloadingWord ? "Preparing Word…" : "Download Word File"}
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={pdfDownloading}
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
            >
              {pdfDownloading ? "Preparing PDF…" : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={() => toggleSettingsPanel("print")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                settingsPanel === "print"
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              }`}
            >
              Print Settings
            </button>
            <button
              type="button"
              onClick={() => toggleSettingsPanel("page")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                settingsPanel === "page"
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
              }`}
            >
              Page Settings
            </button>
            <button
              type="button"
              onClick={() => setShowQeAssistant(true)}
              className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-950/70"
            >
              QE Assistant
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-x-auto">
          {!showPrintPreview && (
            <div
              className={`flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-900 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
              }`}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">From Location</p>
                      <div className="mt-3 space-y-3">
                        <LocationNameField
                          label="Location Name"
                          value={document.from_location_name}
                          onChange={(from_location_name) => patchDocument({ from_location_name })}
                          placeholder="e.g. Manufacturing Unit / Factory"
                        />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <CoordinateField
                            label="Latitude"
                            value={document.from_latitude}
                            onChange={(from_latitude) => patchDocument({ from_latitude })}
                            placeholder="e.g. 21.3846"
                          />
                          <CoordinateField
                            label="Longitude"
                            value={document.from_longitude}
                            onChange={(from_longitude) => patchDocument({ from_longitude })}
                            placeholder="e.g. 81.6614"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-zinc-100">To Location</p>
                      <div className="mt-3 space-y-3">
                        <LocationNameField
                          label="Location Name"
                          value={document.to_location_name}
                          onChange={(to_location_name) => patchDocument({ to_location_name })}
                          placeholder="e.g. Bureau of Indian Standards, Branch Office"
                        />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <CoordinateField
                            label="Latitude"
                            value={document.to_latitude}
                            onChange={(to_latitude) => patchDocument({ to_latitude })}
                            placeholder="e.g. 28.6139"
                          />
                          <CoordinateField
                            label="Longitude"
                            value={document.to_longitude}
                            onChange={(to_longitude) => patchDocument({ to_longitude })}
                            placeholder="e.g. 77.2090"
                          />
                        </div>
                      </div>
                    </div>

                    {!routeValid && (
                      <p className="text-xs text-amber-300">
                        Enter valid latitude (−90 to 90) and longitude (−180 to 180) for both
                        locations to generate the route map.
                      </p>
                    )}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Route Map
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                          Zoom
                        </span>
                        <button
                          type="button"
                          onClick={patchMapZoomFit}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            zoomIsFit
                              ? "border-sky-500 bg-sky-600 text-white"
                              : "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                          }`}
                          aria-label="Fit From and To coordinates"
                          title="Fit From → To"
                        >
                          Fit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            patchMapZoom((zoomIsFit ? fitZoomValue : mapZoom) - 1)
                          }
                          disabled={!zoomIsFit && mapZoom <= MIN_MAP_ZOOM}
                          className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                          aria-label="Zoom out"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={zoomIsFit ? "Fit" : String(mapZoom)}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            if (!raw || /fit/i.test(raw)) {
                              patchMapZoomFit();
                              return;
                            }
                            const n = Number(raw);
                            if (Number.isFinite(n)) patchMapZoom(n);
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-14 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-center text-xs text-zinc-100 outline-none focus:border-sky-500"
                          aria-label="Zoom level"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            patchMapZoom((zoomIsFit ? fitZoomValue : mapZoom) + 1)
                          }
                          disabled={!zoomIsFit && mapZoom >= MAX_MAP_ZOOM}
                          className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                          aria-label="Zoom in"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {embedUrl ? (
                      <div className="relative">
                        {mapUpdating && (
                          <div className="absolute inset-x-0 top-0 z-10 bg-zinc-950/80 px-3 py-1.5 text-center text-[11px] font-semibold text-sky-300">
                            Updating Google Map…
                          </div>
                        )}
                        <iframe
                          key={embedUrl}
                          title="Google Maps route"
                          src={embedUrl}
                          className="h-[min(70vh,520px)] w-full border-0 bg-zinc-900"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="flex h-[min(70vh,520px)] items-center justify-center px-6 text-center text-sm text-zinc-400">
                        {routeValid
                          ? "Preparing Google Map…"
                          : "Route map will appear here after you enter valid From and To coordinates."}
                      </div>
                    )}
                    <p className="border-t border-zinc-800 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
                      Default zoom is <strong className="text-zinc-300">Fit</strong> (shows full
                      From → To route). Use − / + for manual zoom, or{" "}
                      <strong className="text-zinc-300">Fit</strong> again to reset. Click{" "}
                      <strong className="text-zinc-300">Save</strong> to keep the choice after
                      refresh.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showPrintPreview && (
            <div
              className={`flex min-w-0 flex-1 flex-col bg-zinc-600 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
              }`}
            >
              <div className="border-b border-zinc-700/80 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  Print Preview
                </p>
              </div>
              <div className="flex flex-1 justify-center overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Location Map print preview"
                  scrolling="no"
                  className="mx-auto max-w-full shrink-0 border-0 bg-white shadow-2xl"
                  style={printPreviewIframeStyle(iframeSize.widthMm, iframeSize.heightMm)}
                />
              </div>
            </div>
          )}

          {settingsPanel && (
            <div className={splitModalSettingsPaneClass()}>
              <DocumentPrintSettingsPanel
                mode={settingsPanel}
                settings={printSettings}
                onChange={patchPrintSettings}
                hideLetterheadLogo
              />
            </div>
          )}
        </div>
      </div>

      {showQeAssistant && (
        <AiChatModal
          title="QE Assistant"
          subtitle="Location Map · BIS Application"
          systemPrompt={LOCATION_MAP_QE_PROMPT}
          starterQuestions={LOCATION_MAP_QE_STARTERS}
          accentColor="amber"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}
    </>
  );
}
