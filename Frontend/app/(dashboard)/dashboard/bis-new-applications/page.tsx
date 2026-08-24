import { Suspense } from "react";
import { BisNewApplicationsMaster } from "@/components/modules/bis-new-applications";
import { loadBisNewApplicationsFormDropdownOptions } from "@backend/shared/data/bis-new-applications-dropdowns";
import { loadClientMasterDropdownOptions } from "@backend/shared/data/client-master-dropdowns";
import { loadIsCodeFormDropdownOptions } from "@backend/shared/data/is-code-form-dropdowns";
import type { BisNewApplicationMasterRow } from "@backend/shared/types/bis-new-application-master";
import { createClient } from "@backend/db/supabase/server";

function MasterFallback() {
  return (
    <div className="w-full max-w-none animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading BIS New Applications…
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

export default async function BisNewApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [
    { data: bisRaw, error: bisError },
    { data: clientsRaw },
    { data: codesRaw },
  ] = await Promise.all([
    supabase
      .from("bis_new_applications")
      .select(
        `id, client_id, project_kind, title, status, license_number, start_date, target_date, notes,
        is_code_id, cm_l_digits, license_validity_date, case_handled_by, case_referred_by,
        billing_amount, billing_frequency, portal_user_id, portal_password,
        created_at, updated_at,
        clients(name, company_name)`,
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id,name,company_name")
      .order("name", { ascending: true }),
    supabase
      .from("is_codes")
      .select("id,is_number,is_code_title,revision_year")
      .order("is_number", { ascending: true }),
  ]);

  type BisRowDb = Omit<BisNewApplicationMasterRow, "is_codes">;
  const bisRows = (bisRaw ?? []) as unknown as BisRowDb[];

  const isCodeRows =
    (codesRaw ?? []) as unknown as {
      id: string;
      is_number: string;
      is_code_title: string;
      revision_year: number;
    }[];

  const isCodeById = new Map(
    isCodeRows.map((c) => [
      c.id,
      {
        is_number: c.is_number,
        is_code_title: c.is_code_title,
        revision_year: c.revision_year,
      },
    ]),
  );

  const rows: BisNewApplicationMasterRow[] = bisRows.map((r) => ({
    ...r,
    is_codes: r.is_code_id
      ? (isCodeById.get(r.is_code_id) ?? null)
      : null,
  }));

  const clientRows =
    (clientsRaw ?? []) as unknown as {
      id: string;
      name: string;
      company_name: string | null;
    }[];

  const [
    clientMasterDropdowns,
    isCodeFormDropdowns,
    bisNewApplicationsFormDropdowns,
  ] = await Promise.all([
    loadClientMasterDropdownOptions(supabase),
    loadIsCodeFormDropdownOptions(supabase),
    loadBisNewApplicationsFormDropdownOptions(supabase),
  ]);

  return (
    <Suspense fallback={<MasterFallback />}>
      <BisNewApplicationsMaster
        initialRows={rows}
        fetchError={bisError?.message ?? null}
        queryError={firstSearchParam(sp, "error")}
        dbErrorCode={firstSearchParam(sp, "db_code")}
        dbErrorHint={firstSearchParam(sp, "db_hint")}
        clientRows={clientRows}
        isCodeRows={isCodeRows}
        clientMasterDropdowns={clientMasterDropdowns}
        isCodeFormDropdowns={isCodeFormDropdowns}
        bisNewApplicationsFormDropdowns={bisNewApplicationsFormDropdowns}
      />
    </Suspense>
  );
}
