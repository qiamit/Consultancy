import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";
import {
  resolveGradeAndDescription,
  rowHasContent,
} from "@backend/modules/bis/osl-sample-requirements";
import type { SampleOfferLetterVariant } from "@backend/modules/print/sample-offer-letter-variant";
import {
  buildOslSampleTestRequestPagesHtml,
  OSL_SAMPLE_TEST_REQUEST_CSS,
} from "@backend/modules/print/osl-sample-test-request";

export type OslSampleCourierLabelRow = OslSampleRequirementStored & {
  /** Pre-rendered QR PNG data URL (client-generated). */
  qr_data_url?: string;
  /** Resolved from Client Master when laboratory is a client. */
  laboratory_address?: string;
};

export type OslSampleCourierLabelsData = {
  companyName: string;
  /** Applicant / factory address for From block (optional). */
  companyAddress?: string;
  isNumber: string;
  isTitle: string;
  applicationNumber: string;
  variant: SampleOfferLetterVariant;
  rows: OslSampleCourierLabelRow[];
  bisBranchName?: string;
  bisBranchState?: string;
  bisBranchCountry?: string;
  /** Prefix laboratory with BLV Testing Solutions C/o */
  includeBlvCareOf?: boolean;
  /** Show courier mobile under laboratory address */
  includeLabMobile?: boolean;
};

export const OSL_COURIER_BLV_CARE_OF = "BLV Testing Solutions C/o";
export const OSL_COURIER_LAB_MOBILE = "Mobile: +919009413040";

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dash(s: string): string {
  const v = (s ?? "").trim();
  return v ? esc(v) : "—";
}

function fieldLine(label: string, value: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  return `${label}: ${v}`;
}

/**
 * Phone cameras (Apple + Android) fail on dense full-detail QR at print size.
 * Keep payload short so modules stay large enough to lock from a screen or page.
 */
const QR_SCAN_MAX_CHARS = 160;

export function buildOslSampleCourierQrText(
  row: OslSampleRequirementStored,
  meta: Pick<
    OslSampleCourierLabelsData,
    | "companyName"
    | "companyAddress"
    | "isNumber"
    | "isTitle"
    | "applicationNumber"
    | "variant"
  > & { laboratory_address?: string },
): string {
  const resolved = resolveGradeAndDescription(row);
  const isLine = meta.isNumber.trim();
  const candidates = [
    fieldLine("QR Code", row.qr_code),
    fieldLine("Sample Code", row.sample_code),
    fieldLine("IS Number", isLine),
    fieldLine("Batch Number", row.batch_number),
    fieldLine("Applicant", (meta.companyName ?? "").trim()),
    fieldLine("Laboratory", (row.laboratory_name ?? "").trim()),
    fieldLine("Sample Type", row.sample_type),
    fieldLine("Grade", resolved.grade_type_variety),
    fieldLine("Declared Value", row.declared_value),
  ].filter((line): line is string => Boolean(line));

  const lines: string[] = ["BIS Test Request"];
  for (const line of candidates) {
    const next = `${lines.join("\n")}\n${line}`;
    if (next.length > QR_SCAN_MAX_CHARS) break;
    lines.push(line);
  }
  return lines.join("\n");
}

function nl2br(s: string): string {
  return esc(s).replace(/\r\n|\r|\n/g, "<br/>");
}

function buildLabelCard(
  row: OslSampleCourierLabelRow,
  _index: number,
  meta: OslSampleCourierLabelsData,
): string {
  const sampleCode = (row.sample_code ?? "").trim();
  const sampleQrCode = (row.qr_code ?? "").trim();
  const displayCode = sampleCode || sampleQrCode;
  const qrImg = row.qr_data_url?.trim()
    ? `<img class="label-qr" src="${esc(row.qr_data_url)}" alt="QR ${esc(displayCode)}" />`
    : `<div class="label-qr-empty">No QR</div>`;

  const labName = (row.laboratory_name ?? "").trim();
  const labAddress = (row.laboratory_address ?? "").trim();
  const fromAddress = (meta.companyAddress ?? "").trim();
  const showBlv = Boolean(meta.includeBlvCareOf);
  const showMobile = Boolean(meta.includeLabMobile);

  const labNameHtml = showBlv
    ? `<div class="to-blv">${esc(OSL_COURIER_BLV_CARE_OF)}</div>
        <div class="to-name">${dash(labName)}</div>`
    : `<div class="to-name">${dash(labName)}</div>`;

  const labAddressHtml = `
        <div class="to-address">${labAddress ? nl2br(labAddress) : "—"}</div>
        ${
          showMobile
            ? `<div class="to-mobile">${esc(OSL_COURIER_LAB_MOBILE)}</div>`
            : ""
        }`;

  return `
<article class="sample-label">
  <div class="cols-2">
    <section class="col col-lab">
      <div class="to-block">
        <div class="block-kicker">To · Laboratory</div>
        ${labNameHtml}
        ${labAddressHtml}
      </div>
      <div class="from-block">
        <div class="block-kicker">From · Applicant</div>
        <div class="from-name">${dash(meta.companyName)}</div>
        ${fromAddress ? `<div class="from-address">${nl2br(fromAddress)}</div>` : ""}
      </div>
    </section>

    <section class="col col-qr">
      <div class="block-kicker">Scan QR for Sample Details</div>
      <div class="qr-panel">
        ${qrImg}
        <div class="code-block">
          <div class="code-row">
            <span class="code-label">Sample Code</span>
            <span class="code-value">${dash(sampleCode)}</span>
          </div>
          <div class="code-row">
            <span class="code-label">Sample QR Code</span>
            <span class="code-value">${dash(sampleQrCode || sampleCode)}</span>
          </div>
        </div>
        <div class="qr-hint">Scan QR · full details inside</div>
      </div>
    </section>
  </div>
</article>`;
}

