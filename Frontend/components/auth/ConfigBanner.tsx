export function ConfigBanner() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
      <p className="font-medium">Database is not configured for this login.</p>
      <p className="mt-1 text-xs opacity-90">
        Add <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">.env.local</code> in
        the project root (copy from{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">.env.example</code>
        ). Set a public <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">DATABASE_URL</code>{" "}
        (Railway Postgres TCP proxy, not{" "}
        <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">*.railway.internal</code>
        ) and <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">SESSION_SECRET</code>{" "}
        (≥ 32 characters), then restart <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">npm run dev</code>.
      </p>
    </div>
  );
}
