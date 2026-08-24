import { AuthShell } from "@/components/auth/AuthShell";
import { ConfigBanner } from "@/components/auth/ConfigBanner";
import { isDatabaseConfigured } from "@backend/shared/env";
import { loginAction } from "./actions";
import { SubmitButton } from "./submit-button";

function resolveErrorMessage(error: string | null | undefined): string | null {
  if (!error) return null;
  if (error === "auth") return "Could not complete sign-in. Try again.";
  if (error === "config") return "Configure DATABASE_URL and SESSION_SECRET first.";
  if (error === "missing") return "Enter your email and password.";
  return error;
}

export function LoginForm({
  error,
  next,
}: {
  error?: string | null;
  next: string;
}) {
  const configured = isDatabaseConfigured();
  const message = resolveErrorMessage(error);

  return (
    <AuthShell title="Sign in">
      {!configured && <ConfigBanner />}
      <form action={loginAction} className="space-y-5">
        <input type="hidden" name="next" value={next} />

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-sky-500/30 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-sky-500/30 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {message && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {message}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Need access? Ask your administrator to add you in User Management.
      </p>
    </AuthShell>
  );
}
