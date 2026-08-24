import Link from "next/link";
import { SiteNavbar } from "@/components/public/site-navbar";
import { TeamVisitingCard } from "@/components/public/team-visiting-card";
import { WhatsAppFab } from "@/components/public/whatsapp-fab";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_LINK =
  "https://wa.me/919009413040?text=Hello%2C%20I%20need%20consultation%20for%20BIS%20Certification";
const MAP_LINK = "https://maps.google.com/?q=21.384648549168134,81.6614874046873";

const STATS = [
  { value: "500+", label: "Certifications", sub: "Delivered" },
  { value: "300+", label: "Active Clients",  sub: "Pan India" },
  { value: "10+",  label: "Years",           sub: "Experience" },
  { value: "95%",  label: "First-Time",      sub: "Approval Rate" },
  { value: "15+",  label: "States",          sub: "Served" },
  { value: "500+", label: "IS Codes",        sub: "Mapped" },
];

const MILESTONES = [
  { year: "2014", label: "Founded",     text: "BIS licensing & quality systems, Raipur" },
  { year: "2018", label: "Expanded",    text: "NABL accreditation, ISO systems & lab consulting" },
  { year: "2022", label: "Pan-India",   text: "CRS, FMCS & export compliance added" },
  { year: "Now",  label: "Full-Scope",  text: "Complete certification partner for CG & national industry" },
];

const VALUES = [
  { icon: "🎯", title: "Client-First",    desc: "Every recommendation driven by your certification outcome." },
  { icon: "🔬", title: "Technical Depth", desc: "Real-time tracking of BIS notifications & QCO changes." },
  { icon: "🤝", title: "Integrity",       desc: "Honest gap assessments — no surprises mid-process." },
  { icon: "⚡", title: "Speed",           desc: "Templates & lab tie-ups that cut months off timelines." },
  { icon: "📋", title: "Accuracy",        desc: "Every application aligned to correct IS code & scheme." },
  { icon: "🔍", title: "Transparency",    desc: "Clear fees, realistic timelines, status at every stage." },
];

const COMMITMENTS = [
  "Free eligibility assessment before you commit",
  "No hidden charges — complete fee structure upfront",
  "Direct senior consultant access — no call-centre handoffs",
  "Proactive BIS & QCO alerts for active clients",
  "Audit-ready documentation reusable for renewals",
  "Post-certification support for surveillance & scope changes",
];

const TEAM = [
  {
    name: "Rakesh Kumar Labh",
    role: "Director & Lead Consultant",
    expertise: ["NABL Accreditation", "ISO 9001 / 14001 / 45001", "Calibration", "Product Testing", "Lab Setup"],
    phone: "+91 8966003040",
    whatsapp: "918966003040",
    email: "info@qengineering.in",
    initial: "RL",
    accent: "sky" as const,
  },
  {
    name: "Amit Kumar",
    role: "Senior Technical Consultant",
    expertise: ["BIS / ISI Mark", "CRS Registration", "QCO Advisory", "FMCS", "Regulatory Liaison"],
    phone: "+91 9009413040",
    whatsapp: "919009413040",
    email: "info@qengineering.in",
    initial: "AK",
    accent: "indigo" as const,
  },
];

