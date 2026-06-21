"use client";

import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_LINK = "https://wa.me/919009413040?text=Hello%2C%20I%20need%20consultation%20for%20Testing%20of%20Products";
const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const ACCENT = "#D32F2F";
const TILES = [
  { label: "BIS Testing",   sub: "IS Codes · QCO Products",    icon: "🧪", color: "from-red-800 to-red-600",
    desc: "Testing at BIS-empanelled or NABL-accredited labs per applicable IS codes. Mandatory before BIS product certification application." },
  { label: "Export Testing", sub: "CE · FCC · UKCA · RoHS",   icon: "🌍", color: "from-rose-700 to-pink-600",
    desc: "Testing for international compliance marks. We guide selection of notified bodies and test labs for EU, UK, USA, and other markets." },
  { label: "Type Testing",  sub: "New Product Development",    icon: "🔬", color: "from-red-700 to-rose-500",
    desc: "Comprehensive type testing during product development to identify design issues before commercial production and market launch." },
  { label: "Failure Analysis", sub: "Root Cause Investigation", icon: "🔍", color: "from-pink-800 to-rose-700",
    desc: "When products fail tests, we provide root cause analysis and recommend corrective actions to achieve compliance in retesting." },
];
const PRODUCT_TYPES = [
  { cat: "Electrical & Electronics", items: "Cables, switches, MCBs, fans, motors, chargers" },
  { cat: "Steel & Metals",           items: "TMT bars, pipes, sheets, utensils, fasteners" },
  { cat: "Domestic Appliances",      items: "Pressure cookers, geysers, LPG equipment" },
  { cat: "Lighting",                 items: "LED lamps, drivers, CFLs, luminaires" },
  { cat: "Construction Materials",   items: "Cement, glass, PVC pipes, paints, AAC blocks" },
  { cat: "Safety Equipment",         items: "Helmets, fire extinguishers, PPE items" },
  { cat: "Chemical Products",        items: "Fertilizers, lubricants, rubber goods" },
  { cat: "Food Contact Materials",   items: "Packaging, containers, food-grade equipment" },
];
const STEPS = [
  { n: "01", icon: "📋", title: "Test Parameter ID",    desc: "Study applicable IS code and identify all mandatory test parameters before submitting to BIS." },
  { n: "02", icon: "🏭", title: "Lab Selection",        desc: "Identify BIS-empanelled or NABL-accredited lab closest to you with correct scope for your tests." },
  { n: "03", icon: "📦", title: "Sample Preparation",   desc: "Detailed instructions on sample quantity, marking requirements, and documentation to send with samples." },
  { n: "04", icon: "🔄", title: "Testing Coordination", desc: "Coordinate with lab on timelines, track application, and follow up on any lab clarifications needed." },
  { n: "05", icon: "📊", title: "Report Review",        desc: "Review test report against BIS requirements — confirm pass/fail, identify retest needs, advise next steps." },
  { n: "06", icon: "✅", title: "Corrective Action",    desc: "If product fails, guide you on design or process changes to achieve compliance in retesting." },
];

