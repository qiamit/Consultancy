import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/finance", label: "Finance" },
  { href: "/dashboard/bis-projects", label: "BIS projects" },
  { href: "/dashboard/iso-projects", label: "ISO projects" },
  { href: "/dashboard/products", label: "Products & services" },
  { href: "/dashboard/settings/company", label: "Company settings" },
  { href: "/dashboard/settings/app", label: "App settings" },
];

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <Link href="/dashboard" className="block font-semibold text-zinc-900 dark:text-zinc-50">
          Consultancy OS
        </Link>
        <p className="mt-1 truncate text-xs text-zinc-500" title={user?.email ?? ""}>
          {user?.email ?? "—"}
        </p>
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
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
