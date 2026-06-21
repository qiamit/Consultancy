"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/lib/actions/auth";
import { useSidebarLayout } from "./sidebar-layout-context";

type FooterNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
};

const footerNavItems: FooterNavItem[] = [
  {
    href: "/dashboard/settings/company",
    label: "Company Settings",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/app",
    label: "App Settings",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/settings/users",
    label: "User Management",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

function FooterLink({
  item,
  onNavigate,
}: {
  item: FooterNavItem;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
        isActive
          ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
      }`}
    >
      <span className={isActive ? "text-sky-500 dark:text-sky-400" : "text-zinc-400"}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function SidebarFooterNav({
  userName,
  userEmail,
  isAdmin,
}: {
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}) {
  const { setOpen } = useSidebarLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const items = footerNavItems.filter((item) => !item.adminOnly || isAdmin);

  function handleNavigate() {
    setMenuOpen(false);
    if (window.innerWidth < 1024) setOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div ref={rootRef} className="relative border-t border-zinc-100 p-3 dark:border-zinc-800/60">
      {menuOpen && (
        <div
          className="absolute bottom-full left-3 right-3 z-50 mb-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          role="menu"
        >
          <div className="space-y-0.5 p-2">
            {items.map((item) => (
              <FooterLink key={item.href} item={item} onNavigate={handleNavigate} />
            ))}
          </div>
          <div className="border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Signed in as
            </p>
            <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400" title={userEmail}>
              {userEmail || "—"}
            </p>
            {isAdmin && (
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
                Super Admin
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-xs font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
        >
          <span className="truncate" title={userName}>
            {userName}
          </span>
          <svg
            className={`ml-auto h-4 w-4 shrink-0 text-zinc-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>

        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            aria-label="Sign out"
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-200 bg-white p-2.5 text-zinc-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
