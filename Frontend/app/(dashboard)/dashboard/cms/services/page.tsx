import { createClient } from "@backend/db/client/server";
import { CmsServicesView } from "@/components/cms/cms-services-view";
import type { CmsServiceRow } from "@backend/shared/types/cms";

export default async function ServicesCmsPage() {
  const supabase = await createClient();
  const { data: services } = await supabase.from("website_services").select("*").order("created_at", { ascending: false });

  return (
    <div className="w-full">
      <CmsServicesView initialServices={(services ?? []) as CmsServiceRow[]} />
    </div>
  );
}
