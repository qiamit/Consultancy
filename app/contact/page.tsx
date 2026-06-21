"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteNavbar } from "@/components/public/site-navbar";
import { QEAssistantTrigger } from "@/components/public/qe-assistant-trigger";

const WA_LINK = "https://wa.me/919009413040?text=Hello%2C%20I%20need%20consultation%20for%20BIS%20Certification";
const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const FAQS = [
  { q: "How long does BIS certification take?", a: "Typically 3–6 months from application acceptance — subject to successful lab testing and factory inspection. We minimize delays through proper documentation and proactive BIS liaison." },
  { q: "Is BIS certification mandatory for my product?", a: "BIS ISI Mark is mandatory only for products under QCOs (Quality Control Orders) — 500+ product categories. Share your product details and we'll check the QCO status for you — free." },
  { q: "Do you serve clients outside Chhattisgarh?", a: "Yes. We serve clients across India. BIS applications are managed centrally and most interaction happens via phone, WhatsApp, and email. We handle BIS liaison remotely for pan-India clients." },
  { q: "Can you help foreign manufacturers?", a: "Yes. Foreign manufacturers need BIS certification under FMCS (Foreign Manufacturer Certification Scheme). We provide complete support including Authorised Indian Representative services." },
  { q: "What is the cost of BIS certification?", a: "Cost includes BIS fees + lab testing charges + our consultancy fee — variable by product. We provide a complete estimate after understanding your product and situation." },
];

