import { redirect } from "next/navigation";
import { CmsShell } from "@/components/dashboard/cms-shell";
import { getCachedAccess, getCachedUser } from "@backend/modules/auth/cached-access";

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedUser();
  if (!user) redirect("/login");

  const access = await getCachedAccess();
  if (!access?.isAdmin) {
    redirect("/dashboard?error=admin_required");
  }

  return <CmsShell>{children}</CmsShell>;
}
