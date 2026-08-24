import { Suspense } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";
import { RegulatoryUpdatesList } from "@/components/public/regulatory-updates-list";

const WA_NUMBER = "919009413040";
const WA_MSG = encodeURIComponent("Hello, I have a query about a BIS update");
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;
const WA_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

function UpdatesListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white/5 rounded-2xl p-5 border border-white/10 animate-pulse">
          <div className="h-3 w-28 bg-white/10 rounded mb-3" />
          <div className="h-4 w-full bg-white/10 rounded mb-2" />
          <div className="h-3 w-4/5 bg-white/10 rounded" />
        </div>
      ))}
    </div>
  );
}

const UPDATE_SOURCES = [
  { label: "BIS — Bureau of Indian Standards", url: "https://www.bis.gov.in" },
  { label: "NABL — National Accreditation Board", url: "https://www.nabl-india.org" },
  { label: "QCI — Quality Council of India", url: "https://www.qcin.org" },
  { label: "MeitY — QCO Notifications", url: "https://meity.gov.in" },
];

export default function UpdatesPage() {
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
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Live Updates
                </span>
              </div>

              <div className="flex-shrink-0">
                <h1 className="text-white text-xl font-black leading-tight">Regulatory Updates</h1>
                <p className="text-sky-300/70 text-xs mt-1 leading-relaxed">
                  AI-summarized from BIS, NABL, QCI & Ministry websites — refreshed every few hours
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                {[
                  { v: "Daily", l: "Updates", s: "Published" },
                  { v: "6+", l: "Sources", s: "Monitored" },
                  { v: "AI", l: "Powered", s: "Summaries" },
                  { v: "Free", l: "Access", s: "For All" },
                ].map(s => (
                  <div key={s.l} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-white font-black text-lg leading-none">{s.v}</p>
                    <p className="text-red-200 text-[10px] font-bold mt-0.5">{s.l}</p>
                    <p className="text-white/40 text-[9px]">{s.s}</p>
                  </div>
                ))}
              </div>

              <div className="flex-shrink-0 bg-red-500/10 border border-red-500/25 rounded-xl p-3">
                <p className="text-red-300 text-[10px] font-black uppercase tracking-wider mb-1.5">⚠ Important Notice</p>
                <p className="text-white/80 text-xs leading-relaxed">
                  Multiple new Quality Control Orders are being enforced. If your product falls under a QCO without a BIS license, obtain one immediately to avoid penalties.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                {[
                  { v: "QCO", l: "Mandatory", s: "Products" },
                  { v: "BIS", l: "Notifications", s: "Tracked" },
                  { v: "ISO", l: "Updates", s: "Monitored" },
                  { v: "NABL", l: "Circulars", s: "Covered" },
                ].map(s => (
                  <div key={s.l} className="bg-red-500/8 border border-red-500/15 rounded-xl p-3 text-center">
                    <p className="text-red-300 font-black text-base leading-none">{s.v}</p>
                    <p className="text-white/70 text-[10px] font-bold mt-0.5">{s.l}</p>
                    <p className="text-white/40 text-[9px]">{s.s}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── CENTER COLUMN ── */}
          <main className="flex flex-col overflow-y-auto">
            <div className="flex-1 px-5 xl:px-8 py-6 flex flex-col gap-6">
              <div>
                <h2 className="text-white font-black text-2xl mb-2">Latest Regulatory Updates</h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  AI-summarized updates from BIS, ISO, NABL, QCI, QAI, and IQAS official websites.
                </p>
              </div>

              <Suspense fallback={<UpdatesListSkeleton />}>
                <RegulatoryUpdatesList />
              </Suspense>
            </div>
          </main>

          {/* ── RIGHT COLUMN ── */}
          <aside
            className="flex flex-col xl:overflow-hidden border-l border-white/8"
            style={{ background: "linear-gradient(180deg,#060F28 0%,#0B1A3E 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-5">

              <div>
                <p className="text-red-300 text-[10px] font-black uppercase tracking-widest mb-2">Official Sources</p>
                <div className="space-y-1.5">
                  {UPDATE_SOURCES.map(s => (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      <span className="text-white/80 text-[11px] font-medium leading-tight">{s.label}</span>
                      <svg className="w-3 h-3 text-white/30 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>

              <div className="bg-sky-500/10 border border-sky-500/25 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-white font-black text-sm">Need specific guidance?</p>
                <p className="text-white/60 text-xs leading-relaxed">
                  For product-specific QCO status, IS code requirements, or regulatory queries — reach our experts directly.
                </p>
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                  WhatsApp for Query
                </a>
              </div>

              <div>
                <p className="text-red-300 text-[10px] font-black uppercase tracking-widest mb-2">Quick Links</p>
                <div className="space-y-1.5">
                  {[
                    { label: "QCO — Mandatory Products", href: "/qco" },
                    { label: "BIS Product Certification", href: "/services/product-certification" },
                    { label: "Lab Accreditation (NABL)", href: "/services/lab-accreditation" },
                    { label: "Contact Us", href: "/contact" },
                  ].map(r => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="flex items-center gap-2 bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 rounded-lg px-3 py-2 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      <span className="text-white/80 text-xs font-medium">{r.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

        </div>
      </main>

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
