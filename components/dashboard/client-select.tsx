import { createClient } from "@/lib/supabase/server";

export async function ClientSelect({
  name = "client_id",
  defaultValue,
  required,
}: {
  name?: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id,name,company_name")
    .order("name", { ascending: true });

  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue ?? ""}
      className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <option value="">No client linked</option>
      {(data ?? []).map((c) => (
        <option key={c.id} value={c.id}>
          {c.company_name ? `${c.name} (${c.company_name})` : c.name}
        </option>
      ))}
    </select>
  );
}
