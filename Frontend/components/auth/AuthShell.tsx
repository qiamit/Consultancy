import Link from "next/link";
import type { ReactNode } from "react";
import { QELogoImage } from "@/components/public/qe-logo-image";

const CERT_SCHEMES = [
  { label: "ISI Mark", sub: "Scheme-I · QCO products" },
  { label: "CRS", sub: "Electronics & IT goods" },
  { label: "FMCS", sub: "Foreign manufacturers" },
  { label: "QCO", sub: "Mandatory compliance" },
];

const REFERENCE_LINKS = [
  { href: "https://www.manakonline.in", label: "MANAK online" },
  { href: "https://www.bis.gov.in", label: "BIS (Gov)" },
  { href: "https://crsbis.in", label: "CRS portal" },
];

const MOTIVATION = [
  {
    quote: "Quality is never an accident — it is always the result of intelligent effort.",
    author: "John Ruskin",
  },
  {
    quote: "Certification opens markets. Compliance keeps you in them.",
    author: "QE Team",
  },
];

const STATS = [
  { value: "1200+", label: "Certifications" },
  { value: "99%", label: "First-time approval" },
  { value: "10+", label: "Years experience" },
];

export function AuthShell({
  title,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[25%_50%_25%]">
      {/* ── Left 25% — Product Certification ── */}
      <aside
        className="order-2 flex flex-col justify-between border-b border-white/8 px-5 py-6 text-white lg:order-1 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-6 lg:py-8 xl:px-7"
        style={{
          background: "linear-gradient(175deg,#0A1628 0%,#0F2347 60%,#0D1F3C 100%)",
        }}
      >
        <div className="space-y-5">
          <Link href="/" className="inline-block transition-opacity hover:opacity-90">
            <QELogoImage variant="auth" priority className="h-10 w-auto sm:h-11" />
          </Link>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-400/80">
              Product Certification
            </p>
            <h1 className="text-xl font-semibold leading-snug lg:text-2xl">
              BIS · ISI · CRS · FMCS
            </h1>
            <p className="text-xs leading-snug text-slate-400">
              Licenses, renewals, and QCO compliance — tracked per client in one workspace.
            </p>
          </div>

          <ul className="space-y-2">
            {CERT_SCHEMES.map((s) => (
              <li
                key={s.label}
                className="rounded-lg border border-white/8 bg-white/5 px-3 py-2"
              >
                <p className="text-xs font-semibold text-white">{s.label}</p>
                <p className="text-[10px] leading-snug text-slate-400">{s.sub}</p>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Quick links
            </p>
            <ul className="mt-2 space-y-1.5">
              {REFERENCE_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-sky-300 underline-offset-2 hover:text-white hover:underline"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 hidden text-[10px] text-slate-600 lg:block">
          Internal portal — authorized staff only.
        </p>
      </aside>

      {/* ── Center 50% — Auth form ── */}
      <main className="order-1 flex flex-1 flex-col justify-center bg-zinc-50 px-5 py-10 dark:bg-zinc-950 lg:order-2 lg:min-h-screen lg:px-10 lg:py-12 xl:px-14">
        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="flex justify-center lg:hidden">
            <Link href="/" className="transition-opacity hover:opacity-90">
              <QELogoImage variant="nav" priority className="h-9 w-auto" />
            </Link>
          </div>

          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Secure access for staff accounts.
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

      {/* ── Right 25% — Motivational ── */}
      <aside
        className="order-3 flex flex-col justify-between border-t border-white/8 px-5 py-6 text-white lg:min-h-screen lg:border-l lg:border-t-0 lg:px-6 lg:py-8 xl:px-7"
        style={{
          background: "linear-gradient(165deg,#0c4a6e 0%,#1e3a5f 45%,#0f172a 100%)",
        }}
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300/80">
              Why we do this
            </p>
            <h2 className="text-lg font-semibold leading-snug lg:text-xl">
              Every mark of quality starts with one right decision.
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center lg:text-left"
              >
                <p className="text-lg font-bold text-sky-300">{s.value}</p>
                <p className="text-[10px] leading-snug text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {MOTIVATION.map((m) => (
              <blockquote
                key={m.author}
                className="rounded-lg border border-white/8 bg-white/5 px-3 py-3"
              >
                <p className="text-xs leading-snug text-slate-200">&ldquo;{m.quote}&rdquo;</p>
                <footer className="mt-2 text-[10px] font-medium text-sky-400/90">
                  — {m.author}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>

        <p className="mt-6 text-[10px] leading-snug text-slate-500">
          Raipur · Serving manufacturers across India and export markets.
        </p>
      </aside>
    </div>
  );
}
