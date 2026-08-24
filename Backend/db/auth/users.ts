import "server-only";
import { query } from "@backend/db/pool";
import { hashPassword } from "@backend/db/auth/password";
import type { AppUser } from "@backend/db/auth/types";

export type AppUserRow = {
  id: string;
  email: string;
  password_hash: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  raw_user_meta_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toAppUser(row: AppUserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    user_metadata: row.raw_user_meta_data ?? {},
    app_metadata: {},
    created_at: row.created_at,
    last_sign_in_at: row.last_sign_in_at,
    email_confirmed_at: row.email_confirmed_at,
  };
}

export async function findUserByEmail(
  email: string,
): Promise<AppUserRow | null> {
  const { rows } = await query<AppUserRow>(
    `select * from public.app_users where lower(email::text) = $1 limit 1`,
    [normalizeEmail(email)],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<AppUserRow | null> {
  const { rows } = await query<AppUserRow>(
    `select * from public.app_users where id = $1 limit 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  password: string;
  full_name?: string;
  email_confirm?: boolean;
  user_metadata?: Record<string, unknown>;
}): Promise<AppUserRow> {
  const email = normalizeEmail(input.email);
  const password_hash = await hashPassword(input.password);
  const meta: Record<string, unknown> = {
    ...(input.user_metadata ?? {}),
  };
  if (input.full_name !== undefined) {
    meta.full_name = input.full_name;
  }

  const { rows } = await query<AppUserRow>(
    `insert into public.app_users (
       email, password_hash, email_confirmed_at, raw_user_meta_data
     ) values (
       $1, $2,
       case when $3 then now() else null end,
       $4::jsonb
     )
     returning *`,
    [
      email,
      password_hash,
      Boolean(input.email_confirm),
      JSON.stringify(meta),
    ],
  );
  return rows[0];
}

export async function updateUserPassword(
  id: string,
  password: string,
): Promise<void> {
  const password_hash = await hashPassword(password);
  await query(
    `update public.app_users
     set password_hash = $2, updated_at = now()
     where id = $1`,
    [id, password_hash],
  );
}

export async function updateLastSignIn(id: string): Promise<void> {
  await query(
    `update public.app_users
     set last_sign_in_at = now(), updated_at = now()
     where id = $1`,
    [id],
  );
}

export async function updateUserMetadata(
  id: string,
  patch: {
    email?: string;
    user_metadata?: Record<string, unknown>;
    email_confirm?: boolean;
    banned_until?: string | null;
  },
): Promise<AppUserRow | null> {
  const existing = await findUserById(id);
  if (!existing) return null;

  const nextMeta = {
    ...(existing.raw_user_meta_data ?? {}),
    ...(patch.user_metadata ?? {}),
  };
  const email = patch.email ? normalizeEmail(patch.email) : existing.email;
  const emailConfirmedAt =
    patch.email_confirm === true
      ? new Date().toISOString()
      : existing.email_confirmed_at;
  const bannedUntil =
    patch.banned_until !== undefined
      ? patch.banned_until
      : existing.banned_until;

  const { rows } = await query<AppUserRow>(
    `update public.app_users
     set email = $2,
         raw_user_meta_data = $3::jsonb,
         email_confirmed_at = $4,
         banned_until = $5,
         updated_at = now()
     where id = $1
     returning *`,
    [id, email, JSON.stringify(nextMeta), emailConfirmedAt, bannedUntil],
  );
  return rows[0] ?? null;
}

export async function deleteUser(id: string): Promise<void> {
  await query(`delete from public.app_users where id = $1`, [id]);
}

export async function listUsers(): Promise<AppUserRow[]> {
  const { rows } = await query<AppUserRow>(
    `select * from public.app_users order by email asc`,
  );
  return rows;
}
