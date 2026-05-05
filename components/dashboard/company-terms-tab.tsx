import {
  createCompanyTerm,
  deleteCompanyTerm,
  updateCompanyTerm,
} from "@/lib/actions/company-terms";
import { CompanyTextTemplateTab } from "@/components/dashboard/company-text-template-tab";
import type { CompanyTermsRow } from "@/lib/types/company-terms";

export function CompanyTermsTab({ terms }: { terms: CompanyTermsRow[] }) {
  return (
    <CompanyTextTemplateTab
      variant="terms"
      rows={terms}
      bodyLabel="Terms & conditions text"
      addCodePlaceholder="e.g. export_lcl"
      addNamePlaceholder="e.g. Export quotation"
      actions={{
        create: createCompanyTerm,
        update: updateCompanyTerm,
        remove: deleteCompanyTerm,
      }}
      intro={
        <>
          <p className="font-medium">Multiple templates</p>
          <p className="mt-1 text-sky-900/90 dark:text-sky-200/90">
            Each row has a permanent{" "}
            <strong className="font-semibold">link code</strong> (lowercase letters,
            numbers, underscores). Other parts of the app can load text by that code
            — for example pick{" "}
            <code className="rounded bg-white/70 px-1 dark:bg-zinc-900">default</code>{" "}
            for standard quotations and add others such as{" "}
            <code className="rounded bg-white/70 px-1 dark:bg-zinc-900">export</code>{" "}
            when you wire them into forms.
          </p>
        </>
      }
      defaultLockedHint={
        <>
          The <code className="text-zinc-700 dark:text-zinc-300">default</code>{" "}
          template cannot be deleted; it stays in sync with legacy defaults where
          needed.
        </>
      }
    />
  );
}
