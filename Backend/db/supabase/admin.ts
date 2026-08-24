import "server-only";
import { createDbClient, type DbClient } from "@backend/db/supabase/create-db-client";
import { isDatabaseConfigured } from "@backend/shared/env";

export type { DbClient };

export function createAdminClient(): DbClient {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "DATABASE_URL and SESSION_SECRET are required for admin operations.",
    );
  }
  return createDbClient({ admin: true });
}

export function isAdminClientConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.SESSION_SECRET);
}
