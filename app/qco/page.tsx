"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_NUMBER = "919009413040";
const WA_MSG = encodeURIComponent("Hello, I need guidance on QCO / Mandatory BIS Certification.");
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;
const WA_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const QCO_CATEGORIES = [
  {
    title: "Electronics & IT",
    items: ["LED Lights & Luminaires", "Power Banks", "Laptops & Tablets", "Smart Meters", "Cables & Accessories", "Telecom Equipment"],
    color: "#1565C0",
  },
  {
    title: "Chemicals & Materials",
    items: ["Helmets (ISI Mark)", "Toys", "Pressure Cookers", "Steel Products", "Cement", "LPG Cylinders"],
    color: "#00695C",
  },
  {
    title: "Household & Consumer",
    items: ["Water Purifiers", "Air Conditioners", "Refrigerators", "Washing Machines", "Microwave Ovens", "Electric Fans"],
    color: "#4527A0",
  },
  {
    title: "Industrial Products",
    items: ["Transformers", "Wires & Cables", "Circuit Breakers", "Motors", "Batteries", "Solar Panels"],
    color: "#E65100",
  },
];

const PROCESS_STEPS = [
  { step: "01", title: "Applicability Check", desc: "Verify if your product falls under QCO notification" },
  { step: "02", title: "BIS Application", desc: "File for ISI Mark / CRS license on BIS portal" },
  { step: "03", title: "Sample Testing", desc: "Test at BIS-recognized labs against Indian Standards" },
  { step: "04", title: "Factory Audit", desc: "BIS inspection of manufacturing facility" },
  { step: "05", title: "Grant of Licence", desc: "Receive BIS licence with validity period" },
  { step: "06", title: "Compliance Maintenance", desc: "Surveillance audits & renewal support" },
];

const BIS_LINKS = [
  { label: "BIS Portal — Manufacturer Registration", url: "https://www.bis.gov.in" },
  { label: "Product Certification Scheme Details", url: "https://www.bis.gov.in/product-certification" },
  { label: "QCO Notification List (MeitY)", url: "https://meity.gov.in" },
  { label: "BIS Standards Catalogue", url: "https://www.bis.gov.in/standards" },
];

