"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateAllStaffModuleAccess,
  updateStaffModuleAccess,
  type StaffUserRow,
} from "@backend/actions/user-management";
import {
  STAFF_ASSIGNABLE_MODULES,
  STAFF_MODULE_GROUPS,
  completeStaffModuleAccessMap,
  defaultModuleAccessForRole,
  type DashboardModuleKey,
  type ModuleAccessMap,
  type ModulePermission,
  type StaffModuleGroup,
} from "@backend/modules/auth/modules";

const PERMISSIONS: ModulePermission[] = ["edit", "view", "none"];

function permissionLabel(level: ModulePermission): string {
  if (level === "edit") return "Edit";
  if (level === "view") return "View";
  return "None";
}

function mapsEqual(a: ModuleAccessMap, b: ModuleAccessMap): boolean {
  return (
    JSON.stringify(completeStaffModuleAccessMap(a)) ===
    JSON.stringify(completeStaffModuleAccessMap(b))
  );
}

function countLevels(map: ModuleAccessMap): { edit: number; view: number; none: number } {
  let edit = 0;
  let view = 0;
  let none = 0;
  for (const mod of STAFF_ASSIGNABLE_MODULES) {
    const level = map[mod.key] ?? (mod.key === "dashboard" ? "edit" : "none");
    if (level === "edit") edit += 1;
    else if (level === "view") view += 1;
    else none += 1;
  }
  return { edit, view, none };
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
  const [userQuery, setUserQuery] = useState("");
  const usersKey = JSON.stringify(
    staffUsers.map((u) => ({ id: u.id, module_access: u.module_access })),
  );
  const [appliedUsersKey, setAppliedUsersKey] = useState(usersKey);
  const [draftByUser, setDraftByUser] = useState<Record<string, ModuleAccessMap>>(
    () => {
      const map: Record<string, ModuleAccessMap> = {};
      for (const u of staffUsers) {
        map[u.id] = completeStaffModuleAccessMap(u.module_access);
      }
      return map;
    },
  );

  if (usersKey !== appliedUsersKey) {
    setAppliedUsersKey(usersKey);
    setDraftByUser((prev) => {
      const next: Record<string, ModuleAccessMap> = { ...prev };
      for (const u of staffUsers) {
        const incoming = completeStaffModuleAccessMap(u.module_access);
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
      completeStaffModuleAccessMap(selectedUser.module_access))
    : completeStaffModuleAccessMap({});

  const savedMap = selectedUser
    ? completeStaffModuleAccessMap(selectedUser.module_access)
    : completeStaffModuleAccessMap({});
  const selectedDirty = selectedUser ? !mapsEqual(selectedMap, savedMap) : false;

  const dirtyUsers = staffUsers.filter((u) => {
    const draft = draftByUser[u.id] ?? completeStaffModuleAccessMap(u.module_access);
    return !mapsEqual(draft, completeStaffModuleAccessMap(u.module_access));
  });

  const visibleUsers = staffUsers.filter((u) => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.full_name ?? "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role_label.toLowerCase().includes(q)
    );
  });

  const groupedModules = STAFF_MODULE_GROUPS.map((group) => ({
    ...group,
    modules: STAFF_ASSIGNABLE_MODULES.filter(
      (mod) => (mod as { group?: StaffModuleGroup }).group === group.id,
    ),
  })).filter((group) => group.modules.length > 0);

  const counts = countLevels(selectedMap);

  function setPermission(key: DashboardModuleKey, level: ModulePermission) {
    if (!selectedUser) return;
    if (key === "dashboard" && level === "none") return;
    setDraftByUser((prev) => ({
      ...prev,
      [selectedUser.id]: completeStaffModuleAccessMap({
        ...(prev[selectedUser.id] ?? selectedUser.module_access),
        [key]: key === "dashboard" ? "edit" : level,
      }),
    }));
    setError(null);
    setSuccess(null);
  }

  function setAll(level: ModulePermission) {
    if (!selectedUser) return;
    const next = completeStaffModuleAccessMap({});
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

  function applyRolePreset() {
    if (!selectedUser) return;
    setDraftByUser((prev) => ({
      ...prev,
      [selectedUser.id]: defaultModuleAccessForRole(selectedUser.role),
    }));
    setError(null);
    setSuccess(null);
  }

  function applyRolePresetsToAll() {
    setDraftByUser(() => {
      const next: Record<string, ModuleAccessMap> = {};
      for (const u of staffUsers) {
        next[u.id] = defaultModuleAccessForRole(u.role);
      }
      return next;
    });
    setError(null);
    setSuccess(null);
  }

  function handleSave() {
    if (!selectedUser) return;
    setError(null);
    setSuccess(null);
    const access = completeStaffModuleAccessMap(
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

  function handleSaveAll() {
    if (dirtyUsers.length === 0) return;
    setError(null);
    setSuccess(null);
    const updates = dirtyUsers.map((u) => ({
      userId: u.id,
      access: completeStaffModuleAccessMap(draftByUser[u.id] ?? u.module_access),
    }));
    start(async () => {
      const res = await updateAllStaffModuleAccess(updates);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDraftByUser((prev) => {
        const next = { ...prev };
        for (const item of updates) next[item.userId] = item.access;
        return next;
      });
      setSuccess(`Module access saved for ${res.saved} user${res.saved === 1 ? "" : "s"}.`);
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
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Edit, View, or hide each module for every Inspection Engineer and Accountant.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || staffUsers.length === 0}
            onClick={applyRolePresetsToAll}
            className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-800 dark:bg-zinc-900 dark:text-sky-200 dark:hover:bg-sky-950/40"
          >
            Preset all users
          </button>
          <button
            type="button"
            disabled={pending || dirtyUsers.length === 0}
            onClick={handleSaveAll}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {pending ? "Saving…" : `Save all users${dirtyUsers.length ? ` (${dirtyUsers.length})` : ""}`}
          </button>
          <button
            type="button"
            disabled={pending || !selectedUser || !selectedDirty}
            onClick={handleSave}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save this user"}
          </button>
        </div>
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
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Users · {staffUsers.length}
              </p>
              <input
                type="search"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Search name or email"
                className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-auto p-2">
              {visibleUsers.map((u) => {
                const active = u.id === selectedUserId;
                const dirty = dirtyUsers.some((d) => d.id === u.id);
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
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {u.full_name ?? "—"}
                        </span>
                        {dirty ? (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />
                        ) : null}
                      </span>
                      <span className="truncate text-[11px] opacity-80">
                        {u.role_label} · {u.email}
                      </span>
                    </button>
                  </li>
                );
              })}
              {visibleUsers.length === 0 ? (
                <li className="px-2.5 py-6 text-center text-xs text-zinc-500">
                  No users match this search.
                </li>
              ) : null}
            </ul>
          </aside>

          <section className="overflow-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {selectedUser ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                      {selectedUser.full_name ?? selectedUser.email}
                      {selectedDirty ? (
                        <span className="ml-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          Unsaved
                        </span>
                      ) : null}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {selectedUser.role_label} · {selectedUser.email}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      {counts.edit} edit · {counts.view} view · {counts.none} none
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyRolePreset}
                      className="rounded-lg border border-sky-300 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-200 dark:hover:bg-sky-950/40"
                    >
                      Apply {selectedUser.role_label} preset
                    </button>
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

                <div className="space-y-5">
                  {groupedModules.map((group) => (
                    <div key={group.id}>
                      <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {group.label}
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.modules.map((mod) => {
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
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
