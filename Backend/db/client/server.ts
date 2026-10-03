import "server-only";
import { cache } from "react";
import { createDbClient, type DbClient } from "@backend/db/client/create-db-client";

export type { DbClient };

/** One DB client factory result per React request (dedupes layout/sidebar/header/page). */
export const createClient = cache(async (): Promise<DbClient> => {
  return createDbClient();
});
