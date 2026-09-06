const MS_PER_DAY = 86_400_000;

/** License dashboard query windows as YYYY-MM-DD strings. */
export function dashboardLicenseDateBounds(reference = new Date()) {
  const ms = reference.getTime();
  const today = reference.toISOString().split("T")[0]!;
  const plus30Days = new Date(ms + 30 * MS_PER_DAY).toISOString().split("T")[0]!;
  const plus90Days = new Date(ms + 90 * MS_PER_DAY).toISOString().split("T")[0]!;
  const minus90Days = new Date(ms - 90 * MS_PER_DAY).toISOString().split("T")[0]!;
  const yesterday = new Date(ms - MS_PER_DAY).toISOString().split("T")[0]!;
  return {
    today,
    yesterday,
    plus30Days,
    plus90Days,
    minus90Days,
    before90Days: minus90Days,
  };
}
