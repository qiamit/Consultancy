import { createClient } from "@backend/db/client/server";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import {
  applicationProjectKindDbValues,
  isPendingApplicationRow,
  inFilter,
  type BisApplicationSource,
} from "@backend/modules/bis/bis-project-kind";
import { dashboardLicenseDateBounds } from "@backend/shared/dashboard-date-bounds";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const supabase = await createClient();
  const applicationKinds = await applicationProjectKindDbValues(supabase);
  const applicationKindFilter = inFilter(applicationKinds);

  const { today, plus90Days, minus90Days, before90Days } = dashboardLicenseDateBounds();

  const [
    clientsRes,
    isCodesRes,
    productsRes,
    renewalsRes,
    applicationsRes,
    deferredRes,
    stopMarkingRes,
    cancelledRes,
    expiredRes,
    quotationsRes,
    salesOrdersRes,
    taxInvoicesRes,
    proformaRes,
    creditNotesRes,
    statementsRes,
    surveillanceRes,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("is_codes").select("id", { count: "exact", head: true }),
    supabase.from("product_master_items").select("id", { count: "exact", head: true }),
    // Pending renewals: License (not application) with validity today → today+90
    supabase
      .from("bis_projects")
      .select("id, title, status, project_kind, cm_l_digits, license_number, license_validity_date, target_date, client_id, is_code_id, notes, clients(name, company_name, email), is_codes(is_number, revision_year, is_code_title)")
      .not("license_validity_date", "is", null)
      .not("project_kind", "in", applicationKindFilter)
      .gte("license_validity_date", today)
      .lte("license_validity_date", plus90Days)
      .or("status.is.null,status.eq.in_progress")
      .order("license_validity_date", { ascending: true }),
    // Pending applications: Application type only, not yet converted to a license
    supabase
      .from("bis_projects")
      .select("id, title, status, project_kind, created_at, target_date, client_id, cm_l_digits, license_validity_date, is_code_id, notes, clients(name, company_name, email), is_codes(is_number, revision_year, is_code_title)")
      .in("project_kind", applicationKinds)
      .is("license_validity_date", null)
      .or("status.is.null,status.eq.in_progress")
      .order("created_at", { ascending: false }),
    // Deferred: License (not application), validity crossed but within 90 days grace
    supabase
      .from("bis_projects")
      .select("id, title, status, project_kind, cm_l_digits, license_number, license_validity_date, target_date, client_id, is_code_id, notes, clients(name, company_name, email), is_codes(is_number, revision_year, is_code_title)")
      .not("license_validity_date", "is", null)
      .not("project_kind", "in", applicationKindFilter)
      .lt("license_validity_date", today)
      .gte("license_validity_date", minus90Days)
      .or("status.is.null,status.eq.in_progress")
      .order("license_validity_date", { ascending: true }),
    // Stop Marking (non-compliance)
    supabase
      .from("bis_projects")
      .select("id, title, status, project_kind, cm_l_digits, license_number, license_validity_date, target_date, client_id, is_code_id, notes, clients(name, company_name, email), is_codes(is_number, revision_year, is_code_title)")
      .eq("status", "stop_marking")
      .order("license_validity_date", { ascending: true }),
    // Cancelled
    supabase
      .from("bis_projects")
      .select("id, title, status, license_number, license_validity_date, target_date, client_id, clients(name, company_name, email)")
      .eq("status", "cancelled")
      .order("updated_at", { ascending: false }),
    // Expired: validity > 90 days past, only normal/auto status
    supabase
      .from("bis_projects")
      .select("id, title, status, project_kind, cm_l_digits, license_number, license_validity_date, target_date, client_id, is_code_id, notes, clients(name, company_name, email), is_codes(is_number, revision_year, is_code_title)")
      .not("license_validity_date", "is", null)
      .not("project_kind", "in", applicationKindFilter)
      .lt("license_validity_date", before90Days)
      .or("status.is.null,status.eq.in_progress")
      .order("license_validity_date", { ascending: false }),
    supabase.from("finance_quotations").select("id", { count: "exact", head: true }),
    supabase.from("finance_sales_orders").select("id", { count: "exact", head: true }),
    supabase.from("finance_tax_invoices").select("id", { count: "exact", head: true }),
    supabase.from("finance_proforma_invoices").select("id", { count: "exact", head: true }),
    supabase.from("finance_credit_notes").select("id", { count: "exact", head: true }),
    supabase.from("finance_customer_statements").select("id", { count: "exact", head: true }),
    supabase
      .from("license_surveillance")
      .select(
        "id, surveillance_date, allotted_employee_name, cm_l_digits, project_kind, client_id, bis_project_id, is_code_id, created_at, clients(name, company_name, email), is_codes(is_number, revision_year, is_code_title)",
      )
      .order("surveillance_date", { ascending: false })
      .limit(200),
  ]);

  type ClientJoin = {
    name: string | null;
    company_name: string | null;
    email: string | null;
  } | null;

  function mapBisRow(r: Record<string, unknown>) {
    const c = (Array.isArray(r.clients) ? r.clients[0] : r.clients) as ClientJoin;
    type IsCodeJoin = { is_number?: string; revision_year?: number; is_code_title?: string } | null;
    const ic = (Array.isArray(r.is_codes) ? r.is_codes[0] : r.is_codes) as IsCodeJoin;
    return {
      id: r.id as string,
      title: r.title as string,
      status: r.status as string,
      project_kind: (r.project_kind as string | null) ?? "licence",
      cm_l_digits: (r.cm_l_digits as string | null) ?? null,
      license_number: r.license_number as string | null,
      license_validity_date: r.license_validity_date as string | null,
      target_date: r.target_date as string | null,
      client_id: r.client_id as string | null,
      client_name: c?.company_name ?? c?.name ?? "Unknown Client",
      client_email: (c?.email ?? "").trim() || null,
      is_number: ic?.is_number ?? null,
      is_revision_year: ic?.revision_year ?? null,
      is_code_title: ic?.is_code_title ?? null,
      is_code_id: (r.is_code_id as string | null) ?? null,
      notes: r.notes as string | null,
    };
  }

  const renewalRows = (renewalsRes.data ?? []).map(mapBisRow);
  const applicationRows = (applicationsRes.data ?? [])
    .map((r) => ({
      ...mapBisRow(r as Record<string, unknown>),
      created_at: r.created_at as string | null,
      source: "bis_projects" as BisApplicationSource,
    }))
    .filter(isPendingApplicationRow)
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  const deferredRows = (deferredRes.data ?? []).map(mapBisRow);
  const stopMarkingRows = (stopMarkingRes.data ?? []).map(mapBisRow);
  const cancelledRows = (cancelledRes.data ?? []).map(mapBisRow);
  const expiredRows = (expiredRes.data ?? []).map(mapBisRow);

  const surveillanceRows = (surveillanceRes.data ?? []).map((r) => {
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

  const financeModules = [
    { label: "Quotations",          count: quotationsRes.count ?? 0,    href: "/dashboard/finance/sales/quotations",          color: "text-sky-600 dark:text-sky-400",     bg: "bg-sky-50 dark:bg-sky-950/30" },
    { label: "Sales Orders",        count: salesOrdersRes.count ?? 0,   href: "/dashboard/finance/sales/sales-orders",        color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
    { label: "Tax Invoices",        count: taxInvoicesRes.count ?? 0,   href: "/dashboard/finance/sales/tax-invoices",        color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Proforma Invoices",   count: proformaRes.count ?? 0,      href: "/dashboard/finance/sales/proforma-invoices",   color: "text-teal-600 dark:text-teal-400",   bg: "bg-teal-50 dark:bg-teal-950/30" },
    { label: "Credit Notes",        count: creditNotesRes.count ?? 0,   href: "/dashboard/finance/sales/credit-notes",        color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
    { label: "Customer Statements", count: statementsRes.count ?? 0,    href: "/dashboard/finance/sales/customer-statements", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  ];

  return (
    <div className="w-full">
      <DashboardTabs
        financeModules={financeModules}
        renewalRows={renewalRows}
        applicationRows={applicationRows}
        deferredRows={deferredRows}
        stopMarkingRows={stopMarkingRows}
        surveillanceRows={surveillanceRows}
        expiredRows={expiredRows}
        cancelledRows={cancelledRows}
        stats={{
          totalClients: clientsRes.count ?? 0,
          totalIsCodes: isCodesRes.count ?? 0,
          totalProducts: productsRes.count ?? 0,
        }}
      />
    </div>
  );
}
