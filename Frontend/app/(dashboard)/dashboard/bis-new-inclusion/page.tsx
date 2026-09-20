import { Suspense } from "react";
import { PendingApplicationsSection } from "@/components/dashboard/pending-applications-section";
import { createClient } from "@backend/db/client/server";
import {
  ensureProfileAccess,
  isSuperAdminEmail,
} from "@backend/modules/auth/ensure-access";
import {
  applicationProjectKindDbValues,
  compareInclusionListRows,
  inclusionProjectKindDbValues,
  inFilter,
  isInclusionCaseListRow,
  type BisApplicationSource,
} from "@backend/modules/bis/bis-project-kind";

export const dynamic = "force-dynamic";

function InclusionFallback() {
  return (
    <div className="w-full animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
      Loading inclusion cases…
    </div>
  );
}

export default async function BisNewInclusionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = user ? await ensureProfileAccess(supabase, user) : null;
  const isAdmin = Boolean(
    access?.isAdmin || (user && isSuperAdminEmail(user.email)),
  );

  const [inclusionKinds, applicationKinds] = await Promise.all([
    inclusionProjectKindDbValues(supabase),
    applicationProjectKindDbValues(supabase),
  ]);
  const applicationKindFilter = inFilter(applicationKinds);

  const selectCols =
    "id, title, status, project_kind, created_at, updated_at, target_date, client_id, cm_l_digits, license_number, license_validity_date, is_code_id, portal_user_id, portal_password, application_stage, is_qe_managed, clients(name, company_name, email, state), is_codes(is_number, revision_year, is_code_title)";

  const [{ data: inclusionRaw }, { data: licensesRaw }, { data: clientsRaw }] =
    await Promise.all([
      // Pending + completed inclusion cases (completed sort to the bottom in UI).
      supabase
        .from("bis_projects")
        .select(selectCols)
        .in("project_kind", inclusionKinds)
        .order("created_at", { ascending: false })
        .limit(2000),
      // Operative licenses for inclusion picker (any status; must have validity + CM/L client).
      supabase
        .from("bis_projects")
        .select(selectCols)
        .not("project_kind", "in", applicationKindFilter)
        .not("project_kind", "in", inFilter(inclusionKinds))
        .not("license_validity_date", "is", null)
        .not("client_id", "is", null)
        .order("license_validity_date", { ascending: false })
        .limit(2000),
      supabase
        .from("clients")
        .select("id, name, company_name")
        .order("company_name", { ascending: true }),
    ]);

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
      project_kind: (r.project_kind as string | null) ?? "Inclusion",
      cm_l_digits: (r.cm_l_digits as string | null) ?? null,
      license_number: (r.license_number as string | null) ?? null,
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
      application_stage: (r.application_stage as string | null) ?? "Under Preparation",
      notes: null,
      created_at: r.created_at as string | null,
      updated_at: (r.updated_at as string | null) ?? null,
      source: "bis_projects" as BisApplicationSource,
      is_qe_managed: Boolean(r.is_qe_managed),
    };
  }

  const inclusionRows = (inclusionRaw ?? [])
    .map((r) => mapBisRow(r as Record<string, unknown>))
    .filter(isInclusionCaseListRow)
    .sort(compareInclusionListRows);

  const inclusionLicenses = (licensesRaw ?? [])
    .map((r) => mapBisRow(r as Record<string, unknown>))
    .filter((r) => {
      // Exclude in-progress inclusion cases from the picker.
      const kind = (r.project_kind ?? "").toLowerCase();
      return !kind.includes("inclusion");
    })
    .map((r) => ({
      id: r.id,
      title: r.title,
      project_kind: r.project_kind,
      cm_l_digits: r.cm_l_digits,
      license_number: r.license_number,
      license_validity_date: r.license_validity_date,
      client_id: r.client_id,
      client_name: r.client_name,
      is_code_id: r.is_code_id,
      is_number: r.is_number,
      is_revision_year: r.is_revision_year,
      is_code_title: r.is_code_title,
    }));

  const inclusionClients = (clientsRaw ?? [])
    .map((c) => {
      const company = String(c.company_name ?? "").trim();
      const name = String(c.name ?? "").trim();
      return {
        id: String(c.id),
        label: company || name || "Unknown Client",
        filterText: [company, name].filter(Boolean).join(" "),
      };
    })
    .filter((c) => c.id)
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
    );

  return (
    <div className="w-full">
      <Suspense fallback={<InclusionFallback />}>
        <PendingApplicationsSection
          rows={inclusionRows}
          variant="inclusion"
          isAdmin={isAdmin}
          inclusionLicenses={inclusionLicenses}
          inclusionClients={inclusionClients}
        />
      </Suspense>
    </div>
  );
}
