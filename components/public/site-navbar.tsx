"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { QELogo } from "@/components/public/qe-logo";

const SERVICES = [
  { label: "Product Certification (BIS / ISI Mark)", href: "/services/product-certification" },
  { label: "Laboratory Accreditation (NABL, QAI)", href: "/services/lab-accreditation" },
  { label: "Management System Certification", href: "/services/management-system" },
  { label: "Calibration of Instruments", href: "/services/calibration" },
  { label: "Testing of Products", href: "/services/testing" },
  { label: "Laboratory Setup & Instrument Supply", href: "/services/lab-setup" },
];

const MANDATORY_INTERNAL = { label: "View Mandatory Products List", href: "/mandatory-products" };

const MANDATORY = [
  {
    label: "Products under Compulsory Certification (Scheme-I / ISI Mark)",
    url: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en",
  },
  {
    label: "Upcoming QCOs Notified & Due for Implementation",
    url: "https://www.bis.gov.in/upcoming-qcos-notified-and-due-for-implementation/?lang=en",
  },
];

const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Updates", href: "/updates" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Contact", href: "/contact" },
] as const;

const ChevronDown = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={`${className} transition-transform duration-200 group-hover:rotate-180`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
  </svg>
);

const dropdownPanel =
  "absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white py-2 z-50 shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out";

const dropdownHeader = "px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 mb-1";
const dropdownHeaderText =
  "text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest";

const dropdownLink =
  "flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/40 dark:hover:text-sky-400 transition-colors";

const dropdownSection =
  "px-4 py-1.5 mt-1 border-t border-zinc-100 dark:border-zinc-800";

