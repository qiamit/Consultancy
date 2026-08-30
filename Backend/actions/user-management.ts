"use server";



import { revalidatePath } from "next/cache";

import { createClient } from "@backend/db/client/server";

import { createAdminClient, isAdminClientConfigured } from "@backend/db/client/admin";

import { requireAdminProfile } from "@backend/modules/auth/profile";

import { normalizeModuleAccess, type DashboardModuleKey } from "@backend/modules/auth/modules";



export type PortalRoleRow = {

  id: string;

  slug: string;

  label: string;

  is_system: boolean;

  sort_order: number;

};



export type StaffUserRow = {

  id: string;

  email: string;

  full_name: string | null;

  mobile: string | null;

  role: string;

  role_label: string;

  module_access: DashboardModuleKey[];

  created_at: string;

  last_sign_in_at: string | null;

};



function slugifyRoleLabel(label: string): string {

  return label

    .trim()

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, "_")

    .replace(/^_+|_+$/g, "")

    .slice(0, 48);

}



async function loadPortalRoles(supabase: Awaited<ReturnType<typeof createClient>>) {

  const { data, error } = await supabase

    .from("portal_roles")

    .select("id, slug, label, is_system, sort_order")

    .order("sort_order")

    .order("label");



  if (error) throw new Error(error.message);

  return (data ?? []) as PortalRoleRow[];

}



export async function fetchPortalRoles(): Promise<{

  ok: true;

  roles: PortalRoleRow[];

} | { ok: false; error: string }> {

  try {

    const supabase = await createClient();

    await requireAdminProfile(supabase);

    const roles = await loadPortalRoles(supabase);

    return { ok: true, roles };

  } catch (e) {

    return { ok: false, error: e instanceof Error ? e.message : "Failed to load roles." };

  }

}



export async function createPortalRole(label: string) {

  const supabase = await createClient();

  await requireAdminProfile(supabase);



  const trimmed = label.trim();

  if (!trimmed) {

    return { ok: false as const, error: "Role name is required." };

  }



  const slug = slugifyRoleLabel(trimmed);

  if (!slug) {

    return { ok: false as const, error: "Enter a valid role name." };

  }



  const { data: existing } = await supabase

    .from("portal_roles")

    .select("id, slug, label")

    .eq("slug", slug)

    .maybeSingle();



  if (existing) {

    return { ok: true as const, role: existing as PortalRoleRow };

  }



  if (!isAdminClientConfigured()) {

    return {

      ok: false as const,

      error: "Set DATABASE_URL and SESSION_SECRET in .env.local to create roles.",

    };

  }



  const admin = createAdminClient();

  const { data, error } = await admin

    .from("portal_roles")

    .insert({

      slug,

      label: trimmed,

      is_system: false,

      sort_order: 100,

    })

    .select("id, slug, label, is_system, sort_order")

    .single();



  if (error || !data) {

    return { ok: false as const, error: error?.message ?? "Could not create role." };

  }



  revalidatePath("/dashboard/settings/users");

  return { ok: true as const, role: data as PortalRoleRow };

}



export async function fetchStaffUsers(): Promise<{

  ok: true;

  users: StaffUserRow[];

} | { ok: false; error: string }> {

  try {

    const supabase = await createClient();

    await requireAdminProfile(supabase);



    if (!isAdminClientConfigured()) {

      return {

        ok: false,

        error: "Set DATABASE_URL and SESSION_SECRET in .env.local to manage users.",

      };

    }



    const roles = await loadPortalRoles(supabase);

    const roleLabelMap = new Map(roles.map((r) => [r.slug, r.label]));



    const admin = createAdminClient();

    const { data: authData, error: authErr } = await admin.auth.admin.listUsers({

      perPage: 200,

    });

    if (authErr) return { ok: false, error: authErr.message };



    const ids = authData.users.map((u) => u.id);

    const { data: profiles } = await supabase

      .from("profiles")

      .select("id, full_name, mobile, role, module_access, created_at")

      .in("id", ids);



    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));



    const users: StaffUserRow[] = authData.users.map((u) => {

      const p = profileMap.get(u.id);

      const role = (p?.role as string) ?? "staff";

      const isAdminRole = role === "admin";

      return {

        id: u.id,

        email: u.email ?? "—",

        full_name: p?.full_name ?? (u.user_metadata?.full_name as string | undefined) ?? null,

        mobile:
          (typeof p?.mobile === "string" ? p.mobile.trim() : "") ||
          (typeof u.user_metadata?.mobile === "string" ? u.user_metadata.mobile.trim() : "") ||
          null,

        role,

        role_label: roleLabelMap.get(role) ?? role,

        module_access: isAdminRole ? normalizeModuleAccess([]) : normalizeModuleAccess(p?.module_access),

        created_at: p?.created_at ?? u.created_at,

        last_sign_in_at: u.last_sign_in_at ?? null,

      };

    });



    users.sort((a, b) => a.email.localeCompare(b.email));

    return { ok: true, users };

  } catch (e) {

    return { ok: false, error: e instanceof Error ? e.message : "Failed to load users." };

  }

}



async function validateRoleSlug(

  supabase: Awaited<ReturnType<typeof createClient>>,

  role: string,

) {

  const { data } = await supabase.from("portal_roles").select("slug").eq("slug", role).maybeSingle();

  if (!data) return { ok: false as const, error: "Invalid role selected." };

  return { ok: true as const };

}



