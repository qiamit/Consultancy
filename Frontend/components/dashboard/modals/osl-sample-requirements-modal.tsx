"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useEditorRowsFromStored } from "@/components/modules/finance/use-finance-master-state";
import { AiChatModal } from "@/components/dashboard/ai-chat-modal";
import { IsCodeViewModal } from "@/components/dashboard/modals/is-code-view-modal";
import { OslSampleFormModal } from "@/components/dashboard/modals/osl-sample-form-modal";
import {
  OslSampleAddButton,
  OslSampleRequirementsTableEditor,
} from "@/components/dashboard/osl-sample-requirements-table-editor";
import { DocumentPrintSettingsPanel } from "@/components/dashboard/print/document-print-settings-panel";
import {
  printPreviewIframeStyle,
  syncPrintPreviewIframe,
} from "@/components/dashboard/print/sync-print-preview-iframe";

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";
import { buildOslSampleCourierLabelsHtml, buildOslSampleCourierQrText } from "@backend/modules/print/osl-sample-courier-labels";

import { splitModalSettingsPaneClass } from "@/components/dashboard/modals/split-modal-layout";
import { createClient } from "@backend/db/client/client";
import {
  buildOslSampleRequirementsHtml,
  defaultOslSamplePrintSettings,
  DEFAULT_OSL_SAMPLE_TABLE_COLUMNS,
  iframeSizeForOslPrintSettings,
  sampleOfferLetterLabels,
  type OslSampleOfferLetterData,
  type OslSamplePrintAssets,
  type OslSampleTableColumnKey,
  type SampleOfferLetterVariant,
} from "@backend/modules/print/osl-sample-requirements";
import {
  downloadOslSampleRequirementsWord,
} from "@backend/modules/print/osl-sample-requirements-export";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import type { PrintSettings } from "@backend/modules/print/types";
import type { AppDropdownOptionRow } from "@backend/shared/types/app-dropdown-option";
import {
  createOslSampleRequirementRow,
  documentHasContent as oslSampleRequirementsHasContent,
  editorRowsFromStored,
  isSampleIncludedInPrint,
  rowHasContent,
  storedFromEditor,
  type OslSampleRequirementRow,
  type OslSampleRequirementStored,
} from "@backend/modules/bis/osl-sample-requirements";
import {
  resolvePrimaryTopManagementPerson,
  type TopManagementStored,
  withDocumentSignatureImage,
} from "@backend/modules/bis/top-management";
import type { ChecklistImportExclude } from "@backend/modules/bis/checklist-document-import-meta";
import { ModalToolbarActions } from "@/components/dashboard/modals/modal-toolbar-actions";
import { DocumentModalSubtitle } from "@/components/dashboard/modals/document-modal-subtitle";
import { ChecklistDocumentImportDialog } from "@/components/dashboard/modals/checklist-document-import-dialog";

const OSL_QE_PROMPT = `You are QE Assistant, an AI helper for Quality Engineering Consultancy's BIS Applications Management.
You help with OSL (Outside Laboratory) sample requirements and sample offer letters for BIS certification:
- Sample description, declared values, batch details for OSL testing
- Drafting sample offer letter content for BIS branch submission
- Priority vs non-priority sample submission
- Laboratory selection for BIS OSL testing

Be concise, practical, and use Indian BIS/ISI certification context.`;

const OSL_QE_STARTERS = [
  "What should a BIS OSL sample offer letter include?",
  "How to fill sample requirements for IS 1786 steel products?",
  "What is priority vs non-priority sample in BIS OSL?",
];

type ClientPickerRow = {
  id: string;
  name: string;
  company_name: string | null;
  address: string | null;
  city: string | null;
  pin_code: string | null;
  state: string | null;
  country: string | null;
};

const CLIENT_ADDRESS_SELECT =
  "id, name, company_name, address, city, pin_code, state, country";

function clientDisplayLabel(c: ClientPickerRow): string {
  const company = (c.company_name ?? "").trim();
  if (company) return company;
  return (c.name ?? "").trim() || "—";
}

