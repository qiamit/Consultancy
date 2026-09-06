import { createClient } from "@backend/db/client/server";
import { SurveillanceSection } from "@/components/dashboard/surveillance-section";

export const dynamic = "force-dynamic";

export default async function BisSurveillancePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("license_surveillance")
    .select(
      "id, surveillance_date, allotted_employee_name, cm_l_digits, project_kind, client_id, bis_project_id, is_code_id, created_at, clients(name, company_name, email), is_codes(is_number, revision_year, is_code_title)",
    )
    .order("surveillance_date", { ascending: false })
    .limit(200);

  type ClientJoin = {
    name: string | null;
    company_name: string | null;
    email: string | null;
  } | null;

  const rows = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const c = (Array.isArray(row.clients) ? row.clients[0] : row.clients) as ClientJoin;
    const ic = (Array.isArray(row.is_codes) ? row.is_codes[0] : row.is_codes) as {
      is_number?: string;
      revision_year?: number;
      is_code_title?: string;
    } | null;
    return {
      id: row.id as string,
      surveillance_date: row.surveillance_date as string,
      allotted_employee_name: row.allotted_employee_name as string,
      cm_l_digits: (row.cm_l_digits as string | null) ?? null,
      project_kind: (row.project_kind as string | null) ?? null,
      client_id: row.client_id as string,
      bis_project_id: (row.bis_project_id as string | null) ?? null,
      is_code_id: (row.is_code_id as string | null) ?? null,
      client_name: c?.company_name ?? c?.name ?? "Unknown Client",
      is_number: ic?.is_number ?? null,
      is_revision_year: ic?.revision_year ?? null,
      is_code_title: ic?.is_code_title ?? null,
      created_at: row.created_at as string,
    };
  });

  return (
    <div className="w-full">
      <SurveillanceSection rows={rows} />
    </div>
  );
}
