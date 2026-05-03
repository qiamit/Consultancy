import { updateServiceOffering } from "@/lib/actions/settings";
import { createClient } from "@/lib/supabase/server";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("service_offerings")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Products &amp; services
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Catalog of what you offer (BIS, ISO 17025, management systems, testing,
          calibration). Edit labels and toggle visibility.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error.message}
        </p>
      )}

      <div className="space-y-4">
        {(rows ?? []).map((row) => (
          <form
            key={row.id}
            action={updateServiceOffering.bind(null, row.id)}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-4">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Name
                </label>
                <input
                  name="name"
                  required
                  defaultValue={row.name}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div className="lg:col-span-3">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Category
                </label>
                <input
                  name="category"
                  defaultValue={row.category ?? ""}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Sort order
                </label>
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={row.sort_order}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div className="flex items-center gap-2 lg:col-span-2">
                <input
                  id={`active-${row.id}`}
                  name="is_active"
                  type="checkbox"
                  value="on"
                  defaultChecked={row.is_active}
                  className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                />
                <label
                  htmlFor={`active-${row.id}`}
                  className="text-sm text-zinc-700 dark:text-zinc-300"
                >
                  Active
                </label>
              </div>
              <div className="lg:col-span-1 flex lg:justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  Save
                </button>
              </div>
              <div className="md:col-span-2 lg:col-span-12">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={row.description ?? ""}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
