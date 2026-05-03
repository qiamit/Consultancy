import Link from "next/link";
import { notFound } from "next/navigation";
import { updateClientRecord } from "@/lib/actions/clients";
import { createClient } from "@/lib/supabase/server";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !client) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard/clients"
          className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
        >
          ← Clients
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {client.name}
        </h1>
      </div>

      <form
        action={updateClientRecord.bind(null, id)}
        className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <Field
          label="Name"
          name="name"
          defaultValue={client.name}
          required
        />
        <Field
          label="Company name"
          name="company_name"
          defaultValue={client.company_name ?? ""}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={client.email ?? ""}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          defaultValue={client.phone ?? ""}
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Address
          </label>
          <textarea
            name="address"
            rows={3}
            defaultValue={client.address ?? ""}
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
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
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
    </div>
  );
}
