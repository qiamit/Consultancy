import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            Technical Consultancy
          </span>
          <div className="flex gap-4 text-sm font-medium">
            <Link
              href="/login"
              className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-sky-600 px-4 py-2 text-white shadow-sm hover:bg-sky-500"
            >
              Staff signup
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-1 flex-col gap-16 px-6 py-16 lg:flex-row lg:items-start lg:gap-24">
        <section className="flex-1 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">
            BIS • ISO • Testing • Calibration
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 lg:text-5xl">
            Run your consultancy operations with clarity.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Track clients who need new BIS licenses or renewals, ISO 17025 and
            management system programmes, product testing, and instrument
            calibration — with finance and documents in one place.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="inline-flex rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
            >
              Open dashboard
            </Link>
            <a
              href="https://www.bis.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              BIS resources
            </a>
          </div>
        </section>

        <aside className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Services covered
          </h2>
          <ul className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
            <li>BIS — new license, renewal, inclusion, maintenance</li>
            <li>ISO 17025 via NABL, QAI, IQAS and other bodies</li>
            <li>ISO 9001, 14001, 45001, ISO 22000, 5S, Six Sigma, risk analysis</li>
            <li>Product testing coordination</li>
            <li>Calibration of measuring instruments</li>
          </ul>
          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Reference portals
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <a
                  href="https://www.manakonline.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
                >
                  MANAK online
                </a>
              </li>
              <li>
                <a
                  href="https://nabl-india.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
                >
                  NABL
                </a>
              </li>
              <li>
                <a
                  href="https://nablwp.qci.org.in/Home/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 underline-offset-4 hover:underline dark:text-sky-400"
                >
                  NABL portal (QCI)
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </main>

      <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
        Internal operations — authorized staff only.
      </footer>
    </div>
  );
}
