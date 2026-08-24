import "server-only";
import { createDbClient, type DbClient } from "@backend/db/supabase/create-db-client";

export type { DbClient };

export async function createClient(): Promise<DbClient> {
  return createDbClient();
}
