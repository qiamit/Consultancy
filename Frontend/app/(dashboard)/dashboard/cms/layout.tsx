import { redirect } from "next/navigation";
import { CmsShell } from "@/components/dashboard/cms-shell";
import { ensureProfileAccess } from "@backend/modules/auth/ensure-access";
import { createClient } from "@backend/db/client/server";

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await ensureProfileAccess(supabase, user);
  if (!access?.isAdmin) {
    redirect("/dashboard?error=admin_required");
  }

  return <CmsShell>{children}</CmsShell>;
}
