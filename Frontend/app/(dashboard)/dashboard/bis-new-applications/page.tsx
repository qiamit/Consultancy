import { Suspense } from "react";
import { PendingApplicationsSection } from "@/components/dashboard/pending-applications-section";
import { createClient } from "@backend/db/client/server";
import {
  ensureProfileAccess,
  isSuperAdminEmail,
} from "@backend/modules/auth/ensure-access";
import {
  applicationProjectKindDbValues,
  isPendingApplicationRow,
  type BisApplicationSource,
} from "@backend/modules/bis/bis-project-kind";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function PendingApplicationsFallback() {
  return (
    <div className="w-full animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading applications…
    </div>
  );
}

export default async function BisApplicationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const legacyId = firstSearchParam(sp, "id");
  const legacyNew = firstSearchParam(sp, "new");
  if (legacyId) {
    redirect(`/dashboard/bis-new-applications/master?id=${encodeURIComponent(legacyId)}`);
  }
  if (legacyNew === "1") {
    redirect("/dashboard/bis-new-applications/master?new=1");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = user ? await ensureProfileAccess(supabase, user) : null;
  const isAdmin = Boolean(
    access?.isAdmin || (user && isSuperAdminEmail(user.email)),
  );
  const applicationKinds = await applicationProjectKindDbValues(supabase);

  const { data: applicationsRaw, error: applicationsError } = await supabase
    .from("bis_projects")
    .select(
      "id, title, status, project_kind, created_at, target_date, client_id, cm_l_digits, license_validity_date, is_code_id, portal_user_id, portal_password, application_stage, clients(name, company_name, email, state), is_codes(is_number, revision_year, is_code_title)",
    )
    .in("project_kind", applicationKinds)
    .is("license_validity_date", null)
    .or("status.is.null,status.eq.in_progress")
    .order("created_at", { ascending: false });

  if (applicationsError) {
    throw new Error(applicationsError.message);
  }

  type ClientJoin = {
    name: string | null;
    company_name: string | null;
    email: string | null;
    state: string | null;
  } | null;

  function mapBisRow(r: Record<string, unknown>) {
    const c = (Array.isArray(r.clients) ? r.clients[0] : r.clients) as ClientJoin;
    type IsCodeJoin = {
      is_number?: string;
      revision_year?: number;
      is_code_title?: string;
    } | null;
    const ic = (Array.isArray(r.is_codes) ? r.is_codes[0] : r.is_codes) as IsCodeJoin;
    return {
      id: r.id as string,
      title: r.title as string,
      status: r.status as string,
      project_kind: (r.project_kind as string | null) ?? "licence",
      cm_l_digits: (r.cm_l_digits as string | null) ?? null,
      license_number: null as string | null,
      license_validity_date: r.license_validity_date as string | null,
      target_date: r.target_date as string | null,
      client_id: r.client_id as string | null,
      client_name: c?.company_name ?? c?.name ?? "Unknown Client",
      client_email: (c?.email ?? "").trim() || null,
      client_state: (c?.state ?? "").trim() || null,
      is_number: ic?.is_number ?? null,
      is_revision_year: ic?.revision_year ?? null,
      is_code_title: ic?.is_code_title ?? null,
      is_code_id: (r.is_code_id as string | null) ?? null,
      portal_user_id: (r.portal_user_id as string | null) ?? null,
      portal_password: (r.portal_password as string | null) ?? null,
      application_stage: (r.application_stage as string | null) ?? "Draft",
      notes: null,
      created_at: r.created_at as string | null,
      source: "bis_projects" as BisApplicationSource,
    };
  }

  const applicationRows = (applicationsRaw ?? [])
    .map((r) => mapBisRow(r as Record<string, unknown>))
    .filter(isPendingApplicationRow)
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

  const clientIds = [
    ...new Set(
      applicationRows
        .map((r) => r.client_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (clientIds.length > 0) {
    const { data: clientStateRows } = await supabase
      .from("clients")
      .select("id, state")
      .in("id", clientIds);
    const stateByClientId = new Map(
      (clientStateRows ?? []).map((row) => [
        row.id as string,
        String((row as { state?: string | null }).state ?? "").trim() || null,
      ]),
    );
    for (const row of applicationRows) {
      if (!row.client_id) continue;
      row.client_state = stateByClientId.get(row.client_id) ?? row.client_state ?? null;
    }
  }

  return (
    <div className="w-full">
      <Suspense fallback={<PendingApplicationsFallback />}>
        <PendingApplicationsSection rows={applicationRows} isAdmin={isAdmin} />
      </Suspense>
    </div>
  );
}
