import { Suspense } from "react";
import { ClientMaster } from "@/components/modules/client-master";
import { loadClientMasterDropdownOptions } from "@backend/shared/data/client-master-dropdowns";
import { createClient } from "@backend/db/client/server";
import type { ClientMasterRow } from "@backend/shared/types/client-master";

function MasterFallback() {
  return (
    <div className="w-full max-w-none animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading Client Master…
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

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: clients, error }, dropdowns] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, name, company_name, company_type, company_scale, company_status, contact_person_name, email, phone, phone_country_code, address, city, pin_code, state, country, gst_number, opening_balance, balance_type, payment_term, notes, created_at",
      )
      .order("created_at", { ascending: false }),
    loadClientMasterDropdownOptions(supabase),
  ]);

  const rows = (clients ?? []) as unknown as ClientMasterRow[];

  return (
    <Suspense fallback={<MasterFallback />}>
      <ClientMaster
        initialClients={rows}
        fetchError={error?.message ?? null}
        queryError={firstSearchParam(sp, "error")}
        dbErrorCode={firstSearchParam(sp, "db_code")}
        dbErrorHint={firstSearchParam(sp, "db_hint")}
        returnToAfterSave={firstSearchParam(sp, "return_to")}
        {...dropdowns}
      />
    </Suspense>
  );
}
