import { Suspense } from "react";
import { BisProjectsMaster } from "@/components/modules/bis-projects";
import { loadBisProjectsFormDropdownOptions } from "@backend/shared/data/bis-projects-dropdowns";
import { loadClientMasterDropdownOptions } from "@backend/shared/data/client-master-dropdowns";
import { loadIsCodeFormDropdownOptions } from "@backend/shared/data/is-code-form-dropdowns";
import type { BisProjectMasterRow } from "@backend/shared/types/bis-project-master";
import { createClient } from "@backend/db/client/server";

function MasterFallback() {
  return (
    <div className="w-full max-w-none animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading BIS Existing Licenses…
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

/** Normalize pg Date / ISO string to YYYY-MM-DD for client components. */
function toYmdOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : s || null;
}

export default async function BisProjectsPage({
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
      .from("bis_projects")
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

  type BisRowDb = Omit<BisProjectMasterRow, "is_codes">;
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

  const clientRows =
    (clientsRaw ?? []) as unknown as {
      id: string;
      name: string;
      company_name: string | null;
    }[];

  const clientById = new Map(
    clientRows.map((c) => [
      c.id,
      { name: c.name, company_name: c.company_name },
    ]),
  );

  const rows: BisProjectMasterRow[] = bisRows.map((r) => ({
    ...r,
    license_validity_date: toYmdOrNull(r.license_validity_date),
    start_date: toYmdOrNull(r.start_date),
    target_date: toYmdOrNull(r.target_date),
    cm_l_digits:
      r.cm_l_digits == null ? null : String(r.cm_l_digits).trim() || null,
    clients: r.client_id
      ? (r.clients ?? clientById.get(r.client_id) ?? null)
      : null,
    is_codes: r.is_code_id
      ? (isCodeById.get(r.is_code_id) ?? null)
      : null,
  }));

  const [clientMasterDropdowns, isCodeFormDropdowns, bisProjectsFormDropdowns] =
    await Promise.all([
      loadClientMasterDropdownOptions(supabase),
      loadIsCodeFormDropdownOptions(supabase),
      loadBisProjectsFormDropdownOptions(supabase),
    ]);

  return (
    <Suspense fallback={<MasterFallback />}>
      <BisProjectsMaster
        initialRows={rows}
        fetchError={bisError?.message ?? null}
        queryError={firstSearchParam(sp, "error")}
        dbErrorCode={firstSearchParam(sp, "db_code")}
        dbErrorHint={firstSearchParam(sp, "db_hint")}
        clientRows={clientRows}
        isCodeRows={isCodeRows}
        clientMasterDropdowns={clientMasterDropdowns}
        isCodeFormDropdowns={isCodeFormDropdowns}
        bisProjectsFormDropdowns={bisProjectsFormDropdowns}
      />
    </Suspense>
  );
}
