import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { SidebarAside } from "./sidebar-aside";
import { SidebarToggleButton } from "./sidebar-toggle-button";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/clients", label: "Client Master" },
  { href: "/dashboard/finance", label: "Finance Management" },
  { href: "/dashboard/bis-projects", label: "BIS Existing Licenses" },
  { href: "/dashboard/bis-new-applications", label: "BIS New Application" },
  { href: "/dashboard/is-code-master", label: "IS Code Master" },
  { href: "/dashboard/products", label: "Product & Services" },
  { href: "/dashboard/settings/company", label: "Company Settings" },
  { href: "/dashboard/settings/app", label: "App Settings" },
];

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <SidebarAside>
      <div className="flex items-start gap-2 border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <Link
            href="/dashboard"
            className="block text-[15px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50"
          >
            Smart Consultancy Manager
          </Link>
        </div>
        <SidebarToggleButton />
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 text-sm">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <p
          className="mb-3 truncate px-1 text-xs text-zinc-500 dark:text-zinc-400"
          title={user?.email ?? ""}
        >
          {user?.email ?? "—"}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </div>
    </SidebarAside>
  );
}
