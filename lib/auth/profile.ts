import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardModuleKey } from "@/lib/auth/modules";
import { ensureProfileAccess } from "@/lib/auth/ensure-access";

export type UserProfile = {
  id: string;
  full_name: string | null;
  role: "admin" | "staff";
  module_access?: DashboardModuleKey[];
  created_at: string;
};

export async function getCurrentProfile(
  supabase: SupabaseClient,
): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const access = await ensureProfileAccess(supabase, user);
  return access?.profile ?? null;
}

export async function requireAdminProfile(
  supabase: SupabaseClient,
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
