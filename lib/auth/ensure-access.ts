import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ALL_MODULE_KEYS, resolveModuleAccess, type DashboardModuleKey } from "@/lib/auth/modules";
import type { UserProfile } from "@/lib/auth/profile";

export type AccessContext = {
  profile: UserProfile;
  isAdmin: boolean;
  modules: DashboardModuleKey[];
};

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  const configured = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!configured || !email) return false;
  return email.trim().toLowerCase() === configured;
}

export async function ensureProfileAccess(
  supabase: SupabaseClient,
  user: User | null,
): Promise<AccessContext | null> {
  if (!user) return null;

  if (isSuperAdminEmail(user.email)) {
    let profile = await loadProfile(supabase, user);
    if (!profile) {
      profile = {
        id: user.id,
        full_name:
          (user.user_metadata?.full_name as string | undefined)?.trim() ||
          user.email?.split("@")[0] ||
          "User",
        role: "admin",
        module_access: [],
        created_at: new Date().toISOString(),
      };
    }

    if (profile.role !== "admin") {
      await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
      profile = { ...profile, role: "admin" };
    }

    return {
      profile,
      isAdmin: true,
      modules: ALL_MODULE_KEYS,
    };
  }

  let profile = await loadProfile(supabase, user);
  if (!profile) return null;

  const { count: adminCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  if ((adminCount ?? 0) === 0 && profile.role !== "admin") {
    await supabase.from("profiles").update({ role: "admin" }).eq("id", profile.id);
    profile = { ...profile, role: "admin" };
  }

  const isAdmin = profile.role === "admin";
  const modules = isAdmin ? ALL_MODULE_KEYS : resolveModuleAccess(profile);

  return { profile, isAdmin, modules };
}

async function loadProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<UserProfile | null> {
  const fullSelect = await supabase
    .from("profiles")
    .select("id, full_name, role, module_access, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (fullSelect.data) return fullSelect.data as UserProfile;

  const basicSelect = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (basicSelect.data) {
    return {
      ...(basicSelect.data as UserProfile),
      module_access: [],
    };
  }

  return null;
}
