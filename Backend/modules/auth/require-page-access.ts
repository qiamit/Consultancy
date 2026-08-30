import { redirect } from "next/navigation";
import { createClient } from "@backend/db/client/server";
import { ensureProfileAccess } from "@backend/modules/auth/ensure-access";
import { moduleKeyForPath } from "@backend/modules/auth/modules";

export async function requirePageModuleAccess(pathname: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await ensureProfileAccess(supabase, user);
  if (!access) redirect("/login");

  const moduleKey = moduleKeyForPath(pathname);
  if (moduleKey && !access.modules.includes(moduleKey)) {
    redirect("/dashboard?error=access_denied");
  }

  return access;
}
