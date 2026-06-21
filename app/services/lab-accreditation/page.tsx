"use client";

import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_LINK = "https://wa.me/919009413040?text=Hello%2C%20I%20need%20consultation%20for%20Laboratory%20Accreditation";
const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const ACCENT = "#00897B";
const TILES = [
  { label: "NABL",  sub: "ISO/IEC 17025 · Testing & Calibration", icon: "🔬", color: "from-teal-700 to-teal-500",
    desc: "India's premier accreditation body for T&C labs. NABL accreditation is internationally recognized via ILAC MRA and APAC MRA." },
  { label: "QAI",   sub: "QCI · Inspection Bodies",                icon: "🏅", color: "from-cyan-700 to-cyan-500",
    desc: "QAI under QCI accredits inspection bodies per ISO/IEC 17020. Ideal for third-party inspection organizations." },
  { label: "IQAS",  sub: "International Quality Accreditation",    icon: "🌐", color: "from-sky-700 to-sky-500",
    desc: "IQAS under QCI provides accreditation for management system certification bodies and inspection bodies." },
  { label: "FDAS",  sub: "Food & Drug Accreditation",              icon: "🍃", color: "from-green-700 to-green-500",
    desc: "FDAS accreditation for laboratories testing food, drugs, and agricultural products. Recognized by FSSAI and CDSCO." },
];
const DISCIPLINES = [
  { cat: "Chemical Testing",      items: "Water, soil, food, fuels, polymers, metals" },
  { cat: "Mechanical Testing",    items: "Tensile, hardness, impact, fatigue, creep" },
  { cat: "Electrical Testing",    items: "Cables, switches, motors, luminaires, MCBs" },
  { cat: "Thermal Testing",       items: "Heat resistance, temperature calibration" },
  { cat: "Dimensional Metrology", items: "Gauges, CMM, optical comparators" },
  { cat: "Microbiological",       items: "Water, food, pharma, environmental samples" },
  { cat: "Non-Destructive",       items: "UT, RT, MT, PT, VT for industrial products" },
  { cat: "Medical / Clinical",    items: "ISO 15189 — clinical & medical labs" },
];
const STEPS = [
  { n: "01", icon: "🔍", title: "Gap Analysis",           desc: "Comprehensive audit of lab infrastructure, documentation & equipment vs. ISO/IEC 17025:2017 requirements." },
  { n: "02", icon: "📄", title: "QMS Documentation",      desc: "Quality Manual, Method SOPs, Equipment Calibration records, and all NABL-required forms." },
  { n: "03", icon: "🎓", title: "Staff Training",          desc: "Training on ISO 17025, measurement uncertainty, method validation, and internal audit procedures." },
  { n: "04", icon: "📋", title: "Application & Scope",     desc: "Define accreditation scope, select test methods (IS/ASTM/ISO/IEC), and file NABL online application." },
  { n: "05", icon: "🧪", title: "Mock Assessment",         desc: "Simulated NABL assessor visit — identify gaps and correct non-conformities before actual assessment." },
  { n: "06", icon: "✅", title: "Assessment & Follow-up",  desc: "Full support during NABL assessor visit and post-assessment corrective actions for accreditation grant." },
];

