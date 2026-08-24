"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createPortalRole,
  createStaffUser,
  deleteStaffUser,
  resetStaffUserPassword,
  updateStaffUser,
  updateStaffUserRole,
  type PortalRoleRow,
  type StaffUserRow,
} from "@backend/actions/user-management";

const inp =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";

function RoleSelect({
  roles,
  value,
  onChange,
  name = "role",
  disabled,
  className,
}: {
  roles: PortalRoleRow[];
  value: string;
  onChange: (slug: string) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      name={name}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? inp}
    >
      {roles.map((role) => (
        <option key={role.id} value={role.slug}>
          {role.label}
        </option>
      ))}
    </select>
  );
}

function RoleFieldWithAdd({
  roles,
  value,
  onChange,
  newRoleName,
  onNewRoleNameChange,
  onAddRole,
  disabled,
}: {
  roles: PortalRoleRow[];
  value: string;
  onChange: (slug: string) => void;
  newRoleName: string;
  onNewRoleNameChange: (value: string) => void;
  onAddRole: () => Promise<boolean>;
  disabled?: boolean;
}) {
  const [showAddRole, setShowAddRole] = useState(false);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Role</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowAddRole((v) => !v)}
          className="shrink-0 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {showAddRole ? "Cancel" : "+ Add role"}
        </button>
      </div>
      {showAddRole && (
        <div className="mb-2 flex gap-2">
          <input
            value={newRoleName}
            onChange={(e) => onNewRoleNameChange(e.target.value)}
            placeholder="e.g. Accountant"
            className={inp}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={async () => {
              const ok = await onAddRole();
              if (ok) setShowAddRole(false);
            }}
            className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Add
          </button>
        </div>
      )}
      <RoleSelect roles={roles} value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function UserManagementPanel({
  initialUsers,
  initialRoles,
  loadError,
  serviceConfigured,
}: {
  initialUsers: StaffUserRow[];
  initialRoles: PortalRoleRow[];
  loadError: string | null;
  serviceConfigured: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [roles, setRoles] = useState(initialRoles);
  const usersKey = JSON.stringify(initialUsers);
  const rolesKey = JSON.stringify(initialRoles);
  const [appliedUsersKey, setAppliedUsersKey] = useState(usersKey);
  const [appliedRolesKey, setAppliedRolesKey] = useState(rolesKey);

  if (usersKey !== appliedUsersKey) {
    setAppliedUsersKey(usersKey);
    setUsers(initialUsers);
  }
  if (rolesKey !== appliedRolesKey) {
    setAppliedRolesKey(rolesKey);
    setRoles(initialRoles);
  }

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(loadError);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newUserRole, setNewUserRole] = useState("staff");
  const [newRoleName, setNewRoleName] = useState("");
  const [editingUser, setEditingUser] = useState<StaffUserRow | null>(null);
  const [editRole, setEditRole] = useState("staff");
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleAddRole(onAdded?: (slug: string) => void): Promise<boolean> {
    const label = newRoleName.trim();
    if (!label) {
      setError("Enter a role name to add.");
      return false;
    }
    setError(null);
    const res = await createPortalRole(label);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setRoles((prev) => {
      if (prev.some((r) => r.slug === res.role.slug)) return prev;
      return [...prev, res.role].sort(
        (a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label),
      );
    });
    setNewRoleName("");
    setSuccess(`Role "${res.role.label}" added.`);
    onAdded?.(res.role.slug);
    return true;
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createStaffUser(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess("User created. They can sign in with the email and password you set.");
      setNewUserRole("staff");
      setShowForm(false);
      refresh();
    });
  }

  function openEdit(user: StaffUserRow) {
    setEditingUser(user);
    setEditRole(user.role);
    setError(null);
    setSuccess(null);
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await updateStaffUser(editingUser.id, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(`User ${editingUser.email} updated.`);
      setEditingUser(null);
      refresh();
    });
  }

  function handleResetPassword(userId: string, email: string) {
    const pwd = prompt(`New password for ${email} (min 8 characters):`);
    if (!pwd) return;
    setError(null);
    start(async () => {
      const res = await resetStaffUserPassword(userId, pwd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(`Password reset for ${email}.`);
    });
  }

  function handleDelete(userId: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    setError(null);
    start(async () => {
      const res = await deleteStaffUser(userId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccess(`User ${email} deleted.`);
    });
  }

  function handleRoleChange(userId: string, newRole: string) {
    if (updatingRoleUserId === userId) return;

    const user = users.find((u) => u.id === userId);
    if (!user || newRole === user.role) return;

    const prevRole = user.role;
    const prevLabel = user.role_label;
    const newLabel = roles.find((r) => r.slug === newRole)?.label ?? newRole;

    setError(null);
    setSuccess(null);
    setUpdatingRoleUserId(userId);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole, role_label: newLabel } : u,
      ),
    );

    start(async () => {
      const res = await updateStaffUserRole(userId, newRole);
      setUpdatingRoleUserId(null);

      if (!res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, role: prevRole, role_label: prevLabel } : u,
          ),
        );
        setError(res.error);
        return;
      }

      setSuccess(`Role updated for ${user.email}.`);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {!serviceConfigured && (
        <p className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Set <code className="text-xs">DATABASE_URL</code> and{" "}
          <code className="text-xs">SESSION_SECRET</code> in{" "}
          <code className="text-xs">.env.local</code> to create and remove login accounts.
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </p>
      )}

      <div className="shrink-0 space-y-4">
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/20 dark:text-violet-100">
        <p className="font-medium">Super Admin</p>
        <p className="mt-1 text-xs leading-relaxed text-violet-800 dark:text-violet-200">
          Super Admins can manage users, company settings, and app settings. Employees sign in
          only after you add them here.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          disabled={!serviceConfigured || pending}
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {showForm ? "Cancel" : "Add employee"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">New employee</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Full name
              </label>
              <input name="full_name" required className={inp} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Work email
              </label>
              <input name="email" type="email" required className={inp} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Mobile number
              </label>
              <input name="mobile" type="tel" className={inp} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Password
              </label>
              <input name="password" type="password" required minLength={8} className={inp} />
            </div>
            <RoleFieldWithAdd
              roles={roles}
              value={newUserRole}
              onChange={setNewUserRole}
              newRoleName={newRoleName}
              onNewRoleNameChange={setNewRoleName}
              onAddRole={() => handleAddRole(setNewUserRole)}
              disabled={pending}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create user"}
          </button>
        </form>
      )}

      {editingUser && (
        <form
          onSubmit={handleEdit}
          className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/40 p-5 dark:border-sky-900 dark:bg-sky-950/20"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Edit user — {editingUser.email}
            </h2>
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Close
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Full name
              </label>
              <input
                name="full_name"
                required
                defaultValue={editingUser.full_name ?? ""}
                className={inp}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Mobile number
              </label>
              <input
                name="mobile"
                type="tel"
                defaultValue={editingUser.mobile ?? ""}
                className={inp}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <RoleFieldWithAdd
              roles={roles}
              value={editRole}
              onChange={setEditRole}
              newRoleName={newRoleName}
              onNewRoleNameChange={setNewRoleName}
              onAddRole={() => handleAddRole(setEditRole)}
              disabled={pending}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                New password (optional)
              </label>
              <input name="password" type="password" minLength={8} className={inp} />
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-200 p-2.5 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900/80">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Name
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Email
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Mobile
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Role
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {u.full_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">{u.email}</td>
                <td className="px-4 py-3 text-center text-zinc-600 dark:text-zinc-400">
                  {u.mobile?.trim() ? u.mobile : "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <RoleSelect
                    roles={roles}
                    value={u.role}
                    onChange={(slug) => handleRoleChange(u.id, slug)}
                    disabled={!serviceConfigured || updatingRoleUserId === u.id}
                    className={`${inp} mx-auto max-w-[11rem] py-1.5 text-center text-zinc-700 dark:text-zinc-300`}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      title="Edit"
                      aria-label="Edit user"
                      disabled={pending}
                      onClick={() => openEdit(u)}
                      className="rounded-lg px-2 py-1 text-base leading-none hover:bg-sky-50 disabled:opacity-50 dark:hover:bg-sky-950/40"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      title="Reset password"
                      aria-label="Reset password"
                      disabled={pending || !serviceConfigured}
                      onClick={() => handleResetPassword(u.id, u.email)}
                      className="rounded-lg px-2 py-1 text-base leading-none hover:bg-violet-50 disabled:opacity-50 dark:hover:bg-violet-950/40"
                    >
                      🔑
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete user"
                      disabled={pending || !serviceConfigured}
                      onClick={() => handleDelete(u.id, u.email)}
                      className="rounded-lg px-2 py-1 text-base leading-none hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
