"use client";

import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_LINK = "https://wa.me/919009413040?text=Hello%2C%20I%20need%20consultation%20for%20Calibration%20of%20Instruments";
const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const ACCENT = "#FB8C00";
const TILES = [
  { label: "Mechanical",   sub: "Dimensional & Force",    icon: "🔧", color: "from-orange-700 to-orange-500",
    desc: "Calipers, micrometers, gauges, torque wrenches, load cells, hardness testers. Traceable to NPLI national standards." },
  { label: "Electrical",   sub: "Voltage, Current, Power", icon: "⚡", color: "from-yellow-700 to-yellow-500",
    desc: "Multimeters, clamp meters, power analyzers, oscilloscopes, LCR meters. Calibration at NABL-accredited labs." },
  { label: "Thermal",      sub: "Temperature & Humidity",  icon: "🌡️", color: "from-red-700 to-red-500",
    desc: "Thermometers, RTDs, thermocouples, humidity sensors, ovens, furnaces. Critical for food, pharma & chemical industries." },
  { label: "Mass & Pressure", sub: "Weighing & Flow",     icon: "⚖️", color: "from-amber-700 to-amber-500",
    desc: "Weighing scales, balances, pressure gauges, manometers, flow meters. ISO 9001 and NABL-required traceability." },
];
const INSTRUMENT_TYPES = [
  { cat: "Dimensional",    items: "Vernier calipers, micrometers, height gauges" },
  { cat: "Electrical",     items: "Multimeters, power analyzers, oscilloscopes" },
  { cat: "Temperature",    items: "Thermocouples, RTDs, thermometers, ovens" },
  { cat: "Pressure",       items: "Pressure gauges, manometers, barometers" },
  { cat: "Mass / Weight",  items: "Weighing scales, balances, weight sets" },
  { cat: "Optical",        items: "Profile projectors, microscopes, comparators" },
  { cat: "Force / Torque", items: "Load cells, torque wrenches, force gauges" },
  { cat: "Flow & Volume",  items: "Flow meters, pipettes, burettes, volumetric" },
];
const STEPS = [
  { n: "01", icon: "📋", title: "Equipment Inventory",    desc: "Create a comprehensive master list of all measuring instruments — calipers, scales, thermometers, pressure gauges, etc." },
  { n: "02", icon: "📅", title: "Calibration Plan",       desc: "Define calibration frequencies and tolerance requirements for each instrument based on criticality and usage." },
  { n: "03", icon: "🔍", title: "NABL Lab Selection",     desc: "Identify NABL-accredited calibration labs for each instrument type ensuring NPLI traceability." },
  { n: "04", icon: "🚚", title: "Coordination",           desc: "Coordinate instrument dispatch, tracking, and receipt of calibration certificates. Maintain calibration register." },
  { n: "05", icon: "📄", title: "Certificate Review",     desc: "Review each certificate for validity, uncertainty, traceability. Out-of-tolerance instruments flagged immediately." },
  { n: "06", icon: "✅", title: "Records & Compliance",   desc: "Maintain audit-ready calibration records compliant with ISO 9001 and NABL requirements." },
];

