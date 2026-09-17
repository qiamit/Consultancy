import { buildPrintDocument } from "@backend/modules/print/engine";
import { openPrintPreview } from "@backend/modules/print/preview";
import {
  pagedPrintSheetStyles,
  printPageIndicatorHtml,
} from "@backend/modules/print/paged-preview";
import { iframeSizeForPrintSettings } from "@backend/modules/print/manufacturing-scope-declaration";
import {
  DEFAULT_PRINT_SETTINGS,
  type PrintCompanyInfo,
  type PrintSettings,
} from "@backend/modules/print/types";
import { formatDisplayDate } from "@backend/shared/format-date";

export type BisForm1Person = {
  name: string;
  designation: string;
};

export type BisForm1Data = {
  applicationNumber: string;
  companyName: string;
  /** Street / plot line (without city–pin). */
  officeAddress: string;
  factoryAddress: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pinCode: string;
  officeTel: string;
  officeFax: string;
  officeEmail: string;
  factoryTel: string;
  factoryFax: string;
  factoryEmail: string;
  /** e.g. Factory / Office */
  correspondenceAddress: string;
  /** e.g. Medium / Small / Micro / Large */
  scale: string;
  /** e.g. Private */
  sector: string;
  topManagement: BisForm1Person[];
  technicalManagement: BisForm1Person[];
  contactPersonLine: string;
  /** Product description for the “Standard Mark on ___” line and PRODUCT box. */
  productName: string;
  isNumber: string;
  isPart: string;
  isSection: string;
  /** Grade / type / class block (license scope text). */
  gradesText: string;
  unitsOfProduction: string;
  quantity: string;
  valueRs: string;
  bisLicensesHeld: string;
  signatoryName: string;
  signatoryDesignation: string;
  dateOfApplication: string;
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, "<br/>");
}

function dash(s: string, fallback = "—"): string {
  const v = (s ?? "").trim();
  return v || fallback;
}

function cell(s: string): string {
  return esc(dash(s, ""));
}

function personRows(people: BisForm1Person[]): string {
  const filled = people.filter((p) => p.name.trim() || p.designation.trim());
  if (filled.length === 0) {
    return `<tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr>`;
  }
  return filled
    .map(
      (p) =>
        `<tr><td>${esc(p.name.trim())}</td><td>${esc(p.designation.trim())}</td></tr>`,
    )
    .join("");
}

function addressBlock(opts: {
  kindHi: string;
  kindEn: string;
  address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pin: string;
  tel: string;
  fax: string;
  email: string;
}): string {
  return `
<table class="f1-box f1-addr">
  <tr>
    <td class="f1-addr-kind" rowspan="2">
      <div class="f1-vlabel">पता</div>
      <div class="f1-vlabel">Address</div>
      <div class="f1-kind">${esc(opts.kindHi)}</div>
      <div class="f1-kind">${esc(opts.kindEn)}</div>
    </td>
    <td class="f1-addr-main" colspan="5">
      <div class="f1-mini">पता Address</div>
      <div class="f1-val">${nl2br(dash(opts.address, ""))}</div>
    </td>
    <td class="f1-contact-col" rowspan="2">
      <div class="f1-contact-row">
        <div class="f1-mini">दूरभाष Tel.</div>
        <div class="f1-val">${esc(dash(opts.tel, "-"))}</div>
      </div>
      <div class="f1-contact-row">
        <div class="f1-mini">फैक्स FAX</div>
        <div class="f1-val">${esc(dash(opts.fax, "-"))}</div>
      </div>
      <div class="f1-contact-row">
        <div class="f1-mini">ई-मेल* Email*</div>
        <div class="f1-val">${esc(dash(opts.email, ""))}</div>
      </div>
    </td>
  </tr>
  <tr>
    <td class="f1-geo">
      <div class="f1-mini">शहर City</div>
      <div class="f1-val f1-center">${cell(opts.city)}</div>
    </td>
    <td class="f1-geo">
      <div class="f1-mini">जिला District</div>
      <div class="f1-val f1-center">${cell(opts.district)}</div>
    </td>
    <td class="f1-geo">
      <div class="f1-mini">राज्य State</div>
      <div class="f1-val f1-center">${cell(opts.state)}</div>
    </td>
    <td class="f1-geo">
      <div class="f1-mini">देश Country</div>
      <div class="f1-val f1-center">${cell(opts.country)}</div>
    </td>
    <td class="f1-geo f1-pin">
      <div class="f1-mini">पिन Pin</div>
      <div class="f1-val f1-center">${cell(opts.pin)}</div>
    </td>
  </tr>
</table>`;
}

