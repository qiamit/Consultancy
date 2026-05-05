import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarFallback } from "@/components/dashboard/sidebar-fallback";
import {
  MainContentOffset,
  SidebarExpandFab,
  SidebarLayoutProvider,
} from "@/components/dashboard/sidebar-layout-context";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <SidebarLayoutProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Suspense fallback={<SidebarFallback />}>
          <Sidebar />
        </Suspense>
        <MainContentOffset>
          <main className="px-4 py-8 text-left sm:px-6 lg:px-10">{children}</main>
        </MainContentOffset>
        <SidebarExpandFab />
      </div>
    </SidebarLayoutProvider>
  );
}
