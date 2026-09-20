import { ftrReportHasContent } from "@backend/modules/bis/factory-test-report";
import type { FactoryTestReportStored } from "@backend/modules/bis/factory-test-report";
import type { OslSampleRequirementStored } from "@backend/modules/bis/osl-sample-requirements";
import { documentHasContent as oslSamplesHaveContent } from "@backend/modules/bis/osl-sample-requirements";
import {
  maxBisApplicationStage,
  normalizeBisApplicationStage,
  type BisApplicationStage,
  DEFAULT_BIS_APPLICATION_STAGE,
} from "@backend/modules/bis/application-stage";
import {
  parseApplicationChecklistNotes,
  type ApplicationMeta,
} from "@backend/modules/bis/application-checklist-notes";

/**
 * Infer checklist-driven status from saved notes.
 * Milestones (highest wins):
 * 1. Under Preparation (default)
 * 2. Test Request Done — OSL/PI samples present
 * 3. Report Uploaded — Factory Test Report(s) present
 * 4. Application Submitted — Application No. or Date of Application filled
 * 5. Inspection Done — Date of Inspection filled
 */
export function inferBisApplicationStageFromNotes(
  notes: string | null | undefined,
): BisApplicationStage {
  const parsed = parseApplicationChecklistNotes(notes);
  return inferBisApplicationStageFromChecklist({
    meta: parsed.meta,
    oslSampleRequirements: parsed.oslSampleRequirements,
    piSampleRequirements: parsed.piSampleRequirements,
    factoryTestReports: parsed.factoryTestReports,
  });
}

export function inferBisApplicationStageFromChecklist(input: {
  meta: ApplicationMeta;
  oslSampleRequirements: OslSampleRequirementStored[];
  piSampleRequirements: OslSampleRequirementStored[];
  factoryTestReports: FactoryTestReportStored[];
}): BisApplicationStage {
  let stage: BisApplicationStage = DEFAULT_BIS_APPLICATION_STAGE;

  const hasSamples =
    oslSamplesHaveContent(input.oslSampleRequirements) ||
    oslSamplesHaveContent(input.piSampleRequirements);
  if (hasSamples) {
    stage = maxBisApplicationStage(stage, "Test Request Done");
  }

  if (input.factoryTestReports.some(ftrReportHasContent)) {
    stage = maxBisApplicationStage(stage, "Report Uploaded");
  }

  const meta = input.meta;
  if (meta.application_number.trim() || meta.date_of_application.trim()) {
    stage = maxBisApplicationStage(stage, "Application Submitted");
  }

  if (meta.date_of_inspection.trim()) {
    stage = maxBisApplicationStage(stage, "Inspection Done");
  }

  return stage;
}

/** Advance stored stage to match inferred milestones (never regress). */
export function resolveAutoApplicationStage(
  current: string | null | undefined,
  notes: string | null | undefined,
): BisApplicationStage {
  const stored = normalizeBisApplicationStage(current);
  const inferred = inferBisApplicationStageFromNotes(notes);
  return maxBisApplicationStage(stored, inferred);
}
