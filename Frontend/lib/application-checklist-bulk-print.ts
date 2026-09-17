"use client";

import type { LicenseScopeFormat, LicenseScopeTableRow } from "@backend/modules/bis/application-checklist-notes";
import { formatApplicationNumberDisplay } from "@backend/modules/bis/application-checklist-notes";
import {
  documentHasContent as authorizationLetterHasContent,
  type AuthorizationLetterStored,
} from "@backend/modules/bis/authorization-letter";
import {
  rowHasContent as certifiedReferenceMaterialRowHasContent,
  type CertifiedReferenceMaterialStored,
} from "@backend/modules/bis/certified-reference-materials";
import {
  rowHasContent as cmpf305RowHasContent,
  type Cmpf305MachineryStored,
} from "@backend/modules/bis/cmpf-305";
import {
  documentHasContent as cmpf306HasContent,
  type Cmpf306Stored,
} from "@backend/modules/bis/cmpf-306";
import {
  documentHasContent as cmpf307HasContent,
  type Cmpf307Stored,
} from "@backend/modules/bis/cmpf-307";
import {
  documentHasContent as cmpf310HasContent,
  type Cmpf310Stored,
} from "@backend/modules/bis/cmpf-310";
import {
  documentHasContent as cmpf311HasContent,
  type Cmpf311Stored,
} from "@backend/modules/bis/cmpf-311";
import { resolveSampleOfferLetterDate } from "@backend/modules/bis/sample-offer-letter-date";
import {
  ftrReportHasContent,
  syncFactoryTestReportsFromSamples,
  type FactoryTestReportStored,
  type FtrContext,
} from "@backend/modules/bis/factory-test-report";
import {
  serializeLicenseScopeText,
  storedRowsToEditorRows,
} from "@backend/modules/bis/license-scope-format";
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  documentHasContent as locationMapHasContent,
  locationMapHasValidRoute,
  type LocationMapStored,
} from "@backend/modules/bis/location-map";
import {
  rowHasContent as oslSampleRowHasContent,
  type OslSampleRequirementStored,
} from "@backend/modules/bis/osl-sample-requirements";
import {
  documentHasContent as plantLayoutHasContent,
  type PlantLayoutStored,
} from "@backend/modules/bis/plant-layout";
import {
  documentHasContent as processDescriptionHasContent,
  type ProcessDescriptionStored,
} from "@backend/modules/bis/process-description";
import {
  documentHasContent as processFlowChartHasContent,
  type ProcessFlowChartStored,
} from "@backend/modules/bis/process-flow-chart";
import {
  rowHasContent as rawMaterialRowHasContent,
  type RawMaterialStored,
} from "@backend/modules/bis/raw-material-details";
import {
  buildSefBrandRows,
  buildSefQcStaffRows,
  buildSefRawMaterialRows,
  documentHasContent as selfEvaluationFormHasContent,
  resolveSelfEvaluationPackagingMarking,
  type SelfEvaluationFormStored,
} from "@backend/modules/bis/self-evaluation-form";
import {
  findQualityControlIncharge,
  resolveQualityControlIncharge,
  rowHasContent as technicalStaffRowHasContent,
  type TechnicalStaffStored,
} from "@backend/modules/bis/technical-staff";
import {
  resolvePrimaryTopManagementPerson,
  rowHasContent as topManagementRowHasContent,
  withDocumentSignatureImage,
  type TopManagementStored,
} from "@backend/modules/bis/top-management";
import {
  documentHasContent as undertakingGeneralIssHasContent,
  type UndertakingGeneralIssStored,
} from "@backend/modules/bis/undertaking-general-iss";
import {
  documentHasContent as undertakingLongDurationTestHasContent,
  type UndertakingLongDurationTestStored,
} from "@backend/modules/bis/undertaking-long-duration-test";
import {
  documentHasContent as undertakingMinimumMarkingFeeHasContent,
  type UndertakingMinimumMarkingFeeStored,
} from "@backend/modules/bis/undertaking-minimum-marking-fee";
import {
  documentHasContent as undertakingOption2HasContent,
  type UndertakingOption2Stored,
} from "@backend/modules/bis/undertaking-option-2";
import {
  documentHasContent as updatedSchemeOfInspectionHasContent,
  type UpdatedSchemeOfInspectionStored,
} from "@backend/modules/bis/updated-scheme-of-inspection";
import {
  buildAuthorizationLetterHtml,
  defaultAuthorizationLetterPrintSettings,
} from "@backend/modules/print/authorization-letter";
import {
  buildBisForm1Html,
  defaultBisForm1PrintSettings,
  type BisForm1Data,
} from "@backend/modules/print/bis-form-1";
import {
  buildCertifiedReferenceMaterialsHtml,
  defaultCertifiedReferenceMaterialsPrintSettings,
} from "@backend/modules/print/certified-reference-materials";
import {
  buildCmpf305Html,
  defaultCmpf305PrintSettings,
} from "@backend/modules/print/cmpf-305";
import {
  buildCmpf306Html,
  defaultCmpf306PrintSettings,
} from "@backend/modules/print/cmpf-306";
import {
  buildCmpf307Html,
  defaultCmpf307PrintSettings,
} from "@backend/modules/print/cmpf-307";
import {
  buildCmpf310Html,
  defaultCmpf310PrintSettings,
} from "@backend/modules/print/cmpf-310";
import {
  buildCmpf311Html,
  defaultCmpf311PrintSettings,
} from "@backend/modules/print/cmpf-311";
import {
  buildFactoryTestReportHtml,
  defaultFactoryTestReportPrintSettings,
} from "@backend/modules/print/factory-test-report";
import { loadCompanyPrintContext } from "@backend/modules/print/load-company-print-context";
import {
  buildLocationMapHtml,
  defaultLocationMapPrintSettings,
} from "@backend/modules/print/location-map";
import {
  buildManufacturingScopeDeclarationHtml,
  defaultManufacturingScopePrintSettings,
  type ManufacturingScopeDeclarationData,
  type ManufacturingScopePrintAssets,
} from "@backend/modules/print/manufacturing-scope-declaration";
import {
  buildOslSampleRequirementsHtml,
  DEFAULT_OSL_SAMPLE_TABLE_COLUMNS,
  defaultOslSamplePrintSettings,
} from "@backend/modules/print/osl-sample-requirements";
import {
  buildPlantLayoutHtml,
  defaultPlantLayoutPrintSettings,
} from "@backend/modules/print/plant-layout";
import {
  buildProcessDescriptionHtml,
  defaultProcessDescriptionPrintSettings,
} from "@backend/modules/print/process-description";
import {
  buildProcessFlowChartHtml,
  defaultProcessFlowChartPrintSettings,
} from "@backend/modules/print/process-flow-chart";
import {
  buildRawMaterialDetailsHtml,
  defaultRawMaterialDetailsPrintSettings,
} from "@backend/modules/print/raw-material-details";
import {
  buildSelfEvaluationFormHtml,
  defaultSelfEvaluationFormPrintSettings,
} from "@backend/modules/print/self-evaluation-form";
import {
  buildTechnicalStaffHtml,
  defaultTechnicalStaffPrintSettings,
} from "@backend/modules/print/technical-staff";
import {
  buildTopManagementHtml,
  DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS,
  defaultTopManagementPrintSettings,
} from "@backend/modules/print/top-management";
import type { PrintSettings } from "@backend/modules/print/types";
import {
  buildUndertakingGeneralIssHtml,
  defaultUndertakingGeneralIssPrintSettings,
} from "@backend/modules/print/undertaking-general-iss";
import {
  buildUndertakingLongDurationTestHtml,
  defaultUndertakingLongDurationTestPrintSettings,
} from "@backend/modules/print/undertaking-long-duration-test";
import {
  buildUndertakingMinimumMarkingFeeHtml,
  defaultUndertakingMinimumMarkingFeePrintSettings,
} from "@backend/modules/print/undertaking-minimum-marking-fee";
import {
  buildUndertakingOption2Html,
  defaultUndertakingOption2PrintSettings,
} from "@backend/modules/print/undertaking-option-2";
import {
  buildUpdatedSchemeOfInspectionHtml,
  defaultUpdatedSchemeOfInspectionPrintSettings,
} from "@backend/modules/print/updated-scheme-of-inspection";

