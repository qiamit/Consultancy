"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/public/site-navbar";
import { SiteFooter } from "@/components/public/site-footer";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_LINK = "https://wa.me/919009413040?text=Hello%2C%20I%20need%20consultation%20for%20BIS%20Certification";
const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const SERVICES = [
  {
    id: "product-certification",
    icon: "🏆",
    title: "BIS Product Certification",
    subtitle: "ISI Mark",
    tag: "Core Service",
    accentFrom: "#0D47A1",
    accentTo: "#1976D2",
    subTiles: ["ISI Mark", "FMCS Registration", "CRS Registration", "QCO Compliance"],
    desc: "Mandatory ISI Mark certification for 500+ products under Quality Control Orders. We handle the complete BIS process — from IS code identification to factory inspection and license grant.",
    points: [
      "IS code identification & QCO status check",
      "BIS-empanelled lab testing coordination",
      "Complete application & documentation support",
      "Factory inspection preparation & support",
      "CRS registration for electronics & IT products",
      "License renewal and amendment assistance",
    ],
    note: "Mandatory for 500+ product categories including steel, cables, switches, LED lights, toys, electronics, and more.",
  },
  {
    id: "lab-accreditation",
    icon: "🔬",
    title: "Lab Accreditation Services",
    subtitle: "ISO/IEC 17025",
    tag: "Accreditation",
    accentFrom: "#00695C",
    accentTo: "#00897B",
    subTiles: ["NABL", "QAI", "IQAS", "FDAS"],
    desc: "NABL, QAI, IQAS & FDAS accreditation for testing and calibration laboratories as per ISO/IEC 17025:2017. Full documentation, mock assessments, and post-accreditation support.",
    points: [
      "Gap analysis against ISO/IEC 17025:2017",
      "Complete QMS documentation development",
      "Scope definition and method validation",
      "NABL online application preparation",
      "Mock assessment and assessor visit support",
      "QAI, IQAS, FDAS accreditation support",
    ],
    note: "NABL accreditation is essential for labs seeking BIS empanelment and export testing recognition.",
  },
  {
    id: "management-system",
    icon: "📋",
    title: "Management System Certification",
    subtitle: "ISO Standards",
    tag: "ISO Standards",
    accentFrom: "#283593",
    accentTo: "#3F51B5",
    subTiles: ["ISO 9001", "ISO 14001", "ISO 45001", "ISO 50001"],
    desc: "ISO 9001 QMS, ISO 14001 EMS, ISO 45001 OHSMS & ISO 50001 EnMS certification. We guide you from gap analysis through documentation, training, internal audit, and final certification.",
    points: [
      "Gap analysis against ISO standard requirements",
      "Quality Manual, SOPs, Forms development",
      "Employee training & awareness programs",
      "Internal audit & corrective action support",
      "NABCB-accredited certification body liaison",
      "Surveillance audit & recertification support",
    ],
    note: "ISO 9001 is often required by government departments, large buyers, and export customers as a vendor prerequisite.",
  },
  {
    id: "calibration",
    icon: "⚖️",
    title: "Calibration of Instruments",
    subtitle: "Metrological Traceability",
    tag: "Metrology",
    accentFrom: "#E65100",
    accentTo: "#FB8C00",
    subTiles: ["Mechanical", "Electrical", "Thermal", "Mass & Volume"],
    desc: "Comprehensive calibration consultancy ensuring metrological traceability for all your measuring instruments. We connect you with NABL-accredited labs and maintain audit-ready calibration records.",
    points: [
      "Master Equipment List (MEL) creation",
      "Calibration frequency planning by criticality",
      "NABL-accredited calibration lab selection",
      "Certificate review for traceability & validity",
      "Calibration register & due-date tracking",
      "ISO 9001 / ISO 17025 compliant records",
    ],
    note: "Calibration certificates must trace to national standards maintained by NPLI for ISO 9001 and NABL compliance.",
  },
  {
    id: "testing",
    icon: "🧪",
    title: "Testing of Products",
    subtitle: "IS / ASTM / EN / CE",
    tag: "Testing",
    accentFrom: "#B71C1C",
    accentTo: "#D32F2F",
    subTiles: ["IS / BIS Testing", "ASTM / IEC", "EN / CE Testing", "Chemical / RoHS"],
    desc: "Product testing consultancy for BIS certification, export compliance and quality assurance. We identify the right labs, prepare test samples correctly, and review test reports for you.",
    points: [
      "Test parameter identification per IS code",
      "BIS-empanelled / NABL lab selection",
      "Sample preparation & dispatch guidance",
      "Test report review & interpretation",
      "Failure analysis and retesting strategy",
      "Export testing: CE, FCC, UKCA, RoHS",
    ],
    note: "Testing must be at BIS-approved or NABL-accredited labs for results to be accepted during BIS certification.",
  },
  {
    id: "ce-certification",
    icon: "🇪🇺",
    title: "CE & Export Certification",
    subtitle: "European Market Access",
    tag: "Export",
    accentFrom: "#1565C0",
    accentTo: "#0288D1",
    subTiles: ["CE Marking", "UKCA Marking", "RoHS Compliance", "FCC / UL"],
    desc: "CE marking compliance for export to the European Economic Area, UKCA for UK markets, FCC/UL for USA. Full directive mapping, technical file, Declaration of Conformity, and EU Authorized Representative support.",
    points: [
      "EU Directive & Regulation identification",
      "Harmonized standard (EN) selection",
      "Conformity assessment & Notified Body guidance",
      "Technical File (Tech Doc) preparation",
      "EU Declaration of Conformity drafting",
      "EU Authorized Representative appointment",
    ],
    note: "CE marking required for 26+ product categories: machinery, electrical equipment, PPE, toys, medical devices, construction products.",
  },
];

