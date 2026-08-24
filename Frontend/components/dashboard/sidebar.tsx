import Link from "next/link";
import { createClient } from "@backend/db/supabase/server";
import { ensureProfileAccess, isSuperAdminEmail } from "@backend/modules/auth/ensure-access";
import { SidebarAside } from "./sidebar-aside";
import { SidebarNav } from "./sidebar-nav";

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = user ? await ensureProfileAccess(supabase, user) : null;
  const isAdmin = Boolean(
    access?.isAdmin || (user && isSuperAdminEmail(user.email)),
  );

  return (
    <SidebarAside>
      <div className="flex items-center border-b border-zinc-100 px-5 py-5 dark:border-zinc-800/60">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-gradient-to-tr from-sky-600 to-indigo-600 shadow-md">
            <svg
              className="h-4.5 w-4.5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <span className="font-display truncate text-base font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Smart Consultancy
          </span>
        </Link>
      </div>

      <SidebarNav isAdmin={isAdmin} allowedModules={access?.modules} />
    </SidebarAside>
  );
}