import { safePdfFilenamePart } from "@/lib/download-print-pdf";
import {
  mapPageSizeToPlaywrightFormat,
  renderPdfViaPlaywright,
  triggerPdfDownload,
} from "@/lib/playwright-pdf-client";
import {
  rowHasContent as legalDocumentRowHasContent,
  type LegalDocumentStored,
} from "@backend/modules/bis/legal-documents";
import { fileNameFromStoredDocumentRef } from "@backend/modules/storage/cmpf-306-documents";
import { PDFDocument } from "pdf-lib";

/** Order matches Application Form document shortcuts (print / binding sequence). */
export const APPLICATION_CHECKLIST_PRINT_DOCS = [
  { id: "application_copy", label: "Application Copy" },
  { id: "license_scope", label: "Undertaking for License Scope" },
  { id: "osl_sample_requirements", label: "Sample for Out Side Lab" },
  { id: "top_management", label: "Top Management Details" },
  { id: "technical_staff", label: "Technical Staff Details" },
  { id: "location_map", label: "Location Map" },
  { id: "plant_layout", label: "Plant Layout" },
  { id: "process_flow_chart", label: "Process Flow Chart" },
  { id: "process_description", label: "Process Description" },
  { id: "cmpf_305", label: "List of Plant & Machinery" },
  { id: "cmpf_306", label: "List of Testing Equipments" },
  { id: "cmpf_307", label: "Brand Name Declaration" },
  { id: "cmpf_310", label: "Acceptance of Marking Fee" },
  { id: "cmpf_311", label: "Acceptance of SIT" },
  { id: "raw_material_details", label: "Undertaking For Raw Material" },
  { id: "certified_reference_materials", label: "List of Certified Reference Material" },
  { id: "undertaking_option_2", label: "Undertaking for Simplified Procedure" },
  { id: "undertaking_general_iss", label: "Undertaking for General ISS" },
  { id: "self_evaluation_form", label: "Self Evaluation Form" },
  { id: "authorization_letter", label: "Authorization Letter" },
  { id: "pi_sample_requirements", label: "Sample Offer for Inspection" },
  { id: "factory_test_reports", label: "Factory Test Reports" },
  { id: "updated_scheme_of_inspection", label: "Updated SIT" },
  { id: "undertaking_long_duration_test", label: "Undertaking for Long Duration Test" },
  { id: "undertaking_minimum_marking_fee", label: "Undertaking for MMF - AIF" },
] as const;

export type ChecklistPrintDocId = (typeof APPLICATION_CHECKLIST_PRINT_DOCS)[number]["id"];

/** Maps bulk-print document ids to Application Form modal `openDoc` keys. */
export const CHECKLIST_PRINT_DOC_EDIT_KEYS: Record<ChecklistPrintDocId, string> = {
  application_copy: "application-details",
  top_management: "top-management",
  technical_staff: "technical-staff",
  location_map: "location-map",
  plant_layout: "plant-layout",
  process_flow_chart: "process-flow-chart",
  process_description: "process-description",
  license_scope: "license-scope",
  osl_sample_requirements: "osl-sample",
  cmpf_305: "cmpf-305",
  cmpf_306: "cmpf-306",
  cmpf_307: "cmpf-307",
  cmpf_310: "cmpf-310",
  cmpf_311: "cmpf-311",
  raw_material_details: "raw-material",
  certified_reference_materials: "certified-reference-materials",
  undertaking_option_2: "undertaking-option-2",
  undertaking_general_iss: "undertaking-general-iss",
  self_evaluation_form: "self-evaluation",
  authorization_letter: "authorization-letter",
  pi_sample_requirements: "pi-sample",
  factory_test_reports: "factory-test-report",
  updated_scheme_of_inspection: "updated-sit",
  undertaking_long_duration_test: "undertaking-long-duration",
  undertaking_minimum_marking_fee: "undertaking-mmf",
};

export type ChecklistBulkPrintLetterData = Omit<
  ManufacturingScopeDeclarationData,
  "licenseScope" | "licenseScopeFormat" | "licenseScopeRows"
>;

