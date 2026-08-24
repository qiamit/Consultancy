"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import type { ManufacturingScopeDeclarationData } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildLocationMapHtml,
  defaultLocationMapPrintSettings,
  iframeSizeForLocationMapPrintSettings,
  type LocationMapLetterData,
} from "@backend/modules/print/location-map";
import { downloadLocationMapWord } from "@backend/modules/print/location-map-export";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  DEFAULT_MAP_ZOOM,
  locationMapHasValidRoute,
  MAX_MAP_ZOOM,
  mergeLocationMapWithDefaults,
  MIN_MAP_ZOOM,
  resolveLocationMapDefaults,
  resolveMapZoom,
  type LocationMapStored,
} from "@backend/modules/bis/location-map";
import {resolvePrimaryTopManagementPerson,
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
  step = "any",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setDocument(mergeLocationMapWithDefaults(storedDocument, resolvedDefaults));
  }, [storedDocument, resolvedDefaults]);

  const routeValid = useMemo(() => locationMapHasValidRoute(document), [document]);
  const embedUrl = useMemo(
    () => (routeValid ? buildGoogleMapsEmbedUrl(document) : null),
    [document, routeValid],
  );
  const directionsUrl = useMemo(
    () => (routeValid ? buildGoogleMapsDirectionsUrl(document) : null),
    [document, routeValid],
  );

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

  const refreshPreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = buildLocationMapHtml(previewData, printSettings);
    doc.open();
    doc.write(html);
    doc.close();
  }, [previewData, printSettings]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  const iframeSize = iframeSizeForLocationMapPrintSettings(printSettings);
  const isFullNumber = letterData.isNumber?.trim() || "—";
  const mapZoom = resolveMapZoom(document.map_zoom);

  function patchMapZoom(nextZoom: number) {
    const clamped = Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, Math.round(nextZoom)));
    patchDocument({ map_zoom: String(clamped) });
  }

  function patchDocument(patch: Partial<LocationMapStored>) {
    setDocument((prev) => ({ ...prev, ...patch }));
  }

  function patchPrintSettings(patch: Partial<PrintSettings>) {
    setPrintSettings((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    startSave(() => {
      onSave(document);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handlePrint() {
    if (showPrintPreview) {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(buildLocationMapHtml(previewData, printSettings));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handleDownloadWord() {
    void downloadLocationMapWord(previewData, printSettings).catch(() =>
      window.alert("Unable to download Word file."),
    );
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
              className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              Download Word File
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
                          onClick={() => patchMapZoom(mapZoom - 1)}
                          disabled={mapZoom <= MIN_MAP_ZOOM}
                          className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                          aria-label="Zoom out"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={MIN_MAP_ZOOM}
                          max={MAX_MAP_ZOOM}
                          value={mapZoom}
                          onChange={(e) => patchMapZoom(Number(e.target.value))}
                          className="w-14 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-center text-xs text-zinc-100 outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => patchMapZoom(mapZoom + 1)}
                          disabled={mapZoom >= MAX_MAP_ZOOM}
                          className="rounded-md border border-zinc-700 px-2 py-0.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
                          aria-label="Zoom in"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    {embedUrl ? (
                      <iframe
                        key={embedUrl}
                        title="Google Maps route"
                        src={embedUrl}
                        className="h-[min(70vh,520px)] w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex h-[min(70vh,520px)] items-center justify-center px-6 text-center text-sm text-zinc-400">
                        Route map will appear here after you enter valid From and To coordinates.
                      </div>
                    )}
                    <p className="border-t border-zinc-800 px-3 py-2 text-[11px] leading-relaxed text-zinc-500">
                      Set zoom here and click <strong className="text-zinc-300">Save</strong> to keep
                      the scale after refresh. Default zoom is {DEFAULT_MAP_ZOOM}.
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
                  Form Preview — Location Map
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title="Location Map print preview"
                  className="mx-auto max-w-full border-0 bg-white shadow-2xl"
                  style={{
                    width: `min(100%, ${iframeSize.widthMm}mm)`,
                    minHeight: `${iframeSize.heightMm}mm`,
                  }}
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
