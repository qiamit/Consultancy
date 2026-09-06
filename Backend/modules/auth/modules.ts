export const DASHBOARD_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    inMainNav: true,
  },
  {
    key: "bis_applications",
    label: "BIS New Application",
    href: "/dashboard/bis-new-applications",
    inMainNav: true,
  },
  {
    key: "bis_license_renewals",
    label: "BIS Licenses Renewals",
    href: "/dashboard/bis-license-renewals",
    inMainNav: true,
  },
  {
    key: "license_stop_marking",
    label: "License in Stop Marking",
    href: "/dashboard/license-stop-marking",
    inMainNav: true,
  },
  {
    key: "bis_surveillance",
    label: "BIS Surveillances",
    href: "/dashboard/bis-surveillance",
    inMainNav: true,
  },
  {
    key: "our_bis_licenses",
    label: "QE BIS Licenses",
    href: "/dashboard/our-bis-licenses",
    inMainNav: true,
  },
  {
    key: "bis_projects",
    label: "All BIS Licenses",
    href: "/dashboard/bis-projects",
    inMainNav: true,
  },
  {
    key: "clients",
    label: "Client Master",
    href: "/dashboard/clients",
    inMainNav: true,
  },
  {
    key: "is_codes",
    label: "IS Code Master",
    href: "/dashboard/is-code-master",
    inMainNav: true,
  },
  {
    key: "products",
    label: "Product & Services",
    href: "/dashboard/products",
    inMainNav: true,
  },
  {
    key: "finance",
    label: "Finance Management",
    href: "/dashboard/finance",
    inMainNav: true,
  },
  {
    key: "expired_licenses",
    label: "Expired Licenses",
    href: "/dashboard/expired-licenses",
    inMainNav: false,
  },
  {
    key: "test_parameters",
    label: "Test Parameter",
    href: "/dashboard/test-parameters",
    inMainNav: false,
  },
  {
    key: "email",
    label: "Email",
    href: "/dashboard/email",
    inMainNav: false,
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
  {
    key: "module_access",
    label: "Module Access",
    href: "/dashboard/settings/module-access",
    inMainNav: false,
    adminOnly: true,
  },
] as const;

export type DashboardModuleKey = (typeof DASHBOARD_MODULES)[number]["key"];

/** Per-module permission: Edit = full, View = read-only, None = hidden. */
export type ModulePermission = "edit" | "view" | "none";

export type ModuleAccessMap = Partial<Record<DashboardModuleKey, ModulePermission>>;

export const ALL_MODULE_KEYS: DashboardModuleKey[] = DASHBOARD_MODULES.map((m) => m.key);

export const STAFF_ASSIGNABLE_MODULES = DASHBOARD_MODULES.filter(
  (m) => !("adminOnly" in m && m.adminOnly),
);

const MODULE_KEY_SET = new Set<string>(ALL_MODULE_KEYS);

function isModuleKey(value: string): value is DashboardModuleKey {
  return MODULE_KEY_SET.has(value);
}

function isPermission(value: unknown): value is ModulePermission {
  return value === "edit" || value === "view" || value === "none";
}

/**
 * Normalize stored `profiles.module_access` jsonb.
 * Supports legacy string[] (treated as Edit) and the map form `{ module: "edit"|"view"|"none" }`.
 */
export function normalizeModuleAccessMap(raw: unknown): ModuleAccessMap {
  const result: ModuleAccessMap = { dashboard: "edit" };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string" && isModuleKey(item)) {
        result[item] = "edit";
      }
    }
  } else if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!isModuleKey(key) || !isPermission(value)) continue;
      result[key] = value;
    }
  }

  // Dashboard is always at least Edit for signed-in staff.
  if (!result.dashboard || result.dashboard === "none") {
    result.dashboard = "edit";
  }

  // Expired Licenses split from Renewals — inherit level when missing.
  if (
    result.bis_license_renewals &&
    result.bis_license_renewals !== "none" &&
    !result.expired_licenses
  ) {
    result.expired_licenses = result.bis_license_renewals;
  }

  // Our BIS License portfolio — inherit from Existing Licenses when missing.
  if (
    result.bis_projects &&
    result.bis_projects !== "none" &&
    !result.our_bis_licenses
  ) {
    result.our_bis_licenses = result.bis_projects;
  }

  return result;
}

/** Keys the user may open in the sidebar (Edit or View). */
export function normalizeModuleAccess(raw: unknown): DashboardModuleKey[] {
  const map = normalizeModuleAccessMap(raw);
  const keys = STAFF_ASSIGNABLE_MODULES.map((m) => m.key).filter((key) => {
    const level = map[key] ?? (key === "dashboard" ? "edit" : "none");
    return level === "edit" || level === "view";
  });
  if (!keys.includes("dashboard")) keys.unshift("dashboard");
  return Array.from(new Set(keys));
}

export function getModulePermission(
  profile: { role: string; module_access?: unknown },
  moduleKey: DashboardModuleKey,
): ModulePermission {
  if (profile.role === "admin") return "edit";
  const map = normalizeModuleAccessMap(profile.module_access);
  if (moduleKey === "dashboard") return map.dashboard ?? "edit";
  return map[moduleKey] ?? "none";
}

export function resolveModuleAccess(profile: {
  role: string;
  module_access?: unknown;
}): DashboardModuleKey[] {
  if (profile.role === "admin") return ALL_MODULE_KEYS;
  return normalizeModuleAccess(profile.module_access);
}

export function canAccessModule(
  profile: { role: string; module_access?: unknown },
  moduleKey: DashboardModuleKey,
): boolean {
  return getModulePermission(profile, moduleKey) !== "none";
}

export function canEditModule(
  profile: { role: string; module_access?: unknown },
  moduleKey: DashboardModuleKey,
): boolean {
  return getModulePermission(profile, moduleKey) === "edit";
}

export function moduleKeyForPath(pathname: string): DashboardModuleKey | null {
  if (pathname.startsWith("/dashboard/settings/users")) return "user_management";
  if (pathname.startsWith("/dashboard/settings/module-access")) return "module_access";
  if (pathname.startsWith("/dashboard/settings/app")) return "app_settings";
  if (pathname.startsWith("/dashboard/settings/company")) return "company_settings";
  if (pathname.startsWith("/dashboard/email")) return "email";

  const match = DASHBOARD_MODULES.filter((m) => m.inMainNav || m.key === "email" || m.key === "test_parameters")
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (m) => pathname === m.href || (m.href !== "/dashboard" && pathname.startsWith(m.href)),
    );

  return match?.key ?? (pathname.startsWith("/dashboard") ? "dashboard" : null);
}

export function parseModuleAccessForm(formData: FormData): ModuleAccessMap {
  const map: ModuleAccessMap = { dashboard: "edit" };
  for (const mod of STAFF_ASSIGNABLE_MODULES) {
    const raw = String(formData.get(`module_${mod.key}`) ?? "").trim();
    if (mod.key === "dashboard") {
      map.dashboard = "edit";
      continue;
    }
    if (raw === "edit" || raw === "view" || raw === "none") {
      map[mod.key] = raw;
    } else if (raw === "1") {
      map[mod.key] = "edit";
    } else {
      map[mod.key] = "none";
    }
  }
  return normalizeModuleAccessMap(map);
}
