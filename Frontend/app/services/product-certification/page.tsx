import { Suspense } from "react";
import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";
import { BisQcoUpdates } from "@/components/public/bis-qco-updates";

const WA_LINK = "https://wa.me/919009413040?text=Hello%2C%20I%20need%20consultation%20for%20BIS%20Product%20Certification";
const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const ACCENT = "#1565C0";
const TILES = [
  { label: "ISI Mark",  sub: "Scheme-I · QCO Products", icon: "🏆", color: "from-blue-700 to-blue-500",
    desc: "Mandatory for 500+ products under Quality Control Orders. Non-compliance under BIS Act 2016 is a punishable offence." },
  { label: "FMCS",     sub: "Foreign Manufacturer",      icon: "🌐", color: "from-amber-600 to-yellow-500",
    desc: "Foreign manufacturers exporting to India must obtain BIS-FMCS certification with an Authorised Indian Representative." },
  { label: "CRS",      sub: "Compulsory Registration",   icon: "💻", color: "from-emerald-700 to-emerald-500",
    desc: "Mandatory for mobiles, laptops, tablets, chargers, power banks & LED drivers. Registration via crsbis.in portal." },
  { label: "QCO",      sub: "Quality Control Order",     icon: "📜", color: "from-red-700 to-red-500",
    desc: "QCOs issued by Ministry of Commerce & Industry make BIS certification mandatory for specific product categories." },
];
const CATEGORIES = [
  { cat: "Steel & Metals",      items: "TMT bars, MS pipes, GI sheets, utensils" },
  { cat: "Electrical",          items: "Cables, switches, sockets, MCBs, motors" },
  { cat: "Electronics & IT",    items: "Mobiles, laptops, chargers, power banks" },
  { cat: "Lighting",            items: "LED lamps, drivers, CFLs, luminaires" },
  { cat: "Domestic Appliances", items: "Pressure cookers, LPG cylinders, fans" },
  { cat: "Construction",        items: "Cement, PVC pipes, glass, paints, AAC blocks" },
  { cat: "Safety & PPE",        items: "Helmets, safety harnesses, fire extinguishers" },
  { cat: "Chemicals",           items: "Fertilizers, rubber goods, lubricants" },
];
const STEPS = [
  { n: "01", icon: "🔍", title: "QCO & IS Code Check",   desc: "Identify applicable IS code, verify QCO status — determines ISI Mark or CRS route." },
  { n: "02", icon: "🧪", title: "Sample Testing",         desc: "Testing at BIS-empanelled / NABL lab. We guide sample preparation to prevent failures." },
  { n: "03", icon: "📄", title: "Documentation",          desc: "Plant layout, process flow, quality manual, equipment list — complete BIS application package." },
  { n: "04", icon: "💻", title: "Manak Online Filing",    desc: "Application filed on BIS Manak Portal. All BIS queries responded promptly." },
  { n: "05", icon: "🏭", title: "Factory Inspection",     desc: "BIS officer visit prep — your team, records, marking system & equipment made ready." },
  { n: "06", icon: "✅", title: "License Grant",           desc: "BIS issues license. We guide ISI Mark application on products and packaging." },
];