export default function QCOPage() {
  return (
    <div
      className="min-h-screen xl:h-screen xl:overflow-hidden flex flex-col"
      style={{ background: "linear-gradient(175deg,#050D1E 0%,#0A1A3A 60%,#050D1E 100%)" }}
    >
      <SiteNavbar />

      <main className="flex-1 flex flex-col min-h-0 pt-[62px] xl:overflow-hidden">
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[25%_1fr_25%] min-h-0 xl:overflow-hidden">

          {/* ── LEFT COLUMN ── */}
          <aside
            className="flex flex-col xl:overflow-hidden border-r border-white/8"
            style={{ background: "linear-gradient(180deg,#060F28 0%,#0B1A3E 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-4">
              {/* Badge */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  QCO / Mandatory BIS
                </span>
              </div>

              {/* Title */}
              <div className="flex-shrink-0">
                <h1 className="text-white text-xl font-black leading-tight">
                  Quality Control Orders
                </h1>
                <p className="text-sky-300/70 text-xs mt-1 leading-relaxed">
                  Mandatory BIS certification for products sold in India under Government QCO notifications
                </p>
              </div>

              {/* Stats 2×2 */}
              <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                {[
                  { v: "400+", l: "QCO Products", s: "Notified" },
                  { v: "200+", l: "Clients", s: "Certified" },
                  { v: "95%", l: "Success", s: "Rate" },
                  { v: "48hr", l: "Response", s: "Time" },
                ].map(s => (
                  <div key={s.l} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-white font-black text-lg leading-none">{s.v}</p>
                    <p className="text-sky-200 text-[10px] font-bold mt-0.5">{s.l}</p>
                    <p className="text-white/40 text-[9px]">{s.s}</p>
                  </div>
                ))}
              </div>

              {/* Mandate Box */}
              <div className="flex-shrink-0 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3">
                <p className="text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1.5">⚠ Legal Mandate</p>
                <p className="text-white/80 text-xs leading-relaxed">
                  Selling QCO-notified products without a valid BIS licence invites product seizure, heavy fines, and criminal liability under BIS Act 2016.
                </p>
              </div>

              {/* Track record 2×2 */}
              <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                {[
                  { v: "10+", l: "Years", s: "BIS Expertise" },
                  { v: "50+", l: "IS Codes", s: "Handled" },
                  { v: "Pan", l: "India", s: "Coverage" },
                  { v: "24/7", l: "Support", s: "Available" },
                ].map(s => (
                  <div key={s.l} className="bg-sky-500/8 border border-sky-500/15 rounded-xl p-3 text-center">
                    <p className="text-sky-300 font-black text-base leading-none">{s.v}</p>
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

              {/* Intro */}
              <div>
                <h2 className="text-white font-black text-2xl mb-2">Mandatory BIS Certification (QCO)</h2>
                <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
                  Quality Control Orders issued by various Ministries make BIS certification compulsory for specified products.
                  Non-compliance means your product cannot be legally manufactured, imported, or sold in India.
                  Quality Engineering handles the entire certification journey — from applicability check to licence grant.
                </p>
              </div>

              {/* QCO Product Categories */}
              <div>
                <h3 className="text-sky-300 text-xs font-black uppercase tracking-widest mb-3">QCO Product Categories</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {QCO_CATEGORIES.map(cat => (
                    <div
                      key={cat.title}
                      className="rounded-xl p-4 border border-white/10"
                      style={{ background: `${cat.color}18`, borderColor: `${cat.color}30` }}
                    >
                      <p className="text-white font-black text-sm mb-2">{cat.title}</p>
                      <ul className="space-y-1">
                        {cat.items.map(item => (
                          <li key={item} className="flex items-center gap-2 text-white/70 text-xs">
                            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certification Process */}
              <div>
                <h3 className="text-sky-300 text-xs font-black uppercase tracking-widest mb-3">Certification Process</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PROCESS_STEPS.map(p => (
                    <div key={p.step} className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <span className="text-sky-400/50 text-xl font-black block leading-none mb-1">{p.step}</span>
                      <p className="text-white font-bold text-xs">{p.title}</p>
                      <p className="text-white/50 text-[10px] mt-0.5 leading-relaxed">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="bg-sky-500/10 border border-sky-500/25 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-white font-black text-base">Not sure if your product needs QCO?</p>
                  <p className="text-white/60 text-sm mt-0.5">Get a free applicability check from our BIS experts.</p>
                </div>
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                  WhatsApp Us
                </a>
              </div>
            </div>
          </main>

          {/* ── RIGHT COLUMN ── */}
          <aside
            className="flex flex-col xl:overflow-hidden border-l border-white/8"
            style={{ background: "linear-gradient(180deg,#060F28 0%,#0B1A3E 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-5">

              {/* BIS Official Links */}
              <div>
                <p className="text-sky-300 text-[10px] font-black uppercase tracking-widest mb-2">BIS Official Links</p>
                <div className="space-y-1.5">
                  {BIS_LINKS.map(l => (
                    <a
                      key={l.label}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                      <span className="text-white/80 text-[11px] font-medium leading-tight">{l.label}</span>
                      <svg className="w-3 h-3 text-white/30 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>

              {/* Key Facts */}
              <div>
                <p className="text-sky-300 text-[10px] font-black uppercase tracking-widest mb-2">Key Facts</p>
                <div className="space-y-2">
                  {[
                    "QCOs are issued under BIS Act 2016 & various ministry orders",
                    "ISI Mark scheme covers domestic manufacturing",
                    "CRS scheme covers electronics & IT goods",
                    "Import QCO requires BIS licence before customs clearance",
                    "Penalty: up to ₹2 lakh + imprisonment for violations",
                  ].map((f, i) => (
                    <div key={i} className="flex gap-2 items-start bg-white/3 border border-white/8 rounded-lg px-3 py-2">
                      <span className="text-sky-400 text-xs mt-0.5 flex-shrink-0">→</span>
                      <p className="text-white/70 text-[11px] leading-relaxed">{f}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Services */}
              <div>
                <p className="text-sky-300 text-[10px] font-black uppercase tracking-widest mb-2">Related Services</p>
                <div className="space-y-1.5">
                  {[
                    { label: "BIS Product Certification", href: "/services/product-certification" },
                    { label: "Testing & Analysis", href: "/services/testing" },
                    { label: "Management Systems", href: "/services/management-system" },
                  ].map(r => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="flex items-center gap-2 bg-white/5 hover:bg-sky-500/15 border border-white/10 hover:border-sky-500/30 rounded-lg px-3 py-2 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
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
