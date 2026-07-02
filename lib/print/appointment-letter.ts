import { buildPrintDocument } from "@/lib/print/engine";

import {

  buildManufacturingScopeCompany,

  defaultDeclarationPrintSettings,

  iframeSizeForPrintSettings,

  type ManufacturingScopeDeclarationData,

} from "@/lib/print/manufacturing-scope-declaration";

import type { PrintSettings } from "@/lib/print/types";
import { formatDisplayDate, parseToDate } from "@/lib/format-date";
import { buildRightAlignedSignatoryBlockHtml } from "@/lib/print/signatory-signature";
import {
  resolvePrimaryTopManagementPerson,
  type TopManagementStored,
} from "@/lib/top-management";



export type AppointmentLetterData = Omit<

  ManufacturingScopeDeclarationData,

  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"

> & {

  person_name: string;

  designation: string;

  educational_qualification: string;

  experience_years: string;

  appointment_date: string;

  reference_no: string;

  signatory_name: string;

  signatory_designation: string;

};



function esc(s: string): string {

  return String(s ?? "")

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;");

}



function formatDate(dateStr: string): string {

  const raw = (dateStr ?? "").trim();

  if (!raw) return "_______________________";

  if (!parseToDate(raw)) return esc(raw);

  return formatDisplayDate(raw);

}



function qualificationPhrase(data: AppointmentLetterData): string {

  const qual = data.educational_qualification.trim();

  const exp = data.experience_years.trim();

  if (qual && exp) {

    return `who holds <strong>${esc(qual)}</strong> and possesses approximately <strong>${esc(exp)}</strong> year${exp === "1" ? "" : "s"} of relevant experience`;

  }

  if (qual) {

    return `who holds <strong>${esc(qual)}</strong>`;

  }

  if (exp) {

    return `who possesses approximately <strong>${esc(exp)}</strong> year${exp === "1" ? "" : "s"} of relevant experience`;

  }

  return "who is suitably qualified and experienced";

}



export function defaultAppointmentLetterDraft(
  letterData: Omit<
    ManufacturingScopeDeclarationData,
    "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
  >,
  person: {
    person_name: string;
    designation: string;
    educational_qualification: string;
    experience_years: string;
  },
  topManagement: TopManagementStored[] = [],
): AppointmentLetterData {
  const primary = resolvePrimaryTopManagementPerson(topManagement);
  return {
    ...letterData,
    person_name: person.person_name,
    designation: person.designation,
    educational_qualification: person.educational_qualification,
    experience_years: person.experience_years,
    appointment_date: new Date().toISOString().split("T")[0] ?? "",
    reference_no: "",
    signatory_name: primary.person_name || letterData.contactPerson || "",
    signatory_designation: primary.designation || "",
  };
}



function salutation(data: AppointmentLetterData): string {
  const name = data.person_name.trim();
  if (!name) return "Dear Sir/Madam,";
  return `Dear ${esc(name)},`;
}

function buildSignatoryBlock(data: AppointmentLetterData): string {
  const sigName =
    esc(data.signatory_name.trim()) || esc(data.contactPerson) || "—";
  const sigDesig = esc(data.signatory_designation.trim()) || "—";

  return buildRightAlignedSignatoryBlockHtml({
    companyName: esc(data.companyName),
    sigName,
    sigDesig,
    signatureImageUrl: data.signatureImageUrl,
  });
}

function buildAppointmentLetterBody(data: AppointmentLetterData): string {
  const personName = esc(data.person_name.trim() || "_______________________");
  const designation = esc(data.designation.trim() || "Technical Staff");
  const qualPhrase = qualificationPhrase(data);
  const factoryLine = data.address.trim()
    ? `, having its registered office / manufacturing unit at <strong>${esc(data.address.trim())}</strong>`
    : "";

  return `
<div style="text-align:center;margin-bottom:24px;">
  <div style="font-size:17px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">
    Appointment Letter
  </div>
  ${data.reference_no.trim() ? `<div style="margin-top:8px;font-size:11px;color:#64748b;">Ref. No.: ${esc(data.reference_no.trim())}</div>` : ""}
</div>

<div style="font-size:12px;line-height:1.75;text-align:justify;">
  <p style="margin:0 0 18px;line-height:1.65;">
    To,<br/>
    <strong>${personName}</strong><br/>
    ${designation}
  </p>

  <p style="margin:0 0 18px;">
    <strong>Subject:</strong> Appointment as ${designation}
  </p>

  <p style="margin:0 0 18px;">${salutation(data)}</p>

  <p style="margin:0 0 16px;">
    We are pleased to inform you that <strong>M/s. ${esc(data.companyName)}</strong>${factoryLine},
    has appointed you to the position of <strong>${designation}</strong>, with effect from
    <strong>${formatDate(data.appointment_date)}</strong>.
  </p>

  <p style="margin:0 0 16px;">
    You ${qualPhrase}. Based on your credentials, the Management is confident that you will
    discharge your responsibilities with competence and integrity.
  </p>

  <p style="margin:0 0 8px;"><strong>Your duties and responsibilities shall include, inter alia:</strong></p>
  <ul style="margin:0 0 16px;padding-left:22px;line-height:1.7;">
    <li style="margin-bottom:6px;">Ensuring adherence to applicable quality standards, process controls, and internal procedures of the unit;</li>
    <li style="margin-bottom:6px;">Maintaining technical records, documentation, and correspondence in proper order;</li>
    <li style="margin-bottom:6px;">Assisting the Management in matters relating to certification, inspection, and liaison with concerned authorities; and</li>
    <li>Performing such other duties as may be assigned to you from time to time by the Management.</li>
  </ul>

  <p style="margin:0 0 16px;">
    You shall report to the Management and conduct yourself in accordance with the rules, policies,
    and instructions of the Company. You are expected to devote your full attention to the duties
    entrusted to you and to act in the best interests of the organisation at all times.
  </p>

  <p style="margin:0 0 16px;">
    Your remuneration, leave, and other terms and conditions of service shall be as mutually agreed
    and communicated to you separately, unless otherwise specified in writing by the Company.
  </p>

  <p style="margin:0 0 16px;">
    This appointment shall continue unless terminated or modified by the Management through written
    intimation. Either party may terminate this arrangement in accordance with the applicable policy
    or applicable law, as the case may be.
  </p>

  <p style="margin:0 0 16px;">
    We welcome you to our organisation and look forward to a long and mutually rewarding association.
  </p>

  <p style="margin:0 0 4px;">Thanking you,</p>
  <p style="margin:0 0 0;">Yours faithfully,</p>

  ${buildSignatoryBlock(data)}
</div>`;
}



export function defaultAppointmentLetterPrintSettings(): PrintSettings {

  return defaultDeclarationPrintSettings();

}



export function buildAppointmentLetterHtml(

  data: AppointmentLetterData,

  settings: PrintSettings,

): string {

  return buildPrintDocument({

    title: "Appointment Letter",

    bodyHtml: buildAppointmentLetterBody(data),

    settings,

    company: buildManufacturingScopeCompany({

      ...data,

      licenseScope: "",

    }),

  });

}



export { iframeSizeForPrintSettings };


