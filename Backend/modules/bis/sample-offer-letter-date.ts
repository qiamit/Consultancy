import {
  normalizeBisApplicationStage,
} from "@backend/modules/bis/application-stage";
import { toYmdDateString } from "@backend/shared/format-date";

/**
 * Sample Offer Letter (OSL / PI) header Date:
 * - Draft stage → today's date
 * - Any other stage → Date of Inspection
 */
export function resolveSampleOfferLetterDate(
  stage: string | null | undefined,
  dateOfInspection: string | null | undefined,
  today: Date = new Date(),
): string {
  if (normalizeBisApplicationStage(stage) === "Draft") {
    return toYmdDateString(today);
  }
  return String(dateOfInspection ?? "").trim();
}
