import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientSelect } from "@/components/dashboard/client-select";
import { updateBisProject } from "@/lib/actions/bis-projects";
import { uploadBisDocument } from "@/lib/actions/documents";
import { createClient } from "@/lib/supabase/server";

const kinds = [
  { value: "new_license", label: "New license" },
  { value: "renewal", label: "Renewal" },
  { value: "inclusion", label: "New inclusion" },
  { value: "maintenance", label: "Maintenance" },
];

const statuses = [
  { value: "lead", label: "Lead" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
  { value: "cancelled", label: "Cancelled" },
];

export default async function BisProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("bis_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) notFound();

  const { data: docs } = await supabase
    .from("project_documents")
    .select("id,storage_path,file_name,created_at")
    .eq("bis_project_id", id)
    .order("created_at", { ascending: false });

  const signed = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data: signedUrl } = await supabase.storage
        .from("documents")
        .createSignedUrl(d.storage_path, 3600);
      return { ...d, href: signedUrl?.signedUrl ?? null };
    }),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <Link
          href="/dashboard/bis-projects"
          className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
        >
          ← BIS projects
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {row.title}
        </h1>
      </div>

      <form
        action={updateBisProject.bind(null, id)}
        className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Title
          </label>
          <input
            name="title"
            required
            defaultValue={row.title}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Project type
            </label>
            <select
              name="project_kind"
              required
              defaultValue={row.project_kind}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {kinds.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Status
            </label>
            <select
              name="status"
              defaultValue={row.status}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Client
          </label>
          <ClientSelect defaultValue={row.client_id} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            License number
          </label>
          <input
            name="license_number"
            defaultValue={row.license_number ?? ""}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Start date
            </label>
            <input
              name="start_date"
              type="date"
              defaultValue={row.start_date ?? ""}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Target date
            </label>
            <input
              name="target_date"
              type="date"
              defaultValue={row.target_date ?? ""}
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={row.notes ?? ""}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
        >
          Save changes
        </button>
      </form>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Documents
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Files are stored in your Supabase Storage bucket{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
            documents
          </code>
          .
        </p>
        <form
          action={uploadBisDocument.bind(null, id)}
          encType="multipart/form-data"
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <div className="min-w-[200px] flex-1 space-y-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Upload file
            </label>
            <input
              type="file"
              name="file"
              required
              className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:text-zinc-200 dark:file:border-zinc-600 dark:file:bg-zinc-900"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Upload
          </button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {signed.length === 0 ? (
            <li className="text-zinc-500">No documents yet.</li>
          ) : (
            signed.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
              >
                <span className="truncate text-zinc-800 dark:text-zinc-100">
                  {d.file_name ?? d.storage_path}
                </span>
                {d.href ? (
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-medium text-sky-600 hover:underline dark:text-sky-400"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-zinc-400">No link</span>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
