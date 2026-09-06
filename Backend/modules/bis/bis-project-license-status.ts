/** Licence display status — combines validity date AND db compliance status. */

import {
  cmPrefixForProjectKind,
  isApplicationProjectKind,
} from "@backend/modules/bis/bis-project-kind";
import { formatDisplayDate } from "@backend/shared/format-date";

export type LicenseDisplayStatus =
  | "Operative"
  | "Deferred"
  | "Expired"
  | "Stop Marking"
  | "N/A";

/** Coerce DB/JSON date values (string | Date | number) to a YMD / text string. */
function asTrimmedText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).trim();
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * Compute the display status for a BIS license row.
 *
 * Stop Marking is a DB compliance flag — it takes precedence over the
 * date-based calculation. A Stop Marking license can be reverted to
 * Operative by restoring compliance (no renewal needed).
 *
 * Date-based rules (when not Stop Marking):
 *   today ≤ validityEnd            → Operative
 *   validityEnd < today ≤ +90 days → Deferred (grace window)
 *   today > validityEnd + 90 days  → Expired
 */
export function computeLicenseDisplayStatus(
  projectKind: string,
  validityDateYmd: string | Date | null | undefined,
  dbStatus?: string | null,
  now: Date = new Date(),
): LicenseDisplayStatus {
  if (isApplicationProjectKind(projectKind)) return "N/A";
  if (dbStatus === "stop_marking") return "Stop Marking";
  const vRaw = asTrimmedText(validityDateYmd);
  if (!vRaw) return "N/A";
  const validityEnd = startOfDay(parseYmd(vRaw));
  const today = startOfDay(now);
  const deferredEnd = addDays(validityEnd, 90);
  if (today <= validityEnd) return "Operative";
  if (today <= deferredEnd) return "Deferred";
  return "Expired";
}

/**
 * Returns true if today is within the renewal window:
 * 90 days BEFORE validity (Operative approaching expiry) OR
 * 90 days AFTER validity (Deferred grace window).
 * Stop Marking is excluded — it needs compliance restoration first.
 */
export function isRenewalWindowActive(
  validityDateYmd: string | Date | null | undefined,
  dbStatus?: string | null,
  now: Date = new Date(),
): boolean {
  if (dbStatus === "stop_marking") return false;
  const vRaw = asTrimmedText(validityDateYmd);
  if (!vRaw) return false;
  const validityEnd = startOfDay(parseYmd(vRaw));
  const today = startOfDay(now);
  return today >= addDays(validityEnd, -90) && today <= addDays(validityEnd, 90);
}

/**
 * Only Operative and Deferred licenses can be renewed.
 * Expired licenses require a fresh application.
 * Stop Marking requires compliance restoration, not renewal.
 */
export function canApplyForRenewal(lic: LicenseDisplayStatus): boolean {
  return lic === "Operative" || lic === "Deferred";
}

/**
 * Date-based licence phase for Stop Marking filters / eligibility.
 * Ignores DB `stop_marking` flag so Operative / Renewal / Deferred can still be grouped.
 *
 * - Operative: valid and more than 90 days before expiry
 * - Renewal: valid and within 90 days before expiry
 * - Deferred: within 90 days after expiry
 * - Expired: past deferred window (Stop Marking not applicable)
 */
export type StopMarkingPhase =
  | "operative"
  | "renewal"
  | "deferred"
  | "expired"
  | "na";

export function licensePhaseForStopMarking(
  projectKind: string,
  validityDateYmd: string | Date | null | undefined,
  now: Date = new Date(),
): StopMarkingPhase {
  if (isApplicationProjectKind(projectKind)) return "na";
  // Pass null dbStatus so Stop Marking flag does not override date rules.
  const lic = computeLicenseDisplayStatus(projectKind, validityDateYmd, null, now);
  if (lic === "Deferred") return "deferred";
  if (lic === "Expired") return "expired";
  if (lic === "Operative") {
    const vRaw = asTrimmedText(validityDateYmd);
    if (!vRaw) return "na";
    const validityEnd = startOfDay(parseYmd(vRaw));
    const today = startOfDay(now);
    const renewalStart = addDays(validityEnd, -90);
    if (today >= renewalStart && today <= validityEnd) return "renewal";
    return "operative";
  }
  return "na";
}

/** Stop Marking may be applied only on Operative, Renewal, or Deferred licences. */
export function canApplyStopMarking(
  projectKind: string,
  validityDateYmd: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const phase = licensePhaseForStopMarking(projectKind, validityDateYmd, now);
  return phase === "operative" || phase === "renewal" || phase === "deferred";
}

export { cmPrefixForProjectKind };

export function formatCmDisplay(
  projectKind: string,
  digits: string | number | null | undefined,
): string {
  const d = asTrimmedText(digits);
  if (!/^\d{10}$/.test(d)) return "—";
  return `${cmPrefixForProjectKind(projectKind)}-${d}`;
}

/** Licence validity end date plus/minus 90 calendar days (en-IN labels). */
export type LicenceValidityWindow90 = {
  main: string;
  before90: string;
  after90: string;
};

export function licenceValidityDisplayWithWindow90(
  validityDateYmd: string | Date | null | undefined,
): LicenceValidityWindow90 | null {
  const vRaw = asTrimmedText(validityDateYmd);
  if (!vRaw) return null;
  const end = startOfDay(parseYmd(vRaw));
  const fmt = (d: Date) => formatDisplayDate(d);
  return {
    main: fmt(end),
    before90: fmt(addDays(end, -90)),
    after90: fmt(addDays(end, 90)),
  };
}