export default function LabAccreditationPage() {
  return (
    <>
      <SiteNavbar />

      <div
        className="min-h-screen xl:h-screen xl:overflow-hidden flex flex-col"
        style={{ paddingTop: "56px" }}
      >
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[25%_1fr_25%] xl:overflow-hidden">

          {/* ── LEFT COL ── */}
          <aside
            className="flex flex-col xl:overflow-hidden border-r border-white/8"
            style={{ background: "linear-gradient(175deg,#021A18 0%,#03302C 60%,#021A18 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-teal-600/20 border border-teal-500/30 text-teal-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Accreditation
                </span>
              </div>

              <div>
                <div className="text-3xl mb-2">🔬</div>
                <h1 className="text-white font-black text-lg leading-tight mb-1">Laboratory Accreditation</h1>
                <p className="text-teal-200/70 text-xs leading-relaxed">NABL · QAI · IQAS · FDAS</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "ISO 17025", l: "Standard Applied" },
                  { v: "4 Bodies", l: "NABL/QAI/IQAS/FDAS" },
                  { v: "6–12 Mo", l: "Typical Timeline" },
                  { v: "ILAC MRA", l: "Int'l Recognition" },
                ].map(s => (
                  <div key={s.l} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-center">
                    <div className="text-white font-black text-sm">{s.v}</div>
                    <div className="text-white/45 text-[10px] mt-0.5 leading-tight">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="bg-teal-900/30 border border-teal-500/25 rounded-xl px-4 py-3">
                <div className="text-teal-300 text-[11px] font-bold mb-1 flex items-center gap-1.5">⚖️ BIS Requirement</div>
                <p className="text-white/60 text-[11px] leading-relaxed">NABL accreditation is <span className="text-teal-300 font-semibold">mandatory</span> for labs seeking BIS empanelment and for government & export testing contracts.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "50+", l: "Labs Served" },
                  { v: "100%", l: "Doc Coverage" },
                  { v: "12+", l: "Disciplines" },
                  { v: "APAC", l: "MRA Member" },
                ].map(s => (
                  <div key={s.l} className="bg-white/4 border border-white/6 rounded-lg px-2.5 py-2 text-center">
                    <div className="text-white font-black text-sm">{s.v}</div>
                    <div className="text-white/35 text-[10px]">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

          </aside>

          {/* ── CENTER COL ── */}
          <main className="flex flex-col overflow-hidden bg-zinc-950">
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 px-6 py-4 border-b border-white/8 bg-zinc-950/95 backdrop-blur-sm">
                <h2 className="text-white font-black text-lg">Accreditation Bodies & Scope</h2>
                <p className="text-white/40 text-xs">NABL · QAI · IQAS · FDAS — choose the right body for your lab</p>
              </div>

              <div className="px-6 py-5 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {TILES.map(t => (
                    <div key={t.label} className="rounded-2xl overflow-hidden border border-white/8 bg-white/4 hover:bg-white/6 transition-all">
                      <div className={`bg-gradient-to-br ${t.color} px-4 py-3 flex items-center gap-2`}>
                        <span className="text-xl">{t.icon}</span>
                        <div>
                          <div className="text-white font-black text-sm">{t.label}</div>
                          <div className="text-white/70 text-[10px]">{t.sub}</div>
                        </div>
                      </div>
                      <p className="px-4 py-3 text-white/55 text-xs leading-relaxed">{t.desc}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="text-white/80 font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                    Testing Disciplines Covered
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {DISCIPLINES.map(c => (
                      <div key={c.cat} className="bg-white/4 border border-white/6 rounded-xl px-3.5 py-2.5">
                        <div className="text-white/85 text-xs font-semibold mb-0.5">{c.cat}</div>
                        <div className="text-white/40 text-[11px] leading-tight">{c.items}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-white/80 font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                    Our Step-by-Step Process
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {STEPS.map(s => (
                      <div key={s.n} className="bg-white/4 border border-white/6 rounded-xl px-4 py-3 relative">
                        <div className="absolute top-2 right-3 text-white/6 font-black text-4xl select-none leading-none">{s.n}</div>
                        <div className="text-xl mb-1.5">{s.icon}</div>
                        <div className="text-white/85 font-semibold text-xs mb-1">{s.title}</div>
                        <p className="text-white/45 text-[11px] leading-relaxed">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* ── RIGHT COL ── */}
          <aside
            className="flex flex-col xl:overflow-hidden border-l border-white/8"
            style={{ background: "linear-gradient(175deg,#03302C 0%,#021A18 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-teal-500" />
                  What You Get
                </h3>
                <div className="space-y-2">
                  {[
                    "Complete ISO/IEC 17025:2017 QMS documentation",
                    "NABL application & scope document",
                    "Internal audit program & records",
                    "Proficiency testing schedule & support",
                    "Pre-assessment (mock audit) report",
                  ].map(d => (
                    <div key={d} className="flex items-start gap-2.5 bg-white/4 border border-white/6 rounded-xl px-3 py-2.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400 fill-current flex-shrink-0 mt-0.5" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                      <span className="text-white/65 text-[11px] leading-snug">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-teal-500" />
                  Official Resources
                </h3>
                <div className="space-y-1.5">
                  {[
                    { name: "NABL Official Portal",     sub: "Accreditation, schedules, fees", url: "https://nabl-india.org" },
                    { name: "QCI — QAI / IQAS",         sub: "QCI accreditation bodies",       url: "https://www.qcin.org" },
                    { name: "ILAC MRA Signatories",      sub: "Int'l mutual recognition list",  url: "https://ilac.org" },
                  ].map(p => (
                    <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 hover:bg-white/7 transition-all group">
                      <div>
                        <div className="text-white/80 text-[11px] font-semibold group-hover:text-teal-300 transition-colors">{p.name}</div>
                        <div className="text-white/35 text-[10px]">{p.sub}</div>
                      </div>
                      <svg className="w-3 h-3 text-white/25 group-hover:text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-teal-500" />
                  Quick FAQs
                </h3>
                <div className="space-y-2">
                  {[
                    { q: "How long does NABL accreditation take?", a: "6–12 months from documentation to accreditation, depending on NABL's assessment schedule and scope." },
                    { q: "Is proficiency testing required before accreditation?", a: "Yes — NABL requires at least one successful PT or ILC participation before granting accreditation." },
                  ].map(f => (
                    <div key={f.q} className="bg-white/4 border border-white/6 rounded-xl px-3.5 py-3">
                      <div className="text-teal-300/80 text-[11px] font-semibold mb-1 leading-snug">{f.q}</div>
                      <p className="text-white/45 text-[10px] leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-teal-500" />
                  Related Services
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: "BIS Product Certification", href: "/services/product-certification", icon: "🏆" },
                    { label: "Calibration of Instruments", href: "/services/calibration", icon: "⚖️" },
                    { label: "Testing of Products", href: "/services/testing", icon: "🧪" },
                  ].map(r => (
                    <a key={r.label} href={r.href}
                      className="flex items-center gap-2.5 bg-white/4 border border-white/6 rounded-xl px-3 py-2.5 hover:bg-white/7 transition-all group">
                      <span className="text-base">{r.icon}</span>
                      <span className="text-white/65 text-[11px] group-hover:text-white/90 transition-colors">{r.label}</span>
                      <svg className="w-3 h-3 text-white/20 ml-auto group-hover:text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>

      <QEAssistantTrigger />

      <a href={WA_LINK} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d={WA_PATH}/></svg>
      </a>
    </>
  );
}
