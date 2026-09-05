export const DASHBOARD_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    inMainNav: true,
  },
  {
    key: "clients",
    label: "Client Master",
    href: "/dashboard/clients",
    inMainNav: true,
  },
  {
    key: "finance",
    label: "Finance Management",
    href: "/dashboard/finance",
    inMainNav: true,
  },
  {
    key: "bis_projects",
    label: "BIS All Projects",
    href: "/dashboard/bis-projects",
    inMainNav: true,
  },
  {
    key: "is_codes",
    label: "IS Code Master",
    href: "/dashboard/is-code-master",
    inMainNav: true,
  },
  {
    key: "test_parameters",
    label: "Test Parameter",
    href: "/dashboard/test-parameters",
    inMainNav: false,
  },
  {
    key: "products",
    label: "Product & Services",
    href: "/dashboard/products",
    inMainNav: true,
  },
  {
    key: "email",
    label: "View Email",
    href: "/dashboard/email",
    inMainNav: true,
  },
  {
    key: "cms",
    label: "Website CMS",
    href: "/dashboard/cms",
    inMainNav: true,
  },
  {
    key: "company_settings",
    label: "Company Settings",
    href: "/dashboard/settings/company",
    inMainNav: false,
    adminOnly: true,
  },
  {
    key: "app_settings",
    label: "App Settings",
    href: "/dashboard/settings/app",
    inMainNav: false,
    adminOnly: true,
  },
  {
    key: "user_management",
    label: "User Management",
    href: "/dashboard/settings/users",
    inMainNav: false,
    adminOnly: true,
  },
] as const;

export type DashboardModuleKey = (typeof DASHBOARD_MODULES)[number]["key"];

export const ALL_MODULE_KEYS: DashboardModuleKey[] = DASHBOARD_MODULES.map((m) => m.key);

export const STAFF_ASSIGNABLE_MODULES = DASHBOARD_MODULES.filter(
  (m) => !("adminOnly" in m && m.adminOnly),
);

export function normalizeModuleAccess(raw: unknown): DashboardModuleKey[] {
  if (!Array.isArray(raw)) return ["dashboard"];
  const allowed = new Set(ALL_MODULE_KEYS);
  const picked = raw.filter(
    (value): value is DashboardModuleKey =>
      typeof value === "string" && allowed.has(value as DashboardModuleKey),
  );
  return Array.from(new Set<DashboardModuleKey>(["dashboard", ...picked]));
}

export function resolveModuleAccess(profile: {
  role: "admin" | "staff";
  module_access?: unknown;
}): DashboardModuleKey[] {
  if (profile.role === "admin") return ALL_MODULE_KEYS;
  return normalizeModuleAccess(profile.module_access);
}

export function canAccessModule(
  profile: { role: "admin" | "staff"; module_access?: unknown },
  moduleKey: DashboardModuleKey,
): boolean {
  return resolveModuleAccess(profile).includes(moduleKey);
}

export function moduleKeyForPath(pathname: string): DashboardModuleKey | null {
  if (pathname.startsWith("/dashboard/settings/users")) return "user_management";
  if (pathname.startsWith("/dashboard/settings/app")) return "app_settings";
  if (pathname.startsWith("/dashboard/settings/company")) return "company_settings";

  const match = DASHBOARD_MODULES.filter((m) => m.inMainNav)
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (m) => pathname === m.href || (m.href !== "/dashboard" && pathname.startsWith(m.href)),
    );

  return match?.key ?? (pathname.startsWith("/dashboard") ? "dashboard" : null);
}

export function parseModuleAccessForm(formData: FormData): DashboardModuleKey[] {
  const picked = STAFF_ASSIGNABLE_MODULES.filter(
    (m) => formData.get(`module_${m.key}`) === "1",
  ).map((m) => m.key);
  return normalizeModuleAccess(picked);
}
