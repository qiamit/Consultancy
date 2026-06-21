import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignupPage() {
  return (
    <AuthShell title="Staff accounts">
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-700 dark:text-zinc-300">
          New portal users are created by an administrator in{" "}
          <strong>User Management</strong> inside the dashboard.
        </p>
        <p className="text-zinc-500 dark:text-zinc-400">
          If you already have credentials, sign in below.
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Go to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