export async function createStaffUser(formData: FormData) {

  const supabase = await createClient();

  await requireAdminProfile(supabase);



  if (!isAdminClientConfigured()) {

    return {
      ok: false as const,
      error: "DATABASE_URL / SESSION_SECRET is not configured (isAdminClientConfigured).",
    };

  }



  const fullName = String(formData.get("full_name") ?? "").trim();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const mobile = String(formData.get("mobile") ?? "").trim();

  const password = String(formData.get("password") ?? "");

  const role = String(formData.get("role") ?? "staff").trim();



  if (!fullName || !email || password.length < 8) {

    return {

      ok: false as const,

      error: "Full name, email, and password (min 8 characters) are required.",

    };

  }



  const roleCheck = await validateRoleSlug(supabase, role);

  if (!roleCheck.ok) return roleCheck;



  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({

    email,

    password,

    email_confirm: true,

    user_metadata: { full_name: fullName, mobile: mobile || null },

  });



  if (error || !data.user) {

    return { ok: false as const, error: error?.message ?? "Could not create user." };

  }



  const { error: profileErr } = await admin.from("profiles").upsert({

    id: data.user.id,

    full_name: fullName,

    mobile: mobile || null,

    role,

    module_access: role === "admin" ? [] : normalizeModuleAccess([]),

    updated_at: new Date().toISOString(),

  });



  if (profileErr) {

    return { ok: false as const, error: profileErr.message };

  }



  revalidatePath("/dashboard/settings/users");

  return { ok: true as const };

}



export async function updateStaffUser(userId: string, formData: FormData) {

  const supabase = await createClient();

  const adminProfile = await requireAdminProfile(supabase);



  const fullName = String(formData.get("full_name") ?? "").trim();

  const mobile = String(formData.get("mobile") ?? "").trim();

  const role = String(formData.get("role") ?? "staff").trim();

  const password = String(formData.get("password") ?? "");



  if (!fullName) {

    return { ok: false as const, error: "Full name is required." };

  }



  if (adminProfile.id === userId && role !== "admin") {

    return { ok: false as const, error: "You cannot remove your own super admin role." };

  }



  const roleCheck = await validateRoleSlug(supabase, role);

  if (!roleCheck.ok) return roleCheck;



  const admin = createAdminClient();

  const { error } = await admin

    .from("profiles")

    .update({

      full_name: fullName,

      mobile: mobile || null,

      role,

      module_access: role === "admin" ? [] : normalizeModuleAccess([]),

      updated_at: new Date().toISOString(),

    })

    .eq("id", userId);



  if (error) return { ok: false as const, error: error.message };



  if (password.length > 0) {

    if (!isAdminClientConfigured()) {

      return {
      ok: false as const,
      error: "DATABASE_URL / SESSION_SECRET is not configured (isAdminClientConfigured).",
    };

    }

    if (password.length < 8) {

      return { ok: false as const, error: "Password must be at least 8 characters." };

    }

    const admin = createAdminClient();

    const { error: pwdErr } = await admin.auth.admin.updateUserById(userId, {

      password,

      user_metadata: { full_name: fullName, mobile: mobile || null },

    });

    if (pwdErr) return { ok: false as const, error: pwdErr.message };

  } else if (isAdminClientConfigured()) {

    const admin = createAdminClient();

    await admin.auth.admin.updateUserById(userId, {

      user_metadata: { full_name: fullName, mobile: mobile || null },

    });

  }



  revalidatePath("/dashboard/settings/users");

  return { ok: true as const };

}

export async function updateStaffUserRole(userId: string, role: string) {
  const supabase = await createClient();
  const adminProfile = await requireAdminProfile(supabase);

  const nextRole = role.trim();
  if (!nextRole) {
    return { ok: false as const, error: "Select a role." };
  }

  if (adminProfile.id === userId && nextRole !== "admin") {
    return { ok: false as const, error: "You cannot remove your own super admin role." };
  }

  const roleCheck = await validateRoleSlug(supabase, nextRole);
  if (!roleCheck.ok) return roleCheck;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      role: nextRole,
      module_access: nextRole === "admin" ? [] : normalizeModuleAccess([]),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/settings/users");
  return { ok: true as const };
}

export async function resetStaffUserPassword(userId: string, newPassword: string) {

  const supabase = await createClient();

  await requireAdminProfile(supabase);



  if (!isAdminClientConfigured()) {

    return {
      ok: false as const,
      error: "DATABASE_URL / SESSION_SECRET is not configured (isAdminClientConfigured).",
    };

  }



  if (newPassword.length < 8) {

    return { ok: false as const, error: "Password must be at least 8 characters." };

  }



  const admin = createAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, {

    password: newPassword,

  });



  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const };

}



export async function deleteStaffUser(userId: string) {

  const supabase = await createClient();

  const adminProfile = await requireAdminProfile(supabase);



  if (adminProfile.id === userId) {

    return { ok: false as const, error: "You cannot delete your own account." };

  }



  if (!isAdminClientConfigured()) {

    return {
      ok: false as const,
      error: "DATABASE_URL / SESSION_SECRET is not configured (isAdminClientConfigured).",
    };

  }



  const admin = createAdminClient();

  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) return { ok: false as const, error: error.message };



  revalidatePath("/dashboard/settings/users");

  return { ok: true as const };

}

