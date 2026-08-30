import { createClient } from "@backend/db/client/server";
import { ensureProfileAccess, isSuperAdminEmail } from "@backend/modules/auth/ensure-access";
import { DashboardTopBar } from "./dashboard-top-bar";

export async function DashboardHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = user ? await ensureProfileAccess(supabase, user) : null;
  const isAdmin = Boolean(
    access?.isAdmin || (user && isSuperAdminEmail(user.email)),
  );

  return (
    <DashboardTopBar
      userName={
        access?.profile.full_name?.trim() ||
        user?.email?.split("@")[0] ||
        "User"
      }
      userEmail={user?.email ?? ""}
      isAdmin={isAdmin}
    />
  );
}
