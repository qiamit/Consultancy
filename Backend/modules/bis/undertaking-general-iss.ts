import type { TopManagementStored } from "@backend/modules/bis/top-management";
import { resolvePrimaryTopManagementPerson } from "@backend/modules/bis/top-management";

export type UndertakingGeneralIssStored = {
  signatory_name: string;
  signatory_designation: string;
  undertaking_points: string[];
};

export function defaultUndertakingGeneralIssDocument(): UndertakingGeneralIssStored {
  return {
    signatory_name: "",
    signatory_designation: "",
    undertaking_points: [],
  };
}

export function undertakingPointsHaveContent(points: string[] | undefined): boolean {
  return (points ?? []).some((p) => p.trim().length > 0);
}

export function documentHasContent(doc: UndertakingGeneralIssStored): boolean {
  return (
    doc.signatory_name.trim().length > 0 ||
    doc.signatory_designation.trim().length > 0 ||
    undertakingPointsHaveContent(doc.undertaking_points)
  );
}

function parseUndertakingPoints(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => String(p ?? "").trim());
}

export function parseUndertakingGeneralIss(raw: unknown): UndertakingGeneralIssStored {
  if (!raw || typeof raw !== "object") return defaultUndertakingGeneralIssDocument();
  const r = raw as Record<string, unknown>;
  return {
    signatory_name: String(r.signatory_name ?? "").trim(),
    signatory_designation: String(r.signatory_designation ?? "").trim(),
    undertaking_points: parseUndertakingPoints(r.undertaking_points),
  };
}

export function resolveUndertakingGeneralIssDocument(input: {
  contactPerson: string | null;
  topManagement: TopManagementStored[];
  defaultPoints?: string[];
}): UndertakingGeneralIssStored {
  const primary = resolvePrimaryTopManagementPerson(input.topManagement);
  const signatory =
    primary.person_name || (input.contactPerson ?? "").trim();
  return {
    signatory_name: signatory,
    signatory_designation: primary.designation,
    undertaking_points: input.defaultPoints ?? [],
  };
}

export function mergeUndertakingGeneralIssWithDefaults(
  stored: UndertakingGeneralIssStored,
  defaults: UndertakingGeneralIssStored,
): UndertakingGeneralIssStored {
  const hasStoredPoints = undertakingPointsHaveContent(stored.undertaking_points);
  return {
    signatory_name: stored.signatory_name.trim() || defaults.signatory_name,
    signatory_designation:
      stored.signatory_designation.trim() || defaults.signatory_designation,
    undertaking_points: hasStoredPoints
      ? stored.undertaking_points
      : defaults.undertaking_points,
  };
}

function withClauseRef(text: string, clause: string, isCode: string): string {
  const ref = clause.trim();
  const is = isCode.trim() || "________________";
  if (!ref) return text;
  const trimmed = text.trim();
  const ending = /[.。]$/.test(trimmed) ? trimmed.slice(-1) : "";
  const body = ending ? trimmed.slice(0, -1).trimEnd() : trimmed;
  if (/as per\s+/i.test(body)) {
    return `${body.replace(/as per\s+.+$/i, `as per ${ref} of ${is}`)}${ending}`;
  }
  return `${body} as per ${ref} of ${is}${ending}`;
}

function pointsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

/** Keep Marking / Packaging undertaking rows aligned with the clause fields. */
export function syncUndertakingClausePoints(
  points: string[],
  opts: { markingClause: string; packagingClause: string; isNumber: string },
): string[] {
  const isCode = (opts.isNumber ?? "").trim() || "________________";
  const markingRef = (opts.markingClause ?? "").trim();
  const packagingRef = (opts.packagingClause ?? "").trim();
  const next = [...points];

  const apply = (
    matcher: RegExp,
    ref: string,
    fallback: string,
  ) => {
    if (!ref) return;
    const idx = next.findIndex((p) => matcher.test(p));
    if (idx >= 0) {
      next[idx] = withClauseRef(next[idx]!, ref, isCode);
      return;
    }
    if (next.some((p) => p.trim())) {
      next.push(fallback);
    }
  };

  apply(
    /marking\s+clause/i,
    markingRef,
    `We will Follow Marking Clause as per ${markingRef} of ${isCode}`,
  );
  apply(
    /packaging\s+clause/i,
    packagingRef,
    `We will Follow Packaging Clause as per ${packagingRef} of ${isCode}`,
  );

  return pointsEqual(points, next) ? points : next;
}

export function formatWeeklyOffForUndertaking(days: string[]): {
  closeOn: string;
  holidayPhrase: string;
} {
  const list = days.filter((d) => d.trim().length > 0);
  const effective = list.length > 0 ? list : ["Sunday"];
  const closeOn =
    effective.length === 1
      ? effective[0]!
      : effective.length === 2
        ? `${effective[0]} and ${effective[1]}`
        : `${effective.slice(0, -1).join(", ")} and ${effective[effective.length - 1]}`;
  const holidayPhrase =
    effective.length === 1
      ? `${closeOn} is our weekly holiday`
      : `${closeOn} are our weekly holidays`;
  return { closeOn, holidayPhrase };
}
