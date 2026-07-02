import type { TopManagementStored } from "@/lib/top-management";
import { resolvePrimaryTopManagementPerson } from "@/lib/top-management";

export type ProcessDescriptionStored = {
  signatory_name: string;
  signatory_designation: string;
  description_points: string[];
};

export function defaultProcessDescriptionDocument(): ProcessDescriptionStored {
  return {
    signatory_name: "",
    signatory_designation: "",
    description_points: [],
  };
}

export function descriptionPointsHaveContent(points: string[] | undefined): boolean {
  return (points ?? []).some((p) => p.trim().length > 0);
}

export function documentHasContent(doc: ProcessDescriptionStored): boolean {
  return (
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0 ||
    descriptionPointsHaveContent(doc.description_points)
  );
}

function parseDescriptionPoints(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => String(p ?? "").trim());
}

export function parseProcessDescription(raw: unknown): ProcessDescriptionStored {
  if (!raw || typeof raw !== "object") return defaultProcessDescriptionDocument();
  const r = raw as Record<string, unknown>;
  return {
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
    description_points: parseDescriptionPoints(r.description_points),
  };
}

export function resolveProcessDescriptionDocument(input: {
  contactPerson: string | null;
  topManagement: TopManagementStored[];
  defaultPoints?: string[];
}): ProcessDescriptionStored {
  const primary = resolvePrimaryTopManagementPerson(input.topManagement);
  const signatory = primary.person_name || (input.contactPerson ?? "").trim();
  return {
    signatory_name: signatory,
    signatory_designation: primary.designation,
    description_points: input.defaultPoints ?? [],
  };
}

export function mergeProcessDescriptionWithDefaults(
  stored: ProcessDescriptionStored,
  defaults: ProcessDescriptionStored,
): ProcessDescriptionStored {
  const hasStoredPoints = descriptionPointsHaveContent(stored.description_points);
  return {
    signatory_name: stored.signatory_name.trim() || defaults.signatory_name,
    signatory_designation:
      stored.signatory_designation.trim() || defaults.signatory_designation,
    description_points: hasStoredPoints ? stored.description_points : defaults.description_points,
  };
}
