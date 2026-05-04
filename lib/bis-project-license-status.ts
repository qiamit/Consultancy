/** Licence display status from validity date (and project kind). */

export type LicenseDisplayStatus = "Operative" | "Deferred" | "Expired" | "N/A";

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

export function computeLicenseDisplayStatus(
  projectKind: string,
  validityDateYmd: string | null | undefined,
  now: Date = new Date(),
): LicenseDisplayStatus {
  if (projectKind === "application") return "N/A";
  const vRaw = (validityDateYmd ?? "").trim();
  if (!vRaw) return "N/A";
  const validityEnd = startOfDay(parseYmd(vRaw));
  const today = startOfDay(now);
  const deferredEnd = addDays(validityEnd, 90);
  if (today <= validityEnd) return "Operative";
  if (today <= deferredEnd) return "Deferred";
  return "Expired";
}

/** CM/L before digits for licence & inclusion; CM/A for application. */
export function cmPrefixForProjectKind(projectKind: string): "CM/L" | "CM/A" {
  return projectKind === "application" ? "CM/A" : "CM/L";
}

export function formatCmDisplay(
  projectKind: string,
  digits: string | null | undefined,
): string {
  const d = (digits ?? "").trim();
  if (!/^\d{10}$/.test(d)) return "—";
  return `${cmPrefixForProjectKind(projectKind)}${d}`;
}

/** Licence validity end date plus/minus 90 calendar days (en-IN labels). */
export type LicenceValidityWindow90 = {
  main: string;
  before90: string;
  after90: string;
};

export function licenceValidityDisplayWithWindow90(
  validityDateYmd: string | null | undefined,
): LicenceValidityWindow90 | null {
  const vRaw = (validityDateYmd ?? "").trim();
  if (!vRaw) return null;
  const end = startOfDay(parseYmd(vRaw));
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return {
    main: fmt(end),
    before90: fmt(addDays(end, -90)),
    after90: fmt(addDays(end, 90)),
  };
}
