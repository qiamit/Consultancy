"use client";

import Link from "next/link";

export default function EmailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30">
      <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
        View Email could not load
      </h2>
      <p className="text-sm text-red-800 dark:text-red-200">{error.message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