const PORTALS = [
  { name: "Manak Online", url: "https://www.manakonline.in" },
  { name: "NABL India",   url: "https://nabl-india.org" },
  { name: "BIS Official", url: "https://www.bis.gov.in" },
  { name: "QCI",          url: "https://qcin.org" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen xl:h-screen flex flex-col overflow-x-clip xl:overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <SiteNavbar />

      <main className="flex-1 pt-[65px] flex flex-col xl:overflow-hidden">
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[25%_1fr_25%] xl:overflow-hidden xl:min-h-0">

          {/* ── COL 1: Dark Navy Identity Panel ── */}
          <div
            className="relative flex flex-col overflow-hidden border-b xl:border-b-0 xl:border-r border-white/10"
            style={{ background: "linear-gradient(160deg, #0A1628 0%, #0D1F3C 50%, #0F2347 100%)" }}
          >
            {/* Glow blobs */}
            <div className="absolute w-64 h-64 bg-sky-500/10 rounded-full -left-20 -top-16 blur-3xl pointer-events-none" aria-hidden />
            <div className="absolute w-48 h-48 bg-indigo-500/10 rounded-full -right-10 bottom-20 blur-3xl pointer-events-none" aria-hidden />

            <div className="relative flex flex-col gap-4 px-5 py-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-full w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Est. 2014 · Raipur, CG</span>
              </div>

              {/* Company name */}
              <div>
                <h1 className="text-2xl font-black text-white leading-tight">
                  Quality<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Engineering</span>
                </h1>
                <p className="text-sky-400/80 text-xs font-bold uppercase tracking-[0.15em] mt-1.5">
                  BIS · NABL · ISO Consultancy
                </p>
              </div>

              {/* Tagline */}
              <div className="border-l-2 border-sky-500/60 pl-3.5">
                <p className="text-white text-base font-black italic">&ldquo;Raipur se Duniya Tak&rdquo;</p>
                <p className="text-sky-400 text-sm font-semibold mt-0.5">Har Product, Sahi Certification</p>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">
                  From Raipur to the world — every product, certified right.
                </p>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {STATS.map(s => (
                  <div key={s.label + s.sub}
                    className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-1 text-center hover:bg-white/10 transition-colors">
                    <div className="text-xl font-black text-white leading-none">{s.value}</div>
                    <div className="text-sky-400 text-[9px] font-bold uppercase tracking-wide mt-1 leading-tight">{s.label}</div>
                    <div className="text-white/40 text-[8px] leading-tight">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <p className="text-white/60 text-xs leading-relaxed">
                India&apos;s trusted consultancy for <span className="text-white font-semibold">BIS (ISI Mark)</span>, NABL &amp; QAI lab accreditation, ISO management systems, CRS registration, calibration, product testing, and CE Marking — Siltara Industrial Area, Raipur.
              </p>

              {/* Office */}
              <a href={MAP_LINK} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2.5 bg-white/5 border border-white/10 hover:border-sky-500/40 hover:bg-white/10 rounded-xl px-3 py-3 transition-colors group">
                <span className="text-base mt-0.5 flex-shrink-0">📍</span>
                <div>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-wide mb-0.5">Office</p>
                  <p className="text-white/80 text-xs leading-snug">Plot 7A, Avinash Logistic Park,<br />Siltara, Raipur – 493221, CG</p>
                  <p className="text-sky-400 text-[10px] font-semibold mt-1 group-hover:underline">View on Maps →</p>
                </div>
              </a>

              {/* Get in Touch */}
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Get in Touch</p>
                <a href="mailto:info@qengineering.in" className="flex items-center gap-2 text-xs font-semibold text-sky-400 hover:underline">
                  <span>✉</span> info@qengineering.in
                </a>
                <a href="https://www.qengineering.in" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-white/60 hover:text-sky-400 transition-colors">
                  <span>🌐</span> www.qengineering.in
                </a>
                <p className="flex items-center gap-2 text-xs text-white/40">
                  <span>🕐</span> Mon–Sat · 9:30 AM – 6:30 PM
                </p>
              </div>

            </div>
          </div>

          {/* ── COL 2: Philosophy, Values, Journey, Commitments ── */}
          <div className="flex flex-col xl:overflow-y-auto bg-gradient-to-br from-zinc-50 dark:from-zinc-950 to-zinc-100 dark:to-zinc-900 px-4 xl:px-6 py-5 gap-5 border-b xl:border-b-0 border-zinc-200 dark:border-zinc-800">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-900 dark:text-zinc-50 font-black text-lg leading-tight">About Quality Engineering</p>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-0.5">India&apos;s trusted BIS · NABL · ISO consultancy, based in Raipur since 2014</p>
              </div>
              <Link href="/services" className="text-sky-600 dark:text-sky-400 text-sm font-semibold hover:text-sky-500 flex items-center gap-1 whitespace-nowrap">
                Our Services
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </Link>
            </div>

            {/* Philosophy + Mission/Vision row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Philosophy */}
              <div className="col-span-1 rounded-2xl p-4 text-white flex flex-col justify-between"
                style={{ background: "linear-gradient(135deg, #0D47A1 0%, #1565C0 60%, #1976D2 100%)" }}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1.5">Our Philosophy</p>
                  <p className="text-base font-black leading-tight mb-2">What Drives Us</p>
                  <p className="text-xs leading-relaxed text-white/80">
                    &ldquo;Har Product, Sahi Certification&rdquo; — compliance should empower business, not block it.
                  </p>
                </div>
              </div>

              {/* Mission */}
              <div className="rounded-2xl p-4 text-white flex flex-col"
                style={{ background: "linear-gradient(135deg, #00695C 0%, #00796B 100%)" }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1.5">🎯 Mission</p>
                <p className="text-sm font-black mb-2">Make Compliance Accessible</p>
                <p className="text-xs leading-relaxed text-white/80">
                  Accurate &amp; efficient certification for every Indian manufacturer, lab and exporter.
                </p>
              </div>

              {/* Vision */}
              <div className="rounded-2xl p-4 text-white flex flex-col"
                style={{ background: "linear-gradient(135deg, #4527A0 0%, #512DA8 100%)" }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-200 mb-1.5">🌏 Vision</p>
                <p className="text-sm font-black mb-2">CG Goes Global</p>
                <p className="text-xs leading-relaxed text-white/80">
                  CG manufacturers competing globally with world-class compliance standards.
                </p>
              </div>
            </div>

            {/* Core Values */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2.5">Core Values</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {VALUES.map(v => (
                  <div key={v.title}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{v.icon}</span>
                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{v.title}</p>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Journey — horizontal timeline */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2.5">Our Journey</p>
              <div className="relative">
                {/* Horizontal line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 rounded-full" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {MILESTONES.map((m, i) => (
                    <div key={m.year} className="flex flex-col items-center text-center">
                      {/* Dot */}
                      <div className={`w-10 h-10 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center mb-2 shadow-md z-10 relative ${i === MILESTONES.length - 1 ? "bg-emerald-500" : "bg-gradient-to-br from-sky-500 to-indigo-600"}`}>
                        <span className="text-white text-[10px] font-black">{m.year}</span>
                      </div>
                      <p className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wide mb-0.5">{m.label}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Commitments */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
              <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 mb-3">Our Commitments to You</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {COMMITMENTS.map(c => (
                  <div key={c} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className="text-emerald-500 font-black flex-shrink-0 mt-0.5">✓</span>
                    {c}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── COL 3: Team & Contact ── */}
          <div className="flex flex-col border-t xl:border-t-0 xl:border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 xl:overflow-hidden">
            {/* Header */}
            <div className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0D47A1 0%, #1565C0 100%)" }}>
              <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-0.5">Quality Engineering</p>
              <h2 className="text-base font-black text-white">Our Leadership Team</h2>
            </div>

            <div className="flex flex-col gap-3.5 px-4 py-4 flex-1 overflow-y-auto">
              {TEAM.map(m => (
                <TeamVisitingCard key={m.name} {...m} compact className="min-h-0" />
              ))}

              {/* Portals */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Regulatory Portals</p>
                <div className="grid grid-cols-2 gap-2">
                  {PORTALS.map(p => (
                    <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 py-2 px-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-center">
                      {p.name}
                    </a>
                  ))}
                </div>
              </div>

              <Link href="/services"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 py-2.5 text-sm font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-950/60 transition-colors">
                Explore Our Services →
              </Link>
            </div>

            <footer className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950">
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                © 2026 Quality Engineering · Siltara Industrial Area, Raipur – 493221, CG
              </p>
            </footer>
          </div>

        </div>
      </main>

      <WhatsAppFab href={WA_LINK} position="left" />
      <QEAssistantTrigger />
    </div>
  );
}
