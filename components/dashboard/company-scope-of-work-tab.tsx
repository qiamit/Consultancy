import { CompanyTextTemplateTab } from "@/components/dashboard/company-text-template-tab";
import {
  createCompanyScopeTemplate,
  deleteCompanyScopeTemplate,
  updateCompanyScopeTemplate,
} from "@/lib/actions/company-scope-of-work";
import type { CompanyTextTemplateRow } from "@/lib/types/company-text-template";

export function CompanyScopeOfWorkTab({
  rows,
}: {
  rows: CompanyTextTemplateRow[];
}) {
  return (
    <CompanyTextTemplateTab
      variant="scope"
      rows={rows}
      bodyLabel="Scope of work text"
      addCodePlaceholder="e.g. bis_license"
      addNamePlaceholder="e.g. BIS certification scope"
      actions={{
        create: createCompanyScopeTemplate,
        update: updateCompanyScopeTemplate,
        remove: deleteCompanyScopeTemplate,
      }}
      intro={
        <>
          <p className="font-medium">Scope of work templates</p>
          <p className="mt-1 text-sky-900/90 dark:text-sky-200/90">
            Same pattern as terms: each template has a permanent{" "}
            <strong className="font-semibold">link code</strong>. Use it when wiring
            quotations or other screens to pre-fill the scope-of-work field (e.g.{" "}
            <code className="rounded bg-white/70 px-1 dark:bg-zinc-900">default</code>
            ).
          </p>
        </>
      }
      defaultLockedHint={
        <>
          The <code className="text-zinc-700 dark:text-zinc-300">default</code>{" "}
          template cannot be deleted.
        </>
      }
    />
  );
}
