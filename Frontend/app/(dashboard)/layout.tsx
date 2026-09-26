import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarFallback } from "@/components/dashboard/sidebar-fallback";
import {
  MainContentOffset,
  SidebarLayoutProvider,
} from "@/components/dashboard/sidebar-layout-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { QEAssistantProvider } from "@/components/dashboard/qe-assistant-provider";
import { IsCodePortalAiListener } from "@/components/modules/is-code-master/portal-ai-listener";
import { createClient } from "@backend/db/client/server";

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
      <div className="min-h-dvh bg-background text-foreground">
        <Suspense fallback={<SidebarFallback />}>
          <Sidebar />
        </Suspense>
        <MainContentOffset>
          <Suspense
            fallback={
              <div className="h-[53px] border-b border-zinc-200 dark:border-zinc-800" />
            }
          >
            <DashboardHeader />
          </Suspense>
          <main className="px-[2mm] pt-[2mm] pb-[max(1rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
        </MainContentOffset>
        <IsCodePortalAiListener />
        <QEAssistantProvider />
      </div>
    </SidebarLayoutProvider>
  );
}
