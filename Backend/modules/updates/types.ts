export type RegulatoryUpdateTag =
  | "QCO Alert"
  | "BIS"
  | "NABL"
  | "ISO"
  | "QCI"
  | "QAI"
  | "IQAS"
  | "Important";

export type RegulatoryUpdateSource =
  | "BIS"
  | "ISO"
  | "NABL"
  | "QCI"
  | "QAI"
  | "IQAS";

export interface RegulatoryUpdate {
  tag: RegulatoryUpdateTag;
  tagColor: string;
  date: string;
  title: string;
  desc: string;
  source: RegulatoryUpdateSource;
  sourceUrl: string;
}

export const TAG_COLORS: Record<RegulatoryUpdateTag, string> = {
  "QCO Alert":
    "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
  BIS: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800",
  NABL:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  ISO:
    "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800",
  QCI:
    "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800",
  QAI:
    "bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
  IQAS:
    "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  Important:
    "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800",
};

export function withTagColors(
  updates: Omit<RegulatoryUpdate, "tagColor">[],
): RegulatoryUpdate[] {
  return updates.map((u) => ({
    ...u,
    tagColor: TAG_COLORS[u.tag] ?? TAG_COLORS.Important,
  }));
}
