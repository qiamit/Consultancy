"use client";

import Link from "next/link";
import {
  DASHBOARD_MODULES,
  type DashboardModuleKey,
  type ModulePermission,
} from "@backend/modules/auth/modules";

type DashboardStats = {
  totalClients: number;
  totalIsCodes: number;
  totalProducts: number;
  operative: number;
  operativeBeyond90: number;
  dueSoon: number;
  renewalWindow: number;
  deferred: number;
  expired: number;
  stopMarking: number;
  applications: number;
  surveillance: number;
  financePending: number;
  unreadEmail: number;
};

type DashboardUser = {
  name: string;
  role: string;
  roleLabel: string;
  isAdmin: boolean;
};

const MASTER_CARDS = [
  {
    key: "clients" as const,
    module: "clients" as DashboardModuleKey,
    label: "Total Clients",
    sub: "Active client accounts",
    href: "/dashboard/clients",
    addHref: "/dashboard/clients?new=1",
    addLabel: "Add client",
    accent: "sky" as const,
  },
  {
    key: "is_codes" as const,
    module: "is_codes" as DashboardModuleKey,
    label: "Total IS Codes",
    sub: "Indian Standards tracked",
    href: "/dashboard/is-code-master",
    addHref: "/dashboard/is-code-master?new=1",
    addLabel: "Add IS code",
    accent: "emerald" as const,
  },
  {
    key: "products" as const,
    module: "products" as DashboardModuleKey,
    label: "Total Products",
    sub: "Product & service items",
    href: "/dashboard/products",
    addHref: "/dashboard/products?new=1",
    addLabel: "Add product",
    accent: "teal" as const,
  },
];

const ATTENTION_CHIPS = [
  {
    key: "dueSoon" as const,
    module: "bis_license_renewals" as DashboardModuleKey,
    label: "Due soon",
    href: "/dashboard/bis-license-renewals",
    accent: "amber" as const,
  },
  {
    key: "deferred" as const,
    module: "bis_license_renewals" as DashboardModuleKey,
    label: "Deferred",
    href: "/dashboard/bis-license-renewals",
    accent: "blue" as const,
  },
  {
    key: "expired" as const,
    module: "expired_licenses" as DashboardModuleKey,
    label: "Expired",
    href: "/dashboard/expired-licenses",
    accent: "rose" as const,
  },
  {
    key: "stopMarking" as const,
    module: "license_stop_marking" as DashboardModuleKey,
    label: "Stop Marking",
    href: "/dashboard/license-stop-marking",
    accent: "orange" as const,
  },
  {
    key: "applications" as const,
    module: "bis_applications" as DashboardModuleKey,
    label: "Applications",
    href: "/dashboard/bis-new-applications",
    accent: "sky" as const,
  },
];

const PORTFOLIO_SEGMENTS = [
  {
    key: "operativeBeyond90" as const,
    module: "bis_projects" as DashboardModuleKey,
    label: "Operative (>90d)",
    color: "bg-emerald-500",
  },
  {
    key: "dueSoon" as const,
    module: "bis_license_renewals" as DashboardModuleKey,
    label: "Due ≤30d",
    color: "bg-amber-500",
  },
  {
    key: "renewalWindow" as const,
    module: "bis_license_renewals" as DashboardModuleKey,
    label: "Renewal 31–90d",
    color: "bg-sky-500",
  },
  {
    key: "deferred" as const,
    module: "bis_license_renewals" as DashboardModuleKey,
    label: "Deferred",
    color: "bg-blue-500",
  },
  {
    key: "expired" as const,
    module: "expired_licenses" as DashboardModuleKey,
    label: "Expired",
    color: "bg-rose-500",
  },
  {
    key: "stopMarking" as const,
    module: "license_stop_marking" as DashboardModuleKey,
    label: "Stop Marking",
    color: "bg-orange-500",
  },
];

const OPS_CARDS = [
  {
    key: "operative" as const,
    module: "bis_projects" as DashboardModuleKey,
    label: "Operative Licenses",
    sub: "Valid today and beyond",
    href: "/dashboard/bis-projects",
    accent: "emerald" as const,
  },
  {
    key: "surveillance" as const,
    module: "bis_surveillance" as DashboardModuleKey,
    label: "Surveillance",
    sub: "Inspection / visit records",
    href: "/dashboard/bis-surveillance",
    accent: "violet" as const,
  },
  {
    key: "financePending" as const,
    module: "finance" as DashboardModuleKey,
    label: "Finance Pending",
    sub: "Open quotations & tax invoices",
    href: "/dashboard/finance",
    accent: "indigo" as const,
  },
  {
    key: "unreadEmail" as const,
    module: "email" as DashboardModuleKey,
    label: "Unread Email",
    sub: "Inbox messages waiting",
    href: "/dashboard/email",
    accent: "sky" as const,
  },
];

