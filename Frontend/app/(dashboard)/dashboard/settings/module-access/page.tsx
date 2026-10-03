import { redirect } from "next/navigation";
import { ModuleAccessPanel } from "@/components/dashboard/module-access-panel";
import { getCachedAccess, getCachedUser } from "@backend/modules/auth/cached-access";
import { fetchStaffUsers } from "@backend/actions/user-management";

export default async function ModuleAccessPage() {
  const user = await getCachedUser();
  if (!user) redirect("/login");

  const access = await getCachedAccess();
  if (!access?.isAdmin) {
    redirect("/dashboard?error=admin_required");
  }

  const result = await fetchStaffUsers();

  return (
    <div className="mx-2.5 flex h-full min-h-0 flex-col gap-4 p-5">
      <ModuleAccessPanel
        initialUsers={result.ok ? result.users : []}
        loadError={result.ok ? null : result.error}
      />
    </div>
  );
}