export default function BISProductCertificationPage() {
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
            style={{ background: "linear-gradient(175deg,#0A1628 0%,#0F2347 60%,#0D1F3C 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">


              {/* Trending Mandatory Updates — AI fetched daily from bis.gov.in */}
              <Suspense fallback={
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    <p className="text-red-300 text-[10px] font-black uppercase tracking-widest">Trending QCO Updates</p>
                  </div>
                  <div className="space-y-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-10 bg-white/5 border border-white/8 rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
              }>
                <BisQcoUpdates />
              </Suspense>
            </div>

          </aside>

          {/* ── CENTER COL ── */}
          <main className="flex flex-col overflow-hidden bg-zinc-950">
            <div className="flex-1 overflow-y-auto">
              {/* Header bar */}
              <div className="sticky top-0 z-10 px-6 py-4 border-b border-white/8 bg-zinc-950/95 backdrop-blur-sm flex items-center gap-3">
                <div>
                  <h2 className="text-white font-black text-lg">BIS Certification Schemes</h2>
                  <p className="text-white/40 text-xs">ISI Mark · CRS · FMCS · QCO — select a scheme to explore</p>
                </div>
              </div>

              <div className="px-6 py-5 space-y-6">
                {/* 4 Tiles */}
                <div className="grid grid-cols-2 gap-3">
                  {TILES.map(t => (
                    <div key={t.label} className="rounded-2xl overflow-hidden border border-white/8 bg-white/4 hover:bg-white/6 transition-all group">
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

                {/* Product Categories */}
                <div>
                  <h3 className="text-white/80 font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="w-1 h-4 rounded-full" style={{ background: ACCENT }} />
                    Product Categories Covered
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => (
                      <div key={c.cat} className="bg-white/4 border border-white/6 rounded-xl px-3.5 py-2.5">
                        <div className="text-white/85 text-xs font-semibold mb-0.5">{c.cat}</div>
                        <div className="text-white/40 text-[11px] leading-tight">{c.items}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Process Steps */}
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
            style={{ background: "linear-gradient(175deg,#0D1F3C 0%,#0A1628 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              {/* What You Get */}
              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-blue-500" />
                  What You Get
                </h3>
                <div className="space-y-2">
                  {[
                    "BIS License under applicable IS code",
                    "Complete application & documentation set",
                    "Factory inspection readiness support",
                    "ISI Mark labeling guidance & artwork",
                    "License renewal & amendment support",
                  ].map(d => (
                    <div key={d} className="flex items-start gap-2.5 bg-white/4 border border-white/6 rounded-xl px-3 py-2.5">
                      <svg className="w-3.5 h-3.5 text-emerald-400 fill-current flex-shrink-0 mt-0.5" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                      <span className="text-white/65 text-[11px] leading-snug">{d}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Portals */}
              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-blue-500" />
                  Official BIS Portals
                </h3>
                <div className="space-y-1.5">
                  {[
                    { name: "BIS Official Portal", sub: "Standards, schemes, QCOs", url: "https://www.bis.gov.in" },
                    { name: "Manak Online Portal", sub: "Apply & track BIS licenses", url: "https://manakonline.in" },
                    { name: "CRS Portal", sub: "Electronics CRS registration", url: "https://www.crsbis.in" },
                  ].map(p => (
                    <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 hover:bg-white/7 transition-all group">
                      <div>
                        <div className="text-white/80 text-[11px] font-semibold group-hover:text-blue-300 transition-colors">{p.name}</div>
                        <div className="text-white/35 text-[10px]">{p.sub}</div>
                      </div>
                      <svg className="w-3 h-3 text-white/25 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                  ))}
                </div>
              </div>

              {/* Quick FAQs */}
              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-blue-500" />
                  Quick FAQs
                </h3>
                <div className="space-y-2">
                  {[
                    { q: "How long does BIS certification take?", a: "Typically 3–6 months from application — subject to lab testing time, BIS queue, and factory inspection." },
                    { q: "Is FMCS possible for foreign manufacturers?", a: "Yes. Foreign manufacturers appoint an Authorised Indian Representative (AIR). We handle all Indian-side coordination." },
                  ].map(f => (
                    <div key={f.q} className="bg-white/4 border border-white/6 rounded-xl px-3.5 py-3">
                      <div className="text-blue-300/80 text-[11px] font-semibold mb-1 leading-snug">{f.q}</div>
                      <p className="text-white/45 text-[10px] leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Services */}
              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-blue-500" />
                  Related Services
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: "Laboratory Accreditation", href: "/services/lab-accreditation", icon: "🔬" },
                    { label: "Testing of Products", href: "/services/testing", icon: "🧪" },
                    { label: "Management System", href: "/services/management-system", icon: "📋" },
                  ].map(r => (
                    <a key={r.label} href={r.href}
                      className="flex items-center gap-2.5 bg-white/4 border border-white/6 rounded-xl px-3 py-2.5 hover:bg-white/7 transition-all group">
                      <span className="text-base">{r.icon}</span>
                      <span className="text-white/65 text-[11px] group-hover:text-white/90 transition-colors">{r.label}</span>
                      <svg className="w-3 h-3 text-white/20 ml-auto group-hover:text-white/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>

      {/* QE Assistant — bottom right */}
      <QEAssistantTrigger />

      {/* WhatsApp — bottom left */}
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d={WA_PATH}/></svg>
      </a>
    </>
  );
}
