import { redirect } from "next/navigation";
import { createClient } from "@backend/db/client/server";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import {
  applicationProjectKindDbValues,
  inFilter,
} from "@backend/modules/bis/bis-project-kind";
import { dashboardLicenseDateBounds } from "@backend/shared/dashboard-date-bounds";
import { ensureProfileAccess } from "@backend/modules/auth/ensure-access";
import {
  getModulePermission,
  type DashboardModuleKey,
  type ModulePermission,
} from "@backend/modules/auth/modules";
import { fetchUnreadEmailCount } from "@backend/actions/email-accounts";

export const dynamic = "force-dynamic";

const LEGACY_RENEWAL_TABS = new Set(["renewals", "deferred"]);

const ROLE_LABELS: Record<string, string> = {
  admin: "Super Admin",
  inspection_engineer: "Inspection Engineer",
  accountant: "Accountant",
  staff: "Employee",
};

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function roleLabel(slug: string): string {
  if (ROLE_LABELS[slug]) return ROLE_LABELS[slug];
  return slug
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = firstSearchParam(sp, "tab");

  if (tab === "expired") {
    redirect("/dashboard/expired-licenses");
  }
  if (tab && LEGACY_RENEWAL_TABS.has(tab)) {
    redirect("/dashboard/bis-license-renewals");
  }
  if (tab === "applications") redirect("/dashboard/bis-new-applications");
  if (tab === "stop_marking") redirect("/dashboard/license-stop-marking");
  if (tab === "surveillance") redirect("/dashboard/bis-surveillance");
  if (tab === "finance") redirect("/dashboard/finance");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await ensureProfileAccess(supabase, user);
  if (!access) redirect("/login");

  const applicationKinds = await applicationProjectKindDbValues(supabase);
  const applicationKindFilter = inFilter(applicationKinds);
  const { today, yesterday, plus30Days, plus90Days, minus90Days } =
    dashboardLicenseDateBounds();

  const licenseBase = () =>
    supabase
      .from("bis_projects")
      .select("id", { count: "exact", head: true })
      .not("license_validity_date", "is", null)
      .not("project_kind", "in", applicationKindFilter);

  const [
    clientsRes,
    isCodesRes,
    productsRes,
    operativeRes,
    operativeBeyond90Res,
    dueSoonRes,
    renewalWindowRes,
    deferredRes,
    expiredRes,
    applicationsRes,
    stopMarkingRes,
    surveillanceRes,
    quotationsPendingRes,
    taxPendingRes,
    roleRowRes,
    unreadEmail,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("is_codes").select("id", { count: "exact", head: true }),
    supabase.from("product_master_items").select("id", { count: "exact", head: true }),
    licenseBase()
      .gte("license_validity_date", today)
      .or("status.is.null,status.eq.in_progress"),
    licenseBase()
      .gt("license_validity_date", plus90Days)
      .or("status.is.null,status.eq.in_progress"),
    licenseBase()
      .gte("license_validity_date", today)
      .lte("license_validity_date", plus30Days)
      .or("status.is.null,status.eq.in_progress"),
    licenseBase()
      .gt("license_validity_date", plus30Days)
      .lte("license_validity_date", plus90Days)
      .or("status.is.null,status.eq.in_progress"),
    licenseBase()
      .gte("license_validity_date", minus90Days)
      .lte("license_validity_date", yesterday)
      .or("status.is.null,status.eq.in_progress"),
    licenseBase()
      .lt("license_validity_date", minus90Days)
      .or("status.is.null,status.eq.in_progress"),
    supabase
      .from("bis_projects")
      .select("id", { count: "exact", head: true })
      .in("project_kind", applicationKinds)
      .is("license_validity_date", null)
      .or("status.is.null,status.eq.in_progress"),
    supabase
      .from("bis_projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "stop_marking"),
    supabase
      .from("license_surveillance")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("finance_quotations")
      .select("id", { count: "exact", head: true })
      .eq("quotation_status", "pending"),
    supabase
      .from("finance_tax_invoices")
      .select("id", { count: "exact", head: true })
      .eq("tax_status", "pending"),
    supabase
      .from("portal_roles")
      .select("label")
      .eq("slug", access.profile.role)
      .maybeSingle(),
    access.modules.includes("email") || access.isAdmin
      ? fetchUnreadEmailCount()
      : Promise.resolve(0),
  ]);

  const modulePermissions = Object.fromEntries(
    access.modules.map((key) => [
      key,
      access.isAdmin
        ? ("edit" as ModulePermission)
        : getModulePermission(access.profile, key),
    ]),
  ) as Partial<Record<DashboardModuleKey, ModulePermission>>;

  return (
    <DashboardHome
      user={{
        name:
          access.profile.full_name?.trim() ||
          user.email?.split("@")[0] ||
          "User",
        role: access.profile.role,
        roleLabel:
          (roleRowRes.data?.label as string | undefined)?.trim() ||
          roleLabel(access.profile.role),
        isAdmin: access.isAdmin,
      }}
      allowedModules={access.modules}
      modulePermissions={modulePermissions}
      stats={{
        totalClients: clientsRes.count ?? 0,
        totalIsCodes: isCodesRes.count ?? 0,
        totalProducts: productsRes.count ?? 0,
        operative: operativeRes.count ?? 0,
        operativeBeyond90: operativeBeyond90Res.count ?? 0,
        dueSoon: dueSoonRes.count ?? 0,
        renewalWindow: renewalWindowRes.count ?? 0,
        deferred: deferredRes.count ?? 0,
        expired: expiredRes.count ?? 0,
        stopMarking: stopMarkingRes.count ?? 0,
        applications: applicationsRes.count ?? 0,
        surveillance: surveillanceRes.count ?? 0,
        financePending:
          (quotationsPendingRes.count ?? 0) + (taxPendingRes.count ?? 0),
        unreadEmail,
      }}
    />
  );
}
