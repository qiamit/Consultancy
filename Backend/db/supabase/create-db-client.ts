import "server-only";
import { from as dbFrom, type QueryBuilder } from "@backend/db/query-builder";
import {
  clearSession,
  getSession,
  setSession,
} from "@backend/db/auth/session";
import {
  createUser,
  deleteUser,
  findUserByEmail,
  findUserById,
  listUsers,
  toAppUser,
  updateLastSignIn,
  updateUserMetadata,
  updateUserPassword,
} from "@backend/db/auth/users";
import { verifyPassword } from "@backend/db/auth/password";
import type { AppUser } from "@backend/db/auth/types";
import {
  createSignedGetUrl,
  deleteObjects,
  downloadObject,
  uploadObject,
} from "@backend/modules/storage/s3";

export type AuthError = { message: string } | null;

async function bodyToBuffer(
  body: Buffer | Uint8Array | Blob | ArrayBuffer | string,
): Promise<Buffer> {
  if (typeof body === "string") return Buffer.from(body);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  }
  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }
  throw new Error("Unsupported upload body type");
}

function createStorageBucket(bucket: string) {
  return {
    async upload(
      path: string,
      file: Buffer | Uint8Array | Blob | ArrayBuffer | string,
      opts?: { upsert?: boolean; contentType?: string },
    ) {
      try {
        const buf = await bodyToBuffer(file);
        await uploadObject(bucket, path, buf, opts?.contentType);
        return { data: { path }, error: null as AuthError };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    },

    async download(path: string) {
      try {
        const buf = await downloadObject(bucket, path);
        const blob = new Blob([new Uint8Array(buf)]);
        return { data: blob, error: null as AuthError };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    },

    async remove(paths: string[]) {
      try {
        await deleteObjects(bucket, paths);
        return { data: paths, error: null as AuthError };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    },

    async createSignedUrl(path: string, expiresIn: number) {
      try {
        const signedUrl = await createSignedGetUrl(bucket, path, expiresIn);
        return { data: { signedUrl }, error: null as AuthError };
      } catch (e) {
        return {
          data: null,
          error: { message: e instanceof Error ? e.message : String(e) },
        };
      }
    },

    getPublicUrl(path: string) {
      const params = new URLSearchParams({ bucket, path });
      return {
        data: { publicUrl: `/api/storage/public?${params.toString()}` },
      };
    },
  };
}

function createAuthAdminApi() {
  return {
    async listUsers(_opts?: { page?: number; perPage?: number }) {
      const rows = await listUsers();
      return {
        data: {
          users: rows.map((r) => ({
            ...toAppUser(r),
            last_sign_in_at: r.last_sign_in_at,
          })),
        },
        error: null as AuthError,
      };
    },

    async createUser(attrs: {
      email: string;
      password: string;
      email_confirm?: boolean;
      user_metadata?: Record<string, unknown>;
    }) {
      try {
        const row = await createUser({
          email: attrs.email,
          password: attrs.password,
          email_confirm: attrs.email_confirm,
          user_metadata: attrs.user_metadata,
          full_name:
            typeof attrs.user_metadata?.full_name === "string"
              ? attrs.user_metadata.full_name
              : undefined,
        });
        return { data: { user: toAppUser(row) }, error: null as AuthError };
      } catch (e) {
        return {
          data: { user: null },
          error: {
            message: e instanceof Error ? e.message : String(e),
          },
        };
      }
    },

    async updateUserById(
      id: string,
      attrs: {
        password?: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
        ban_duration?: string;
      },
    ) {
      try {
        if (attrs.password) {
          await updateUserPassword(id, attrs.password);
        }
        let banned_until: string | null | undefined;
        if (attrs.ban_duration === "none") banned_until = null;
        const row = await updateUserMetadata(id, {
          email: attrs.email,
          user_metadata: attrs.user_metadata,
          banned_until,
        });
        if (!row) {
          return {
            data: { user: null },
            error: { message: "User not found" },
          };
        }
        return { data: { user: toAppUser(row) }, error: null as AuthError };
      } catch (e) {
        return {
          data: { user: null },
          error: {
            message: e instanceof Error ? e.message : String(e),
          },
        };
      }
    },

    async deleteUser(id: string) {
      try {
        await deleteUser(id);
        return { data: { user: null }, error: null as AuthError };
      } catch (e) {
        return {
          data: { user: null },
          error: {
            message: e instanceof Error ? e.message : String(e),
          },
        };
      }
    },
  };
}

function createAuthApi() {
  return {
    async getUser(): Promise<{ data: { user: AppUser | null }; error: AuthError }> {
      const session = await getSession();
      if (!session?.userId) {
        return { data: { user: null }, error: null };
      }
      const row = await findUserById(session.userId);
      if (!row) return { data: { user: null }, error: null };
      return { data: { user: toAppUser(row) }, error: null };
    },

    async signInWithPassword(credentials: {
      email: string;
      password: string;
    }): Promise<{
      data: { user: AppUser | null; session: { user: AppUser } | null };
      error: AuthError;
    }> {
      const row = await findUserByEmail(credentials.email);
      if (!row || !(await verifyPassword(credentials.password, row.password_hash))) {
        return {
          data: { user: null, session: null },
          error: { message: "Invalid login credentials" },
        };
      }
      if (row.banned_until && new Date(row.banned_until) > new Date()) {
        return {
          data: { user: null, session: null },
          error: { message: "User is banned" },
        };
      }
      await setSession(row.id, row.email);
      await updateLastSignIn(row.id);
      const user = toAppUser(row);
      return { data: { user, session: { user } }, error: null };
    },

    async signOut(): Promise<{ error: AuthError }> {
      await clearSession();
      return { error: null };
    },

    admin: createAuthAdminApi(),
  };
}

export type DbClient = {
  from: (table: string) => QueryBuilder;
  auth: ReturnType<typeof createAuthApi>;
  storage: { from: (bucket: string) => ReturnType<typeof createStorageBucket> };
};

export function createDbClient(_options?: { admin?: boolean }): DbClient {
  return {
    from: (table: string) => dbFrom(table),
    auth: createAuthApi(),
    storage: {
      from: (bucket: string) => createStorageBucket(bucket),
    },
  };
}
