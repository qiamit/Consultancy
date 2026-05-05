import { FinanceModuleShell } from "./finance-module-shell";

export function FinancePlaceholderPanel({
  breadcrumb,
  title,
  description,
}: {
  breadcrumb: string;
  title: string;
  description: string;
}) {
  return (
    <FinanceModuleShell
      breadcrumb={breadcrumb}
      title={title}
      description={description}
    >
      <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Party</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={4}
                className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
              >
                No records yet. This screen will match{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Client Master
                </span>{" "}
                behaviour — searchable grid, add/edit form, print, CSV, and bulk
                actions — once this module is connected to its tables.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </FinanceModuleShell>
  );
}
