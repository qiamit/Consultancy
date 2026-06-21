import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarFallback } from "@/components/dashboard/sidebar-fallback";
import {
  MainContentOffset,
  SidebarExpandFab,
  SidebarLayoutProvider,
} from "@/components/dashboard/sidebar-layout-context";
import { MobileTopBar } from "@/components/dashboard/mobile-top-bar";
import { QEAssistantProvider } from "@/components/dashboard/qe-assistant-provider";
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
          {/* Mobile-only top bar with hamburger */}
          <MobileTopBar />
          <main className="px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </MainContentOffset>
        <SidebarExpandFab />
        <QEAssistantProvider />
      </div>
    </SidebarLayoutProvider>
  );
}
