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

import { downloadPrintHtmlAsPdf, safePdfFilenamePart } from "@/lib/download-print-pdf";

export const APPLICATION_CHECKLIST_PRINT_DOCS = [
  { id: "top_management", label: "Top Management Details" },
  { id: "technical_staff", label: "Technical Staff Details" },
  { id: "location_map", label: "Location Map" },
  { id: "plant_layout", label: "Plant Layout" },
  { id: "process_flow_chart", label: "Process Flow Chart" },
  { id: "process_description", label: "Process Description" },
  { id: "license_scope", label: "Undertaking for License Scope" },
  { id: "osl_sample_requirements", label: "Sample for Out Side Lab" },
  { id: "cmpf_305", label: "List of Plant & Machinery - CMPF 305" },
  { id: "cmpf_306", label: "List of Testing Equipments - CMPF - 306" },
  { id: "cmpf_307", label: "Brand Name Declaration - CMPF 307" },
  { id: "cmpf_310", label: "Acceptance of Marking Fee - CMPF 310" },
  { id: "cmpf_311", label: "Acceptance of Scheme of Inspection & Testing CMPF 311" },
  { id: "raw_material_details", label: "Undertaking For Raw Material" },
  { id: "certified_reference_materials", label: "List of Certified Reference Material" },
  { id: "undertaking_option_2", label: "Undertaking for Simplified Procedure" },
  { id: "undertaking_general_iss", label: "Undertaking for General ISS" },
  { id: "self_evaluation_form", label: "Self Evaluation Form" },
  { id: "authorization_letter", label: "Authorization Letter" },
  { id: "pi_sample_requirements", label: "Sample Offer for Inspection" },
  { id: "factory_test_reports", label: "Factory Test Reports" },
  { id: "updated_scheme_of_inspection", label: "Updated Scheme of Inspection & Testing" },
  { id: "undertaking_long_duration_test", label: "Undertaking for Long Duration Test" },
  { id: "undertaking_minimum_marking_fee", label: "Undertaking for Minimum Marking Fee" },
] as const;

export type ChecklistPrintDocId = (typeof APPLICATION_CHECKLIST_PRINT_DOCS)[number]["id"];

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
  applicationNumber: string;
  dateOfApplication: string;
  dateOfInspection: string;
  markingClause: string;
  packagingClause?: string;
  weeklyOff?: string[];
  inspectionOfficerName: string;
  inspectionOfficerDesignation: string;
  licenceNumber?: string;
  printAssets?: ManufacturingScopePrintAssets;
};

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

function combineChecklistPrintHtml(docs: { id: ChecklistPrintDocId; html: string }[]): string {
  const styleChunks: string[] = [];
  const bodyChunks: string[] = [];

  docs.forEach((doc, index) => {
    const { styles, body } = extractHtmlParts(doc.html);
    if (styles.trim()) styleChunks.push(styles);
    const pageBreak = index === 0 ? "auto" : "always";
    bodyChunks.push(
      `<div class="bulk-checklist-doc" data-doc-id="${doc.id}" style="page-break-before:${pageBreak}">${body}</div>`,
    );
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Application Checklist Documents</title>
<style>
${styleChunks.join("\n")}
.bulk-checklist-doc { width: 100%; }
@media print {
  .bulk-checklist-doc { page-break-before: always; break-before: page; }
  .bulk-checklist-doc:first-of-type { page-break-before: auto; break-before: auto; }
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

  const docs = selectedWithContent.map((id) => ({
    id,
    html: buildSingleChecklistDocHtml(id, ctx, printAssets),
  }));

  return combineChecklistPrintHtml(docs);
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

export async function downloadChecklistCombinedPdf(opts: {
  html: string;
  companyName: string;
}): Promise<void> {
  await downloadPrintHtmlAsPdf({
    html: opts.html,
    filename: `Application_Checklist_${safePdfFilenamePart(opts.companyName)}.pdf`,
    settings: {
      paper_size: "A4",
      orientation: "portrait",
    },
  });
}
