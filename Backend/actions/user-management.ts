"use server";



import { revalidatePath } from "next/cache";

import { createClient } from "@backend/db/client/server";

import { createAdminClient, isAdminClientConfigured } from "@backend/db/client/admin";

import { findUserByEmail } from "@backend/db/auth/users";

import { requireAdminProfile } from "@backend/modules/auth/profile";

import { normalizeModuleAccessMap, type ModuleAccessMap } from "@backend/modules/auth/modules";



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
  module_access: ModuleAccessMap;
  created_at: string;
  last_sign_in_at: string | null;
};

/** Reject email-like values that were wrongly saved into mobile. */
function normalizeStaffMobile(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("@")) return null;
  return value;
}

function slugifyRoleLabel(label: string): string {

  return label

    .trim()

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, "_")

    .replace(/^_+|_+$/g, "")

    .slice(0, 48);

}

/** Canonical roles shown in User Management (Employee removed). */
const CANONICAL_PORTAL_ROLES: Omit<PortalRoleRow, "id">[] = [
  { slug: "admin", label: "Super Admin", is_system: true, sort_order: 0 },
  {
    slug: "inspection_engineer",
    label: "Inspection Engineer",
    is_system: true,
    sort_order: 1,
  },
  { slug: "accountant", label: "Accountant", is_system: true, sort_order: 2 },
];

const DEFAULT_NON_ADMIN_ROLE = "inspection_engineer";

async function ensureCanonicalPortalRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  try {
    for (const role of CANONICAL_PORTAL_ROLES) {
      const { data: existing } = await supabase
        .from("portal_roles")
        .select("id")
        .eq("slug", role.slug)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("portal_roles")
          .update({
            label: role.label,
            is_system: role.is_system,
            sort_order: role.sort_order,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("portal_roles").insert(role);
      }
    }

    // Remap + remove legacy Employee (staff). Prefer admin client for system-row delete.
    if (isAdminClientConfigured()) {
      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({
          role: DEFAULT_NON_ADMIN_ROLE,
          updated_at: new Date().toISOString(),
        })
        .eq("role", "staff");
      await admin.from("portal_roles").delete().eq("slug", "staff");
    } else {
      await supabase
        .from("profiles")
        .update({
          role: DEFAULT_NON_ADMIN_ROLE,
          updated_at: new Date().toISOString(),
        })
        .eq("role", "staff");
      await supabase.from("portal_roles").delete().eq("slug", "staff");
    }
  } catch {
    // Non-fatal: role list can still load from whatever rows exist.
  }
}

async function loadPortalRoles(supabase: Awaited<ReturnType<typeof createClient>>) {
  await ensureCanonicalPortalRoles(supabase);

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

      const role = (p?.role as string) ?? DEFAULT_NON_ADMIN_ROLE;

      const isAdminRole = role === "admin";

      return {

        id: u.id,

        email: u.email ?? "—",

        full_name: p?.full_name ?? (u.user_metadata?.full_name as string | undefined) ?? null,

        mobile:
          normalizeStaffMobile(p?.mobile) ||
          normalizeStaffMobile(u.user_metadata?.mobile) ||
          null,

        role,

        role_label: roleLabelMap.get(role) ?? role,

        module_access: isAdminRole
          ? {}
          : normalizeModuleAccessMap(p?.module_access),

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

  const mobile = normalizeStaffMobile(formData.get("mobile")) ?? "";

  const password = String(formData.get("password") ?? "");

  const role = String(formData.get("role") ?? DEFAULT_NON_ADMIN_ROLE).trim();



  if (!fullName || !email || password.length < 8) {

    return {

      ok: false as const,

      error: "Full name, email, and password (min 8 characters) are required.",

    };

  }



  const roleCheck = await validateRoleSlug(supabase, role);

  if (!roleCheck.ok) return roleCheck;

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return {
      ok: false as const,
      error: "A user with this email already exists. Open Edit on that row instead of adding again.",
    };
  }

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({

    email,

    password,

    email_confirm: true,

    user_metadata: { full_name: fullName, mobile: mobile || null },

  });



  if (error || !data.user) {
    const raw = error?.message ?? "Could not create user.";
    if (raw.includes("app_users_email_key") || raw.includes("duplicate key")) {
      return {
        ok: false as const,
        error: "A user with this email already exists. Open Edit on that row instead of adding again.",
      };
    }
    return { ok: false as const, error: raw };
  }



  const { error: profileErr } = await admin.from("profiles").upsert({

    id: data.user.id,

    full_name: fullName,

    mobile: mobile || null,

    role,

    module_access: role === "admin" ? [] : normalizeModuleAccessMap([]),

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

  const mobile = normalizeStaffMobile(formData.get("mobile")) ?? "";

  const role = String(formData.get("role") ?? DEFAULT_NON_ADMIN_ROLE).trim();

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

      module_access: role === "admin" ? [] : normalizeModuleAccessMap([]),

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
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("module_access")
    .eq("id", userId)
    .maybeSingle();

  const { error } = await admin
    .from("profiles")
    .update({
      role: nextRole,
      module_access:
        nextRole === "admin"
          ? []
          : normalizeModuleAccessMap(existingProfile?.module_access),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/settings/users");
  revalidatePath("/dashboard/settings/module-access");
  return { ok: true as const };
}

export async function updateStaffModuleAccess(
  userId: string,
  access: ModuleAccessMap | string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  await requireAdminProfile(supabase);

  const trimmedId = userId?.trim();
  if (!trimmedId) return { ok: false, error: "Invalid user." };

  const admin = createAdminClient();
  const { data: profile, error: fetchError } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", trimmedId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!profile) return { ok: false, error: "User not found." };
  if ((profile.role as string) === "admin") {
    return {
      ok: false,
      error: "Super Admin already has access to all modules.",
    };
  }

  const module_access = normalizeModuleAccessMap(access);

  const { error } = await admin
    .from("profiles")
    .update({
      module_access,
      updated_at: new Date().toISOString(),
    })
    .eq("id", trimmedId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/settings/users");
  revalidatePath("/dashboard/settings/module-access");
  return { ok: true };
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

