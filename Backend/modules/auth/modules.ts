export type StaffModuleGroup = "core" | "bis" | "masters" | "tools";

export const STAFF_MODULE_GROUPS: { id: StaffModuleGroup; label: string }[] = [
  { id: "core", label: "Home" },
  { id: "bis", label: "BIS Operations" },
  { id: "masters", label: "Masters" },
  { id: "tools", label: "Tools" },
];

export const DASHBOARD_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    inMainNav: true,
    group: "core" as StaffModuleGroup,
  },
  {
    key: "bis_applications",
    label: "BIS New Application",
    href: "/dashboard/bis-new-applications",
    inMainNav: true,
    group: "bis" as StaffModuleGroup,
  },
  {
    key: "bis_new_inclusion",
    label: "BIS New Inclusion",
    href: "/dashboard/bis-new-inclusion",
    inMainNav: true,
    group: "bis" as StaffModuleGroup,
  },
  {
    key: "bis_license_renewals",
    label: "BIS Licenses Renewals",
    href: "/dashboard/bis-license-renewals",
    inMainNav: true,
    group: "bis" as StaffModuleGroup,
  },
  {
    key: "license_stop_marking",
    label: "License in Stop Marking",
    href: "/dashboard/license-stop-marking",
    inMainNav: true,
    group: "bis" as StaffModuleGroup,
  },
  {
    key: "bis_surveillance",
    label: "BIS Surveillances",
    href: "/dashboard/bis-surveillance",
    inMainNav: true,
    group: "bis" as StaffModuleGroup,
  },
  {
    key: "bis_sample_failure_reply",
    label: "BIS Sample Failure Reply",
    href: "/dashboard/bis-sample-failure-reply",
    inMainNav: true,
    group: "bis" as StaffModuleGroup,
  },
  {
    key: "our_bis_licenses",
    label: "QE BIS Licenses",
    href: "/dashboard/our-bis-licenses",
    inMainNav: true,
    group: "bis" as StaffModuleGroup,
  },
  {
    key: "bis_projects",
    label: "All BIS Licenses",
    href: "/dashboard/bis-projects",
    inMainNav: true,
    group: "bis" as StaffModuleGroup,
  },
  {
    key: "expired_licenses",
    label: "Expired Licenses",
    href: "/dashboard/expired-licenses",
    inMainNav: true,
    group: "bis" as StaffModuleGroup,
  },
  {
    key: "clients",
    label: "Client Master",
    href: "/dashboard/clients",
    inMainNav: true,
    group: "masters" as StaffModuleGroup,
  },
  {
    key: "is_codes",
    label: "IS Code Master",
    href: "/dashboard/is-code-master",
    inMainNav: true,
    group: "masters" as StaffModuleGroup,
  },
  {
    key: "products",
    label: "Product & Services",
    href: "/dashboard/products",
    inMainNav: true,
    group: "masters" as StaffModuleGroup,
  },
  {
    key: "test_parameters",
    label: "Test Parameter",
    href: "/dashboard/test-parameters",
    inMainNav: true,
    group: "masters" as StaffModuleGroup,
  },
  {
    key: "finance",
    label: "Finance Management",
    href: "/dashboard/finance",
    inMainNav: true,
    group: "tools" as StaffModuleGroup,
  },
  {
    key: "email",
    label: "Email",
    href: "/dashboard/email",
    inMainNav: true,
    group: "tools" as StaffModuleGroup,
  },
  {
    key: "cms",
    label: "Website CMS",
    href: "/dashboard/cms",
    inMainNav: true,
    group: "tools" as StaffModuleGroup,
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

  // Inclusion — inherit from New Application when missing.
  if (
    result.bis_applications &&
    result.bis_applications !== "none" &&
    !result.bis_new_inclusion
  ) {
    result.bis_new_inclusion = result.bis_applications;
  }

  return result;
}

/** Every staff module gets an explicit Edit / View / None value. */
export function completeStaffModuleAccessMap(raw: unknown): ModuleAccessMap {
  const normalized = normalizeModuleAccessMap(raw);
  const result: ModuleAccessMap = { dashboard: "edit" };
  for (const mod of STAFF_ASSIGNABLE_MODULES) {
    if (mod.key === "dashboard") {
      result.dashboard = "edit";
      continue;
    }
    result[mod.key] = normalized[mod.key] ?? "none";
  }
  return result;
}

/** Sensible defaults when a new Inspection Engineer or Accountant is created. */
export function defaultModuleAccessForRole(role: string): ModuleAccessMap {
  const map = completeStaffModuleAccessMap({});
  const slug = role.trim().toLowerCase();

  if (slug === "accountant") {
    map.finance = "edit";
    map.clients = "view";
    map.bis_projects = "view";
    map.our_bis_licenses = "view";
    map.expired_licenses = "view";
    map.email = "view";
    return map;
  }

  if (slug === "inspection_engineer" || slug === "staff") {
    for (const mod of STAFF_ASSIGNABLE_MODULES) {
      if (mod.key === "dashboard") {
        map.dashboard = "edit";
      } else if (mod.key === "finance" || mod.key === "cms") {
        map[mod.key] = "none";
      } else {
        map[mod.key] = "edit";
      }
    }
    return map;
  }

  return map;
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

  const match = [...DASHBOARD_MODULES]
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
  return completeStaffModuleAccessMap(map);
}
