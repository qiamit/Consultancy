import { AppSettingsTabs } from "@/components/dashboard/app-settings-tabs";
import { createClient } from "@/lib/supabase/server";

function firstSearchParam(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function AppSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const err = firstSearchParam(sp, "error");
  const errMsg =
    err === "db" ? "Could not save settings. Try again." : null;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const initial = (row ?? {}) as Record<string, string | null | undefined>;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          App Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Portal title, prefixes, appearance defaults, currency, and date/time formats.
        </p>
      </div>

      {errMsg ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errMsg}
        </p>
      ) : null}

      <AppSettingsTabs initial={initial} />
    </div>
  );
}
