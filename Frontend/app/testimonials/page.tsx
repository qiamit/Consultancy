"use client";

import Link from "next/link";
import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_NUMBER = "919009413040";
const WA_MSG = encodeURIComponent("Hello, I would like to know more about your certification services");
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;
const WA_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const TESTIMONIALS = [
  {
    name: "Rajesh Verma",
    role: "Director",
    company: "Verma Electricals Pvt. Ltd.",
    location: "Raipur, CG",
    service: "BIS / ISI Mark",
    rating: 5,
    quote:
      "Quality Engineering guided us through the entire BIS certification for our LED lighting range. Their team handled documentation, factory inspection prep, and lab coordination — we received our ISI license on the first attempt.",
  },
  {
    name: "Priya Sharma",
    role: "Quality Manager",
    company: "Sharma Agro Foods",
    location: "Bhilai, CG",
    service: "ISO 9001 & FSSAI Support",
    rating: 5,
    quote:
      "We needed ISO 9001 for an export order. The consultants were responsive, explained every step clearly, and helped us close audit findings quickly. Highly professional service from start to finish.",
  },
  {
    name: "Amit Patel",
    role: "Proprietor",
    company: "Patel Testing Laboratory",
    location: "Nagpur, MH",
    service: "NABL Accreditation",
    rating: 5,
    quote:
      "NABL accreditation seemed overwhelming until we engaged Quality Engineering. They structured our QMS, prepared us for assessment, and we achieved ISO/IEC 17025 accreditation within the planned timeline.",
  },
  {
    name: "Suresh Khandelwal",
    role: "Managing Partner",
    company: "Khandelwal Jewellers",
    location: "Raipur, CG",
    service: "BIS Hallmarking",
    rating: 5,
    quote:
      "Hallmarking compliance was mandatory for our business. Their Raipur team made the BIS registration process smooth — from AHC registration to display centre requirements, everything was handled properly.",
  },
  {
    name: "Vikram Singh",
    role: "Export Manager",
    company: "Singh Engineering Works",
    location: "Indore, MP",
    service: "CE Marking & Product Testing",
    rating: 5,
    quote:
      "For our European export project, they coordinated CE marking documentation and pre-certification testing. Practical advice, no unnecessary delays — exactly what a manufacturing unit needs.",
  },
  {
    name: "Anita Deshmukh",
    role: "Compliance Head",
    company: "Deshmukh Electronics",
    location: "Pune, MH",
    service: "CRS Registration",
    rating: 5,
    quote:
      "CRS registration for our charger and adapter range was completed without back-and-forth confusion. The team stays updated on BIS notifications and proactively alerts us about regulatory changes.",
  },
];

const STAR_PATH = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 20 20">
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsPage() {
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
                <span className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Client Stories
                </span>
              </div>

              <div className="flex-shrink-0">
                <h1 className="text-white text-xl font-black leading-tight">Testimonials</h1>
                <p className="text-sky-300/70 text-xs mt-1 leading-relaxed">
                  Hear from manufacturers, labs, and exporters across India who trusted Quality Engineering
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                {[
                  { v: "500+", l: "Clients", s: "Served" },
                  { v: "5★", l: "Average", s: "Rating" },
                  { v: "10+", l: "Years", s: "Experience" },
                  { v: "Pan", l: "India", s: "Presence" },
                ].map(s => (
                  <div key={s.l} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-white font-black text-lg leading-none">{s.v}</p>
                    <p className="text-amber-200 text-[10px] font-bold mt-0.5">{s.l}</p>
                    <p className="text-white/40 text-[9px]">{s.s}</p>
                  </div>
                ))}
              </div>

              <div className="flex-shrink-0 bg-amber-500/10 border border-amber-500/25 rounded-xl p-3">
                <p className="text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1.5">Our Promise</p>
                <p className="text-white/80 text-xs leading-relaxed">
                  We have helped 500+ businesses achieve BIS, NABL, ISO, and export compliance certifications across India — with a 95% first-attempt success rate.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 flex-shrink-0">
                {[
                  { v: "95%", l: "Success", s: "Rate" },
                  { v: "300+", l: "Active", s: "Clients" },
                  { v: "15+", l: "States", s: "Covered" },
                  { v: "48hr", l: "Response", s: "Time" },
                ].map(s => (
                  <div key={s.l} className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-3 text-center">
                    <p className="text-amber-300 font-black text-base leading-none">{s.v}</p>
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
                <h2 className="text-white font-black text-2xl mb-2">What Our Clients Say</h2>
                <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
                  Real feedback from manufacturers, testing laboratories, and exporters who chose Quality Engineering for their compliance journey.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TESTIMONIALS.map(t => (
                  <article
                    key={t.name + t.company}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col hover:bg-white/8 transition-colors"
                  >
                    <Stars count={t.rating} />
                    <blockquote className="text-white/70 text-sm leading-relaxed mt-3 mb-4 flex-1">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <div className="border-t border-white/10 pt-3">
                      <p className="font-black text-white text-sm">{t.name}</p>
                      <p className="text-white/50 text-xs mt-0.5">{t.role}, {t.company}</p>
                      <p className="text-white/35 text-[11px] mt-0.5">{t.location}</p>
                      <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/25">
                        {t.service}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </main>

          {/* ── RIGHT COLUMN ── */}
          <aside
            className="flex flex-col xl:overflow-hidden border-l border-white/8"
            style={{ background: "linear-gradient(180deg,#060F28 0%,#0B1A3E 100%)" }}
          >
            <div className="flex-1 xl:overflow-hidden px-5 py-5 flex flex-col gap-5">

              <div>
                <p className="text-amber-300 text-[10px] font-black uppercase tracking-widest mb-2">Services Reviewed</p>
                <div className="space-y-1.5">
                  {[
                    "BIS / ISI Mark Certification",
                    "NABL Lab Accreditation",
                    "ISO 9001 / 14001 / 45001",
                    "CRS Registration",
                    "CE Marking",
                    "BIS Hallmarking",
                  ].map((s, i) => (
                    <div key={i} className="flex gap-2 items-center bg-white/3 border border-white/8 rounded-lg px-3 py-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      <p className="text-white/75 text-[11px]">{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-sky-500/10 border border-sky-500/25 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-white font-black text-sm">Ready to get certified?</p>
                <p className="text-white/60 text-xs leading-relaxed">
                  Join 500+ satisfied clients. Get a free consultation from our BIS & NABL experts.
                </p>
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
                  style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                  WhatsApp Us
                </a>
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-white/70 border border-white/15 hover:bg-white/10 transition-colors"
                >
                  Contact Us
                </Link>
              </div>

              <div>
                <p className="text-amber-300 text-[10px] font-black uppercase tracking-widest mb-2">Our Services</p>
                <div className="space-y-1.5">
                  {[
                    { label: "BIS Product Certification", href: "/services/product-certification" },
                    { label: "Lab Accreditation", href: "/services/lab-accreditation" },
                    { label: "Management Systems", href: "/services/management-system" },
                    { label: "Calibration", href: "/services/calibration" },
                  ].map(r => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="flex items-center gap-2 bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 rounded-lg px-3 py-2 transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
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