const SERVICES_LIST = [
  { href: "/services/product-certification", label: "BIS Product Certification", icon: "🏆" },
  { href: "/services/lab-accreditation", label: "Lab Accreditation (NABL)", icon: "🔬" },
  { href: "/services/management-system", label: "ISO Management System", icon: "📋" },
  { href: "/services/calibration", label: "Calibration of Instruments", icon: "⚖️" },
  { href: "/services/testing", label: "Testing of Products", icon: "🧪" },
  { href: "/services/ce-certification", label: "CE & Export Certification", icon: "🇪🇺" },
];

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", service: "", message: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = encodeURIComponent(
      `Hello Quality Engineering!\n\nName: ${form.name}\nCompany: ${form.company}\nPhone: ${form.phone}\nEmail: ${form.email}\nService Needed: ${form.service}\n\nMessage: ${form.message}`
    );
    window.open(`https://wa.me/919009413040?text=${msg}`, "_blank");
    setSent(true);
  }

  return (
    <>
      <SiteNavbar />

      <div className="min-h-screen xl:h-screen xl:overflow-hidden flex flex-col pt-[56px] xl:pt-[60px]">
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[25%_1fr_25%] xl:overflow-hidden">

          {/* ══════════ COL 1 — DARK NAVY LEFT ══════════ */}
          <aside
            className="flex flex-col overflow-hidden border-b xl:border-b-0 xl:border-r border-white/10"
            style={{ background: "linear-gradient(175deg, #0A1628 0%, #0F2347 60%, #0D1F3C 100%)" }}
          >
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-white/25 text-[10px]">
                <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
                <span>/</span>
                <span className="text-white/50">Contact</span>
              </div>

              {/* Identity */}
              <div>
                <div className="inline-flex items-center gap-1.5 bg-sky-500/15 border border-sky-400/25 text-sky-300 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
                  📍 Get In Touch
                </div>
                <h1 className="text-xl font-black text-white leading-tight mb-1">Quality Engineering</h1>
                <p className="text-sky-400 text-[11px] font-bold tracking-wide">Certification Consultants · Raipur, CG</p>
                <p className="text-white/40 text-xs mt-2 leading-relaxed">
                  Leading BIS & ISO certification consultancy in Chhattisgarh. Free initial consultation — no obligation. We respond within 2 hours on WhatsApp.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="space-y-2">
                <p className="text-white/25 text-[9px] uppercase tracking-widest font-black mb-2">Direct Contact</p>

                <a href="tel:+919009413040"
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/8 hover:border-sky-400/40 hover:bg-sky-400/5 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white/35 text-[9px] uppercase tracking-wide">Amit Kumar · Sr. Technical Consultant</div>
                    <div className="text-white/80 text-xs font-bold group-hover:text-sky-300 transition-colors">+91 90094 13040</div>
                  </div>
                </a>

                <a href="tel:+918966003040"
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/8 hover:border-indigo-400/40 hover:bg-indigo-400/5 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white/35 text-[9px] uppercase tracking-wide">Rakesh Kumar Labh · Director</div>
                    <div className="text-white/80 text-xs font-bold group-hover:text-indigo-300 transition-colors">+91 89660 03040</div>
                  </div>
                </a>

                <a href="mailto:info@qengineering.in"
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/8 hover:border-emerald-400/40 hover:bg-emerald-400/5 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white/35 text-[9px] uppercase tracking-wide">Email Us</div>
                    <div className="text-white/80 text-xs font-bold group-hover:text-emerald-300 transition-colors">info@qengineering.in</div>
                  </div>
                </a>

                <a href="https://maps.google.com/?q=21.384648549168134,81.6614874046873" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/8 hover:border-amber-400/40 hover:bg-amber-400/5 transition-all group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white/35 text-[9px] uppercase tracking-wide">Office Address</div>
                    <div className="text-white/80 text-xs font-bold group-hover:text-amber-300 transition-colors leading-tight">Siltara Industrial Area<br />Raipur – 493221, CG</div>
                  </div>
                </a>
              </div>

              {/* Office Hours */}
              <div className="rounded-xl border border-white/8 p-3.5" style={{ background: "rgba(255,255,255,0.04)" }}>
                <p className="text-white/40 text-[9px] uppercase tracking-widest font-black mb-2">Office Hours</p>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-white/40">Mon – Sat</span>
                    <span className="text-white/70 font-bold">9:30 AM – 6:30 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Sunday</span>
                    <span className="text-white/50">By Appointment</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">WhatsApp</span>
                    <span className="text-green-400 font-bold">24 × 7</span>
                  </div>
                </div>
              </div>

              {/* Quick CTA */}
              <div className="space-y-2">
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#25D366] hover:bg-[#1eb858] text-white font-bold text-xs rounded-xl transition-all">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                  Chat on WhatsApp
                </a>
                <a href="tel:+919009413040"
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-white/20 hover:border-white/40 text-white font-bold text-xs rounded-xl transition-all">
                  📞 Call Now — +91 90094 13040
                </a>
              </div>

            </div>
          </aside>

          {/* ══════════ COL 2 — CENTER: FORM + MAP ══════════ */}
          <main className="flex flex-col overflow-hidden bg-zinc-950">
            <div className="flex-1 overflow-y-auto">

              {/* Header */}
              <div className="relative px-6 pt-8 pb-6 border-b border-white/8" style={{ background: "linear-gradient(135deg, #0D1F3C 0%, #0A1628 60%, #0D47A115 100%)" }}>
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 80% at 80% 30%, #25D36644, transparent 70%)" }} />
                <div className="relative">
                  <h2 className="text-2xl font-black text-white mb-1">Send Your Enquiry</h2>
                  <p className="text-white/40 text-sm">Fill the form — it will open WhatsApp with your details pre-filled for instant sending</p>
                </div>
              </div>

              <div className="px-5 xl:px-6 py-6 space-y-6">

                {/* Contact Form */}
                {sent ? (
                  <div className="rounded-2xl border border-green-400/30 p-8 text-center" style={{ background: "rgba(34,197,94,0.07)" }}>
                    <div className="text-4xl mb-3">✅</div>
                    <h3 className="font-black text-white mb-2">Opening WhatsApp…</h3>
                    <p className="text-white/40 text-sm mb-5 max-w-sm mx-auto">Your enquiry details have been prepared. Please send the message in WhatsApp to complete your enquiry.</p>
                    <button onClick={() => setSent(false)} className="text-sky-400 text-sm font-semibold hover:underline">Send another enquiry</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-white/35 mb-1.5 uppercase tracking-widest">Your Name *</label>
                        <input
                          name="name" type="text" required value={form.name} onChange={handleChange}
                          placeholder="Rajesh Kumar"
                          className="w-full px-3 py-2.5 rounded-xl text-xs text-white placeholder-white/20 border border-white/10 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 transition-all"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-white/35 mb-1.5 uppercase tracking-widest">Company Name</label>
                        <input
                          name="company" type="text" value={form.company} onChange={handleChange}
                          placeholder="ABC Pvt. Ltd."
                          className="w-full px-3 py-2.5 rounded-xl text-xs text-white placeholder-white/20 border border-white/10 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 transition-all"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-black text-white/35 mb-1.5 uppercase tracking-widest">Phone Number *</label>
                        <input
                          name="phone" type="tel" required value={form.phone} onChange={handleChange}
                          placeholder="+91 98765 43210"
                          className="w-full px-3 py-2.5 rounded-xl text-xs text-white placeholder-white/20 border border-white/10 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 transition-all"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-white/35 mb-1.5 uppercase tracking-widest">Email Address</label>
                        <input
                          name="email" type="email" value={form.email} onChange={handleChange}
                          placeholder="you@company.com"
                          className="w-full px-3 py-2.5 rounded-xl text-xs text-white placeholder-white/20 border border-white/10 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 transition-all"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-white/35 mb-1.5 uppercase tracking-widest">Service Required</label>
                      <select
                        name="service" value={form.service} onChange={handleChange}
                        className="w-full px-3 py-2.5 rounded-xl text-xs text-white border border-white/10 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 transition-all"
                        style={{ background: "#0D1F3C" }}
                      >
                        <option value="">Select a service…</option>
                        <option>BIS Product Certification (ISI Mark)</option>
                        <option>CRS Registration (Electronics)</option>
                        <option>NABL Laboratory Accreditation</option>
                        <option>ISO 9001 / 14001 / 45001 Certification</option>
                        <option>Calibration of Instruments</option>
                        <option>Testing of Products</option>
                        <option>CE / UKCA / Export Certification</option>
                        <option>Other / General Query</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-white/35 mb-1.5 uppercase tracking-widest">Your Message / Query</label>
                      <textarea
                        name="message" rows={3} value={form.message} onChange={handleChange}
                        placeholder="Describe your product and what you need help with…"
                        className="w-full px-3 py-2.5 rounded-xl text-xs text-white placeholder-white/20 border border-white/10 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20 transition-all resize-none"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      />
                    </div>
                    <button type="submit"
                      className="w-full py-3 bg-[#25D366] hover:bg-[#1eb858] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-900/40">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                      Send via WhatsApp
                    </button>
                    <p className="text-white/20 text-[10px] text-center">Opens WhatsApp with your details pre-filled · We respond within 2 hours</p>
                  </form>
                )}

                {/* Map */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-sky-400 to-indigo-500" />
                    <h3 className="text-sm font-black text-white">Our Office Location</h3>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: "200px" }}>
                    <iframe
                      src="https://www.openstreetmap.org/export/embed.html?bbox=81.641%2C21.374%2C81.681%2C21.394&layer=mapnik&marker=21.384648549168134%2C81.6614874046873"
                      width="100%" height="100%"
                      style={{ border: 0, filter: "invert(0.9) hue-rotate(180deg)" }}
                      loading="lazy"
                      title="Quality Engineering Office Location"
                    />
                  </div>
                  <div className="mt-2.5 flex items-start justify-between gap-3">
                    <div className="text-white/35 text-[10px] leading-relaxed">
                      Plot No 7A, Avinash Logistic Park, SKS Road<br />
                      Siltara Industrial Area Phase 2, Raipur – 493221
                    </div>
                    <a href="https://maps.google.com/?q=21.384648549168134,81.6614874046873" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-all text-[10px] font-bold whitespace-nowrap flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Google Maps
                    </a>
                  </div>
                </div>

              </div>
            </div>
          </main>

          {/* ══════════ COL 3 — RIGHT PANEL ══════════ */}
          <aside
            className="flex flex-col overflow-hidden border-t xl:border-t-0 xl:border-l border-white/10 min-h-[400px] xl:min-h-0"
            style={{ background: "linear-gradient(175deg, #0D1F3C 0%, #0A1628 100%)" }}
          >
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">

              {/* Response Promise */}
              <div className="rounded-xl border border-green-400/20 p-3.5" style={{ background: "rgba(34,197,94,0.07)" }}>
                <p className="text-green-400 text-[10px] font-black mb-2">⚡ Our Response Promise</p>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center gap-2 text-white/50">
                    <span className="text-green-400">✓</span> WhatsApp reply within <span className="text-white/70 font-bold">2 hours</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/50">
                    <span className="text-green-400">✓</span> Free initial consultation — <span className="text-white/70 font-bold">no obligation</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/50">
                    <span className="text-green-400">✓</span> QCO status check — <span className="text-white/70 font-bold">completely free</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/50">
                    <span className="text-green-400">✓</span> Pan India service — <span className="text-white/70 font-bold">all states</span>
                  </div>
                </div>
              </div>

              {/* FAQs */}
              <div>
                <p className="text-white/25 text-[9px] uppercase tracking-widest font-black mb-3">Frequently Asked Questions</p>
                <div className="space-y-2">
                  {FAQS.map((f, i) => (
                    <div key={i} className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <button
                        className="w-full flex items-start justify-between gap-2 px-3 py-3 text-left hover:bg-white/4 transition-colors"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      >
                        <span className="text-white/65 text-[10px] font-bold leading-tight">{f.q}</span>
                        <svg className={`w-3.5 h-3.5 text-white/25 flex-shrink-0 mt-0.5 transition-transform ${openFaq === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openFaq === i && (
                        <div className="px-3 pb-3">
                          <p className="text-white/35 text-[10px] leading-relaxed">{f.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Our Services */}
              <div>
                <p className="text-white/25 text-[9px] uppercase tracking-widest font-black mb-3">Our Services</p>
                <div className="space-y-1.5">
                  {SERVICES_LIST.map(s => (
                    <Link key={s.href} href={s.href}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/8 hover:border-white/20 hover:bg-white/4 transition-all group">
                      <span className="text-sm">{s.icon}</span>
                      <span className="text-white/50 text-[10px] font-semibold group-hover:text-white/80 transition-colors flex-1">{s.label}</span>
                      <svg className="w-3 h-3 text-white/20 group-hover:text-white/50 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>

            </div>
          </aside>

        </div>
      </div>


      <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl shadow-green-900/30 hover:scale-110 transition-transform"
        aria-label="WhatsApp">
        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
      </a>

      <QEAssistantTrigger />
    </>
  );
}
