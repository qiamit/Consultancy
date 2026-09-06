import { createClient } from "@backend/db/client/server";
import { ensureProfileAccess, isSuperAdminEmail } from "@backend/modules/auth/ensure-access";
import { fetchUnreadEmailCount } from "@backend/actions/email-accounts";
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
  const canAccessEmail = Boolean(
    isAdmin || access?.modules.includes("email"),
  );
  const unreadEmailCount = canAccessEmail ? await fetchUnreadEmailCount() : 0;

  return (
    <DashboardTopBar
      userName={
        access?.profile.full_name?.trim() ||
        user?.email?.split("@")[0] ||
        "User"
      }
      userEmail={user?.email ?? ""}
      isAdmin={isAdmin}
      canAccessEmail={canAccessEmail}
      unreadEmailCount={unreadEmailCount}
    />
  );
}
