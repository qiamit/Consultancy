import { createClient } from "@/lib/supabase/server";
import { CmsNewsView } from "@/components/cms/cms-news-view";

export default async function NewsCmsPage() {
  const supabase = await createClient();
  const { data: news } = await supabase.from("website_news").select("*").order("published_date", { ascending: false });

  return (
    <div className="w-full">
      <CmsNewsView initialNews={news || []} />
    </div>
  );
}