export default function TestingPage() {
  return (
    <>
      <SiteNavbar />

      <div className="min-h-screen xl:h-screen xl:overflow-hidden flex flex-col" style={{ paddingTop: "56px" }}>
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[25%_1fr_25%] xl:overflow-hidden">

          {/* ── LEFT COL ── */}
          <aside className="flex flex-col xl:overflow-hidden border-r border-white/8"
            style={{ background: "linear-gradient(175deg,#1A0000 0%,#2D0808 60%,#1A0000 100%)" }}>
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-red-600/20 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Testing
                </span>
              </div>

              <div>
                <div className="text-3xl mb-2">🧪</div>
                <h1 className="text-white font-black text-lg leading-tight mb-1">Testing of Products</h1>
                <p className="text-red-200/70 text-xs leading-relaxed">IS / ASTM · CE / FCC · BIS Empanelled Labs</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "IS/ASTM", l: "Indian & Intl Codes" },
                  { v: "CE/FCC", l: "Export Markets" },
                  { v: "15–90 Days", l: "Test Duration" },
                  { v: "NABL Labs", l: "Empanelled Network" },
                ].map(s => (
                  <div key={s.l} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-center">
                    <div className="text-white font-black text-sm">{s.v}</div>
                    <div className="text-white/45 text-[10px] mt-0.5 leading-tight">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="bg-red-900/30 border border-red-500/25 rounded-xl px-4 py-3">
                <div className="text-red-300 text-[11px] font-bold mb-1">⚠️ BIS Requirement</div>
                <p className="text-white/60 text-[11px] leading-relaxed">Testing at <span className="text-red-300 font-semibold">BIS-empanelled labs</span> is mandatory before any BIS certification application. Wrong lab = rejected application.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "200+", l: "Products Tested" },
                  { v: "NABL", l: "Lab Network" },
                  { v: "All India", l: "Coverage" },
                  { v: "Fast", l: "Turnaround" },
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
                <h2 className="text-white font-black text-lg">Product Testing Services</h2>
                <p className="text-white/40 text-xs">BIS · Export · Type · Failure Analysis — for certification and quality assurance</p>
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
                    Product Types We Test
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PRODUCT_TYPES.map(c => (
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
          <aside className="flex flex-col xl:overflow-hidden border-l border-white/8"
            style={{ background: "linear-gradient(175deg,#2D0808 0%,#1A0000 100%)" }}>
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-red-500" />
                  What You Get
                </h3>
                <div className="space-y-2">
                  {[
                    "Test matrix document (parameters per IS code)",
                    "Lab selection with accreditation verification",
                    "Sample preparation instructions",
                    "Test report review & interpretation",
                    "Failure analysis report (if product fails)",
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
                  <span className="w-1 h-3.5 rounded-full bg-red-500" />
                  Key Resources
                </h3>
                <div className="space-y-1.5">
                  {[
                    { name: "BIS Official Portal",   sub: "IS codes, empanelled labs list",   url: "https://www.bis.gov.in" },
                    { name: "NABL Lab Search",        sub: "Find accredited labs by scope",    url: "https://nabl-india.org" },
                    { name: "Manak Online Portal",    sub: "Track BIS test applications",      url: "https://manakonline.in" },
                  ].map(p => (
                    <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 hover:bg-white/7 transition-all group">
                      <div>
                        <div className="text-white/80 text-[11px] font-semibold group-hover:text-red-300 transition-colors">{p.name}</div>
                        <div className="text-white/35 text-[10px]">{p.sub}</div>
                      </div>
                      <svg className="w-3 h-3 text-white/25 group-hover:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-red-500" />
                  Quick FAQs
                </h3>
                <div className="space-y-2">
                  {[
                    { q: "Can we test at any NABL lab?", a: "For BIS certification, testing must be at a BIS-empanelled lab specifically — not all NABL labs are empanelled for all IS codes." },
                    { q: "How long does product testing take?", a: "Most IS code tests complete in 15–45 days. Tests with conditioning (weathering, aging) may take 60–90 days." },
                  ].map(f => (
                    <div key={f.q} className="bg-white/4 border border-white/6 rounded-xl px-3.5 py-3">
                      <div className="text-red-300/80 text-[11px] font-semibold mb-1 leading-snug">{f.q}</div>
                      <p className="text-white/45 text-[10px] leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-red-500" />
                  Related Services
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: "BIS Product Certification", href: "/services/product-certification", icon: "🏆" },
                    { label: "Calibration of Instruments", href: "/services/calibration",           icon: "⚖️" },
                    { label: "Laboratory Accreditation",   href: "/services/lab-accreditation",     icon: "🔬" },
                  ].map(r => (
                    <a key={r.label} href={r.href}
                      className="flex items-center gap-2.5 bg-white/4 border border-white/6 rounded-xl px-3 py-2.5 hover:bg-white/7 transition-all group">
                      <span className="text-base">{r.icon}</span>
                      <span className="text-white/65 text-[11px] group-hover:text-white/90">{r.label}</span>
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