const STATS = [
  { value: "500+", label: "Certifications", sub: "Delivered" },
  { value: "300+", label: "Active", sub: "Clients" },
  { value: "10+", label: "Years", sub: "Experience" },
  { value: "6", label: "Core", sub: "Service Areas" },
  { value: "15+", label: "States", sub: "Pan India" },
  { value: "95%", label: "First-Time", sub: "Approval Rate" },
];

export default function ServicesPage() {
  return (
    <>
      <SiteNavbar />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-[80px]" style={{ background: "linear-gradient(135deg, #0A1628 0%, #0D1F3C 60%, #0D47A122 100%)" }}>
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse 70% 60% at 60% 40%, #1976D244 0%, transparent 70%)" }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-14">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/30 text-xs mb-8">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/50">Services</span>
          </div>

          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 bg-white/10 border border-white/15">
                Certification & Compliance
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                All Our Services
              </h1>
              <p className="text-white/40 text-base sm:text-lg max-w-xl leading-relaxed">
                From BIS Product Certification to CE Marking — complete compliance solutions for Indian manufacturers and laboratories.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1eb858] text-white font-bold text-sm rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-900/40">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                  Free Consultation
                </a>
                <Link href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm rounded-xl transition-all">
                  Contact Us
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-2 lg:w-[220px]">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl p-3 text-center border border-white/10" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div className="text-lg font-black text-white">{stat.value}</div>
                  <div className="text-white/35 text-[9px] leading-tight">{stat.label}<br />{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Nav strip */}
        <div className="relative border-t border-white/10" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {SERVICES.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap border border-transparent hover:border-white/15">
                  <span>{s.icon}</span>
                  {s.title.split(" ").slice(0, 3).join(" ")}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="h-8 bg-gradient-to-b from-transparent to-zinc-950" />
      </section>

      {/* ── SERVICE CARDS GRID ── */}
      <main style={{ background: "#0A1628" }} className="pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {SERVICES.map(s => (
              <article
                key={s.id}
                id={s.id}
                className="group rounded-2xl overflow-hidden border border-white/10 flex flex-col transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 hover:-translate-y-1"
                style={{ background: "linear-gradient(160deg, #0D1F3C 0%, #0A1628 100%)" }}
              >
                {/* Coloured header bar */}
                <div
                  className="px-5 py-5 flex flex-col items-center text-center relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${s.accentFrom}, ${s.accentTo})` }}
                >
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 70%)" }} />

                  <div className="relative text-4xl mb-2">{s.icon}</div>
                  <div className="relative text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">{s.tag}</div>
                  <h2 className="relative text-base font-black text-white leading-tight mb-0.5">{s.title}</h2>
                  <p className="relative text-[11px] text-white/60">{s.subtitle}</p>
                </div>

                {/* Sub-tiles */}
                <div className="grid grid-cols-2 gap-1.5 p-3 border-b border-white/8">
                  {s.subTiles.map(tile => (
                    <div
                      key={tile}
                      className="rounded-xl py-2 px-2 text-center text-[10px] font-bold text-white/70 border border-white/10"
                      style={{ background: `${s.accentFrom}18` }}
                    >
                      {tile}
                    </div>
                  ))}
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-5 gap-4">
                  <p className="text-white/50 text-xs leading-relaxed">{s.desc}</p>

                  {/* Points */}
                  <div className="space-y-1.5 flex-1">
                    {s.points.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `linear-gradient(135deg, ${s.accentFrom}, ${s.accentTo})` }}
                        >
                          <svg className="w-2 h-2 fill-white" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-white/55 text-xs leading-relaxed">{pt}</span>
                      </div>
                    ))}
                  </div>

                  {/* Note */}
                  <div className="rounded-xl px-3 py-2.5 border border-white/8" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-white/35 text-[10px] leading-relaxed">
                      <span className="text-white/55 font-bold">ℹ️ </span>{s.note}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href={`/services/${s.id}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white border border-white/20 hover:border-white/50 transition-all hover:bg-white/5"
                    >
                      View Details
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <a
                      href={`https://wa.me/919009413040?text=Hello%2C%20I%20need%20help%20with%20${encodeURIComponent(s.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#1eb858] transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                      Enquire
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ── BOTTOM CTA ── */}
        <section className="border-t border-white/8" style={{ background: "linear-gradient(135deg, #0D1F3C, #0A1628)" }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
            <div className="inline-flex items-center gap-1.5 text-white/40 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-5 border border-white/10">
              Not Sure Where to Start?
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-4 leading-tight">
              Talk to Our Experts — Free Consultation
            </h2>
            <p className="text-white/35 text-sm mb-8 leading-relaxed max-w-lg mx-auto">
              We&apos;ll identify exactly which certifications your business needs and the fastest, most cost-effective path to achieve them.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#25D366] hover:bg-[#1eb858] text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-900/40 text-sm"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                Free WhatsApp Consultation
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white/20 hover:border-white/50 text-white font-bold rounded-xl transition-all hover:bg-white/5 text-sm"
              >
                Send Us a Message
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl shadow-green-900/30 hover:scale-110 transition-transform"
        aria-label="WhatsApp">
        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
      </a>

      <QEAssistantTrigger />
    </>
  );
}