const ACCENT = {
  sky: {
    card: "border-sky-200/70 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900/50 dark:from-sky-950/40 dark:to-zinc-900",
    label: "text-sky-700 dark:text-sky-300",
    value: "text-sky-950 dark:text-sky-50",
    bar: "bg-sky-500",
    btn: "bg-sky-600 hover:bg-sky-500 text-white",
    chip: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  },
  emerald: {
    card: "border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-zinc-900",
    label: "text-emerald-700 dark:text-emerald-300",
    value: "text-emerald-950 dark:text-emerald-50",
    bar: "bg-emerald-500",
    btn: "bg-emerald-600 hover:bg-emerald-500 text-white",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  teal: {
    card: "border-teal-200/70 bg-gradient-to-br from-teal-50 to-white dark:border-teal-900/50 dark:from-teal-950/40 dark:to-zinc-900",
    label: "text-teal-700 dark:text-teal-300",
    value: "text-teal-950 dark:text-teal-50",
    bar: "bg-teal-500",
    btn: "bg-teal-600 hover:bg-teal-500 text-white",
    chip: "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200",
  },
  amber: {
    card: "border-amber-200/70 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/50 dark:from-amber-950/40 dark:to-zinc-900",
    label: "text-amber-800 dark:text-amber-300",
    value: "text-amber-950 dark:text-amber-50",
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  },
  blue: {
    card: "border-blue-200/70 bg-gradient-to-br from-blue-50 to-white dark:border-blue-900/50 dark:from-blue-950/40 dark:to-zinc-900",
    label: "text-blue-700 dark:text-blue-300",
    value: "text-blue-950 dark:text-blue-50",
    bar: "bg-blue-500",
    chip: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  },
  orange: {
    card: "border-orange-200/70 bg-gradient-to-br from-orange-50 to-white dark:border-orange-900/50 dark:from-orange-950/40 dark:to-zinc-900",
    label: "text-orange-800 dark:text-orange-300",
    value: "text-orange-950 dark:text-orange-50",
    bar: "bg-orange-500",
    chip: "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200",
  },
  rose: {
    card: "border-rose-200/70 bg-gradient-to-br from-rose-50 to-white dark:border-rose-900/50 dark:from-rose-950/40 dark:to-zinc-900",
    label: "text-rose-700 dark:text-rose-300",
    value: "text-rose-950 dark:text-rose-50",
    bar: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  },
  violet: {
    card: "border-violet-200/70 bg-gradient-to-br from-violet-50 to-white dark:border-violet-900/50 dark:from-violet-950/40 dark:to-zinc-900",
    label: "text-violet-700 dark:text-violet-300",
    value: "text-violet-950 dark:text-violet-50",
    bar: "bg-violet-500",
    chip: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  },
  indigo: {
    card: "border-indigo-200/70 bg-gradient-to-br from-indigo-50 to-white dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-zinc-900",
    label: "text-indigo-700 dark:text-indigo-300",
    value: "text-indigo-950 dark:text-indigo-50",
    bar: "bg-indigo-500",
    chip: "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200",
  },
} as const;

function formatToday(): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function greetingForNow(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function canSee(
  allowed: ReadonlySet<DashboardModuleKey>,
  module: DashboardModuleKey,
): boolean {
  return allowed.has(module);
}

function canEditModule(
  permissions: Partial<Record<DashboardModuleKey, ModulePermission>>,
  isAdmin: boolean,
  module: DashboardModuleKey,
): boolean {
  if (isAdmin) return true;
  return permissions[module] === "edit";
}

export function DashboardHome({
  user,
  allowedModules,
  modulePermissions,
  stats,
}: {
  user: DashboardUser;
  allowedModules: DashboardModuleKey[];
  modulePermissions: Partial<Record<DashboardModuleKey, ModulePermission>>;
  stats: DashboardStats;
}) {
  const allowed = new Set(allowedModules);

  const attentionChips = ATTENTION_CHIPS.filter((c) => canSee(allowed, c.module));
  const attentionTotal = attentionChips.reduce(
    (sum, chip) => sum + stats[chip.key],
    0,
  );

  const portfolio = PORTFOLIO_SEGMENTS.filter((s) => canSee(allowed, s.module)).map(
    (s) => ({
      ...s,
      value: stats[s.key],
    }),
  );
  const portfolioTotal = portfolio.reduce((sum, s) => sum + s.value, 0);

  const masterCards = MASTER_CARDS.filter((c) => canSee(allowed, c.module));
  const opsCards = OPS_CARDS.filter((c) => canSee(allowed, c.module));

  const quickLinks = DASHBOARD_MODULES.filter(
    (m) => canSee(allowed, m.key) && (m.inMainNav || m.key === "email"),
  );

  const showFinanceCta = canSee(allowed, "finance");

  const masterValues = {
    clients: stats.totalClients,
    is_codes: stats.totalIsCodes,
    products: stats.totalProducts,
  };

  return (
    <div className="relative w-full space-y-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-2 h-48 rounded-3xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-100/70 via-transparent to-transparent dark:from-sky-950/40"
      />

      <header className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-400/90">
            Overview
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            {greetingForNow()}, {user.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
              {user.roleLabel}
            </span>
            <span>{formatToday()}</span>
            {attentionChips.length > 0 ? (
              <span>
                · {attentionTotal.toLocaleString("en-IN")} items need attention
              </span>
            ) : null}
          </div>
        </div>
        {showFinanceCta ? (
          <Link
            href="/dashboard/finance"
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
          >
            Open Finance
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : null}
      </header>

      {attentionChips.length > 0 ? (
        <section className="relative space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Needs attention
          </h2>
          <div className="flex flex-wrap gap-2">
            {attentionChips.map((chip) => {
              const accent = ACCENT[chip.accent];
              const value = stats[chip.key];
              return (
                <Link
                  key={chip.key}
                  href={chip.href}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 ${accent.chip}`}
                >
                  <span>{chip.label}</span>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 tabular-nums dark:bg-zinc-950/50">
                    {value.toLocaleString("en-IN")}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {portfolio.length > 0 ? (
        <section className="relative space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              License portfolio
            </h2>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {portfolioTotal.toLocaleString("en-IN")} tracked
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {portfolioTotal > 0
                ? portfolio.map((seg) => {
                    const pct = (seg.value / portfolioTotal) * 100;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={seg.key}
                        className={`${seg.color} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${seg.label}: ${seg.value.toLocaleString("en-IN")}`}
                      />
                    );
                  })
                : null}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio.map((seg) => {
                const pct =
                  portfolioTotal > 0
                    ? Math.round((seg.value / portfolioTotal) * 100)
                    : 0;
                return (
                  <div
                    key={seg.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${seg.color}`} />
                      <span className="truncate text-zinc-700 dark:text-zinc-300">
                        {seg.label}
                      </span>
                    </div>
                    <span className="shrink-0 tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {seg.value.toLocaleString("en-IN")}
                      <span className="ml-1 text-[11px] font-medium text-zinc-400">
                        {pct}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {masterCards.length > 0 ? (
        <section className="relative space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Master Data
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {masterCards.map((card) => {
              const accent = ACCENT[card.accent];
              const edit = canEditModule(
                modulePermissions,
                user.isAdmin,
                card.module,
              );
              return (
                <div
                  key={card.key}
                  className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${accent.card}`}
                >
                  <div className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`} />
                  <Link href={card.href} className="block">
                    <p className={`text-xs font-bold uppercase tracking-wider ${accent.label}`}>
                      {card.label}
                    </p>
                    <p className={`mt-2 text-4xl font-extrabold tabular-nums tracking-tight ${accent.value}`}>
                      {masterValues[card.key].toLocaleString("en-IN")}
                    </p>
                    <p className={`mt-1 text-sm ${accent.label} opacity-80`}>{card.sub}</p>
                  </Link>
                  <div className="mt-4 flex gap-2">
                    {edit ? (
                      <Link
                        href={card.addHref}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${accent.btn}`}
                      >
                        {card.addLabel}
                      </Link>
                    ) : null}
                    <Link
                      href={card.href}
                      className="rounded-lg border border-zinc-200/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      View all
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {opsCards.length > 0 ? (
        <section className="relative space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Operations & finance
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {opsCards.map((card) => {
              const accent = ACCENT[card.accent];
              const value = stats[card.key];
              return (
                <Link
                  key={card.key}
                  href={card.href}
                  className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${accent.card}`}
                >
                  <div className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`} />
                  <p className={`text-[11px] font-bold uppercase tracking-wider sm:text-xs ${accent.label}`}>
                    {card.label}
                  </p>
                  <p className={`mt-2 text-3xl font-extrabold tabular-nums sm:text-4xl ${accent.value}`}>
                    {value.toLocaleString("en-IN")}
                  </p>
                  <p className={`mt-1 text-xs font-medium leading-snug sm:text-sm ${accent.label} opacity-80`}>
                    {card.sub}
                  </p>
                  <span className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${accent.label}`}>
                    Open
                    <svg
                      className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {quickLinks.length > 0 ? (
        <section className="relative space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Quick Access
          </h2>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-sky-700 dark:hover:text-sky-300"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
