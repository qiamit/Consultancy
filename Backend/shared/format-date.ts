const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Parse ISO date (YYYY-MM-DD), ISO datetime, or Date to a local calendar Date. */
export function parseToDate(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  const s = input.trim();
  if (!s) return null;

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return date;
    }
    return null;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Format dates for display as dd-mmm-yy (e.g. 27-Jun-26). */
export function formatDisplayDate(
  input: string | Date | null | undefined,
  fallback = "—",
): string {
  const d = parseToDate(input);
  if (!d) {
    if (typeof input === "string" && input.trim()) return input.trim();
    return fallback;
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = MONTH_ABBR[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export function toYmdDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse dd-mmm-yy / dd-mmm-yyyy or legacy dd.mm.yyyy into YYYY-MM-DD. */
export function parseDisplayDateInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const dashed = /^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/.exec(trimmed);
  if (dashed) {
    const day = Number(dashed[1]);
    const monthToken = dashed[2].charAt(0).toUpperCase() + dashed[2].slice(1).toLowerCase();
    const month = MONTH_ABBR.indexOf(monthToken as (typeof MONTH_ABBR)[number]);
    if (month < 0) return null;
    let year = Number(dashed[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    const d = new Date(year, month, day);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
    return toYmdDateString(d);
  }

  const dotted = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(trimmed);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]) - 1;
    const year = Number(dotted[3]);
    if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1900) return null;
    const d = new Date(year, month, day);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
    return toYmdDateString(d);
  }

  return null;
}

/** Format optional date fields for tables and labels (empty → em dash). */
export function formatDateField(value: string | null | undefined): string {
  return formatDisplayDate(value);
}

/** Print/export subtitle timestamp: dd-mmm-yy, h:mm AM/PM */
export function formatPrintTimestamp(d: Date = new Date()): string {
  const date = formatDisplayDate(d);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}
