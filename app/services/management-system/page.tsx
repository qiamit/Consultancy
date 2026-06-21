"use client";

import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_LINK = "https://wa.me/919009413040?text=Hello%2C%20I%20need%20consultation%20for%20Management%20System%20Certification";
const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const ACCENT = "#3F51B5";
const TILES = [
  { label: "ISO 9001",  sub: "Quality Management System",       icon: "📋", color: "from-indigo-700 to-indigo-500",
    desc: "The world's most recognized QMS standard. Mandatory for government tenders, large buyer approvals, and export documentation across all industries." },
  { label: "ISO 14001", sub: "Environmental Management System", icon: "🌿", color: "from-green-700 to-green-500",
    desc: "Demonstrates environmental responsibility. Required by pollution control boards and global buyers for ethical sourcing and sustainability compliance." },
  { label: "ISO 45001", sub: "OH&S Management System",          icon: "🦺", color: "from-amber-700 to-amber-500",
    desc: "Occupational Health & Safety standard. Required for factories under labor safety audits and demanded by global supply chain auditors." },
  { label: "IMS",       sub: "Integrated 9001+14001+45001",     icon: "🔗", color: "from-violet-700 to-violet-500",
    desc: "Integrated Management System combining Quality, Environment & Safety into one audit-ready system. Most cost-effective option for manufacturing units." },
];
const INDUSTRIES = [
  { cat: "Manufacturing",      items: "Engineering, steel, plastics, chemicals, auto" },
  { cat: "Construction",       items: "Builders, contractors, infrastructure projects" },
  { cat: "Food & Agriculture", items: "Food processors, packaging, cold chains" },
  { cat: "Healthcare",         items: "Hospitals, diagnostic centers, pharma" },
  { cat: "IT & Services",      items: "Software, BPO, consulting, logistics firms" },
  { cat: "Trading",            items: "Import/export companies, distributors" },
  { cat: "Education",          items: "Schools, training institutes, universities" },
  { cat: "Government / PSU",   items: "Public sector units, municipal bodies" },
];
const STEPS = [
  { n: "01", icon: "🔍", title: "Gap Analysis",           desc: "Assess existing processes against ISO requirements — identify what's in place and what needs development." },
  { n: "02", icon: "📄", title: "Documentation",          desc: "Quality Manual, Procedures, Work Instructions, Risk Register, Objectives, and all required records." },
  { n: "03", icon: "🎓", title: "Training & Awareness",   desc: "Training for top management and all departments on their roles. Ensures system buy-in." },
  { n: "04", icon: "🏭", title: "Implementation Support", desc: "On-site guidance during initial implementation to ensure processes work as documented." },
  { n: "05", icon: "📊", title: "Internal Audit",         desc: "Independent internal audit to identify non-conformities before the certification body audit." },
  { n: "06", icon: "✅", title: "Certification Audit",    desc: "We support during Stage 1 & Stage 2 audits with the NABCB-accredited certification body." },
];