function buildFormBody(data: BisForm1Data): string {
  const appNo = dash(data.applicationNumber, "");
  const firm = dash(data.companyName, "");
  const product = dash(data.productName, "");
  const isNo = dash(data.isNumber, "");
  const grades = dash(data.gradesText, "");
  const appDate = data.dateOfApplication
    ? formatDisplayDate(data.dateOfApplication, "")
    : "";

  return `
<div class="print-sheet print-sheet-natural f1-sheet">
  <div class="print-sheet-body f1-fit-body">
    <div class="f1-header">
      <div class="f1-form-title">प्रपत्र 1 Form 1</div>
      <div class="f1-sub">[नियम 3 देखें] [See Regulation 3]</div>
      <div class="f1-org">भारतीय मानक ब्यूरो</div>
      <div class="f1-org">BUREAU OF INDIAN STANDARDS</div>
      <div class="f1-scheme">उत्पाद प्रमाणन योजना / Product Certification Scheme</div>
      <div class="f1-app-title">मानक चिह्न का उपयोग करने लाइसेंस के लिए आवेदन</div>
      <div class="f1-app-title-en">APPLICATION FOR LICENCE TO USE THE STANDARD MARK</div>
    </div>

    <table class="f1-box f1-row">
      <tr>
        <td class="f1-label-cell">आवेदन संख्या<br/>Application Number</td>
        <td class="f1-value-cell">${esc(appNo)}</td>
      </tr>
      <tr>
        <td class="f1-label-cell">आवेदक फर्म का पूरा नाम<br/>Full name of Applicant Firm</td>
        <td class="f1-value-cell">${esc(firm)}</td>
      </tr>
    </table>

    ${addressBlock({
      kindHi: "कार्यालय",
      kindEn: "Office",
      address: data.officeAddress,
      city: data.city,
      district: data.district,
      state: data.state,
      country: data.country,
      pin: data.pinCode,
      tel: data.officeTel,
      fax: data.officeFax,
      email: data.officeEmail,
    })}

    ${addressBlock({
      kindHi: "फैक्टरी",
      kindEn: "FACTORY",
      address: data.factoryAddress,
      city: data.city,
      district: data.district,
      state: data.state,
      country: data.country,
      pin: data.pinCode,
      tel: data.factoryTel,
      fax: data.factoryFax,
      email: data.factoryEmail,
    })}

    <table class="f1-box f1-meta-row">
      <tr>
        <td class="f1-meta-label">
          <div>पत्राचार का पता</div>
          <div>CORRESPONDENCE ADDRESS</div>
        </td>
        <td class="f1-meta-box">${esc(dash(data.correspondenceAddress, "Factory"))}</td>
        <td class="f1-meta-label">
          <div>स्तर</div>
          <div>SCALE</div>
        </td>
        <td class="f1-meta-box">${esc(dash(data.scale, ""))}</td>
        <td class="f1-meta-label">
          <div>क्षेत्र</div>
          <div>SECTOR</div>
        </td>
        <td class="f1-meta-box">${esc(dash(data.sector, ""))}</td>
      </tr>
    </table>

    <table class="f1-box f1-mgmt">
      <tr>
        <td class="f1-mgmt-side" rowspan="3">
          <div class="f1-vlabel">प्रबंध</div>
          <div class="f1-vlabel">MANAGEMENT</div>
        </td>
        <td class="f1-mgmt-head" colspan="2">शीर्ष प्रबंध<br/>Top Management</td>
        <td class="f1-mgmt-head" colspan="2">तकनीकी प्रबंध<br/>Technical Management</td>
      </tr>
      <tr>
        <td class="f1-mgmt-sub">नाम<br/>Name</td>
        <td class="f1-mgmt-sub">पदनाम<br/>Designation</td>
        <td class="f1-mgmt-sub">नाम<br/>Name</td>
        <td class="f1-mgmt-sub">पदनाम<br/>Designation</td>
      </tr>
      <tr>
        <td colspan="2" class="f1-mgmt-body">
          <table class="f1-inner">${personRows(data.topManagement)}</table>
        </td>
        <td colspan="2" class="f1-mgmt-body">
          <table class="f1-inner">${personRows(data.technicalManagement)}</table>
        </td>
      </tr>
      <tr>
        <td class="f1-contact-label" colspan="2">
          संपर्क किए जाने वाले व्यक्ति और टेलीफोन / मोबाइल नंबर<br/>
          CONTACT PERSON &amp; Tel/Mobile No.
        </td>
        <td class="f1-contact-value" colspan="3">${esc(dash(data.contactPersonLine, ""))}</td>
      </tr>
    </table>
    <p class="f1-note">*Furnishing of correct and valid email id is a mandatory requirement and absence of this information shall make the application liable for rejection</p>

    <div class="f1-mark-line">
      <div>यह आवेदन <span class="f1-fill">${esc(product)}</span> पर भारतीय मानक ब्यूरो की मानक के उपयोग के लिए किया जा रहा है ।</div>
      <div>This application is being made to use the Bureau of Indian Standards (BIS) Standard Mark on <span class="f1-fill">${esc(product)}</span></div>
    </div>

    <table class="f1-box f1-product">
      <tr>
        <td class="f1-side-label">
          <div class="f1-vlabel">उत्पाद</div>
          <div class="f1-vlabel">PRODUCT</div>
        </td>
        <td class="f1-product-val">${esc(product)}</td>
      </tr>
      <tr>
        <td class="f1-side-label">
          <div class="f1-vlabel-sm">भारतीय मानक उपयुक्त संशोधन सहित</div>
          <div class="f1-vlabel-sm">INDIAN STANDARD WITH APPLICABLE AMENDMENTS</div>
        </td>
        <td class="f1-std-wrap">
          <table class="f1-std">
            <tr>
              <td class="f1-is-meta">
                <div><strong>भा मा IS:</strong> ${esc(isNo)}</div>
                <div><strong>भाग Part:</strong> ${esc(dash(data.isPart, ""))}</div>
                <div><strong>खंड Sec:</strong> ${esc(dash(data.isSection, ""))}</div>
              </td>
              <td class="f1-grades">
                <div class="f1-grades-head">GRADE/TYPE/CLASS</div>
                <div class="f1-grades-body">${nl2br(grades)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table class="f1-box f1-capacity">
      <tr>
        <td class="f1-cap-title">
          वर्तमान स्थापित क्षमता<br/>
          PRESENT INSTALLED CAPACITY<br/>
          (उत्पादन प्रतिवर्ष) (Production per annum)
        </td>
        <td class="f1-cap-cell">
          <div class="f1-mini">उत्पाद की इकाईयां<br/>Units of Production</div>
          <div class="f1-val f1-center">${esc(dash(data.unitsOfProduction, "0.00"))}</div>
        </td>
        <td class="f1-cap-cell">
          <div class="f1-mini">मात्रा<br/>Quantity</div>
          <div class="f1-val f1-center">${esc(dash(data.quantity, "0.00"))}</div>
        </td>
        <td class="f1-cap-cell">
          <div class="f1-mini">मूल्य (रु.)<br/>Value (Rs.)</div>
          <div class="f1-val f1-center">${esc(dash(data.valueRs, ""))}</div>
        </td>
      </tr>
    </table>

    <table class="f1-box f1-licenses">
      <tr>
        <td>
          <div class="f1-mini"><strong>भारतीय मानक ब्यूरो से धारित लाइसेंस</strong></div>
          <div class="f1-mini"><strong>Bureau of Indian Standards (BIS) Licenses held</strong></div>
          <div class="f1-licenses-body">${nl2br(dash(data.bisLicensesHeld, ""))}</div>
        </td>
      </tr>
    </table>

    <table class="f1-box f1-declaration">
      <tr>
        <td>
          <p><strong>Declaration:</strong> The above information is true to the best of my knowledge and belief. I shall be responsible for any misleading information in the application. I understand and agree that in case of any wrong information in the application, the application shall be liable for rejection. I also agree that, if the license is granted on the basis of information which is later found to be incorrect, the license shall be liable for cancellation.</p>
          <p><strong>घोषणा:</strong> उपरोक्त सूचना मेरी जानकारी एवं विश्वास से सच है। आवेदन में किसी भी भ्रामक सूचना के लिए मैं जिम्मेदार रहूँगा/रहूँगी। मैं समझता/समझती हूँ और सहमत हूँ कि आवेदन में गलत सूचना होने पर आवेदन अस्वीकृत किया जा सकता है। मैं यह भी सहमत हूँ कि यदि गलत सूचना के आधार पर लाइसेंस दिया जाता है और बाद में सूचना गलत पाई जाती है तो लाइसेंस रद्द किया जा सकता है।</p>
        </td>
      </tr>
    </table>

    <table class="f1-box f1-sign">
      <tr>
        <td class="f1-seal">
          <div class="f1-mini">फर्म की सील:<br/>Seal of the Firm:</div>
          <div class="f1-seal-box"></div>
        </td>
        <td class="f1-sign-fields">
          <div class="f1-sign-line">हस्ताक्षर (Signature) ______________________________</div>
          <div class="f1-sign-line">नाम (Name) <span class="f1-fill">${esc(dash(data.signatoryName, "__________"))}</span></div>
          <div class="f1-sign-line">पदनाम (Designation) <span class="f1-fill">${esc(dash(data.signatoryDesignation, "__________"))}</span></div>
          <div class="f1-sign-line">आवेदन की तिथि (Date of Application) <span class="f1-fill">${esc(dash(appDate, "__________"))}</span></div>
        </td>
      </tr>
    </table>

    <p class="f1-important">महत्वपूर्ण- आवेदन पर फर्म के सीईओ अथवा उनकी अनुपस्थिति में अधिकृत प्रतिनिधि के हस्ताक्षर हों ।</p>
    <p class="f1-important">Important- Application should be signed by CEO of the firm, or in his absence by authorized representative.</p>
  </div>
  ${printPageIndicatorHtml(1, 1)}
</div>`;
}

