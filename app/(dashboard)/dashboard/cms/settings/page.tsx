import { createClient } from "@/lib/supabase/server";
import { CmsSettingsView } from "@/components/cms/cms-settings-view";

export default async function SettingsCmsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("website_settings").select("*").eq("id", 1).maybeSingle();

  return (
    <div className="w-full">
      <CmsSettingsView initialSettings={settings || {}} />
    </div>
  );
}