export type ChecklistBulkPrintContext = {
  letterData: ChecklistBulkPrintLetterData;
  topManagement: TopManagementStored[];
  technicalStaff: TechnicalStaffStored[];
  factoryTestReports: FactoryTestReportStored[];
  oslSampleRequirements: OslSampleRequirementStored[];
  piSampleRequirements: OslSampleRequirementStored[];
  licenseScope: string;
  licenseScopeFormat: LicenseScopeFormat;
  licenseScopeRows: LicenseScopeTableRow[];
  cmpf305Machinery: Cmpf305MachineryStored[];
  cmpf306: Cmpf306Stored;
  cmpf307: Cmpf307Stored;
  cmpf310: Cmpf310Stored;
  cmpf311: Cmpf311Stored;
  rawMaterialDetails: RawMaterialStored[];
  certifiedReferenceMaterials: CertifiedReferenceMaterialStored[];
  undertakingOption2: UndertakingOption2Stored;
  undertakingGeneralIss: UndertakingGeneralIssStored;
  authorizationLetter: AuthorizationLetterStored;
  undertakingLongDurationTest: UndertakingLongDurationTestStored;
  undertakingMinimumMarkingFee: UndertakingMinimumMarkingFeeStored;
  locationMap: LocationMapStored;
  plantLayout: PlantLayoutStored;
  processFlowChart: ProcessFlowChartStored;
  processDescription: ProcessDescriptionStored;
  updatedSchemeOfInspection: UpdatedSchemeOfInspectionStored;
  selfEvaluationForm: SelfEvaluationFormStored;
  /** Application Details → Legal Documents attachments. */
  legalDocuments: LegalDocumentStored[];
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  applicationStage?: string | null;
  markingClause: string;
  packagingClause?: string;
  weeklyOff?: string[];
  inspectionOfficerName: string;
  inspectionOfficerDesignation: string;
  licenceNumber?: string;
  /** Firm scale for BIS Form 1 (Application Copy). */
  firmScale?: string;
  /** Sector / company type for BIS Form 1 (Application Copy). */
  sector?: string;
  printAssets?: ManufacturingScopePrintAssets;
};

export type ChecklistBulkListRow =
  | {
      kind: "print";
      id: ChecklistPrintDocId;
      rowKey: ChecklistPrintDocId;
      label: string;
      hasContent: boolean;
      editKey: string;
    }
  | {
      kind: "attachment";
      id: string;
      rowKey: string;
      label: string;
      hasContent: boolean;
      editKey: string;
      documentRef: string;
      attachmentGroup:
        | "legal_document"
        | "cmpf306_calibration"
        | "cmpf306_consent"
        | "qci_appointment_letter"
        | "qci_education_certificate"
        | "qci_photo";
    };

function attachmentFileLabel(ref: string, fallback: string): string {
  const name = fileNameFromStoredDocumentRef(ref).trim();
  return name && name !== "Document" ? name : fallback;
}

/**
 * Full bulk-print grid: checklist print modules (Application Form shortcut order)
 * + Application Details attachments (after Sample for OSL / Application Details slot)
 * + QCI Appointment Letter / Education Certificate / Photo (after Technical Staff)
 * + CMPF-306 Calibration Certificates / Consent Letters (right after CMPF 306).
 */
export function buildChecklistBulkListRows(
  ctx: ChecklistBulkPrintContext,
): ChecklistBulkListRow[] {
  const rows: ChecklistBulkListRow[] = [];

  function pushQciAttachmentRows() {
    const qci = findQualityControlIncharge(ctx.technicalStaff);

    const slots: {
      group: Extract<
        ChecklistBulkListRow,
        { kind: "attachment" }
      >["attachmentGroup"];
      label: string;
      ref: string;
    }[] = [
      {
        group: "qci_appointment_letter",
        label: "QCI Appointment Letter",
        ref: qci?.appointment_letter.trim() ?? "",
      },
      {
        group: "qci_education_certificate",
        label: "QCI Education Certificate",
        ref: qci?.educational_certificate.trim() ?? "",
      },
      {
        group: "qci_photo",
        label: "QCI Photo",
        ref: qci?.photo.trim() ?? "",
      },
    ];

    for (const slot of slots) {
      const hasFile = Boolean(slot.ref);
      rows.push({
        kind: "attachment",
        id: `${slot.group}:${hasFile ? "0" : "empty"}`,
        rowKey: `${slot.group}:${hasFile ? "0" : "empty"}`,
        label: slot.label,
        hasContent: hasFile,
        editKey: "technical-staff",
        documentRef: slot.ref,
        attachmentGroup: slot.group,
      });
    }
  }

  function pushLegalDocumentRows() {
    const legalDocs = (ctx.legalDocuments ?? []).filter(legalDocumentRowHasContent);
    if (legalDocs.length === 0) {
      rows.push({
        kind: "attachment",
        id: "legal_document:empty",
        rowKey: "legal_document:empty",
        label: "Legal Documents",
        hasContent: false,
        editKey: "application-details",
        documentRef: "",
        attachmentGroup: "legal_document",
      });
      return;
    }
    legalDocs.forEach((doc, index) => {
      const desc =
        doc.description.trim() ||
        attachmentFileLabel(doc.document_ref, `Document ${index + 1}`);
      rows.push({
        kind: "attachment",
        id: `legal_document:${index}`,
        rowKey: `legal_document:${index}`,
        label: desc,
        hasContent: Boolean(doc.document_ref.trim()),
        editKey: "application-details",
        documentRef: doc.document_ref,
        attachmentGroup: "legal_document",
      });
    });
  }

  function pushCmpf306AttachmentRows() {
    const calibrations = (ctx.cmpf306.calibration_certificates ?? []).filter((r) => r.trim());
    calibrations.forEach((ref, index) => {
      rows.push({
        kind: "attachment",
        id: `cmpf306_calibration:${index}`,
        rowKey: `cmpf306_calibration:${index}`,
        label:
          calibrations.length === 1
            ? "Calibration Certificates"
            : `Calibration Certificates ${index + 1}`,
        hasContent: true,
        editKey: "cmpf-306",
        documentRef: ref,
        attachmentGroup: "cmpf306_calibration",
      });
    });
    if (calibrations.length === 0) {
      rows.push({
        kind: "attachment",
        id: "cmpf306_calibration:empty",
        rowKey: "cmpf306_calibration:empty",
        label: "Calibration Certificates",
        hasContent: false,
        editKey: "cmpf-306",
        documentRef: "",
        attachmentGroup: "cmpf306_calibration",
      });
    }

    const consents = (ctx.cmpf306.consent_letters ?? []).filter((r) => r.trim());
    consents.forEach((ref, index) => {
      rows.push({
        kind: "attachment",
        id: `cmpf306_consent:${index}`,
        rowKey: `cmpf306_consent:${index}`,
        label:
          consents.length === 1
            ? "Consent Letter"
            : `Consent Letter ${index + 1}`,
        hasContent: true,
        editKey: "cmpf-306",
        documentRef: ref,
        attachmentGroup: "cmpf306_consent",
      });
    });
    if (consents.length === 0) {
      rows.push({
        kind: "attachment",
        id: "cmpf306_consent:empty",
        rowKey: "cmpf306_consent:empty",
        label: "Consent Letter",
        hasContent: false,
        editKey: "cmpf-306",
        documentRef: "",
        attachmentGroup: "cmpf306_consent",
      });
    }
  }

  for (const doc of APPLICATION_CHECKLIST_PRINT_DOCS) {
    rows.push({
      kind: "print",
      id: doc.id,
      rowKey: doc.id,
      label: doc.label,
      hasContent: checklistPrintDocHasContent(doc.id, ctx),
      editKey: CHECKLIST_PRINT_DOC_EDIT_KEYS[doc.id],
    });

    // Application Details slot sits after Sample for OSL in the Application Form grid.
    if (doc.id === "osl_sample_requirements") {
      pushLegalDocumentRows();
    }

    if (doc.id === "technical_staff") {
      pushQciAttachmentRows();
    }

    if (doc.id === "cmpf_306") {
      pushCmpf306AttachmentRows();
    }
  }

  return rows;
}

