import { formatPrintTimestamp } from "@backend/shared/format-date";

export function formatCmsPublishedDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatPrintTimestamp(d);
}
