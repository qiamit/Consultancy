import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardHomePage() {
  const supabase = await createClient();

  const [clients, bis, iso, txns] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("bis_projects").select("id", { count: "exact", head: true }),
    supabase.from("iso_projects").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Clients", count: clients.count ?? 0, href: "/dashboard/clients" },
    { label: "BIS projects", count: bis.count ?? 0, href: "/dashboard/bis-projects" },
    { label: "ISO projects", count: iso.count ?? 0, href: "/dashboard/iso-projects" },
    { label: "Finance entries", count: txns.count ?? 0, href: "/dashboard/finance" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Track BIS licensing (new, renewal, inclusion, maintenance), ISO programmes,
          testing and calibration engagements, and finances in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-700"
          >
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {s.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {s.count}
            </p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Quick links
        </h2>
        <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <li>
            <a
              href="https://www.manakonline.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
            >
              MANAK online
            </a>
          </li>
          <li>
            <a
              href="https://www.bis.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
            >
              BIS (Gov)
            </a>
          </li>
          <li>
            <a
              href="https://nabl-india.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
            >
              NABL
            </a>
          </li>
          <li>
            <a
              href="https://nablwp.qci.org.in/Home/login"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
            >
              NABL portal (QCI)
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