/** Same shape as Client Master table: address + city + PIN + state + country. */
function clientCompleteAddress(c: ClientPickerRow): string {
  return [c.address, c.city, c.pin_code, c.state, c.country]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeNameKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Looser key so "Pvt. Ltd." / "&" variants still match Client Master. */
function softNameKey(s: string): string {
  return normalizeNameKey(s)
    .replace(/&/g, " and ")
    .replace(/\b(pvt\.?|private)\b/g, " ")
    .replace(/\b(ltd\.?|limited)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveClientAddress(
  laboratoryName: string,
  clients: ClientPickerRow[],
): string {
  const target = normalizeNameKey(laboratoryName);
  const softTarget = softNameKey(laboratoryName);
  if (!target) return "";

  const scored = clients
    .map((c) => {
      const label = normalizeNameKey(clientDisplayLabel(c));
      const company = normalizeNameKey(c.company_name ?? "");
      const name = normalizeNameKey(c.name ?? "");
      const softLabel = softNameKey(clientDisplayLabel(c));
      const softCompany = softNameKey(c.company_name ?? "");
      const softName = softNameKey(c.name ?? "");

      let score = 0;
      if (label === target || company === target || name === target) score = 3;
      else if (
        softTarget &&
        (softLabel === softTarget ||
          softCompany === softTarget ||
          softName === softTarget)
      ) {
        score = 2;
      } else if (
        softTarget.length >= 8 &&
        (softLabel.includes(softTarget) ||
          softTarget.includes(softLabel) ||
          softCompany.includes(softTarget) ||
          softTarget.includes(softCompany))
      ) {
        score = 1;
      }
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const match = scored[0]?.c;
  return match ? clientCompleteAddress(match) : "";
}

async function fetchClientsForLabLookup(): Promise<ClientPickerRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select(CLIENT_ADDRESS_SELECT)
    .order("company_name", { ascending: true });
  return (data ?? []) as ClientPickerRow[];
}

export function OslSampleRequirementsModal({
  variant = "osl",
  letterData,
  topManagement,
  isCodeNumber,
  isCodeId,
  revisionYear,
  rows: initialStored,
  clientId = null,
  excludeImportSource = null,
  onSave,
  onClose,
  initialFocusSampleIndex = null,
}: {
  variant?: SampleOfferLetterVariant;
  letterData: Omit<OslSampleOfferLetterData, "rows" | "signatoryName" | "signatoryDesignation">;
  topManagement: TopManagementStored[];
  isCodeNumber: string | null;
  isCodeId: string | null;
  revisionYear: number | null;
  rows: OslSampleRequirementStored[];
  clientId?: string | null;
  excludeImportSource?: ChecklistImportExclude | null;
  onSave: (rows: OslSampleRequirementStored[]) => void;
  onClose: () => void;
  initialFocusSampleIndex?: number | null;
}) {
  const labels = sampleOfferLetterLabels(variant);
  const importDocumentKey =
    variant === "pi" ? ("pi_sample_requirements" as const) : ("osl_sample_requirements" as const);
  const [letterVariant, setLetterVariant] =
    useState<SampleOfferLetterVariant>(variant);
  const letterLabels = sampleOfferLetterLabels(letterVariant);
  const [rows, setRows] = useEditorRowsFromStored(initialStored, editorRowsFromStored);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(() =>
    defaultOslSamplePrintSettings(),
  );
  const [printAssets, setPrintAssets] = useState<OslSamplePrintAssets>({});
  const [tableColumns, setTableColumns] = useState<OslSampleTableColumnKey[]>(
    () => [...DEFAULT_OSL_SAMPLE_TABLE_COLUMNS],
  );
  const [settingsPanel, setSettingsPanel] = useState<"page" | "print" | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showQeAssistant, setShowQeAssistant] = useState(false);
  const [showIsCodeView, setShowIsCodeView] = useState(false);
  const [sampleFormRow, setSampleFormRow] = useState<
    OslSampleRequirementRow | null | undefined
  >(undefined);
  const [clientRows, setClientRows] = useState<ClientPickerRow[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [showCourierLabelsPreview, setShowCourierLabelsPreview] = useState(false);
  const [courierLabelsHtml, setCourierLabelsHtml] = useState("");
  const [courierLabelsLoading, setCourierLabelsLoading] = useState(false);
  const [courierLabelsDownloading, setCourierLabelsDownloading] = useState(false);
  const [courierIncludeBlv, setCourierIncludeBlv] = useState(true);
  const [courierIncludeMobile, setCourierIncludeMobile] = useState(true);
  const [saving, startSave] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const courierIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select(CLIENT_ADDRESS_SELECT)
        .order("company_name", { ascending: true });
      if (!cancelled) setClientRows((data ?? []) as ClientPickerRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const defaults = defaultOslSamplePrintSettings();
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
        letterhead_show_mobile:
          companySettings.letterhead_show_mobile ??
          companySettings.letterhead_show_contact ??
          prev.letterhead_show_mobile ??
          prev.letterhead_show_contact,
        letterhead_show_email:
          companySettings.letterhead_show_email ??
          companySettings.letterhead_show_contact ??
          prev.letterhead_show_email ??
          prev.letterhead_show_contact,
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

  // Keep OSL Sample margin defaults in sync (matches Top Management).
  useEffect(() => {
    const defaults = defaultOslSamplePrintSettings();
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

  const reloadClients = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("clients")
      .select(CLIENT_ADDRESS_SELECT)
      .order("company_name", { ascending: true });
    setClientRows((data ?? []) as ClientPickerRow[]);
  }, []);

  const clientOptions: AppDropdownOptionRow[] = useMemo(
    () =>
      clientRows.map((c) => {
        const label = clientDisplayLabel(c);
        return {
          id: c.id,
          value: label,
          label,
          filterText: [c.name, c.company_name].filter(Boolean).join(" ") || null,
          canDelete: false,
        };
      }),
    [clientRows],
  );

  const isFullNumber = letterData.isNumber?.trim() || "—";

  const { signatoryName, signatoryDesignation } = useMemo(() => {
    const primary = resolvePrimaryTopManagementPerson(topManagement);
    return {
      signatoryName: primary.person_name || letterData.contactPerson?.trim() || "",
      signatoryDesignation: primary.designation,
    };
  }, [topManagement, letterData.contactPerson]);

  const previewData = useMemo((): OslSampleOfferLetterData => {
    const all = storedFromEditor(rows);
    // In Letter ON → include in Print Preview / Print / Word / PDF table.
    // Do not drop by Sample For (OSL/FT/IT); letter OSL|IT toggle only changes wording.
    const filtered = all.filter((r) => isSampleIncludedInPrint(r));
    return withDocumentSignatureImage({
      ...letterData,
      signatoryName,
      signatoryDesignation,
      rows: filtered,
    }, topManagement);
  }, [letterData, signatoryName, signatoryDesignation, rows, topManagement]);

  const inLetterCount = previewData.rows.length;
  const totalSampleCount = useMemo(
    () => storedFromEditor(rows).length,
    [rows],
  );

  const refreshPreview = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    const html = buildOslSampleRequirementsHtml(
      previewData,
      printSettings,
      tableColumns,
      letterVariant,
      printAssets,
    );
    doc.open();
    doc.write(html);
    doc.close();
    requestAnimationFrame(() => syncPrintPreviewIframe(iframe));
  }, [previewData, printSettings, tableColumns, letterVariant, printAssets]);

  useEffect(() => {
    refreshPreview();
  }, [refreshPreview]);

  useEffect(() => {
    if (showPrintPreview) {
      refreshPreview();
    }
  }, [showPrintPreview, refreshPreview]);

  useEffect(() => {
    if (!showCourierLabelsPreview || !courierLabelsHtml) return;
    const iframe = courierIframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    doc.open();
    doc.write(courierLabelsHtml);
    doc.close();
    requestAnimationFrame(() => syncPrintPreviewIframe(iframe));
  }, [showCourierLabelsPreview, courierLabelsHtml]);

  const iframeSize = iframeSizeForOslPrintSettings(printSettings);

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
      const stored = storedFromEditor(rows);
      onSave(stored);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function openAddSampleForm() {
    setSampleFormRow(null);
  }

  function openEditSampleForm(row: OslSampleRequirementRow) {
    setSampleFormRow(row);
  }

  function handleSampleFormSave(row: OslSampleRequirementRow) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = row;
        return next;
      }
      return [...prev, row];
    });
    setSampleFormRow(undefined);
  }

  function handleUpdateSample(row: OslSampleRequirementRow) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = row;
      return next;
    });
  }

  function handleRemoveSample(row: OslSampleRequirementRow) {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  function handleCopySample(row: OslSampleRequirementRow) {
    const copy: OslSampleRequirementRow = {
      ...row,
      id: createOslSampleRequirementRow().id,
    };
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === row.id);
      if (idx < 0) return [...prev, copy];
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
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
    printWindow.document.write(
      buildOslSampleRequirementsHtml(
        previewData,
        printSettings,
        tableColumns,
        letterVariant,
        printAssets,
      ),
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handleDownloadWord() {
    void downloadOslSampleRequirementsWord(
      previewData,
      printSettings,
      tableColumns,
      letterVariant,
      printAssets,
    ).catch(() => window.alert("Unable to download Word file."));
  }

  async function handleDownloadPdf() {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    try {
      const html = buildOslSampleRequirementsHtml(
      previewData,
      printSettings,
      tableColumns,
      letterVariant,
      printAssets,
    );
      await downloadPrintHtmlAsPdf({
        html,
        filename: `Sample_Requirements_${safePdfFilenamePart(letterData.companyName)}.pdf`,
        settings: printSettings,
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to download PDF.");
    } finally {
      setPdfDownloading(false);
    }
  }

  async function buildCourierLabelsDocumentHtml(opts?: {
    includeBlv?: boolean;
    includeMobile?: boolean;
  }): Promise<string | null> {
    const stored = storedFromEditor(rows).filter(rowHasContent);
    if (stored.length === 0) return null;

    const includeBlv = opts?.includeBlv ?? courierIncludeBlv;
    const includeMobile = opts?.includeMobile ?? courierIncludeMobile;

    // Fresh Client Master fetch so To · Laboratory gets complete address.
    const labClients = await fetchClientsForLabLookup();

    const QR = await import("qrcode");
    const labelRows = await Promise.all(
      stored.map(async (row) => {
        const laboratory_address = resolveClientAddress(
          row.laboratory_name,
          labClients,
        );
        const payload = buildOslSampleCourierQrText(row, {
          companyName: letterData.companyName,
          companyAddress: letterData.address ?? "",
          isNumber: letterData.isNumber ?? isCodeNumber ?? "",
          isTitle: letterData.isTitle ?? "",
          variant: letterVariant,
          laboratory_address,
        });
        if (!payload.trim()) {
          return { ...row, qr_data_url: "", laboratory_address };
        }
        try {
          // High-res PNG + quiet zone so print/scan stays sharp (dense detail payload).
          const qr_data_url = await QR.toDataURL(payload, {
            width: 1024,
            margin: 4,
            errorCorrectionLevel: "M",
            type: "image/png",
            color: { dark: "#000000", light: "#ffffff" },
          });
          return { ...row, qr_data_url, laboratory_address };
        } catch {
          // Retry with lower ECC if payload is too dense for M.
          try {
            const qr_data_url = await QR.toDataURL(payload, {
              width: 1024,
              margin: 4,
              errorCorrectionLevel: "L",
              type: "image/png",
              color: { dark: "#000000", light: "#ffffff" },
            });
            return { ...row, qr_data_url, laboratory_address };
          } catch {
            return { ...row, qr_data_url: "", laboratory_address };
          }
        }
      }),
    );

    return buildOslSampleCourierLabelsHtml({
      companyName: letterData.companyName,
      companyAddress: letterData.address ?? "",
      isNumber: letterData.isNumber ?? isCodeNumber ?? "",
      isTitle: letterData.isTitle ?? "",
      applicationNumber: letterData.applicationNumber ?? "",
      variant: letterVariant,
      rows: labelRows,
      includeBlvCareOf: includeBlv,
      includeLabMobile: includeMobile,
    });
  }

  async function refreshCourierLabelsPreview(opts?: {
    includeBlv?: boolean;
    includeMobile?: boolean;
  }) {
    setCourierLabelsLoading(true);
    try {
      const html = await buildCourierLabelsDocumentHtml(opts);
      if (html) setCourierLabelsHtml(html);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Unable to refresh sample labels preview.",
      );
    } finally {
      setCourierLabelsLoading(false);
    }
  }

  async function handleToggleCourierBlv() {
    const next = !courierIncludeBlv;
    setCourierIncludeBlv(next);
    if (showCourierLabelsPreview) {
      await refreshCourierLabelsPreview({
        includeBlv: next,
        includeMobile: courierIncludeMobile,
      });
    }
  }

  async function handleToggleCourierMobile() {
    const next = !courierIncludeMobile;
    setCourierIncludeMobile(next);
    if (showCourierLabelsPreview) {
      await refreshCourierLabelsPreview({
        includeBlv: courierIncludeBlv,
        includeMobile: next,
      });
    }
  }

  async function handleViewCourierLabels() {
    if (showCourierLabelsPreview) {
      setShowCourierLabelsPreview(false);
      return;
    }
    if (courierLabelsLoading) return;

    setCourierLabelsLoading(true);
    try {
      const html = await buildCourierLabelsDocumentHtml();
      if (!html) {
        window.alert("Add at least one sample before viewing courier labels.");
        return;
      }
      setCourierLabelsHtml(html);
      setShowPrintPreview(false);
      setShowCourierLabelsPreview(true);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to open sample labels preview.");
    } finally {
      setCourierLabelsLoading(false);
    }
  }

  async function handleDownloadCourierLabelsPdf() {
    if (courierLabelsDownloading) return;

    setCourierLabelsDownloading(true);
    try {
      const html = courierLabelsHtml.trim()
        ? courierLabelsHtml
        : await buildCourierLabelsDocumentHtml();
      if (!html) {
        window.alert("Add at least one sample before downloading courier labels.");
        return;
      }
      if (!courierLabelsHtml.trim()) setCourierLabelsHtml(html);

      await downloadPrintHtmlAsPdf({
        html,
        filename: `Sample_Courier_Labels_${safePdfFilenamePart(letterData.companyName)}.pdf`,
        settings: {
          paper_size: "A4",
          orientation: "portrait",
        },
      });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to download courier labels PDF.");
    } finally {
      setCourierLabelsDownloading(false);
    }
  }

  function handlePrintCourierLabels() {
    if (courierIframeRef.current?.contentWindow) {
      courierIframeRef.current.contentWindow.focus();
      courierIframeRef.current.contentWindow.print();
      return;
    }
    if (!courierLabelsHtml.trim()) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(courierLabelsHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function toggleSettingsPanel(panel: "page" | "print") {
    setSettingsPanel((prev) => (prev === panel ? null : panel));
  }

  function handleImportFromApplication(nextRows: OslSampleRequirementStored[]): boolean {
    const current = storedFromEditor(rows);
    if (oslSampleRequirementsHasContent(current)) {
      const ok = window.confirm(
        `Replace the current ${labels.modalTitle} with the imported sample data?`,
      );
      if (!ok) return false;
    }
    setRows(editorRowsFromStored(nextRows));
    setShowPrintPreview(false);
    setShowCourierLabelsPreview(false);
    return true;
  }

  return (
    <>
      <div className="absolute inset-0 z-[400] flex flex-col bg-zinc-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="flex shrink-0 flex-col gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2 sm:px-4 sm:py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">{labels.modalTitle}</h2>
            <DocumentModalSubtitle companyName={letterData.companyName} isNumber={isFullNumber} />
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Letter
              </span>
              <button
                type="button"
                onClick={() => setLetterVariant("osl")}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  letterVariant === "osl"
                    ? "bg-teal-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                OSL
              </button>
              <button
                type="button"
                onClick={() => setLetterVariant("pi")}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  letterVariant === "pi"
                    ? "bg-teal-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                IT
              </button>
              <span className="text-[11px] text-zinc-500">{letterLabels.documentHeading}</span>
            </div>
          </div>
          <ModalToolbarActions onClose={onClose}>
          {savedFlash && (
            <span className="text-xs font-semibold text-emerald-400">Saved ✓</span>
          )}
          {saving && <span className="text-xs text-zinc-400">Saving…</span>}
          <span
            className="hidden text-[11px] font-medium text-zinc-400 sm:inline"
            title="Samples with In Letter ON appear in Print Preview / Print / Word / PDF"
          >
            In Letter: {inLetterCount}
            {totalSampleCount !== inLetterCount
              ? ` / ${totalSampleCount}`
              : ""}
          </span>
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
            onClick={() => setShowImportDialog(true)}
            title={`Import ${labels.modalTitle} from Another Application or License`}
            className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCourierLabelsPreview(false);
              setShowPrintPreview((prev) => !prev);
            }}
            title={`Print Preview includes all ${inLetterCount} sample${inLetterCount === 1 ? "" : "s"} with In Letter ON`}
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
            title={`Print includes all ${inLetterCount} sample${inLetterCount === 1 ? "" : "s"} with In Letter ON`}
            className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Print
          </button>
          <button
            type="button"
            onClick={handleDownloadWord}
            title={`Word table includes all ${inLetterCount} sample${inLetterCount === 1 ? "" : "s"} with In Letter ON`}
            className="shrink-0 whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
          >
            Download Word File
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={pdfDownloading}
            title={`PDF table includes all ${inLetterCount} sample${inLetterCount === 1 ? "" : "s"} with In Letter ON`}
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
          </ModalToolbarActions>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row xl:overflow-x-auto">
          {!showPrintPreview && !showCourierLabelsPreview && (
            <div
              className={`flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-900 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
              }`}
            >
              <div className="border-b border-zinc-800 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <OslSampleAddButton theme="dark" onClick={openAddSampleForm} />
                  <button
                    type="button"
                    onClick={() => void handleViewCourierLabels()}
                    disabled={courierLabelsLoading}
                    title="View printable sample tags with QR for courier attachment"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                      showCourierLabelsPreview
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : "border-emerald-600/50 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-950/70"
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {courierLabelsLoading ? "Opening…" : "View Sample Labels"}
                  </button>
                  {isCodeId ? (
                    <button
                      type="button"
                      onClick={() => setShowIsCodeView(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-600/50 bg-indigo-950/40 px-2.5 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-950/70"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View IS Files
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
                <OslSampleRequirementsTableEditor
                  theme="dark"
                  rows={rows}
                  onEdit={openEditSampleForm}
                  onCopy={handleCopySample}
                  onRemove={handleRemoveSample}
                  onUpdate={handleUpdateSample}
                  focusSampleIndex={initialFocusSampleIndex}
                />
              </div>
            </div>
          )}

          {showCourierLabelsPreview && (
            <div
              className={`flex min-w-0 flex-1 flex-col bg-zinc-600 ${
                settingsPanel ? "xl:w-[calc(100%-18rem)]" : "xl:w-full"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-700/80 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-200">
                  Sample Labels Preview · Courier
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleCourierBlv()}
                    disabled={courierLabelsLoading}
                    title="Add BLV Testing Solutions C/o above laboratory name"
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                      courierIncludeBlv
                        ? "border-sky-500 bg-sky-600 text-white"
                        : "border-zinc-500 bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                    }`}
                  >
                    Add BLV
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleCourierMobile()}
                    disabled={courierLabelsLoading}
                    title="Add Mobile: +919009413040 under laboratory address"
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                      courierIncludeMobile
                        ? "border-sky-500 bg-sky-600 text-white"
                        : "border-zinc-500 bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                    }`}
                  >
                    Add Mobile
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintCourierLabels}
                    className="rounded-lg border border-zinc-500 bg-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-100 hover:bg-zinc-600"
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadCourierLabelsPdf()}
                    disabled={courierLabelsDownloading}
                    className="rounded-lg border border-emerald-500/60 bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {courierLabelsDownloading ? "Preparing PDF…" : "Download PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCourierLabelsPreview(false)}
                    className="rounded-lg border border-zinc-500 bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={courierIframeRef}
                  title="Sample courier labels preview"
                  className="mx-auto max-w-full border-0 bg-white shadow-2xl"
                  scrolling="no"
                  style={printPreviewIframeStyle(210, 297)}
                />
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
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                <iframe
                  ref={iframeRef}
                  title={labels.iframeTitle}
                  className="mx-auto max-w-full border-0 bg-white shadow-2xl"
                  scrolling="no"
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
                oslTableColumns={settingsPanel === "print" ? tableColumns : undefined}
                onOslTableColumnsChange={
                  settingsPanel === "print" ? setTableColumns : undefined
                }
                hideLetterheadLogo
              />
            </div>
          )}
        </div>
      </div>

      {showIsCodeView && isCodeId && (
        <IsCodeViewModal
          isCodeId={isCodeId}
          isNumber={isCodeNumber}
          revisionYear={revisionYear}
          overlayZIndexClass="z-[450]"
          onClose={() => setShowIsCodeView(false)}
        />
      )}

      {showQeAssistant && (
        <AiChatModal
          title="QE Assistant"
          subtitle={labels.qeSubtitle}
          systemPrompt={OSL_QE_PROMPT}
          starterQuestions={OSL_QE_STARTERS}
          accentColor="emerald"
          overlayZIndexClass="z-[500]"
          onClose={() => setShowQeAssistant(false)}
        />
      )}

      {showImportDialog && (
        <ChecklistDocumentImportDialog
          documentKey={importDocumentKey}
          title={`Import ${labels.modalTitle}`}
          defaultClientId={clientId}
          exclude={excludeImportSource}
          onImport={(payload) => {
            if (payload.key !== importDocumentKey) return false;
            return handleImportFromApplication(payload.document);
          }}
          onClose={() => setShowImportDialog(false)}
        />
      )}

      {sampleFormRow !== undefined ? (
        <OslSampleFormModal
          initial={sampleFormRow}
          clientOptions={clientOptions}
          onClientsChanged={reloadClients}
          onSave={handleSampleFormSave}
          onClose={() => setSampleFormRow(undefined)}
        />
      ) : null}
    </>
  );
}
