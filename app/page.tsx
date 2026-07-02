import Link from "next/link";
import { Suspense } from "react";
import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";
import { IsiMarkLogo } from "@/components/public/isi-mark-logo";
import {
  NABLIcon, ISOIcon, CalibrationIcon, TestingIcon,
  CEIcon, CRSIcon, HallmarkIcon, QCOIcon,
} from "@/components/public/service-icons";

function ServiceIcon({ icon }: { icon: string }) {
  if (icon === "isi") return <IsiMarkLogo />;
  if (icon === "nabl") return <NABLIcon className="w-8 h-8 mx-auto" />;
  if (icon === "iso") return <ISOIcon className="w-8 h-8 mx-auto" />;
  if (icon === "calibration") return <CalibrationIcon className="w-8 h-8 mx-auto" />;
  if (icon === "testing") return <TestingIcon className="w-8 h-8 mx-auto" />;
  if (icon === "ce") return <CEIcon className="w-8 h-8 mx-auto" />;
  if (icon === "crs") return <CRSIcon className="w-8 h-8 mx-auto" />;
  if (icon === "hallmark") return <HallmarkIcon className="w-8 h-8 mx-auto" />;
  if (icon === "qco") return <QCOIcon className="w-8 h-8 mx-auto" />;
  return null;
}
import { WhatsAppFab } from "@/components/public/whatsapp-fab";
import {
  LatestUpdatesPanel,
  LatestUpdatesSkeleton,
} from "@/components/public/latest-updates-panel";

const WA_LINK = "https://wa.me/919009413040?text=Hello%2C%20I%20need%20consultation%20for%20BIS%20Certification";

const BIS_SERVICES = [
  { icon: "isi",      label: "Product Certification", sub: "ISI Mark for 500+ QCO products",  accent: "from-sky-600 to-indigo-600" },
  { icon: "hallmark", label: "FMCS Registration",     sub: "Foreign Manufacturer Certification", accent: "from-yellow-600 to-amber-600" },
  { icon: "crs",      label: "CRS Registration",      sub: "Mobiles, laptops, chargers & IT", accent: "from-sky-600 to-cyan-600" },
  { icon: "qco",      label: "QCO Compliance",         sub: "Gap analysis & advisory",         accent: "from-red-700 to-red-900" },
];

const NABL_SERVICES = [
  { label: "NABL",  sub: "Testing & Calibration Labs",     accent: "from-teal-500 to-emerald-600" },
  { label: "QAI",   sub: "ISO/IEC 17025 Accreditation",   accent: "from-cyan-500 to-teal-600" },
  { label: "IQAS",  sub: "International Lab Accreditation", accent: "from-sky-500 to-cyan-600" },
  { label: "FDAS",  sub: "Food & Drug Testing Facilities",  accent: "from-emerald-500 to-green-600" },
];

const ISO_SERVICES = [
  { label: "ISO 9001",  sub: "Quality Management (QMS)",       accent: "from-indigo-500 to-violet-600" },
  { label: "ISO 14001", sub: "Environmental Management (EMS)", accent: "from-emerald-500 to-teal-600" },
  { label: "ISO 45001", sub: "Health & Safety (OHSMS)",        accent: "from-orange-500 to-red-600" },
  { label: "ISO 50001", sub: "Energy Management (EnMS)",       accent: "from-yellow-500 to-amber-600" },
];

const CALIBRATION_SERVICES = [
  { label: "Mechanical",    sub: "Torque, force & pressure",   accent: "from-amber-500 to-orange-600" },
  { label: "Electrical",    sub: "Meters & power analysers",   accent: "from-yellow-500 to-amber-600" },
  { label: "Thermal",       sub: "Sensors & thermocouples",    accent: "from-orange-500 to-red-600" },
  { label: "Mass & Volume", sub: "Balances & flow meters",     accent: "from-amber-600 to-yellow-700" },
];

const TESTING_SERVICES = [
  { label: "IS / BIS Testing",   sub: "Indian Standards for BIS",     accent: "from-red-500 to-rose-600" },
  { label: "ASTM / IEC Testing", sub: "International standards",      accent: "from-rose-500 to-red-700" },
  { label: "EN / CE Testing",    sub: "European export norms",        accent: "from-pink-500 to-rose-700" },
  { label: "Chemical Testing",   sub: "RoHS & heavy metals",          accent: "from-red-600 to-pink-700" },
];

