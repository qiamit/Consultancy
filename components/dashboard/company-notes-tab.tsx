import { CompanyTextTemplateTab } from "@/components/dashboard/company-text-template-tab";
import {
  createCompanyNotesTemplate,
  deleteCompanyNotesTemplate,
  updateCompanyNotesTemplate,
} from "@/lib/actions/company-notes-templates";
import type { CompanyTextTemplateRow } from "@/lib/types/company-text-template";

export function CompanyNotesTab({ rows }: { rows: CompanyTextTemplateRow[] }) {
  return (
    <CompanyTextTemplateTab
      variant="notes"
      rows={rows}
      bodyLabel="Notes Text"
      addCodePlaceholder="e.g. internal_only"
      addNamePlaceholder="e.g. Internal memo block"
      actions={{
        create: createCompanyNotesTemplate,
        update: updateCompanyNotesTemplate,
        remove: deleteCompanyNotesTemplate,
      }}
      intro={
        <>
          <p className="font-medium">Notes templates</p>
          <p className="mt-1 text-sky-900/90 dark:text-sky-200/90">
            Reusable note blocks identified by{" "}
            <strong className="font-semibold">link code</strong>. Reference them from
            quotations or other modules when you need a standard notes paragraph (e.g.{" "}
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
