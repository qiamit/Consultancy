import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";
import { resolveGradeAndDescription } from "@backend/modules/bis/osl-sample-requirements";
import { parseToDate } from "@backend/shared/format-date";

export type OslSampleTestRequestPageRow = OslSampleRequirementStored & {
  laboratory_address?: string;
  qr_data_url?: string;
};

export type OslSampleTestRequestData = {
  companyName: string;
  companyAddress?: string;
  isNumber: string;
  isTitle: string;
  applicationNumber: string;
  bisBranchName: string;
  bisBranchState: string;
  bisBranchCountry?: string;
  rows: OslSampleTestRequestPageRow[];
  includeBlvCareOf?: boolean;
  includeLabMobile?: boolean;
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTrDate(value: string | Date | null | undefined): string {
  const d = value instanceof Date ? value : parseToDate(value);
  if (!d) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatIsNo(isNumber: string, isTitle: string): string {
  const num = (isNumber ?? "").trim();
  const title = (isTitle ?? "").trim();
  if (num && title) return `${num}`;
  return num || title || "—";
}

const TR_BLV_CARE_OF = "BLV Testing Solutions C/o";
const TR_LAB_MOBILE = "Mobile Number: +919009413040";

function sentFromLine(data: OslSampleTestRequestData): string {
  return [data.companyName, data.companyAddress]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ") || "—";
}

function sentToHtml(data: OslSampleTestRequestData, row: OslSampleTestRequestPageRow): string {
  const firm = (row.laboratory_name ?? "").trim() || (row.destination_lab ?? "").trim();
  const address = (row.laboratory_address ?? "").trim();
  const lines: string[] = [];
  if (data.includeBlvCareOf) {
    lines.push(`<div class="tr-sent-blv">${esc(TR_BLV_CARE_OF)}</div>`);
  }
  lines.push(`<div class="tr-sent-firm">${firm ? esc(firm) : "—"}</div>`);
  if (address) {
    lines.push(`<div class="tr-sent-addr">${esc(address)}</div>`);
  }
  if (data.includeLabMobile) {
    lines.push(`<div class="tr-sent-mobile">${esc(TR_LAB_MOBILE)}</div>`);
  }
  return lines.join("");
}

function isBlank(value: string | null | undefined): boolean {
  const v = String(value ?? "").trim();
  if (!v) return true;
  const n = v.toLowerCase();
  return v === "—" || v === "-" || v === "–" || n === "nil" || n === "nill" || n === "n/a";
}

function pairRow(
  aLabel: string,
  aValue: string,
  bLabel: string,
  bValue: string,
): string {
  return `
    <tr>
      <th>${esc(aLabel)}</th>
      <td>${aValue}</td>
      <th>${esc(bLabel)}</th>
      <td>${bValue}</td>
    </tr>`;
}

function fullRow(label: string, value: string): string {
  return `
    <tr>
      <th>${esc(label)}</th>
      <td colspan="3">${value}</td>
    </tr>`;
}

function detailPair(
  aLabel: string,
  aRaw: string,
  bLabel: string,
  bRaw: string,
  aHtml?: string,
  bHtml?: string,
): string {
  const aOk = !isBlank(aRaw);
  const bOk = !isBlank(bRaw);
  const a = aHtml ?? esc((aRaw ?? "").trim());
  const b = bHtml ?? esc((bRaw ?? "").trim());
  if (aOk && bOk) return pairRow(aLabel, a, bLabel, b);
  if (aOk) return fullRow(aLabel, a);
  if (bOk) return fullRow(bLabel, b);
  return "";
}

function detailFull(label: string, raw: string, html?: string): string {
  if (isBlank(raw)) return "";
  return fullRow(label, html ?? esc(raw.trim()));
}

export function buildOslSampleTestRequestPagesHtml(data: OslSampleTestRequestData): string {
  return data.rows
    .map((row) => {
      const resolved = resolveGradeAndDescription(row);
      const today = formatTrDate(new Date());
      const drawingNote = (row.declared_drawing_ref ?? "").trim()
        ? ` <span class="tr-note">(Drawing / PDF attached)</span>`
        : "";
      const qrCode = (row.qr_code ?? "").trim();
      const sampleCode = (row.sample_code ?? "").trim();
      const qrAlt = sampleCode || qrCode;
      const headerQr = row.qr_data_url?.trim()
        ? `<img class="tr-head-qr" src="${esc(row.qr_data_url)}" alt="QR ${esc(qrAlt)}" />`
        : `<div class="tr-head-qr-empty">No QR</div>`;

      return `
<article class="tr-page" aria-label="Test Request attachment">
  <header class="tr-head">
    <h2>TEST REQUEST</h2>
  </header>

  <div class="tr-to-qr">
    <section class="tr-sent tr-sent-to">
      <span class="tr-k">Sample Sent To:</span>
      <div class="tr-sent-body">${sentToHtml(data, row)}</div>
    </section>
    <aside class="tr-head-qr-card">
      <div class="tr-head-qr-pad">${headerQr}</div>
      <p class="tr-head-qr-caption">Scan for complete sample details</p>
    </aside>
  </div>

  <section class="tr-box">
    <h3>Sample Details</h3>
    <table class="tr-grid">
      <colgroup>
        <col class="tr-kcol" /><col class="tr-vcol" />
        <col class="tr-kcol" /><col class="tr-vcol" />
      </colgroup>
      <tbody>
        ${detailPair("IS Number", formatIsNo(data.isNumber, data.isTitle), "Test Request Date", today)}
        ${detailPair(
          "Sample Code",
          row.sample_code,
          "QR Code",
          row.qr_code,
          `<span class="mono">${esc((row.sample_code ?? "").trim())}</span>`,
          `<span class="mono">${esc((row.qr_code ?? "").trim())}</span>`,
        )}
        ${detailPair("Sample Type", row.sample_type, "Priority", row.priority)}
        ${detailPair("Shelf Life", row.shelf_life, "Serial Number", row.serial_number ?? "")}
        ${detailPair("Test Required", row.test_required, "Testing Charges", row.testing_charges)}
        ${detailPair(
          "Batch Number",
          row.batch_number,
          "Manufacturing Date",
          formatTrDate(row.date_of_manufacturing),
        )}
        ${detailFull("Grade / Type / Variety", resolved.grade_type_variety)}
        ${
          !isBlank(row.declared_value) || drawingNote
            ? fullRow(
                "Declared Value",
                `${isBlank(row.declared_value) ? "" : esc(row.declared_value.trim())}${drawingNote}`,
              )
            : ""
        }
        ${detailFull("Sample Description", resolved.sample_description)}
        ${detailFull("Additional Information", row.additional_information ?? "")}
        ${detailFull("Sample Quantity", row.sample_quantity ?? "")}
      </tbody>
    </table>
  </section>

  <section class="tr-sent tr-sent-from">
    <span class="tr-k">Sample Sent From :</span>
    <span>${esc(sentFromLine(data))}</span>
  </section>
</article>`;
    })
    .join("\n");
}

export const OSL_SAMPLE_TEST_REQUEST_CSS = `
  .tr-page {
    width: 100%;
    min-height: 273mm;
    margin-top: 8mm;
    padding: 6mm 5mm 8mm;
    background: #fff;
    color: #111;
    break-before: page;
    page-break-before: always;
    break-inside: avoid;
    page-break-inside: avoid;
    position: relative;
    font-family: "Times New Roman", Times, serif;
  }
  .tr-page:first-of-type {
    margin-top: 0;
    break-before: auto;
    page-break-before: auto;
  }
  .tr-head {
    margin-bottom: 4mm;
    text-align: center;
  }
  .tr-head h2 {
    margin: 0;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: .08em;
    text-decoration: underline;
    color: #111;
  }
  .tr-to-qr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 68mm;
    gap: 4mm;
    align-items: stretch;
    margin-bottom: 3mm;
  }
  .tr-to-qr .tr-sent { margin-bottom: 0; display: flex; flex-direction: column; justify-content: center; }
  .tr-head-qr-card {
    flex-shrink: 0;
    width: 64mm;
    padding: 3mm 3mm 2.5mm;
    border: 0.75pt solid #d1d5db;
    border-radius: 2mm;
    background: #fff;
    overflow: visible;
  }
  .tr-head-qr-pad {
    padding: 4mm;
    background: #fff;
    border: 0.5pt solid #e5e7eb;
  }
  .tr-head-qr {
    width: 52mm;
    height: 52mm;
    object-fit: contain;
    display: block;
    background: #fff;
  }
  .tr-head-qr-empty {
    width: 52mm;
    height: 52mm;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0.6pt dashed #9ca3af;
    font-size: 10px;
    color: #9ca3af;
  }
  .tr-head-qr-caption {
    margin: 1.8mm 0 0;
    text-align: center;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: #6b7280;
  }
  .tr-sent {
    border: 0.75pt solid #9ca3af;
    border-radius: 2mm;
    padding: 2.5mm 3mm;
    font-size: 16px;
    line-height: 1.5;
    margin-bottom: 2mm;
  }
  .tr-sent-to { justify-content: flex-start; }
  .tr-sent-body {
    display: flex;
    flex-direction: column;
    gap: 0.6mm;
    margin-top: 1.2mm;
  }
  .tr-sent-blv,
  .tr-sent-firm { font-weight: 700; }
  .tr-sent-from { margin-top: 3.5mm; margin-bottom: 0; }
  .tr-k { font-weight: 800; display: block; }
  .tr-box {
    border: 0.75pt solid #d1d5db;
    border-radius: 2mm;
    padding: 3mm;
  }
  .tr-box h3 {
    margin: 0 0 1.5mm;
    font-size: 14px;
    font-weight: 800;
    color: #111;
  }
  .tr-grid {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }
  .tr-grid th, .tr-grid td {
    border: 0.6pt solid #9ca3af;
    padding: 2.4mm 2.2mm;
    font-size: 11.5px;
    vertical-align: top;
  }
  .tr-grid .tr-kcol { width: 1%; }
  .tr-grid .tr-vcol { width: auto; }
  .tr-grid th {
    background: #f3f4f6;
    font-weight: 800;
    text-align: left;
    color: #111;
    white-space: nowrap;
    word-break: keep-all;
  }
  .tr-grid td {
    word-break: break-word;
  }
  .mono {
    font-family: "Times New Roman", Times, serif;
    font-size: 11px;
    font-weight: 700;
  }
  .tr-note { font-size: 9.5px; color: #4b5563; font-weight: 600; }
  @media print {
    .tr-page { break-before: page; page-break-before: always; margin-top: 0; }
  }
`;