export default function CalibrationPage() {
  return (
    <>
      <SiteNavbar />

      <div className="min-h-screen xl:h-screen xl:overflow-hidden flex flex-col" style={{ paddingTop: "56px" }}>
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[25%_1fr_25%] xl:overflow-hidden">

          {/* ── LEFT COL ── */}
          <aside className="flex flex-col xl:overflow-hidden border-r border-white/8"
            style={{ background: "linear-gradient(175deg,#1A0E00 0%,#2D1800 60%,#1A0E00 100%)" }}>
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-orange-600/20 border border-orange-500/30 text-orange-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  Metrology
                </span>
              </div>

              <div>
                <div className="text-3xl mb-2">⚖️</div>
                <h1 className="text-white font-black text-lg leading-tight mb-1">Calibration of Instruments</h1>
                <p className="text-orange-200/70 text-xs leading-relaxed">Mechanical · Electrical · Thermal · Mass</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "4 Types", l: "Mech/Elec/Thermal/Mass" },
                  { v: "NPLI", l: "National Traceability" },
                  { v: "Annual", l: "Calibration Cycle" },
                  { v: "ISO 9001", l: "Compliant Records" },
                ].map(s => (
                  <div key={s.l} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-center">
                    <div className="text-white font-black text-sm">{s.v}</div>
                    <div className="text-white/45 text-[10px] mt-0.5 leading-tight">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="bg-orange-900/30 border border-orange-500/25 rounded-xl px-4 py-3">
                <div className="text-orange-300 text-[11px] font-bold mb-1">⚖️ ISO & NABL Requirement</div>
                <p className="text-white/60 text-[11px] leading-relaxed">ISO 9001, NABL accreditation & BIS factory assessments all require <span className="text-orange-300 font-semibold">calibrated instruments</span> with traceable certificates.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "500+", l: "Instruments" },
                  { v: "NABL", l: "Lab Network" },
                  { v: "Pan India", l: "Coverage" },
                  { v: "Audit", l: "Ready Records" },
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
                <h2 className="text-white font-black text-lg">Calibration Services & Instrument Types</h2>
                <p className="text-white/40 text-xs">Mechanical · Electrical · Thermal · Mass — full metrological traceability</p>
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
                    Instrument Categories
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {INSTRUMENT_TYPES.map(c => (
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
            style={{ background: "linear-gradient(175deg,#2D1800 0%,#1A0E00 100%)" }}>
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-orange-500" />
                  What You Get
                </h3>
                <div className="space-y-2">
                  {[
                    "Master Equipment List (MEL) with calibration schedule",
                    "Calibration procedure documentation",
                    "Calibration register & due-date tracker",
                    "Certificate review notes for each instrument",
                    "Non-conforming equipment handling procedure",
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
                  <span className="w-1 h-3.5 rounded-full bg-orange-500" />
                  Key Resources
                </h3>
                <div className="space-y-1.5">
                  {[
                    { name: "NPLI India",       sub: "National Physical Laboratory",  url: "https://www.nplindia.org" },
                    { name: "NABL India",        sub: "Accredited calibration labs",   url: "https://nabl-india.org" },
                    { name: "BIS Manak Online", sub: "BIS calibration requirements",  url: "https://manakonline.in" },
                  ].map(p => (
                    <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 hover:bg-white/7 transition-all group">
                      <div>
                        <div className="text-white/80 text-[11px] font-semibold group-hover:text-orange-300 transition-colors">{p.name}</div>
                        <div className="text-white/35 text-[10px]">{p.sub}</div>
                      </div>
                      <svg className="w-3 h-3 text-white/25 group-hover:text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-orange-500" />
                  Quick FAQs
                </h3>
                <div className="space-y-2">
                  {[
                    { q: "Does every instrument need calibration?", a: "Only instruments that affect product quality, test results, or compliance need calibration. We help identify critical vs. reference instruments." },
                    { q: "What does 'traceable to national standards' mean?", a: "Calibration chain traces back unbroken to NPLI (National Physical Laboratory of India) national measurement standards." },
                  ].map(f => (
                    <div key={f.q} className="bg-white/4 border border-white/6 rounded-xl px-3.5 py-3">
                      <div className="text-orange-300/80 text-[11px] font-semibold mb-1 leading-snug">{f.q}</div>
                      <p className="text-white/45 text-[10px] leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-orange-500" />
                  Related Services
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: "Laboratory Accreditation", href: "/services/lab-accreditation",   icon: "🔬" },
                    { label: "Testing of Products",      href: "/services/testing",              icon: "🧪" },
                    { label: "Management System",        href: "/services/management-system",    icon: "📋" },
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