export function defaultBisForm1PrintSettings(): PrintSettings {
  return {
    ...DEFAULT_PRINT_SETTINGS,
    orientation: "portrait",
    paper_size: "A4",
    show_letterhead: false,
    show_page_numbers: false,
    show_footer_line: false,
    font_family: "Arial",
    font_size: 10,
    margin_top: 8,
    margin_bottom: 8,
    margin_left: 10,
    margin_right: 10,
    primary_color: "#111111",
  };
}

export function buildBisForm1Company(data: BisForm1Data): PrintCompanyInfo {
  return {
    name: data.companyName,
    address: data.factoryAddress || data.officeAddress,
    city: data.city,
    state: data.state,
    pin_code: data.pinCode,
    country: data.country || "India",
    gst_number: "",
    email: data.factoryEmail || data.officeEmail,
    phone: data.factoryTel || data.officeTel,
    contact_person: data.signatoryName,
    logo_url: null,
    website: "",
    letterhead_upper_url: null,
    letterhead_lower_url: null,
    seal_sign_url: null,
  };
}

function formStyles(settings: PrintSettings): string {
  const pageSize = iframeSizeForPrintSettings(settings);
  const sheetHeight = `calc(${pageSize.heightMm}mm - ${settings.margin_top}mm - ${settings.margin_bottom}mm)`;
  return `
    ${pagedPrintSheetStyles(settings)}
    html, body { overflow: hidden !important; }
    .doc-page {
      overflow: hidden;
      height: ${pageSize.heightMm}mm;
      max-height: ${pageSize.heightMm}mm;
      box-sizing: border-box;
    }
    .f1-sheet.print-sheet,
    .print-sheet.f1-sheet {
      height: auto !important;
      min-height: 0 !important;
      max-height: ${sheetHeight};
      overflow: hidden;
      padding-bottom: 4mm;
      box-sizing: border-box;
    }
    .f1-sheet {
      font-family: Arial, Helvetica, sans-serif;
      color: #111;
      font-size: 9px;
      line-height: 1.3;
    }
    .f1-fit-body {
      width: 100%;
      box-sizing: border-box;
    }
    .f1-header { text-align: center; margin-bottom: 3px; }
    .f1-form-title { font-size: 12.5px; font-weight: 700; }
    .f1-sub { font-size: 8.5px; margin-top: 0; }
    .f1-org { font-size: 11.5px; font-weight: 700; margin-top: 1px; }
    .f1-scheme { font-size: 9.5px; margin-top: 1px; }
    .f1-app-title { font-size: 10.5px; font-weight: 700; margin-top: 3px; }
    .f1-app-title-en { font-size: 10.5px; font-weight: 800; text-transform: uppercase; }
    .f1-box { width: 100%; border-collapse: collapse; margin-top: 3px; table-layout: fixed; }
    .f1-box td, .f1-box th { border: 1px solid #111; vertical-align: top; padding: 2px 4px; }
    .f1-label-cell { width: 32%; font-size: 8.5px; font-weight: 600; }
    .f1-value-cell { font-size: 10.5px; font-weight: 700; }
    .f1-mini { font-size: 7.5px; font-weight: 600; line-height: 1.15; color: #222; }
    .f1-val { font-size: 9.5px; margin-top: 1px; word-break: break-word; }
    .f1-center { text-align: center; }
    .f1-vlabel { font-weight: 700; font-size: 9px; writing-mode: horizontal-tb; }
    .f1-vlabel-sm { font-weight: 700; font-size: 7.5px; line-height: 1.15; }
    .f1-kind { font-weight: 700; font-size: 9px; margin-top: 1px; }
    .f1-addr-kind { width: 9%; text-align: center; background: #fafafa; }
    .f1-addr-main { width: 52%; }
    .f1-contact-col { width: 22%; padding: 0 !important; }
    .f1-contact-row { border-bottom: 1px solid #111; padding: 2px 4px; }
    .f1-contact-row:last-child { border-bottom: none; }
    .f1-geo { width: 11%; }
    .f1-pin { width: 10%; }
    .f1-meta-row td { vertical-align: middle; }
    .f1-meta-label { width: 14%; font-size: 7.5px; font-weight: 700; text-align: center; line-height: 1.15; }
    .f1-meta-box { width: 12%; text-align: center; font-weight: 700; font-size: 10px; }
    .f1-mgmt-side { width: 8%; text-align: center; background: #fafafa; }
    .f1-mgmt-head { text-align: center; font-weight: 700; font-size: 9px; background: #f3f3f3; }
    .f1-mgmt-sub { text-align: center; font-size: 8px; font-weight: 600; width: 23%; }
    .f1-mgmt-body { padding: 0 !important; vertical-align: top; }
    .f1-inner { width: 100%; border-collapse: collapse; }
    .f1-inner td { border: none; border-bottom: 1px solid #ccc; padding: 2px 4px; font-size: 9.5px; width: 50%; }
    .f1-inner tr:last-child td { border-bottom: none; }
    .f1-contact-label { font-size: 8px; font-weight: 600; background: #fafafa; }
    .f1-contact-value { font-size: 10px; font-weight: 700; }
    .f1-note { font-size: 7.5px; margin: 3px 0 4px; font-style: italic; }
    .f1-mark-line { font-size: 9px; margin: 4px 0 3px; line-height: 1.3; }
    .f1-fill { font-weight: 700; text-decoration: underline; }
    .f1-side-label { width: 12%; text-align: center; background: #fafafa; }
    .f1-product-val { font-size: 10.5px; font-weight: 700; text-transform: uppercase; }
    .f1-std-wrap { padding: 0 !important; }
    .f1-std { width: 100%; border-collapse: collapse; }
    .f1-std td { border: none; border-right: 1px solid #111; vertical-align: top; }
    .f1-std td:last-child { border-right: none; }
    .f1-is-meta { width: 28%; font-size: 9px; line-height: 1.4; padding: 3px 5px !important; }
    .f1-grades { width: 72%; padding: 0 !important; }
    .f1-grades-head { text-align: center; font-weight: 700; font-size: 9px; border-bottom: 1px solid #111; padding: 2px; background: #f3f3f3; }
    .f1-grades-body { padding: 3px 5px; font-size: 8.5px; line-height: 1.3; white-space: pre-wrap; }
    .f1-cap-title { width: 34%; font-size: 8px; font-weight: 700; line-height: 1.2; }
    .f1-cap-cell { width: 22%; }
    .f1-licenses-body { margin-top: 2px; font-size: 9px; min-height: 12px; }
    .f1-declaration p { margin: 0 0 4px; font-size: 8px; text-align: justify; line-height: 1.3; }
    .f1-declaration p:last-child { margin-bottom: 0; }
    .f1-seal { width: 34%; }
    .f1-seal-box { width: 20mm; height: 20mm; border: 1px solid #111; margin-top: 3px; }
    .f1-sign-fields { font-size: 9px; }
    .f1-sign-line { margin: 4px 0; }
    .f1-important { font-size: 8px; margin: 3px 0 0; font-weight: 600; }
    @media print {
      html, body { overflow: hidden !important; }
      .doc-page {
        height: ${pageSize.heightMm}mm;
        max-height: ${pageSize.heightMm}mm;
        overflow: hidden;
      }
      .f1-sheet.print-sheet,
      .print-sheet.f1-sheet {
        height: auto !important;
        min-height: 0 !important;
        max-height: ${sheetHeight};
        overflow: hidden;
      }
    }
  `;
}

