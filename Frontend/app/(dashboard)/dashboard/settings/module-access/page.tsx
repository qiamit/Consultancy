import { redirect } from "next/navigation";
import { ModuleAccessPanel } from "@/components/dashboard/module-access-panel";
import { ensureProfileAccess } from "@backend/modules/auth/ensure-access";
import { fetchStaffUsers } from "@backend/actions/user-management";
import { createClient } from "@backend/db/client/server";

export default async function ModuleAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await ensureProfileAccess(supabase, user);
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
