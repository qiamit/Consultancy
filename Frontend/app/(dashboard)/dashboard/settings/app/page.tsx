import { AppSettingsTabs } from "@/components/dashboard/app-settings-tabs";
import { fetchAiModels } from "@backend/actions/ai-models";
import { createClient } from "@backend/db/supabase/server";

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
  const savedTab = firstSearchParam(sp, "tab");
  const saved = firstSearchParam(sp, "saved") === "1";

  const errMsg = err === "db" ? "Could not save settings. Try again." : null;

  const supabase = await createClient();
  const [{ data: row }, aiModels] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    fetchAiModels(),
  ]);

  const initial = (row ?? {}) as Record<string, string | null | undefined>;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-0 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          App Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Portal title, prefixes, appearance defaults, currency, date/time formats, and AI model configuration.
        </p>
      </div>

      {errMsg && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {errMsg}
        </p>
      )}

      {saved && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Settings saved successfully.
        </p>
      )}

      <AppSettingsTabs initial={initial} aiModels={aiModels} initialTab={savedTab} />
    </div>
  );
}
