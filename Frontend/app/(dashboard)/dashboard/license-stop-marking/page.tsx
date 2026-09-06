import { createClient } from "@backend/db/client/server";
import { LicenseStopMarkingSection } from "@/components/dashboard/license-stop-marking-section";

export const dynamic = "force-dynamic";

export default async function LicenseStopMarkingPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("bis_projects")
    .select(
      "id, title, status, project_kind, cm_l_digits, license_number, license_validity_date, target_date, client_id, is_code_id, portal_user_id, portal_password, is_qe_managed, clients(name, company_name, email), is_codes(is_number, revision_year, is_code_title)",
    )
    .eq("status", "stop_marking")
    .order("license_validity_date", { ascending: true });

  type ClientJoin = {
    name: string | null;
    company_name: string | null;
    email: string | null;
  } | null;

  const rows = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const c = (Array.isArray(row.clients) ? row.clients[0] : row.clients) as ClientJoin;
    type IsCodeJoin = {
      is_number?: string;
      revision_year?: number;
      is_code_title?: string;
    } | null;
    const ic = (Array.isArray(row.is_codes) ? row.is_codes[0] : row.is_codes) as IsCodeJoin;
    return {
      id: row.id as string,
      title: row.title as string,
      status: row.status as string,
      project_kind: (row.project_kind as string | null) ?? "licence",
      cm_l_digits: (row.cm_l_digits as string | null) ?? null,
      license_number: row.license_number as string | null,
      license_validity_date: row.license_validity_date as string | null,
      target_date: row.target_date as string | null,
      client_id: row.client_id as string | null,
      client_name: c?.company_name ?? c?.name ?? "Unknown Client",
      client_email: (c?.email ?? "").trim() || null,
      portal_user_id: (row.portal_user_id as string | null) ?? null,
      portal_password: (row.portal_password as string | null) ?? null,
      is_number: ic?.is_number ?? null,
      is_revision_year: ic?.revision_year ?? null,
      is_code_title: ic?.is_code_title ?? null,
      is_code_id: (row.is_code_id as string | null) ?? null,
      notes: null,
      is_qe_managed: Boolean(row.is_qe_managed),
    };
  });

  return (
    <div className="w-full">
      <LicenseStopMarkingSection rows={rows} />
    </div>
  );
}