export async function resolveChecklistAttachmentUrl(documentRef: string): Promise<string> {
  const { createClient } = await import("@backend/db/client/client");
  const { resolveDocumentRef } = await import(
    "@backend/modules/storage/technical-staff-documents"
  );
  const url = await resolveDocumentRef(createClient(), documentRef);
  if (!url) throw new Error("Unable to open attachment. File may be missing.");
  return url;
}

export async function openChecklistAttachmentView(documentRef: string): Promise<void> {
  const url = await resolveChecklistAttachmentUrl(documentRef);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) throw new Error("Unable to open preview. Please allow pop-ups and try again.");
}

export async function openChecklistAttachmentPrint(documentRef: string): Promise<void> {
  const url = await resolveChecklistAttachmentUrl(documentRef);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) throw new Error("Unable to open print window. Please allow pop-ups and try again.");
  // Give the viewer a moment to load before print (PDF / image).
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      // Viewer may block print until fully loaded — user can print manually.
    }
  }, 800);
}

export async function downloadChecklistAttachmentPdf(documentRef: string, label: string): Promise<void> {
  const url = await resolveChecklistAttachmentUrl(documentRef);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Unable to download attachment.");
  const blob = await res.blob();
  const safe = label.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 80) || "Attachment";
  const pathName = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return "";
    }
  })();
  const extMatch = /\.([a-zA-Z0-9]{2,5})(?:\?|$)/.exec(pathName);
  const ext = extMatch?.[1]?.toLowerCase() ?? (blob.type.includes("pdf") ? "pdf" : "bin");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safe}.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function withBulkLetterhead(settings: PrintSettings): PrintSettings {
  return {
    ...settings,
    show_letterhead: true,
    letterhead_layout: "logo-na",
  };
}

function resolveFirmRep(ctx: ChecklistBulkPrintContext): {
  firmRepName: string;
  firmRepDesignation: string;
} {
  const primary = resolvePrimaryTopManagementPerson(ctx.topManagement);
  return {
    firmRepName: primary.person_name || ctx.letterData.contactPerson?.trim() || "",
    firmRepDesignation: primary.designation,
  };
}

function resolveSignatory(ctx: ChecklistBulkPrintContext): {
  signatoryName: string;
  signatoryDesignation: string;
} {
  const primary = resolvePrimaryTopManagementPerson(ctx.topManagement);
  return {
    signatoryName: primary.person_name || ctx.letterData.contactPerson?.trim() || "",
    signatoryDesignation: primary.designation,
  };
}

function licenseScopeHasContent(ctx: ChecklistBulkPrintContext): boolean {
  const text = serializeLicenseScopeText(
    ctx.licenseScopeFormat,
    ctx.licenseScope,
    storedRowsToEditorRows(ctx.licenseScopeRows),
  );
  return text.trim().length > 0;
}