const LAB_SETUP_SERVICES = [
  { label: "Lab Design",         sub: "Layout & infrastructure",     accent: "from-emerald-500 to-teal-600" },
  { label: "Instrument Supply",  sub: "Calibrated test equipment",   accent: "from-teal-500 to-cyan-600" },
  { label: "NABL Setup",         sub: "Accreditation ready labs",    accent: "from-cyan-500 to-sky-600" },
  { label: "Consumables",        sub: "Lab chemicals & supplies",    accent: "from-sky-500 to-blue-600" },
];

const STATS = [
  { value: "1200+", label: "Certifications", sub: "Delivered" },
  { value: "700+", label: "Active", sub: "Clients" },
  { value: "10+", label: "Years", sub: "Experience" },
  { value: "99%", label: "First-Time", sub: "Approval Rate" },
  { value: "All", label: "World", sub: "Coverage" },
  { value: "250+", label: "IS Codes", sub: "Mapped" },
];

const CREDENTIALS = [
  { icon: "🏅", text: "BIS Empanelled Consultant" },
  { icon: "🔬", text: "NABL Accreditation Specialist" },
  { icon: "📋", text: "ISO 9001 · 14001 · 45001" },
  { icon: "🌏", text: "Export & CE Marking Support" },
];

const INDUSTRIES = ["Manufacturing", "Electronics & IT", "Testing Labs", "Jewellery", "Food & FMCG", "Engineering Goods"];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-clip bg-zinc-50 dark:bg-zinc-950 xl:h-screen xl:overflow-hidden">
      <SiteNavbar />

      {/* Main fills remaining height on desktop; scroll naturally on mobile/tablet */}
      <main className="flex min-h-0 flex-1 flex-col pt-[65px] xl:overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col xl:overflow-hidden">

          {/* ── 3-COLUMN LAYOUT: Left brand | Center services | Right news ── */}
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(240px,28%)_minmax(0,1fr)_minmax(240px,28%)] gap-0 xl:overflow-hidden">

            {/* ── COL 1: Brand & Stats ── */}
            <div className="relative flex flex-col justify-between overflow-hidden px-4 py-5 sm:px-5 sm:py-6 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 bg-gradient-to-b from-zinc-100 dark:from-zinc-900 via-white dark:via-zinc-900 to-zinc-50 dark:to-zinc-950">
              <div className="absolute w-72 h-72 bg-blue-600/10 rounded-full -left-20 -top-10 blur-3xl pointer-events-none" aria-hidden />
              <div className="absolute w-48 h-48 bg-emerald-500/8 rounded-full -right-10 bottom-24 blur-3xl pointer-events-none" aria-hidden />

              <div className="relative flex flex-col items-center justify-center text-center w-full max-w-lg mx-auto gap-3 py-2 xl:max-w-[320px]">
                {/* Company name */}
                <div>
                  <h1 className="text-3xl xl:text-[2rem] font-bold text-zinc-900 dark:text-zinc-50 leading-tight tracking-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">
                      Quality Engineering
                    </span>
                  </h1>
                  <p className="text-sky-600 dark:text-sky-400 text-sm font-semibold uppercase tracking-[0.15em] mt-1.5">
                    BIS · NABL · ISO Consultancy
                  </p>
                </div>

                {/* Tagline */}
                <div className="space-y-1.5">
                  <p className="text-zinc-800 dark:text-zinc-200 text-lg font-bold leading-snug">
                    &ldquo;Raipur se Duniya Tak&rdquo;
                  </p>
                  <p className="text-sky-600 dark:text-sky-400 text-base font-semibold leading-snug">
                    Har Product, Sahi Certification
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed pt-0.5">
                    From Raipur to the world — every product, certified right.
                  </p>
                </div>

                {/* Value proposition */}
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed px-1">
                  Your trusted partner for <span className="text-zinc-900 dark:text-zinc-100 font-semibold">BIS (ISI Mark)</span>, NABL &amp; QAI lab accreditation, ISO management systems, CRS registration, calibration, product testing, and CE marking — based in Siltara Industrial Area, Raipur.
                </p>

                {/* KPI grid */}
                <div className="w-full grid grid-cols-3 gap-2">
                  {STATS.map(s => (
                    <div key={s.label + s.sub} className="bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 px-1 hover:border-sky-200 dark:hover:border-sky-800 transition-colors shadow-sm">
                      <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50 leading-none">{s.value}</div>
                      <div className="text-sky-600 dark:text-sky-400 text-[10px] font-bold uppercase tracking-wide mt-1 leading-tight">{s.label}</div>
                      <div className="text-zinc-500 text-[9px] leading-tight">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Credentials */}
                <div className="w-full grid grid-cols-2 gap-2">
                  {CREDENTIALS.map(c => (
                    <div key={c.text} className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-2 leading-tight">
                      <span className="text-base flex-shrink-0">{c.icon}</span>
                      <span>{c.text}</span>
                    </div>
                  ))}
                </div>

                {/* Industries served */}
                <div className="w-full">
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Industries We Serve</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {INDUSTRIES.map(ind => (
                      <span key={ind} className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-full px-2.5 py-1">
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Link
                href="/mandatory-products"
                className="relative flex-shrink-0 mt-3 flex items-center justify-between bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2.5 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">📋</span>
                  <div className="min-w-0 text-left">
                    <div className="text-red-800 dark:text-red-200 font-bold text-xs leading-tight">Mandatory Products List</div>
                    <div className="text-red-600/80 dark:text-red-300/80 text-[10px] leading-snug">500+ products requiring BIS / ISI Mark</div>
                  </div>
                </div>
                <svg className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </Link>

            </div>

            {/* ── COL 2: Services KPI Grid ── */}
            <div className="flex flex-col px-4 py-5 sm:px-5 sm:py-6 lg:overflow-y-auto xl:overflow-y-auto bg-gradient-to-br from-zinc-50 dark:from-zinc-950 to-zinc-100 dark:to-zinc-900 border-b lg:border-b-0 xl:border-b-0 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-zinc-900 dark:text-zinc-50 font-bold text-base">Certification Solutions</p>
                </div>
                <Link href="/services" className="text-sky-600 dark:text-sky-400 text-sm font-semibold hover:text-sky-500 flex items-center gap-1">
                  Explore All
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 auto-rows-fr">

                {/* ── MERGED BIS TILE ── */}
                <Link
                  href="/services/product-certification"
                  className="group relative rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #0D47A1 0%, #1565C0 50%, #1976D2 100%)" }}
                >
                  {/* Shine */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />

                  <div className="relative flex flex-col h-full p-4 gap-3">
                    {/* Badge */}
                    <div className="flex justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                        Most In-Demand
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-white font-black text-base leading-tight text-center">BIS / ISI / CRS Certification Services</p>

                    {/* 4 text buttons */}
                    <div className="grid grid-cols-2 gap-2 flex-1 auto-rows-fr">
                      {BIS_SERVICES.map(b => (
                        <div key={b.label}
                          className="flex flex-col items-center justify-center text-center bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-2 py-2.5 transition-colors gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${b.accent}`} />
                          <p className="text-white text-[11px] font-bold leading-tight">{b.label}</p>
                          <p className="text-blue-200/70 text-[9px] leading-tight">{b.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg py-2 text-xs font-bold text-white transition-colors">
                      View all BIS Services
                      <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </Link>

                {/* ── MERGED NABL TILE ── */}
                <Link
                  href="/services/lab-accreditation"
                  className="group relative rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #00695C 0%, #00796B 50%, #00897B 100%)" }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
                  <div className="relative flex flex-col h-full p-4 gap-3">
                    <div className="flex justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                        Labs & Testing
                      </span>
                    </div>
                    <p className="text-white font-black text-base leading-tight text-center">
                      Lab Accreditation Services for Testing &amp; Calibration as per ISO 17025
                    </p>
                    <div className="grid grid-cols-2 gap-2 flex-1 auto-rows-fr">
                      {NABL_SERVICES.map(n => (
                        <div key={n.label}
                          className="flex flex-col items-center justify-center text-center bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-2 py-2.5 transition-colors gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${n.accent}`} />
                          <p className="text-white text-[11px] font-bold leading-tight">{n.label}</p>
                          <p className="text-emerald-200/70 text-[9px] leading-tight">{n.sub}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg py-2 text-xs font-bold text-white transition-colors">
                      View Lab Accreditation
                      <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </Link>

                {/* ── MERGED ISO TILE ── */}
                <Link
                  href="/services/management-system"
                  className="group relative rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #283593 0%, #3949AB 50%, #3F51B5 100%)" }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
                  <div className="relative flex flex-col h-full p-4 gap-3">
                    <div className="flex justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                        Export Ready
                      </span>
                    </div>
                    <p className="text-white font-black text-base leading-tight text-center">
                      Management System Certification Services
                    </p>
                    <div className="grid grid-cols-2 gap-2 flex-1 auto-rows-fr">
                      {ISO_SERVICES.map(s => (
                        <div key={s.label}
                          className="flex flex-col items-center justify-center text-center bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-2 py-2.5 transition-colors gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${s.accent}`} />
                          <p className="text-white text-[11px] font-bold leading-tight">{s.label}</p>
                          <p className="text-indigo-200/70 text-[9px] leading-tight">{s.sub}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg py-2 text-xs font-bold text-white transition-colors">
                      View ISO Services
                      <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </Link>

                {/* ── MERGED CALIBRATION TILE ── */}
                <Link
                  href="/services/calibration"
                  className="group relative rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #E65100 0%, #F57C00 50%, #FB8C00 100%)" }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
                  <div className="relative flex flex-col h-full p-4 gap-3">
                    <div className="flex justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-200 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                        ISO 9001 Required
                      </span>
                    </div>
                    <p className="text-white font-black text-base leading-tight text-center">
                      Instrument Calibration Services
                    </p>
                    <div className="grid grid-cols-2 gap-2 flex-1 auto-rows-fr">
                      {CALIBRATION_SERVICES.map(s => (
                        <div key={s.label}
                          className="flex flex-col items-center justify-center text-center bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-2 py-2.5 transition-colors gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${s.accent}`} />
                          <p className="text-white text-[11px] font-bold leading-tight">{s.label}</p>
                          <p className="text-orange-200/70 text-[9px] leading-tight">{s.sub}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg py-2 text-xs font-bold text-white transition-colors">
                      View Calibration Services
                      <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </Link>

                {/* ── MERGED TESTING TILE ── */}
                <Link
                  href="/services/testing"
                  className="group relative rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #B71C1C 0%, #C62828 50%, #D32F2F 100%)" }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
                  <div className="relative flex flex-col h-full p-4 gap-3">
                    <div className="flex justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-200 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                        Pre-BIS Testing
                      </span>
                    </div>
                    <p className="text-white font-black text-base leading-tight text-center">
                      Product Testing &amp; Pre-Certification Services
                    </p>
                    <div className="grid grid-cols-2 gap-2 flex-1 auto-rows-fr">
                      {TESTING_SERVICES.map(s => (
                        <div key={s.label}
                          className="flex flex-col items-center justify-center text-center bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-2 py-2.5 transition-colors gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${s.accent}`} />
                          <p className="text-white text-[11px] font-bold leading-tight">{s.label}</p>
                          <p className="text-red-200/70 text-[9px] leading-tight">{s.sub}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg py-2 text-xs font-bold text-white transition-colors">
                      View Testing Services
                      <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </Link>

                {/* ── LAB SETUP & INSTRUMENT SUPPLY TILE ── */}
                <Link
                  href="/services/lab-setup"
                  className="group relative rounded-xl overflow-hidden flex flex-col shadow-sm transition-all duration-200 hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #004D40 0%, #00695C 50%, #00897B 100%)" }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
                  <div className="relative flex flex-col h-full p-4 gap-3">
                    <div className="flex justify-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-teal-200 bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                        Lab Infrastructure
                      </span>
                    </div>
                    <p className="text-white font-black text-base leading-tight text-center">
                      Laboratory Setup &amp; Instrument Supply
                    </p>
                    <div className="grid grid-cols-2 gap-2 flex-1 auto-rows-fr">
                      {LAB_SETUP_SERVICES.map(s => (
                        <div key={s.label}
                          className="flex flex-col items-center justify-center text-center bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-2 py-2.5 transition-colors gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${s.accent}`} />
                          <p className="text-white text-[11px] font-bold leading-tight">{s.label}</p>
                          <p className="text-teal-200/70 text-[9px] leading-tight">{s.sub}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 rounded-lg py-2 text-xs font-bold text-white transition-colors">
                      View Lab Setup Services
                      <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* ── COL 3: News ── */}
            <div className="flex flex-col lg:col-span-2 xl:col-span-1 border-t lg:border-t xl:border-t-0 xl:border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[360px] sm:min-h-[400px] xl:min-h-0 xl:overflow-hidden">
              <Suspense fallback={<LatestUpdatesSkeleton />}>
                <LatestUpdatesPanel limit={8} />
              </Suspense>
            </div>

          </div>
        </div>

        {/* Footer strip */}
        <footer className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 py-3 px-4 sm:px-6 bg-white dark:bg-zinc-900 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-zinc-500 dark:text-zinc-400 text-[10px] leading-relaxed">© 2026 Quality Engineering · Plot No 7A, Avinash Logistic Park, SKS Road, Siltara Industrial Area Phase 2, Raipur – 493221, CG</p>
          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            <a href="mailto:info@qengineering.in" className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">info@qengineering.in</a>
            <span className="text-zinc-300 dark:text-zinc-600">·</span>
            <a href="https://www.qengineering.in" className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">www.qengineering.in</a>
          </div>
        </footer>
      </main>

      <WhatsAppFab href={WA_LINK} position="left" />
      <QEAssistantTrigger />
    </div>
  );
}