/** Scale Form-1 body to fit one paper page when content overflows. */
function fitToPageScript(): string {
  return `<script>(function(){
  function fit(){
    var sheet = document.querySelector(".f1-sheet");
    var body = sheet && sheet.querySelector(".f1-fit-body");
    if(!sheet || !body) return;
    body.style.transform = "";
    body.style.width = "";
    var ind = sheet.querySelector(".print-sheet-page-indicator");
    var reserve = (ind ? ind.offsetHeight : 12) + 6;
    var page = document.querySelector(".doc-page");
    if(!page) return;
    var cs = getComputedStyle(page);
    var padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    var avail = page.clientHeight - padY - reserve;
    if(avail < 40) return;
    var needed = body.scrollHeight;
    if(needed > avail + 1){
      var scale = Math.max(0.45, avail / needed);
      body.style.transformOrigin = "top left";
      body.style.transform = "scale(" + scale + ")";
      body.style.width = (100 / scale) + "%";
    }
  }
  function run(){
    fit();
    requestAnimationFrame(fit);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  window.addEventListener("load", run);
  window.addEventListener("resize", run);
  window.addEventListener("beforeprint", run);
  if(typeof ResizeObserver !== "undefined" && document.querySelector(".doc-page")){
    new ResizeObserver(run).observe(document.querySelector(".doc-page"));
  }
})();</script>`;
}

export function buildBisForm1Html(
  data: BisForm1Data,
  settings: PrintSettings = defaultBisForm1PrintSettings(),
): string {
  const bodyHtml = `
${buildFormBody(data)}
${fitToPageScript()}
`;

  return buildPrintDocument({
    title: "BIS Form 1 — Application for Licence",
    bodyHtml,
    settings: { ...settings, show_letterhead: false, show_page_numbers: false },
    company: buildBisForm1Company(data),
    extraStyles: formStyles(settings),
  });
}

export function openBisForm1Preview(data: BisForm1Data): void {
  const settings = defaultBisForm1PrintSettings();
  const company = buildBisForm1Company(data);
  openPrintPreview({
    buildDoc: (s) =>
      buildBisForm1Html(data, {
        ...settings,
        ...s,
        show_letterhead: false,
        show_page_numbers: false,
      }),
    initialSettings: settings,
    company,
    pageCount: 1,
  });
}
