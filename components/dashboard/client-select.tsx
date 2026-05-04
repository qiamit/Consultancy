import { createClient } from "@/lib/supabase/server";

type ClientOption = {
  id: string;
  name: string;
  company_name: string | null;
  contact_person_name: string | null;
};

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
    .select("id,name,company_name,contact_person_name")
    .order("company_name", { ascending: true });

  const rows = (data ?? []) as ClientOption[];

  return (
    <select
      name={name}
      required={required}
      defaultValue={defaultValue ?? ""}
      className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <option value="">No client linked</option>
      {rows.map((c) => {
        const company = c.company_name?.trim();
        const contact = c.contact_person_name?.trim();
        const label = company
          ? contact
            ? `${company} (${contact})`
            : company
          : contact || c.name;
        return (
          <option key={c.id} value={c.id}>
            {label}
          </option>
        );
      })}
    </select>
  );
}
