import type { AppDbClient } from "@backend/db/client/types";
import type { DashboardModuleKey } from "@backend/modules/auth/modules";
import { ensureProfileAccess } from "@backend/modules/auth/ensure-access";

export type UserProfile = {
  id: string;
  full_name: string | null;
  role: "admin" | "staff";
  module_access?: DashboardModuleKey[];
  created_at: string;
};

export async function getCurrentProfile(
  supabase: AppDbClient,
): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const access = await ensureProfileAccess(supabase, user);
  return access?.profile ?? null;
}

export async function requireAdminProfile(
  supabase: AppDbClient,
): Promise<UserProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const access = user ? await ensureProfileAccess(supabase, user) : null;
  if (!access?.isAdmin) {
    throw new Error("Admin access required.");
  }
  return access.profile;
}