export default function ManagementSystemPage() {
  return (
    <>
      <SiteNavbar />

      <div className="min-h-screen xl:h-screen xl:overflow-hidden flex flex-col" style={{ paddingTop: "56px" }}>
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[25%_1fr_25%] xl:overflow-hidden">

          {/* ── LEFT COL ── */}
          <aside className="flex flex-col xl:overflow-hidden border-r border-white/8"
            style={{ background: "linear-gradient(175deg,#0D0E2A 0%,#161840 60%,#0D0E2A 100%)" }}>
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  ISO Standards
                </span>
              </div>

              <div>
                <div className="text-3xl mb-2">📋</div>
                <h1 className="text-white font-black text-lg leading-tight mb-1">Management System Certification</h1>
                <p className="text-indigo-200/70 text-xs leading-relaxed">ISO 9001 · ISO 14001 · ISO 45001 · ISO 50001</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "4 Standards", l: "ISO 9001–50001" },
                  { v: "IMS Option", l: "Integrated System" },
                  { v: "3–5 Mo", l: "Typical Timeline" },
                  { v: "NABCB", l: "Accredited CB" },
                ].map(s => (
                  <div key={s.l} className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-center">
                    <div className="text-white font-black text-sm">{s.v}</div>
                    <div className="text-white/45 text-[10px] mt-0.5 leading-tight">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-900/30 border border-indigo-500/25 rounded-xl px-4 py-3">
                <div className="text-indigo-300 text-[11px] font-bold mb-1">📌 Why ISO Certification?</div>
                <p className="text-white/60 text-[11px] leading-relaxed">ISO 9001 is <span className="text-indigo-300 font-semibold">required</span> for government tenders, export buyers, and large corporate vendor approvals across India.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "300+", l: "Orgs Certified" },
                  { v: "IMS", l: "Specialist" },
                  { v: "All", l: "Industries" },
                  { v: "Pan India", l: "Coverage" },
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
                <h2 className="text-white font-black text-lg">ISO Management System Standards</h2>
                <p className="text-white/40 text-xs">ISO 9001 · 14001 · 45001 · 50001 — choose the right standard for your organization</p>
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
                    Industries We Serve
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {INDUSTRIES.map(c => (
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
            style={{ background: "linear-gradient(175deg,#161840 0%,#0D0E2A 100%)" }}>
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-indigo-500" />
                  What You Get
                </h3>
                <div className="space-y-2">
                  {[
                    "Complete ISO QMS/EMS/OHSMS documentation",
                    "Risk & opportunity register",
                    "Internal audit program & report",
                    "Management review meeting records",
                    "CAPA tracker & corrective action records",
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
                  <span className="w-1 h-3.5 rounded-full bg-indigo-500" />
                  Key Resources
                </h3>
                <div className="space-y-1.5">
                  {[
                    { name: "ISO Official Website",  sub: "Browse all ISO standards",      url: "https://www.iso.org" },
                    { name: "NABCB India",            sub: "Accredited certification bodies", url: "https://nabcb.qci.org.in" },
                    { name: "BIS Standards Portal",  sub: "IS equivalent ISO standards",    url: "https://www.bis.gov.in" },
                  ].map(p => (
                    <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-3 py-2.5 hover:bg-white/7 transition-all group">
                      <div>
                        <div className="text-white/80 text-[11px] font-semibold group-hover:text-indigo-300 transition-colors">{p.name}</div>
                        <div className="text-white/35 text-[10px]">{p.sub}</div>
                      </div>
                      <svg className="w-3 h-3 text-white/25 group-hover:text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-indigo-500" />
                  Quick FAQs
                </h3>
                <div className="space-y-2">
                  {[
                    { q: "How long does ISO certification take?", a: "3–5 months for a medium organization. Integrated systems (IMS) take slightly longer but save cost overall." },
                    { q: "Can we get ISO 9001 + 14001 + 45001 together?", a: "Yes — IMS (Integrated Management System) audit is more cost-effective and reduces documentation overlap. Recommended for factories." },
                  ].map(f => (
                    <div key={f.q} className="bg-white/4 border border-white/6 rounded-xl px-3.5 py-3">
                      <div className="text-indigo-300/80 text-[11px] font-semibold mb-1 leading-snug">{f.q}</div>
                      <p className="text-white/45 text-[10px] leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-white/80 font-bold text-xs uppercase tracking-widest mb-2.5 flex items-center gap-2">
                  <span className="w-1 h-3.5 rounded-full bg-indigo-500" />
                  Related Services
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: "BIS Product Certification", href: "/services/product-certification", icon: "🏆" },
                    { label: "Laboratory Accreditation",  href: "/services/lab-accreditation",     icon: "🔬" },
                    { label: "Calibration of Instruments", href: "/services/calibration",          icon: "⚖️" },
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
