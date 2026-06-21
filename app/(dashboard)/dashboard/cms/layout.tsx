"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabs = [
    { name: "Services", href: "/dashboard/cms/services" },
    { name: "News & Updates", href: "/dashboard/cms/news" },
    { name: "Site Settings", href: "/dashboard/cms/settings" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Website Management
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage your public website content, news updates, and contact information.
        </p>
      </div>

      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-sky-500 text-sky-600 dark:text-sky-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
