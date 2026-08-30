"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { DASHBOARD_MODULES, type DashboardModuleKey } from "@backend/modules/auth/modules";
import { useSidebarLayout } from "./sidebar-layout-context";

type NavItem = {
  key: DashboardModuleKey;
  href: string;
  label: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  {
    key: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: "clients",
    href: "/dashboard/clients",
    label: "Client Master",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: "finance",
    href: "/dashboard/finance",
    label: "Finance Management",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "bis_projects",
    href: "/dashboard/bis-projects",
    label: "BIS All Projects",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    key: "is_codes",
    href: "/dashboard/is-code-master",
    label: "IS Code Master",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    key: "test_parameters",
    href: "/dashboard/test-parameters",
    label: "Test Parameter",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "products",
    href: "/dashboard/products",
    label: "Product & Services",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key: "email",
    href: "/dashboard/email",
    label: "View Email",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

function navItemIsActive(pathname: string, href: string): boolean {
  return (
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href))
  );
}

export function SidebarNav({
  isAdmin,
  allowedModules,
}: {
  isAdmin: boolean;
  allowedModules?: DashboardModuleKey[];
}) {
  const pathname = usePathname();
  const { setOpen } = useSidebarLayout();
  // usePathname() can differ between SSR (Suspense/stream) and the first client
  // paint — gate active styles until after hydration so markup matches.
  const [pathReady, setPathReady] = useState(false);
  useEffect(() => {
    setPathReady(true);
  }, []);

  const visibleItems = isAdmin
    ? navItems
    : navItems.filter((item) => (allowedModules ?? ["dashboard"]).includes(item.key));

  function handleLinkClick() {
    if (window.innerWidth < 1024) setOpen(false);
  }

  return (
    <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6 text-sm">
      {visibleItems.map((item) => {
        const isActive = pathReady && navItemIsActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleLinkClick}
            className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.95rem] font-medium transition-all duration-200 ${
              isActive
                ? "bg-sky-500/10 font-semibold text-sky-600 dark:text-sky-400"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-50"
            }`}
          >
            <span
              aria-hidden
              className={`absolute bottom-1/4 left-0 top-1/4 w-1 rounded-r-full bg-sky-500 dark:bg-sky-400 ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            />

            <span
              className={`transition-colors duration-200 ${
                isActive
                  ? "text-sky-500 dark:text-sky-400"
                  : "text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-300"
              }`}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
