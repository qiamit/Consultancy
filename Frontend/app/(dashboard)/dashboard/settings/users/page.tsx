import { redirect } from "next/navigation";
import { UserManagementPanel } from "@/components/dashboard/user-management-panel";
import { ensureProfileAccess } from "@backend/modules/auth/ensure-access";
import { fetchPortalRoles, fetchStaffUsers } from "@backend/actions/user-management";
import { isAdminClientConfigured } from "@backend/db/supabase/admin";
import { createClient } from "@backend/db/supabase/server";

export default async function UserManagementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await ensureProfileAccess(supabase, user);
  if (!access?.isAdmin) {
    redirect("/dashboard?error=admin_required");
  }

  const [result, rolesResult] = await Promise.all([fetchStaffUsers(), fetchPortalRoles()]);

  return (
    <div className="mx-2.5 flex h-full min-h-0 flex-col gap-4 p-5">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          User Management
        </h1>
      </div>

      <UserManagementPanel
        initialUsers={result.ok ? result.users : []}
        initialRoles={rolesResult.ok ? rolesResult.roles : []}
        loadError={result.ok ? null : result.error}
        serviceConfigured={isAdminClientConfigured()}
      />
    </div>
  );
}
