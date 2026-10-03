import { redirect } from "next/navigation";
import { getCachedAccess, getCachedUser } from "@backend/modules/auth/cached-access";
import { moduleKeyForPath } from "@backend/modules/auth/modules";

export async function requirePageModuleAccess(pathname: string) {
  const user = await getCachedUser();
  if (!user) redirect("/login");

  const access = await getCachedAccess();
  if (!access) redirect("/login");

  const moduleKey = moduleKeyForPath(pathname);
  if (moduleKey && !access.modules.includes(moduleKey)) {
    redirect("/dashboard?error=access_denied");
  }

  return access;
}
