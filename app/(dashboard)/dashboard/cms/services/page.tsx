import { createClient } from "@/lib/supabase/server";
import { CmsServicesView } from "@/components/cms/cms-services-view";

export default async function ServicesCmsPage() {
  const supabase = await createClient();
  const { data: services } = await supabase.from("website_services").select("*").order("created_at", { ascending: false });

  return (
    <div className="w-full">
      <CmsServicesView initialServices={services || []} />
    </div>
  );
}
