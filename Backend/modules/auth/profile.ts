import type { AppDbClient } from "@backend/db/client/types";
import { ensureProfileAccess } from "@backend/modules/auth/ensure-access";

export type UserProfile = {
  id: string;
  full_name: string | null;
  role: string;
  module_access?: unknown;
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
