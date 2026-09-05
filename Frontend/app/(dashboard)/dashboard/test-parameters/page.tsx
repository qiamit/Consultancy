import { Suspense } from "react";
import { TestParameterMaster } from "@/components/modules/test-parameter-master";
import { formatIsCodeRevisionLabel } from "@/components/modules/test-parameter-master/constants";
import type { IsCodeComboboxOption } from "@/components/modules/bis-projects/is-code-combobox";
import { loadIsCodeFormDropdownOptions } from "@backend/shared/data/is-code-form-dropdowns";
import { createClient } from "@backend/db/client/server";
import type { IsCodeMasterRow } from "@backend/shared/types/is-code-master";
import type { TestParameterMasterRow } from "@backend/shared/types/test-parameter-master";

function MasterFallback() {
  return (
    <div className="w-full animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading Test…
    </div>
  );
}

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function TestParametersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const scopeIsCodeId = firstSearchParam(sp, "is_code_id");
  const supabase = await createClient();

  let parametersQuery = supabase
    .from("test_parameters")
    .select(
      "id, is_code_id, test_name, clause_no, test_method, unit, specified_value, created_at, is_codes(is_number, revision_year)",
    )
    .order("created_at", { ascending: false });

  // Each IS code has its own test list — never load other IS rows when scoped.
  if (scopeIsCodeId) {
    parametersQuery = parametersQuery.eq("is_code_id", scopeIsCodeId);
  }

  const [
    { data: parameters, error: paramError },
    { data: codes },
    isCodeFormDropdowns,
  ] = await Promise.all([
      parametersQuery,
      supabase
        .from("is_codes")
        .select("id, is_number, revision_year, is_code_title")
        .order("is_number", { ascending: true }),
      loadIsCodeFormDropdownOptions(supabase),
    ]);

  type ParamDb = Omit<TestParameterMasterRow, "is_codes"> & {
    is_codes:
      | { is_number: string; revision_year: number }
      | { is_number: string; revision_year: number }[]
      | null;
  };

  const rows: TestParameterMasterRow[] = ((parameters ?? []) as ParamDb[]).map(
    (r) => {
      const ic = Array.isArray(r.is_codes) ? r.is_codes[0] : r.is_codes;
      return {
        id: r.id,
        is_code_id: r.is_code_id,
        test_name: r.test_name,
        clause_no: r.clause_no,
        test_method: r.test_method,
        unit: r.unit,
        specified_value: r.specified_value,
        created_at: r.created_at,
        is_codes: ic ?? null,
      };
    },
  );

  const codeRows = (codes ?? []) as Pick<
    IsCodeMasterRow,
    "id" | "is_number" | "revision_year" | "is_code_title"
  >[];

  const isCodeOptions: IsCodeComboboxOption[] = codeRows.map((c) => ({
    id: c.id,
    label: formatIsCodeRevisionLabel(c.is_number, c.revision_year),
    filterText: `${c.is_number} ${c.is_code_title ?? ""}`,
  }));

  return (
    <Suspense fallback={<MasterFallback />}>
      <TestParameterMaster
        initialRows={rows}
        fetchError={paramError?.message ?? null}
        queryError={firstSearchParam(sp, "error")}
        dbErrorCode={firstSearchParam(sp, "db_code")}
        dbErrorHint={firstSearchParam(sp, "db_hint")}
        isCodeOptions={isCodeOptions}
        isCodeFormDropdowns={isCodeFormDropdowns}
      />
    </Suspense>
  );
}