export function SiteNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const servicesActive = pathname.startsWith("/services");
  const mandatoryActive = pathname === "/qco" || pathname.startsWith("/qco");

  const navItemCls = (active: boolean) =>
    [
      "flex flex-1 items-center justify-center gap-1 min-w-0 px-2 xl:px-3 py-2 rounded-lg",
      "text-[11px] xl:text-xs 2xl:text-sm font-bold tracking-wide uppercase transition-all duration-200 whitespace-nowrap",
      active
        ? "bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700"
        : "text-zinc-600 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-white dark:hover:bg-zinc-900",
    ].join(" ");

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setExpanded(null);
  }, [pathname]);

  const toggleMobileMenu = () => setMobileOpen((open) => !open);

  const handleLoginNav = () => {
    setMobileOpen(false);
    router.push("/login");
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 w-full max-w-[100vw] overflow-x-clip transition-all duration-300 border-b border-zinc-200/80 dark:border-zinc-800 ${scrolled ? "bg-white shadow-sm dark:bg-zinc-900" : "bg-white/90 backdrop-blur-md dark:bg-zinc-900/90"}`}>
      <div className="h-[3px] bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-600" />

      <nav className="w-full px-4 sm:px-6 lg:px-8 flex items-center h-[62px] gap-3 sm:gap-4 overflow-hidden pr-12 lg:pr-8">
        {/* Logo */}
        <Link href="/" className="min-w-0 flex-1 lg:flex-none" aria-label="Quality Engineering — Home">
          <QELogo sm />
        </Link>

        {/* Desktop Nav — full-width pill bar */}
        <div className="hidden lg:flex flex-1 items-center min-w-0 px-1 xl:px-3">
          <div className="flex w-full items-stretch gap-0.5 xl:gap-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100/90 dark:bg-zinc-800/80 p-1">
            {NAV_LINKS.slice(0, 2).map((item) => (
              <Link key={item.href} href={item.href} className={navItemCls(isActive(item.href))}>
                {item.label}
              </Link>
            ))}

            {/* Services Dropdown */}
            <div className="relative group flex flex-1 min-w-0">
              <button
                type="button"
                className={`${navItemCls(servicesActive)} w-full group`}
                aria-haspopup="true"
              >
                Services
                <ChevronDown />
              </button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 h-2 w-full min-w-[120px]" />
              <div className={`${dropdownPanel} min-w-[300px] xl:min-w-[320px]`}>
                <div className={dropdownHeader}>
                  <p className={dropdownHeaderText}>Our Services</p>
                </div>
                {SERVICES.map(s => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className={dropdownLink}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-500 flex-shrink-0" />
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* QCO Direct Link */}
            <Link href="/qco" className={navItemCls(mandatoryActive)}>
              <span className="hidden 2xl:inline">Mandatory</span>
              <span className="2xl:hidden">QCO</span>
            </Link>

            {NAV_LINKS.slice(2).map((item) => (
              <Link key={item.href} href={item.href} className={navItemCls(isActive(item.href))}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: CTA buttons (desktop only) */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0 ml-auto">
          {/* WhatsApp button */}
          <a
            href="https://wa.me/919009413040?text=Hello%2C%20I%20need%20BIS%20Certification%20consultation"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#1eb858] text-white font-bold rounded-lg transition-colors text-xs shadow-sm"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
            WhatsApp
          </a>

          {/* Call button */}
          <a
            href="tel:+919009413040"
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:border-sky-600 hover:text-sky-600 dark:text-sky-400 text-gray-700 font-bold rounded-lg transition-colors text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
            </svg>
            Call
          </a>

          {/* Portal button */}
          <button
            onClick={handleLoginNav}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Portal
          </button>
        </div>
      </nav>

      {/* Mobile toggle — pinned to viewport so flex/overflow cannot push it off-screen */}
      <button
        type="button"
        className="lg:hidden fixed top-[14px] right-3 z-[70] flex h-11 w-11 items-center justify-center rounded-lg bg-white/95 text-gray-700 shadow-sm ring-1 ring-zinc-200/80 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation dark:bg-zinc-900/95 dark:text-zinc-100 dark:ring-zinc-700"
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
        aria-expanded={mobileOpen}
        aria-controls="mobile-nav-menu"
      >
        {mobileOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
        )}
      </button>

      {/* Mobile Menu */}
      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-[65px] z-[55] bg-black/30 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <div
            id="mobile-nav-menu"
            className="lg:hidden relative z-[60] border-t border-gray-100 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
          <div className="px-4 py-3 space-y-0.5 max-h-[min(80vh,calc(100dvh-65px))] overflow-y-auto overscroll-contain">
            <Link href="/" className="block px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-sky-600 dark:text-sky-400 rounded-lg hover:bg-blue-50" onClick={() => setMobileOpen(false)}>Home</Link>
            <Link href="/about" className="block px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-sky-600 dark:text-sky-400 rounded-lg hover:bg-blue-50" onClick={() => setMobileOpen(false)}>About</Link>

            {/* Services accordion */}
            <div>
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 rounded-lg hover:bg-blue-50"
                onClick={() => setExpanded(expanded === "services" ? null : "services")}
              >
                Services
                <svg className={`w-4 h-4 transition-transform ${expanded === "services" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </button>
              {expanded === "services" && (
                <div className="pl-3 mt-1 space-y-0.5">
                  {SERVICES.map(s => (
                    <Link key={s.href} href={s.href} className="block px-3 py-2 text-sm text-gray-600 hover:text-sky-600 dark:text-sky-400 rounded-lg hover:bg-blue-50" onClick={() => setMobileOpen(false)}>{s.label}</Link>
                  ))}
                </div>
              )}
            </div>

            {/* Mandatory Products accordion */}
            <div>
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-gray-700 rounded-lg hover:bg-blue-50"
                onClick={() => setExpanded(expanded === "mandatory" ? null : "mandatory")}
              >
                Mandatory Products
                <svg className={`w-4 h-4 transition-transform ${expanded === "mandatory" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
              </button>
              {expanded === "mandatory" && (
                <div className="pl-3 mt-1 space-y-0.5">
                  <Link href={MANDATORY_INTERNAL.href} className="block px-3 py-2 text-sm font-semibold text-sky-600 dark:text-sky-400 rounded-lg hover:bg-blue-50" onClick={() => setMobileOpen(false)}>{MANDATORY_INTERNAL.label}</Link>
                  {MANDATORY.map(m => (
                    <a key={m.url} href={m.url} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 text-sm text-gray-600 hover:text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50" onClick={() => setMobileOpen(false)}>{m.label}</a>
                  ))}
                </div>
              )}
            </div>

            <Link href="/updates" className="block px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-sky-600 dark:text-sky-400 rounded-lg hover:bg-blue-50" onClick={() => setMobileOpen(false)}>Updates</Link>
            <Link href="/testimonials" className="block px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-sky-600 dark:text-sky-400 rounded-lg hover:bg-blue-50" onClick={() => setMobileOpen(false)}>Testimonials</Link>
            <Link href="/contact" className="block px-3 py-2.5 text-sm font-semibold text-gray-700 hover:text-sky-600 dark:text-sky-400 rounded-lg hover:bg-blue-50" onClick={() => setMobileOpen(false)}>Contact</Link>

            <div className="pt-3 pb-1 border-t border-gray-100 mt-2 flex gap-2">
              <a href="https://wa.me/919009413040" target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366] text-white font-bold rounded-xl text-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                WhatsApp
              </a>
              <button type="button" onClick={handleLoginNav} className="flex-1 py-2.5 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-500 transition-colors text-sm">
                Client Portal
              </button>
            </div>
          </div>
          </div>
        </>
      )}
    </header>
  );
}
