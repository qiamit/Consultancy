import "server-only";
import { cache } from "react";
import { createClient } from "@backend/db/client/server";
import type { User } from "@backend/db/client/types";
import {
  ensureProfileAccess,
  type AccessContext,
} from "@backend/modules/auth/ensure-access";

/** One iron-session + app_users lookup per request. */
export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** One profile/access resolution per request (layout + sidebar + header + page). */
export const getCachedAccess = cache(
  async (): Promise<AccessContext | null> => {
    const supabase = await createClient();
    const user = await getCachedUser();
    return ensureProfileAccess(supabase, user);
  },
);