/** Printable sample tags — 2 per A4 (each half page); details live in QR payload. */
export function buildOslSampleCourierLabelsHtml(data: OslSampleCourierLabelsData): string {
  const rows = data.rows.filter(rowHasContent);
  if (rows.length === 0) {
    throw new Error("Add at least one sample before downloading courier labels.");
  }

  const testRequestPages = buildOslSampleTestRequestPagesHtml({
    companyName: data.companyName,
    companyAddress: data.companyAddress,
    isNumber: data.isNumber,
    isTitle: data.isTitle,
    applicationNumber: data.applicationNumber,
    bisBranchName: data.bisBranchName ?? "",
    bisBranchState: data.bisBranchState ?? "",
    bisBranchCountry: data.bisBranchCountry ?? "India",
    rows,
    includeBlvCareOf: data.includeBlvCareOf,
    includeLabMobile: data.includeLabMobile,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Test Request</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Times New Roman", Times, serif;
    color: #111827;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { padding: 4mm; }
  .sheet {
    display: flex;
    flex-direction: column;
    gap: 6mm;
    width: 100%;
  }
  .sample-label {
    width: 100%;
    height: 128mm;
    max-height: 128mm;
    border: 1.25pt solid #1f2937;
    border-radius: 2.5mm;
    padding: 4mm 4.5mm;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    gap: 3mm;
    background: linear-gradient(180deg, #fafafa 0%, #ffffff 14mm);
  }
  .sample-label:nth-child(2n) {
    break-after: page;
    page-break-after: always;
  }
  .sample-label:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .block-kicker {
    font-size: 7.5px;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 1.5mm;
  }

  .cols-2 {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: 0;
    border: 0.75pt solid #e5e7eb;
    border-radius: 2mm;
    overflow: hidden;
    background: #fff;
  }
  .col {
    padding: 4mm;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .col-lab {
    background: #fff;
    color: #111827;
    justify-content: space-between;
  }
  .col-lab .block-kicker { color: #6b7280; }
  .to-block {
    flex-shrink: 0;
  }
  .from-block {
    margin-top: auto;
    padding-top: 3mm;
    border-top: 1pt solid #111827;
    flex-shrink: 0;
  }
  .col-qr {
    align-items: center;
    background: #ffffff;
    border-left: 0.75pt solid #e5e7eb;
  }
  .col-qr .block-kicker {
    align-self: stretch;
    text-align: center;
  }

  .to-name {
    font-size: 16px;
    font-weight: 800;
    line-height: 1.35;
    color: #111827;
  }
  .to-blv {
    font-size: 14px;
    font-weight: 800;
    line-height: 1.3;
    color: #111827;
    margin-bottom: 1.5mm;
  }
  .to-address {
    margin-top: 3mm;
    font-size: 13px;
    line-height: 1.5;
    color: #111827;
    white-space: pre-wrap;
  }
  .to-mobile {
    margin-top: 2mm;
    font-size: 13px;
    font-weight: 750;
    line-height: 1.35;
    color: #111827;
    font-variant-numeric: tabular-nums;
  }

  .qr-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2mm;
    text-align: center;
    width: 100%;
    flex: 1;
  }
  .label-qr {
    width: 58mm;
    height: 58mm;
    object-fit: contain;
    background: #fff;
    border: none;
    border-radius: 0;
    padding: 0;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
  .label-qr-empty {
    width: 58mm;
    height: 58mm;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0.75pt dashed #9ca3af;
    border-radius: 1.5mm;
    font-size: 8px;
    color: #9ca3af;
    background: #fff;
  }
  .code-block {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5mm;
    margin-top: 1mm;
  }
  .code-row {
    display: flex;
    flex-direction: column;
    gap: 0.4mm;
    padding: 1.5mm 2mm;
    background: #fff;
    border: 0.5pt solid #e5e7eb;
    border-radius: 1.5mm;
  }
  .code-label {
    font-size: 7px;
    font-weight: 800;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #6b7280;
  }
  .code-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11px;
    font-weight: 750;
    word-break: break-all;
    line-height: 1.25;
    color: #111827;
  }
  .qr-hint {
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #9ca3af;
  }

  .from-name {
    font-size: 14px;
    font-weight: 800;
    line-height: 1.3;
    color: #111827;
  }
  .from-address {
    margin-top: 1.5mm;
    font-size: 11px;
    line-height: 1.4;
    color: #111827;
  }

  ${OSL_SAMPLE_TEST_REQUEST_CSS}

  @media print {
    body { padding: 0; }
    .sample-label { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
  ${testRequestPages}
</body>
</html>`;
}