export function checklistPrintDocHasContent(
  id: ChecklistPrintDocId,
  ctx: ChecklistBulkPrintContext,
): boolean {
  switch (id) {
    case "application_copy":
      return Boolean(
        ctx.letterData.companyName.trim() ||
          ctx.applicationNumber.trim() ||
          ctx.topManagement.some(topManagementRowHasContent) ||
          ctx.technicalStaff.some(technicalStaffRowHasContent) ||
          licenseScopeHasContent(ctx),
      );
    case "top_management":
      return ctx.topManagement.some(topManagementRowHasContent);
    case "technical_staff":
      return ctx.technicalStaff.some(technicalStaffRowHasContent);
    case "location_map":
      return locationMapHasContent(ctx.locationMap);
    case "plant_layout":
      return plantLayoutHasContent(ctx.plantLayout);
    case "process_flow_chart":
      return processFlowChartHasContent(ctx.processFlowChart);
    case "process_description":
      return processDescriptionHasContent(ctx.processDescription);
    case "license_scope":
      return licenseScopeHasContent(ctx);
    case "osl_sample_requirements":
      return ctx.oslSampleRequirements.some(oslSampleRowHasContent);
    case "cmpf_305":
      return ctx.cmpf305Machinery.some(cmpf305RowHasContent);
    case "cmpf_306":
      return cmpf306HasContent(ctx.cmpf306);
    case "cmpf_307":
      return cmpf307HasContent(ctx.cmpf307);
    case "cmpf_310":
      return cmpf310HasContent(ctx.cmpf310);
    case "cmpf_311":
      return cmpf311HasContent(ctx.cmpf311);
    case "raw_material_details":
      return ctx.rawMaterialDetails.some(rawMaterialRowHasContent);
    case "certified_reference_materials":
      return ctx.certifiedReferenceMaterials.some(certifiedReferenceMaterialRowHasContent);
    case "undertaking_option_2":
      return undertakingOption2HasContent(ctx.undertakingOption2);
    case "undertaking_general_iss":
      return undertakingGeneralIssHasContent(ctx.undertakingGeneralIss);
    case "self_evaluation_form":
      return selfEvaluationFormHasContent(ctx.selfEvaluationForm);
    case "authorization_letter":
      return authorizationLetterHasContent(ctx.authorizationLetter);
    case "pi_sample_requirements":
      return ctx.piSampleRequirements.some(oslSampleRowHasContent);
    case "factory_test_reports":
      return (
        ctx.factoryTestReports.some(ftrReportHasContent) ||
        ctx.oslSampleRequirements.some(oslSampleRowHasContent) ||
        ctx.piSampleRequirements.some(oslSampleRowHasContent)
      );
    case "updated_scheme_of_inspection":
      return updatedSchemeOfInspectionHasContent(ctx.updatedSchemeOfInspection);
    case "undertaking_long_duration_test":
      return undertakingLongDurationTestHasContent(ctx.undertakingLongDurationTest);
    case "undertaking_minimum_marking_fee":
      return undertakingMinimumMarkingFeeHasContent(ctx.undertakingMinimumMarkingFee);
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function extractHtmlParts(html: string): { styles: string; body: string } {
  const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const styles = styleMatches.map((m) => m[1] ?? "").join("\n");
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = (bodyMatch?.[1] ?? html).trim();
  return { styles, body };
}

/**
 * Scope document CSS under a wrapper so fit-page rules like
 * `html, body { overflow:hidden; max-height:297mm }` cannot clip the combined pack.
 */
function scopeDocumentCss(css: string, scopeSelector: string): string {
  // Drop per-doc @page — one shared A4 @page is enough for the combined pack.
  let cleaned = css.replace(/@page\b[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/gi, "");

  cleaned = cleaned.replace(/(^|})\s*([^@}{][^{]*)\{/g, (match, brace: string, selectors: string) => {
    const scoped = selectors
      .split(",")
      .map((raw) => {
        const sel = raw.trim();
        if (!sel) return sel;
        if (/^(html|body)$/i.test(sel)) return scopeSelector;
        if (/^html\s*,\s*body$/i.test(sel) || /^body\s*,\s*html$/i.test(sel)) {
          return scopeSelector;
        }
        if (/^html\s+body$/i.test(sel)) return scopeSelector;
        if (/^(html|body)\b/i.test(sel)) {
          return sel.replace(/^(html|body)\b/i, scopeSelector);
        }
        return `${scopeSelector} ${sel}`;
      })
      .filter(Boolean)
      .join(", ");
    return `${brace}\n${scoped} {`;
  });

  return cleaned;
}

function combineChecklistPrintHtml(docs: { id: ChecklistPrintDocId; html: string }[]): string {
  const styleChunks: string[] = [];
  const bodyChunks: string[] = [];

  docs.forEach((doc, index) => {
    const scope = `.bulk-checklist-doc[data-doc-id="${doc.id}"]`;
    const { styles, body } = extractHtmlParts(doc.html);
    if (styles.trim()) styleChunks.push(scopeDocumentCss(styles, scope));
    const pageBreak = index === 0 ? "auto" : "always";
    bodyChunks.push(
      `<div class="bulk-checklist-doc" data-doc-id="${doc.id}" style="page-break-before:${pageBreak};break-before:${
        index === 0 ? "auto" : "page"
      }">${body}</div>`,
    );
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Application Checklist Documents</title>
<style>
html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  overflow: visible !important;
  max-height: none !important;
  height: auto !important;
}
@page { size: A4 portrait; margin: 0; }
.bulk-checklist-doc {
  width: 100%;
  box-sizing: border-box;
  page-break-inside: auto;
}
.bulk-checklist-doc + .bulk-checklist-doc {
  page-break-before: always;
  break-before: page;
}
${styleChunks.join("\n")}
@media print {
  html, body {
    overflow: visible !important;
    max-height: none !important;
    height: auto !important;
  }
  .bulk-checklist-doc + .bulk-checklist-doc {
    page-break-before: always;
    break-before: page;
  }
}
</style>
</head>
<body>
${bodyChunks.join("\n")}
</body>
</html>`;
}

function buildFtrContext(ctx: ChecklistBulkPrintContext): FtrContext {
  const qc = resolveQualityControlIncharge(ctx.technicalStaff);
  const isReference = ctx.letterData.isNumber?.trim() || "—";
  const address = ctx.letterData.address.trim();
  const rawAppNo = ctx.applicationNumber.trim();
  const appNo =
    !rawAppNo || rawAppNo.toUpperCase() === "N/A" || rawAppNo === "—"
      ? ""
      : formatApplicationNumberDisplay(rawAppNo);
  return {
    applicantName: ctx.letterData.companyName,
    applicantAddress: address,
    applicationNumber: appNo,
    licenceNumber: ctx.licenceNumber ?? "",
    productTitle: ctx.letterData.isTitle ?? "",
    isCode: isReference !== "—" ? isReference : "",
    dateOfApplication: ctx.dateOfApplication,
    dateOfInspection: ctx.dateOfInspection,
    inspectionOfficerName: ctx.inspectionOfficerName.trim(),
    inspectionOfficerDesignation: ctx.inspectionOfficerDesignation.trim(),
    qualityControlInchargeName: qc.name,
    qualityControlInchargeDesignation: qc.designation,
  };
}

function resolveFactoryTestReports(ctx: ChecklistBulkPrintContext): FactoryTestReportStored[] {
  const hasSamples =
    ctx.oslSampleRequirements.some(oslSampleRowHasContent) ||
    ctx.piSampleRequirements.some(oslSampleRowHasContent);
  if (!hasSamples) return ctx.factoryTestReports;
  return syncFactoryTestReportsFromSamples({
    oslSamples: ctx.oslSampleRequirements,
    piSamples: ctx.piSampleRequirements,
    existing: ctx.factoryTestReports,
    ctx: buildFtrContext(ctx),
  });
}

function resolveFactoryAddressLine(ctx: ChecklistBulkPrintContext): string {
  const address = ctx.letterData.address.trim();
  const city = ctx.letterData.city.trim();
  if (!address) return city;
  if (!city) return address;
  if (address.toLowerCase().includes(city.toLowerCase())) return address;
  return `${address}, ${city}`;
}

function buildBisForm1DataFromCtx(ctx: ChecklistBulkPrintContext): BisForm1Data {
  const letter = ctx.letterData;
  const street = letter.address.trim();
  const city = letter.city.trim();
  const state = letter.bisBranchState.trim();
  const country = (letter.bisBranchCountry.trim() || "INDIA").toUpperCase();
  const phone = letter.phone.trim();
  const email = letter.email.trim();
  const contactPerson = letter.contactPerson.trim();
  const primary = resolvePrimaryTopManagementPerson(ctx.topManagement);
  const product = letter.isTitle.trim() || letter.isNumber.trim();
  const isNumberRaw = letter.isNumber.trim();
  const isNumber = isNumberRaw
    ? /^is\b/i.test(isNumberRaw)
      ? isNumberRaw
      : `IS ${isNumberRaw}`
    : "";
  const gradesText = serializeLicenseScopeText(
    ctx.licenseScopeFormat,
    ctx.licenseScope,
    storedRowsToEditorRows(ctx.licenseScopeRows),
  );

  return {
    applicationNumber: ctx.applicationNumber.trim(),
    companyName: letter.companyName.trim(),
    officeAddress: street || resolveFactoryAddressLine(ctx),
    factoryAddress: street || resolveFactoryAddressLine(ctx),
    city,
    district: city,
    state,
    country,
    pinCode: "",
    officeTel: phone,
    officeFax: "-",
    officeEmail: email,
    factoryTel: phone ? `Mobile: ${phone}` : "",
    factoryFax: "-",
    factoryEmail: email,
    correspondenceAddress: "Factory",
    scale: (ctx.firmScale ?? "").trim(),
    sector: (ctx.sector ?? "").trim(),
    topManagement: ctx.topManagement
      .filter(topManagementRowHasContent)
      .map((r) => ({
        name: r.person_name.trim(),
        designation: r.designation.trim(),
      })),
    technicalManagement: ctx.technicalStaff
      .filter(technicalStaffRowHasContent)
      .map((r) => ({
        name: r.person_name.trim(),
        designation: r.designation.trim(),
      })),
    contactPersonLine: [contactPerson || primary.person_name, phone]
      .filter(Boolean)
      .join(" "),
    productName: product,
    isNumber,
    isPart: "",
    isSection: "",
    gradesText,
    unitsOfProduction: "0.00",
    quantity: "0.00",
    valueRs: "",
    bisLicensesHeld: (ctx.licenceNumber ?? "").trim(),
    signatoryName: primary.person_name || contactPerson,
    signatoryDesignation: primary.designation,
    dateOfApplication: ctx.dateOfApplication,
  };
}

function buildSingleChecklistDocHtml(
  id: ChecklistPrintDocId,
  ctx: ChecklistBulkPrintContext,
  printAssets: ManufacturingScopePrintAssets,
): string {
  const letter = ctx.letterData;
  const applicationNumber = ctx.applicationNumber || letter.applicationNumber || "";
  const { firmRepName, firmRepDesignation } = resolveFirmRep(ctx);
  const { signatoryName, signatoryDesignation } = resolveSignatory(ctx);
  const topManagement = ctx.topManagement;

  switch (id) {
    case "application_copy":
      return buildBisForm1Html(buildBisForm1DataFromCtx(ctx), defaultBisForm1PrintSettings());
    case "top_management": {
      const settings = withBulkLetterhead(defaultTopManagementPrintSettings());
      const data = {
        ...letter,
        applicationNumber,
        signatoryName,
        signatoryDesignation,
        rows: ctx.topManagement,
      };
      return buildTopManagementHtml(
        data,
        settings,
        [...DEFAULT_TOP_MANAGEMENT_TABLE_COLUMNS],
        printAssets,
      );
    }
    case "technical_staff": {
      const settings = withBulkLetterhead(defaultTechnicalStaffPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          signatoryName,
          signatoryDesignation,
          rows: ctx.technicalStaff,
        },
        topManagement,
      );
      return buildTechnicalStaffHtml(data, settings, printAssets);
    }
    case "location_map": {
      const settings = withBulkLetterhead(defaultLocationMapPrintSettings());
      const routeValid = locationMapHasValidRoute(ctx.locationMap);
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          document: ctx.locationMap,
          embedUrl: routeValid ? buildGoogleMapsEmbedUrl(ctx.locationMap) : null,
          directionsUrl: routeValid ? buildGoogleMapsDirectionsUrl(ctx.locationMap) : null,
          firmRepName,
          firmRepDesignation,
        },
        topManagement,
      );
      return buildLocationMapHtml(data, settings, printAssets);
    }
    case "plant_layout": {
      const settings = withBulkLetterhead(defaultPlantLayoutPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          document: ctx.plantLayout,
          firmRepName,
          firmRepDesignation,
        },
        topManagement,
      );
      return buildPlantLayoutHtml(data, settings, printAssets);
    }
    case "process_flow_chart": {
      const settings = withBulkLetterhead(defaultProcessFlowChartPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          document: ctx.processFlowChart,
          firmRepName,
          firmRepDesignation,
        },
        topManagement,
      );
      return buildProcessFlowChartHtml(data, settings, printAssets);
    }
    case "process_description": {
      const settings = withBulkLetterhead(defaultProcessDescriptionPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          document: ctx.processDescription,
        },
        topManagement,
      );
      return buildProcessDescriptionHtml(data, settings, printAssets);
    }
    case "license_scope": {
      const settings = withBulkLetterhead(defaultManufacturingScopePrintSettings());
      const scopeRows = storedRowsToEditorRows(ctx.licenseScopeRows);
      const effectiveScopeText = serializeLicenseScopeText(
        ctx.licenseScopeFormat,
        ctx.licenseScope,
        scopeRows,
      );
      const data = withDocumentSignatureImage(
        {
          ...letter,
          signatoryName,
          signatoryDesignation,
          licenseScope: effectiveScopeText,
          licenseScopeFormat: ctx.licenseScopeFormat,
          licenseScopeRows:
            ctx.licenseScopeFormat === "table"
              ? ctx.licenseScopeRows.map(({ component, value }) => ({ component, value }))
              : undefined,
        },
        topManagement,
      );
      return buildManufacturingScopeDeclarationHtml(data, settings, printAssets);
    }
    case "osl_sample_requirements": {
      const settings = withBulkLetterhead(defaultOslSamplePrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          inspectionDate: resolveSampleOfferLetterDate(
            ctx.applicationStage,
            ctx.dateOfInspection,
          ),
          applicationNumber,
          signatoryName,
          signatoryDesignation,
          rows: ctx.oslSampleRequirements,
        },
        topManagement,
      );
      return buildOslSampleRequirementsHtml(
        data,
        settings,
        [...DEFAULT_OSL_SAMPLE_TABLE_COLUMNS],
        "osl",
        printAssets,
      );
    }
    case "pi_sample_requirements": {
      const settings = withBulkLetterhead(defaultOslSamplePrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          inspectionDate: resolveSampleOfferLetterDate(
            ctx.applicationStage,
            ctx.dateOfInspection,
          ),
          applicationNumber,
          signatoryName,
          signatoryDesignation,
          rows: ctx.piSampleRequirements,
        },
        topManagement,
      );
      return buildOslSampleRequirementsHtml(
        data,
        settings,
        [...DEFAULT_OSL_SAMPLE_TABLE_COLUMNS],
        "pi",
        printAssets,
      );
    }
    case "cmpf_305": {
      const settings = withBulkLetterhead(defaultCmpf305PrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          inspectionOfficerName: ctx.inspectionOfficerName,
          inspectionOfficerDesignation: ctx.inspectionOfficerDesignation,
          firmRepName,
          firmRepDesignation,
          rows: ctx.cmpf305Machinery,
        },
        topManagement,
      );
      return buildCmpf305Html(data, settings, printAssets);
    }
    case "cmpf_306": {
      const settings = withBulkLetterhead(defaultCmpf306PrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          inspectionOfficerName: ctx.inspectionOfficerName,
          inspectionOfficerDesignation: ctx.inspectionOfficerDesignation,
          firmRepName,
          firmRepDesignation,
          document: ctx.cmpf306,
        },
        topManagement,
      );
      return buildCmpf306Html(data, settings, printAssets);
    }
    case "cmpf_307": {
      const settings = withBulkLetterhead(defaultCmpf307PrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          firmRepName,
          firmRepDesignation,
          document: ctx.cmpf307,
        },
        topManagement,
      );
      return buildCmpf307Html(data, settings, printAssets);
    }
    case "cmpf_310": {
      const settings = withBulkLetterhead(defaultCmpf310PrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          document: ctx.cmpf310,
        },
        topManagement,
      );
      return buildCmpf310Html(data, settings, printAssets);
    }
    case "cmpf_311": {
      const settings = withBulkLetterhead(defaultCmpf311PrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          firmRepName,
          firmRepDesignation,
          document: ctx.cmpf311,
        },
        topManagement,
      );
      return buildCmpf311Html(data, settings, printAssets);
    }
    case "raw_material_details": {
      const settings = withBulkLetterhead(defaultRawMaterialDetailsPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          firmRepName,
          firmRepDesignation,
          rows: ctx.rawMaterialDetails,
        },
        topManagement,
      );
      return buildRawMaterialDetailsHtml(data, settings, printAssets);
    }
    case "certified_reference_materials": {
      const settings = withBulkLetterhead(defaultCertifiedReferenceMaterialsPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          firmRepName,
          firmRepDesignation,
          rows: ctx.certifiedReferenceMaterials,
        },
        topManagement,
      );
      return buildCertifiedReferenceMaterialsHtml(data, settings, printAssets);
    }
    case "undertaking_option_2": {
      const settings = withBulkLetterhead(defaultUndertakingOption2PrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          document: ctx.undertakingOption2,
        },
        topManagement,
      );
      return buildUndertakingOption2Html(data, settings, printAssets);
    }
    case "undertaking_general_iss": {
      const settings = withBulkLetterhead(defaultUndertakingGeneralIssPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          markingClause: ctx.markingClause,
          packagingClause: ctx.packagingClause ?? "",
          weeklyOff: ctx.weeklyOff ?? [],
          document: ctx.undertakingGeneralIss,
        },
        topManagement,
      );
      return buildUndertakingGeneralIssHtml(data, settings, printAssets);
    }
    case "self_evaluation_form": {
      const settings = withBulkLetterhead(defaultSelfEvaluationFormPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          markingClause: ctx.markingClause,
          brandsWithoutMarkReasons: ctx.cmpf307.brands_without_mark_reasons,
          document: ctx.selfEvaluationForm,
          rawMaterialRows: buildSefRawMaterialRows(ctx.rawMaterialDetails),
          packagingMarkingRows: resolveSelfEvaluationPackagingMarking(
            ctx.selfEvaluationForm,
            ctx.markingClause,
          ),
          qcStaffRows: buildSefQcStaffRows(ctx.technicalStaff),
          brandRows: buildSefBrandRows(ctx.cmpf307),
        },
        topManagement,
      );
      return buildSelfEvaluationFormHtml(data, settings, printAssets);
    }
    case "authorization_letter": {
      const settings = withBulkLetterhead(defaultAuthorizationLetterPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          document: ctx.authorizationLetter,
        },
        topManagement,
      );
      return buildAuthorizationLetterHtml(data, settings, printAssets);
    }
    case "factory_test_reports": {
      const settings = {
        ...defaultFactoryTestReportPrintSettings(),
        show_letterhead: true as const,
        letterhead_layout: "logo-na" as const,
      };
      const qc = resolveQualityControlIncharge(ctx.technicalStaff);
      const reports = resolveFactoryTestReports(ctx);
      const data = {
        ...letter,
        city: letter.city ?? "",
        reports,
        inspectionOfficerName: ctx.inspectionOfficerName.trim(),
        inspectionOfficerDesignation: ctx.inspectionOfficerDesignation.trim(),
        qualityControlInchargeName: qc.name,
        qualityControlInchargeDesignation: qc.designation,
      };
      return buildFactoryTestReportHtml(data, settings, printAssets);
    }
    case "updated_scheme_of_inspection": {
      const settings = withBulkLetterhead(defaultUpdatedSchemeOfInspectionPrintSettings());
      const data = {
        ...letter,
        document: ctx.updatedSchemeOfInspection,
      };
      return buildUpdatedSchemeOfInspectionHtml(data, settings, printAssets);
    }
    case "undertaking_long_duration_test": {
      const settings = withBulkLetterhead(defaultUndertakingLongDurationTestPrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          document: ctx.undertakingLongDurationTest,
        },
        topManagement,
      );
      return buildUndertakingLongDurationTestHtml(data, settings, printAssets);
    }
    case "undertaking_minimum_marking_fee": {
      const settings = withBulkLetterhead(defaultUndertakingMinimumMarkingFeePrintSettings());
      const data = withDocumentSignatureImage(
        {
          ...letter,
          applicationNumber,
          dateOfApplication: ctx.dateOfApplication,
          dateOfInspection: ctx.dateOfInspection,
          firmRepName,
          firmRepDesignation,
          document: ctx.undertakingMinimumMarkingFee,
        },
        topManagement,
      );
      return buildUndertakingMinimumMarkingFeeHtml(data, settings, printAssets);
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export async function buildSelectedChecklistPrintHtml(
  ids: ChecklistPrintDocId[],
  ctx: ChecklistBulkPrintContext,
): Promise<string> {
  const docs = await buildSelectedChecklistPrintDocs(ids, ctx);
  return combineChecklistPrintHtml(docs);
}

export async function buildSelectedChecklistPrintDocs(
  ids: ChecklistPrintDocId[],
  ctx: ChecklistBulkPrintContext,
): Promise<{ id: ChecklistPrintDocId; html: string }[]> {
  if (!ids.length) {
    throw new Error("No checklist documents selected for print.");
  }

  const selectedWithContent = ids.filter((id) => checklistPrintDocHasContent(id, ctx));
  if (!selectedWithContent.length) {
    throw new Error("None of the selected checklist documents have content to print.");
  }

  const { assetUrls } = await loadCompanyPrintContext();
  const printAssets: ManufacturingScopePrintAssets = {
    letterhead_upper_url:
      assetUrls.letterhead_upper_url ?? ctx.printAssets?.letterhead_upper_url ?? null,
    letterhead_lower_url:
      assetUrls.letterhead_lower_url ?? ctx.printAssets?.letterhead_lower_url ?? null,
    seal_sign_url: assetUrls.seal_sign_url ?? ctx.printAssets?.seal_sign_url ?? null,
    logo_url: null,
  };

  return selectedWithContent.map((id) => ({
    id,
    html: buildSingleChecklistDocHtml(id, ctx, printAssets),
  }));
}

export function openChecklistCombinedPrint(html: string): void {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!printWindow) {
    throw new Error("Unable to open print window. Please allow pop-ups and try again.");
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

/** Open a single checklist document in a new tab for on-screen viewing (no print dialog). */
export function openChecklistDocumentView(html: string): void {
  const viewWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!viewWindow) {
    throw new Error("Unable to open preview window. Please allow pop-ups and try again.");
  }
  viewWindow.document.write(html);
  viewWindow.document.close();
  viewWindow.focus();
}

async function mergePdfBlobs(blobs: Blob[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const blob of blobs) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  const out = await merged.save();
  // Copy into a fresh ArrayBuffer-backed Uint8Array for Blob Part typing.
  const copy = new Uint8Array(out.byteLength);
  copy.set(out);
  return new Blob([copy], { type: "application/pdf" });
}

function pdfSettingsFromHtml(html: string): Pick<PrintSettings, "paper_size" | "orientation"> {
  const landscape = /@page\s*\{[^}]*landscape/i.test(html) || /orientation:\s*landscape/i.test(html);
  return {
    paper_size: "A4",
    orientation: landscape ? "landscape" : "portrait",
  };
}

export async function downloadChecklistCombinedPdf(opts: {
  html?: string;
  docs?: { id: ChecklistPrintDocId; html: string }[];
  /** Optional attachment storage refs to merge into the same PDF (PDF files only). */
  attachmentRefs?: string[];
  companyName: string;
}): Promise<void> {
  const filename = `Application_Checklist_${safePdfFilenamePart(opts.companyName)}.pdf`;
  const blobs: Blob[] = [];

  // Preferred path: render each document alone (keeps fit-page CSS intact), then merge.
  if (opts.docs && opts.docs.length > 0) {
    for (const doc of opts.docs) {
      const settings = pdfSettingsFromHtml(doc.html);
      const blob = await renderPdfViaPlaywright({
        html: doc.html,
        filename: `${doc.id}.pdf`,
        format: mapPageSizeToPlaywrightFormat(settings.paper_size),
        landscape: settings.orientation === "landscape",
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      blobs.push(blob);
    }
  } else {
    const html = (opts.html ?? "").trim();
    if (html) {
      const blob = await renderPdfViaPlaywright({
        html,
        filename: "checklist.pdf",
        format: "a4",
        landscape: false,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });
      blobs.push(blob);
    }
  }

  for (const ref of opts.attachmentRefs ?? []) {
    const trimmed = ref.trim();
    if (!trimmed) continue;
    try {
      const url = await resolveChecklistAttachmentUrl(trimmed);
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      let pathName = trimmed;
      try {
        pathName = new URL(url).pathname;
      } catch {
        // keep trimmed
      }
      const isPdf = blob.type.includes("pdf") || /\.pdf(?:\?|$)/i.test(pathName);
      if (isPdf) blobs.push(blob);
    } catch {
      // Skip non-mergeable / missing attachments.
    }
  }

  if (blobs.length === 0) throw new Error("Nothing to export as PDF.");
  const merged = blobs.length === 1 ? blobs[0]! : await mergePdfBlobs(blobs);
  triggerPdfDownload(merged, filename);
}

/** Download selected checklist HTML as a Word-openable .doc file. */
export function downloadChecklistCombinedWord(opts: {
  html: string;
  companyName: string;
}): void {
  const html = opts.html.trim();
  if (!html) throw new Error("Nothing to export as Word.");

  const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const styles = styleMatches.map((m) => m[1] ?? "").join("\n");
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = (bodyMatch?.[1] ?? html).trim();

  const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:w="urn:schemas-microsoft-com:office:word"
 xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8"/>
<title>Application Checklist</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
${styles}
@page { size: A4; margin: 12mm; }
body { font-family: Arial, Helvetica, sans-serif; }
</style>
</head>
<body>${body}</body>
</html>`;

  const blob = new Blob(["\ufeff", wordHtml], {
    type: "application/msword",
  });
  const filename = `Application_Checklist_${safePdfFilenamePart(opts.companyName)}.doc`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
