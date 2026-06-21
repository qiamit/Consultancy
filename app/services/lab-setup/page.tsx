"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_NUMBER = "919009413040";
const WA_MSG = encodeURIComponent("Hello, I need help with Laboratory Setup & Instrument Supply.");
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;
const WA_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const SCHEME_TILES = [
  {
    code: "Lab Design",
    title: "Complete Lab Infrastructure",
    sub: "Floor plan, utilities, environmental controls, safety systems",
    color: "#00695C",
  },
  {
    code: "Instruments",
    title: "Instrument Procurement & Supply",
    sub: "Sourcing calibrated, traceable test & measurement equipment",
    color: "#00897B",
  },
  {
    code: "NABL Setup",
    title: "NABL-Ready Lab Setup",
    sub: "Documentation, SOPs, and facility prep for accreditation",
    color: "#0097A7",
  },
  {
    code: "Consumables",
    title: "Lab Chemicals & Consumables",
    sub: "Reagents, reference standards, safety supplies",
    color: "#00838F",
  },
];

const DISCIPLINES = [
  { label: "Mechanical Testing", icon: "⚙️" },
  { label: "Electrical Testing", icon: "⚡" },
  { label: "Chemical Analysis", icon: "🧪" },
  { label: "Thermal Testing", icon: "🌡️" },
  { label: "Environmental Testing", icon: "🌿" },
  { label: "Metrology & Calibration", icon: "📏" },
  { label: "Microbiological Testing", icon: "🔬" },
  { label: "Non-Destructive Testing", icon: "🔍" },
];

const PROCESS_STEPS = [
  { step: "01", title: "Requirement Analysis", desc: "Understand scope, test parameters, and accreditation goals" },
  { step: "02", title: "Lab Design & Layout", desc: "Floor plan, utilities, environmental conditions, safety zones" },
  { step: "03", title: "Equipment Selection", desc: "Specify instruments matching your IS/ISO/ASTM test methods" },
  { step: "04", title: "Procurement & Supply", desc: "Source from approved vendors with calibration certificates" },
  { step: "05", title: "Installation & Commissioning", desc: "Install, qualify (IQ/OQ/PQ), and commission all equipment" },
  { step: "06", title: "NABL Documentation", desc: "Prepare quality manual, SOPs, and calibration records for accreditation" },
];

const DELIVERABLES = [
  "Complete lab floor plan & 3D layout",
  "Equipment list with specifications",
  "Vendor quotes & procurement support",
  "Calibration certificates (NABL-traceable)",
  "Installation & commissioning report",
  "Quality manual & SOP templates",
  "NABL pre-assessment checklist",
];

const FAQS = [
  {
    q: "Can you set up a NABL-accredited lab from scratch?",
    a: "Yes. We handle everything from lab design and instrument procurement to documentation and pre-assessment support for NABL/QAI accreditation.",
  },
  {
    q: "Do you supply imported instruments?",
    a: "We source both domestic and imported instruments from verified vendors, ensuring calibration traceability to national/international standards.",
  },
];

