import { createClient } from "@backend/db/client/server";
import { SampleFailureReplySection } from "@/components/dashboard/sample-failure-reply-section";

export const dynamic = "force-dynamic";

export default async function BisSampleFailureReplyPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("bis_sample_failure_replies")
    .select(
      "id, sample_failure_type, sample_code, sample_qr_code, cm_l_digits, project_kind, status, notes, reply_draft, failure_letter_path, failure_letter_name, offer_letter_path, offer_letter_name, factory_test_report_path, factory_test_report_name, client_id, bis_project_id, is_code_id, created_at, clients(name, company_name), is_codes(is_number, revision_year, is_code_title), bis_projects(portal_user_id, portal_password)",
    )
    .order("created_at", { ascending: false })
    .limit(300);

  type ClientJoin = {
    name: string | null;
    company_name: string | null;
  } | null;

  type IsCodeJoin = {
    is_number?: string;
    revision_year?: number;
    is_code_title?: string;
  } | null;

  type ProjectJoin = {
    portal_user_id?: string | null;
    portal_password?: string | null;
  } | null;

  const rows = (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const c = (Array.isArray(row.clients) ? row.clients[0] : row.clients) as ClientJoin;
    const ic = (Array.isArray(row.is_codes) ? row.is_codes[0] : row.is_codes) as IsCodeJoin;
    const bp = (
      Array.isArray(row.bis_projects) ? row.bis_projects[0] : row.bis_projects
    ) as ProjectJoin;
    return {
      id: row.id as string,
      sample_failure_type: row.sample_failure_type as string,
      sample_code: (row.sample_code as string) ?? "",
      sample_qr_code: (row.sample_qr_code as string) ?? "",
      cm_l_digits: (row.cm_l_digits as string | null) ?? null,
      project_kind: (row.project_kind as string | null) ?? null,
      status: (row.status as string) ?? "open",
      notes: (row.notes as string) ?? "",
      reply_draft: (row.reply_draft as string) ?? "",
      failure_letter_path: (row.failure_letter_path as string | null) ?? null,
      failure_letter_name: (row.failure_letter_name as string | null) ?? null,
      offer_letter_path: (row.offer_letter_path as string | null) ?? null,
      offer_letter_name: (row.offer_letter_name as string | null) ?? null,
      factory_test_report_path: (row.factory_test_report_path as string | null) ?? null,
      factory_test_report_name: (row.factory_test_report_name as string | null) ?? null,
      client_id: row.client_id as string,
      bis_project_id: (row.bis_project_id as string | null) ?? null,
      is_code_id: row.is_code_id as string,
      client_name: c?.company_name ?? c?.name ?? "Unknown Firm",
      is_number: ic?.is_number ?? null,
      is_revision_year: ic?.revision_year ?? null,
      is_code_title: ic?.is_code_title ?? null,
      portal_user_id: bp?.portal_user_id ?? null,
      portal_password: bp?.portal_password ?? null,
      created_at: row.created_at as string,
    };
  });

  return (
    <div className="w-full">
      <SampleFailureReplySection rows={rows} />
    </div>
  );
}
