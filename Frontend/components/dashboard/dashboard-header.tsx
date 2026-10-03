import { getCachedAccess, getCachedUser } from "@backend/modules/auth/cached-access";
import { isSuperAdminEmail } from "@backend/modules/auth/ensure-access";
import { DashboardTopBar } from "./dashboard-top-bar";

export async function DashboardHeader() {
  const [user, access] = await Promise.all([getCachedUser(), getCachedAccess()]);
  const isAdmin = Boolean(
    access?.isAdmin || (user && isSuperAdminEmail(user.email)),
  );
  const canAccessEmail = isAdmin;
  const canAccessCms = Boolean(isAdmin || access?.modules.includes("cms"));

  // Do not await unread email count here — it was blocking every dashboard
  // navigation (~2–5s). The header badge loads it client-side via /api/email/unread-count.
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
      canAccessCms={canAccessCms}
      unreadEmailCount={0}
    />
  );
}