export default function LabSetupPage() {
  return (
    <div
      className="min-h-screen xl:h-screen xl:overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(175deg,#021A18 0%,#03302C 60%,#021A18 100%)" }}
    >
      <SiteNavbar />

      <main className="flex-1 flex flex-col min-h-0 pt-[62px] xl:overflow-hidden">
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[25%_1fr_25%] min-h-0 xl:overflow-hidden">

          {/* ── LEFT COLUMN ── */}
          <aside
            className="flex flex-col xl:overflow-hidden border-r border-white/8"
            style={{ background: "linear-gradient(180deg,#021510 0%,#032B25 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              {/* Badge */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Lab Infrastructure
                </span>
              </div>

              {/* Title */}
              <div className="flex-shrink-0">
                <h1 className="text-white text-xl font-black leading-tight">
                  Laboratory Setup & Instrument Supply
                </h1>
                <p className="text-teal-300/70 text-xs mt-1 leading-relaxed">
                  End-to-end lab design, equipment procurement, commissioning, and NABL-readiness support
                </p>
              </div>

              {/* Stats 2×2 */}
              <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                {[
                  { v: "50+", l: "Labs Setup", s: "Delivered" },
                  { v: "8+", l: "Disciplines", s: "Covered" },
                  { v: "10+", l: "Years", s: "Experience" },
                  { v: "100%", l: "NABL", s: "Success Rate" },
                ].map(s => (
                  <div key={s.l} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-white font-black text-lg leading-none">{s.v}</p>
                    <p className="text-teal-200 text-[10px] font-bold mt-0.5">{s.l}</p>
                    <p className="text-white/40 text-[9px]">{s.s}</p>
                  </div>
                ))}
              </div>

              {/* Mandate Box */}
              <div className="flex-shrink-0 bg-teal-500/10 border border-teal-500/25 rounded-xl p-3">
                <p className="text-teal-300 text-[10px] font-black uppercase tracking-wider mb-1.5">Why It Matters</p>
                <p className="text-white/80 text-xs leading-relaxed">
                  A properly designed and equipped lab is the foundation for NABL accreditation, BIS testing approvals, and export test reports accepted worldwide.
                </p>
              </div>

              {/* Track record 2×2 */}
              <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                {[
                  { v: "Pan", l: "India", s: "Projects" },
                  { v: "200+", l: "Instruments", s: "Supplied" },
                  { v: "NABL", l: "Traceable", s: "Calibration" },
                  { v: "24/7", l: "Support", s: "Post-setup" },
                ].map(s => (
                  <div key={s.l} className="bg-teal-500/8 border border-teal-500/15 rounded-xl p-3 text-center">
                    <p className="text-teal-300 font-black text-base leading-none">{s.v}</p>
                    <p className="text-white/70 text-[10px] font-bold mt-0.5">{s.l}</p>
                    <p className="text-white/40 text-[9px]">{s.s}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── CENTER COLUMN ── */}
          <main className="flex flex-col overflow-y-auto">
            <div className="flex-1 px-5 xl:px-8 py-6 flex flex-col gap-8">

              {/* Service Tiles */}
              <div>
                <h2 className="text-white font-black text-xl mb-3">Our Lab Setup Services</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SCHEME_TILES.map(t => (
                    <div
                      key={t.code}
                      className="rounded-xl p-4 border border-white/10 flex flex-col gap-2"
                      style={{ background: `${t.color}18`, borderColor: `${t.color}35` }}
                    >
                      <span
                        className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full self-start border"
                        style={{ color: t.color, background: `${t.color}20`, borderColor: `${t.color}40` }}
                      >
                        {t.code}
                      </span>
                      <p className="text-white font-black text-sm">{t.title}</p>
                      <p className="text-white/55 text-xs leading-relaxed">{t.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lab Disciplines */}
              <div>
                <h3 className="text-teal-300 text-xs font-black uppercase tracking-widest mb-3">Lab Disciplines We Cover</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DISCIPLINES.map(d => (
                    <div key={d.label} className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col items-center text-center gap-1.5">
                      <span className="text-xl">{d.icon}</span>
                      <p className="text-white/80 text-[11px] font-bold leading-tight">{d.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Process */}
              <div>
                <h3 className="text-teal-300 text-xs font-black uppercase tracking-widest mb-3">Our Process</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PROCESS_STEPS.map(p => (
                    <div key={p.step} className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <span className="text-teal-400/50 text-xl font-black block leading-none mb-1">{p.step}</span>
                      <p className="text-white font-bold text-xs">{p.title}</p>
                      <p className="text-white/50 text-[10px] mt-0.5 leading-relaxed">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </main>

          {/* ── RIGHT COLUMN ── */}
          <aside
            className="flex flex-col xl:overflow-hidden border-l border-white/8"
            style={{ background: "linear-gradient(180deg,#021510 0%,#032B25 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-5">

              {/* Deliverables */}
              <div>
                <p className="text-teal-300 text-[10px] font-black uppercase tracking-widest mb-2">What You Get</p>
                <div className="space-y-1.5">
                  {DELIVERABLES.map((d, i) => (
                    <div key={i} className="flex gap-2 items-start bg-white/3 border border-white/8 rounded-lg px-3 py-2">
                      <span className="text-teal-400 text-xs mt-0.5 flex-shrink-0">✓</span>
                      <p className="text-white/75 text-[11px] leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQs */}
              <div>
                <p className="text-teal-300 text-[10px] font-black uppercase tracking-widest mb-2">FAQs</p>
                <div className="space-y-2">
                  {FAQS.map((f, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-white font-bold text-xs mb-1">{f.q}</p>
                      <p className="text-white/55 text-[11px] leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Services */}
              <div>
                <p className="text-teal-300 text-[10px] font-black uppercase tracking-widest mb-2">Related Services</p>
                <div className="space-y-1.5">
                  {[
                    { label: "Lab Accreditation (NABL)", href: "/services/lab-accreditation" },
                    { label: "Calibration Services", href: "/services/calibration" },
                    { label: "Testing & Analysis", href: "/services/testing" },
                  ].map(r => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="flex items-center gap-2 bg-white/5 hover:bg-teal-500/15 border border-white/10 hover:border-teal-500/30 rounded-lg px-3 py-2 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                      <span className="text-white/80 text-xs font-medium">{r.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

        </div>
      </main>

      {/* WhatsApp circle */}
      <a
        href={WA_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}
      >
        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
      </a>
      <QEAssistantTrigger />
    </div>
  );
}
