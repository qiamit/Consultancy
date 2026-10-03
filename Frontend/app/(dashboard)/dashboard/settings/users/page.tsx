import { redirect } from "next/navigation";
import { UserManagementPanel } from "@/components/dashboard/user-management-panel";
import { getCachedAccess, getCachedUser } from "@backend/modules/auth/cached-access";
import { fetchPortalRoles, fetchStaffUsers } from "@backend/actions/user-management";
import { isAdminClientConfigured } from "@backend/db/client/admin";

export default async function UserManagementPage() {
  const user = await getCachedUser();
  if (!user) redirect("/login");

  const access = await getCachedAccess();
  if (!access?.isAdmin) {
    redirect("/dashboard?error=admin_required");
  }

  const [result, rolesResult] = await Promise.all([fetchStaffUsers(), fetchPortalRoles()]);

  return (
    <div className="mx-2.5 flex h-full min-h-0 flex-col gap-4 p-5">
      <UserManagementPanel
        initialUsers={result.ok ? result.users : []}
        initialRoles={rolesResult.ok ? rolesResult.roles : []}
        loadError={result.ok ? null : result.error}
        serviceConfigured={isAdminClientConfigured()}
      />
    </div>
  );
}
