import type { AppUser } from "@backend/db/auth/types";

/** Structural stand-in for the former supabase-js client type. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseClient = {
  // QueryBuilder is thenable; keep loose for call-site compatibility.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  auth: {
    getUser: () => Promise<{ data: { user: AppUser | null }; error: { message: string } | null }>;
    signInWithPassword: (credentials: {
      email: string;
      password: string;
    }) => Promise<{
      data: { user: AppUser | null; session: unknown };
      error: { message: string } | null;
    }>;
    signOut: () => Promise<{ error: { message: string } | null }>;
    // Optional: server DbClient has admin; browser client stubs it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    admin?: any;
  };
  storage: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: (bucket: string) => any;
  };
};

export type { AppUser as User };
