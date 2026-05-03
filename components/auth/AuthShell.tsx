import Link from "next/link";
import type { ReactNode } from "react";

const referenceLinks = [
  { href: "https://www.manakonline.in", label: "MANAK online" },
  { href: "https://www.bis.gov.in", label: "BIS (Gov)" },
  { href: "https://nabl-india.org/", label: "NABL" },
  {
    href: "https://nablwp.qci.org.in/Home/login",
    label: "NABL portal (QCI)",
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="relative flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-10 text-white lg:w-[42%] lg:max-w-xl lg:px-12 lg:py-14">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Technical consultancy
            </p>
            <h1 className="text-3xl font-semibold leading-tight lg:text-4xl">
              BIS • ISO • Testing • Calibration
            </h1>
            {subtitle ? (
              <p className="max-w-md text-sm leading-relaxed text-slate-300">
                {subtitle}
              </p>
            ) : (
              <p className="max-w-md text-sm leading-relaxed text-slate-300">
                Manage licenses, certifications, client records, and finances in
                one secure workspace.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Useful references
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {referenceLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-300 underline-offset-4 hover:text-white hover:underline"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-10 text-xs text-slate-500 lg:mt-0">
          Internal operations portal — authorized staff only.
        </p>
      </aside>

      <main className="flex flex-1 flex-col justify-center bg-zinc-50 px-6 py-12 dark:bg-zinc-950 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Secure access powered by Supabase.
            </p>
          </div>
          {children}
          <p className="text-center text-xs text-zinc-500">
            <Link
              href="/"
              className="underline-offset-4 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
            >
              Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
