"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateStaffModuleAccess,
  type StaffUserRow,
} from "@backend/actions/user-management";
import {
  STAFF_ASSIGNABLE_MODULES,
  normalizeModuleAccessMap,
  type DashboardModuleKey,
  type ModuleAccessMap,
  type ModulePermission,
} from "@backend/modules/auth/modules";

const PERMISSIONS: ModulePermission[] = ["edit", "view", "none"];

function permissionLabel(level: ModulePermission): string {
  if (level === "edit") return "Edit";
  if (level === "view") return "View";
  return "None";
}

function emptyStaffMap(): ModuleAccessMap {
  const map: ModuleAccessMap = { dashboard: "edit" };
  for (const mod of STAFF_ASSIGNABLE_MODULES) {
    map[mod.key] = mod.key === "dashboard" ? "edit" : "none";
  }
  return map;
}

function mapsEqual(a: ModuleAccessMap, b: ModuleAccessMap): boolean {
  return JSON.stringify(normalizeModuleAccessMap(a)) === JSON.stringify(normalizeModuleAccessMap(b));
}

export function ModuleAccessPanel({
  initialUsers,
  loadError,
}: {
  initialUsers: StaffUserRow[];
  loadError: string | null;
}) {
  const router = useRouter();
  const staffUsers = useMemo(
    () => initialUsers.filter((u) => u.role !== "admin"),
    [initialUsers],
  );

  const [selectedUserId, setSelectedUserId] = useState<string>(
    () => staffUsers[0]?.id ?? "",
  );
  const usersKey = JSON.stringify(
    staffUsers.map((u) => ({ id: u.id, module_access: u.module_access })),
  );
  const [appliedUsersKey, setAppliedUsersKey] = useState(usersKey);
  const [draftByUser, setDraftByUser] = useState<Record<string, ModuleAccessMap>>(
    () => {
      const map: Record<string, ModuleAccessMap> = {};
      for (const u of staffUsers) {
        map[u.id] = normalizeModuleAccessMap(u.module_access);
      }
      return map;
    },
  );

  if (usersKey !== appliedUsersKey) {
    setAppliedUsersKey(usersKey);
    setDraftByUser((prev) => {
      const next: Record<string, ModuleAccessMap> = { ...prev };
      for (const u of staffUsers) {
        const incoming = normalizeModuleAccessMap(u.module_access);
        if (!next[u.id] || mapsEqual(next[u.id]!, incoming)) {
          next[u.id] = incoming;
        }
      }
      return next;
    });
    if (selectedUserId && !staffUsers.some((u) => u.id === selectedUserId)) {
      setSelectedUserId(staffUsers[0]?.id ?? "");
    }
  }

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(loadError);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedUser = staffUsers.find((u) => u.id === selectedUserId) ?? null;
  const selectedMap: ModuleAccessMap = selectedUser
    ? (draftByUser[selectedUser.id] ??
      normalizeModuleAccessMap(selectedUser.module_access))
    : emptyStaffMap();

  function setPermission(key: DashboardModuleKey, level: ModulePermission) {
    if (!selectedUser) return;
    if (key === "dashboard" && level === "none") return;
    setDraftByUser((prev) => ({
      ...prev,
      [selectedUser.id]: normalizeModuleAccessMap({
        ...(prev[selectedUser.id] ?? selectedUser.module_access),
        [key]: key === "dashboard" ? "edit" : level,
      }),
    }));
    setError(null);
    setSuccess(null);
  }

  function setAll(level: ModulePermission) {
    if (!selectedUser) return;
    const next = emptyStaffMap();
    for (const mod of STAFF_ASSIGNABLE_MODULES) {
      next[mod.key] = mod.key === "dashboard" ? "edit" : level;
    }
    setDraftByUser((prev) => ({
      ...prev,
      [selectedUser.id]: next,
    }));
    setError(null);
    setSuccess(null);
  }

  function handleSave() {
    if (!selectedUser) return;
    setError(null);
    setSuccess(null);
    const access = normalizeModuleAccessMap(
      draftByUser[selectedUser.id] ?? selectedUser.module_access,
    );
    start(async () => {
      const res = await updateStaffModuleAccess(selectedUser.id, access);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDraftByUser((prev) => ({ ...prev, [selectedUser.id]: access }));
      setSuccess(`Module access saved for ${selectedUser.full_name ?? selectedUser.email}.`);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Module Access
          </h1>
        </div>
        <button
          type="button"
          disabled={pending || !selectedUser}
          onClick={handleSave}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save access"}
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      {staffUsers.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No Inspection Engineer or Accountant users yet. Add them in User Management first.
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
          <aside className="overflow-auto rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Users
            </p>
            <ul className="space-y-0.5">
              {staffUsers.map((u) => {
                const active = u.id === selectedUserId;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setError(null);
                        setSuccess(null);
                      }}
                      className={`flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors ${
                        active
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className="truncate text-sm font-semibold">
                        {u.full_name ?? "—"}
                      </span>
                      <span className="truncate text-[11px] opacity-80">
                        {u.role_label} · {u.email}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="overflow-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {selectedUser ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {selectedUser.full_name ?? selectedUser.email}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectedUser.role_label} · {selectedUser.email}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAll("edit")}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      All Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setAll("view")}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      All View
                    </button>
                    <button
                      type="button"
                      onClick={() => setAll("none")}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      All None
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {STAFF_ASSIGNABLE_MODULES.map((mod) => {
                    const level =
                      selectedMap[mod.key] ??
                      (mod.key === "dashboard" ? "edit" : "none");
                    const locked = mod.key === "dashboard";
                    return (
                      <div
                        key={mod.key}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                          level === "none"
                            ? "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                            : level === "view"
                              ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
                              : "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {mod.label}
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          {PERMISSIONS.map((perm) => {
                            const active = level === perm;
                            const disabled =
                              pending || (locked && perm !== "edit");
                            return (
                              <button
                                key={perm}
                                type="button"
                                disabled={disabled}
                                onClick={() => setPermission(mod.key, perm)}
                                title={`${mod.label}: ${permissionLabel(perm)}`}
                                className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                  active
                                    ? perm === "edit"
                                      ? "bg-sky-600 text-white"
                                      : perm === "view"
                                        ? "bg-amber-600 text-white"
                                        : "bg-zinc-600 text-white"
                                    : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                }`}
                              >
                                {permissionLabel(perm)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
