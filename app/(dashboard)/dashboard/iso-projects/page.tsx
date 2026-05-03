import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function IsoProjectsPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("iso_projects")
    .select(
      "id,title,project_kind,status,accrediting_body,standard,target_date,clients(name,company_name)",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            ISO & accreditation projects
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            NABL, QAI, IQAS, and other bodies — new certifications and surveillance.
          </p>
        </div>
        <Link
          href="/dashboard/iso-projects/new"
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
        >
          New project
        </Link>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Standard</th>
              <th className="px-4 py-3">Accreditor</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {(rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No ISO projects yet.
                </td>
              </tr>
            ) : (
              rows!.map((r) => {
                const raw = r.clients as unknown;
                const client = Array.isArray(raw)
                  ? (raw[0] as { name: string; company_name: string | null } | undefined)
                  : (raw as { name: string; company_name: string | null } | null);
                const clientLabel = client
                  ? client.company_name
                    ? `${client.name} (${client.company_name})`
                    : client.name
                  : "—";
                return (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {r.title}
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-600 dark:text-zinc-300">
                      {String(r.project_kind).replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.standard ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.accrediting_body ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {clientLabel}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {r.target_date ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/iso-projects/${r.id}`}
                        className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
