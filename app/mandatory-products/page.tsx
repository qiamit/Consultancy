"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNavbar } from "@/components/public/site-navbar";
import { SiteFooter } from "@/components/public/site-footer";

const WA_LINK = "https://wa.me/919009413040?text=Hello%2C%20I%20need%20help%20with%20BIS%20certification%20for%20my%20product";
const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

interface Product {
  name: string;
  isCode: string;
  note?: string;
}

interface Category {
  id: string;
  icon: string;
  title: string;
  color: string;
  products: Product[];
}

const CATEGORIES: Category[] = [
  {
    id: "electrical",
    icon: "⚡",
    title: "Electrical Wires, Cables & Accessories",
    color: "bg-yellow-500",
    products: [
      { name: "PVC Insulated Cables (up to 1100V)", isCode: "IS 694", note: "Mandatory QCO" },
      { name: "PVC Insulated Heavy Duty Electric Cables", isCode: "IS 1554" },
      { name: "Flexible Cables & Cords", isCode: "IS 9968" },
      { name: "Switches for Domestic & Similar Purposes", isCode: "IS 3854", note: "Mandatory QCO" },
      { name: "13A Plugs, Socket Outlets & Adaptors", isCode: "IS 1293" },
      { name: "Miniature Circuit Breakers (MCB)", isCode: "IS 60898", note: "Mandatory QCO" },
      { name: "Residual Current Devices (RCCB/RCBO)", isCode: "IS 61008 / IS 61009" },
      { name: "Distribution Boards / MCB DB", isCode: "IS 8623" },
      { name: "Extension Cords / Multi-Plug Boards", isCode: "IS 302-2-52", note: "Mandatory QCO" },
      { name: "Ceiling Fans, Table Fans, Pedestal Fans", isCode: "IS 374", note: "Mandatory QCO" },
      { name: "Electric Immersion Water Heaters", isCode: "IS 302-2-21" },
      { name: "Electric Smoothing Irons", isCode: "IS 302-2-3" },
    ],
  },
  {
    id: "lighting",
    icon: "💡",
    title: "LED & Lighting Products",
    color: "bg-amber-500",
    products: [
      { name: "Self-Ballasted LED Lamps (LED Bulbs)", isCode: "IS 16102 Part 1", note: "Mandatory QCO" },
      { name: "LED Drivers / Control Gear", isCode: "IS 16102 Part 2" },
      { name: "LED Luminaires for Road / Street Lighting", isCode: "IS 10322 Part 5 Sec 3" },
      { name: "LED Luminaires for Indoor Use", isCode: "IS 10322 Part 5" },
      { name: "Tube Lights / Linear Fluorescent Lamps", isCode: "IS 1534" },
      { name: "High Mast / Flood Lights (LED)", isCode: "IS 10322" },
    ],
  },
  {
    id: "electronics",
    icon: "📱",
    title: "Electronics, IT & Telecom (CRS / BIS)",
    color: "bg-blue-500",
    products: [
      { name: "Mobile Phones & Smartphones", isCode: "IS 13252 (CRS)", note: "CRS Mandatory" },
      { name: "Laptops & Notebook Computers", isCode: "IS 13252 (CRS)", note: "CRS Mandatory" },
      { name: "Tablets & iPads", isCode: "IS 13252 (CRS)", note: "CRS Mandatory" },
      { name: "Power Adapters / Chargers", isCode: "IS 13252 (CRS)", note: "CRS Mandatory" },
      { name: "Power Banks / Portable Chargers", isCode: "IS 16046 (CRS)", note: "CRS Mandatory" },
      { name: "LED TVs / Smart TVs", isCode: "IS 616 (CRS)", note: "CRS Mandatory" },
      { name: "Set Top Boxes / DTH Devices", isCode: "IS 616 (CRS)", note: "CRS Mandatory" },
      { name: "Wireless Keyboards, Mouse & Dongles", isCode: "IS 616 (CRS)", note: "CRS Mandatory" },
      { name: "Bluetooth Speakers & Headphones", isCode: "IS 616 (CRS)", note: "CRS Mandatory" },
      { name: "CCTV Cameras & DVR/NVR Systems", isCode: "IS 13252 (CRS)", note: "CRS Mandatory" },
      { name: "Electronic Toys (Battery Operated)", isCode: "IS 9873-4", note: "Mandatory QCO — Oct 2025" },
      { name: "Smart Energy Meters", isCode: "IS 15884" },
    ],
  },
  {
    id: "steel",
    icon: "🔩",
    title: "Steel & Metal Products",
    color: "bg-zinc-50 dark:bg-zinc-9500",
    products: [
      { name: "TMT Bars / Hot Rolled Deformed Steel Bars", isCode: "IS 1786", note: "Mandatory QCO" },
      { name: "Hot Rolled Medium & High Tensile Structural Steel", isCode: "IS 2062", note: "Mandatory QCO" },
      { name: "Mild Steel Wire Rods", isCode: "IS 1977" },
      { name: "Cold Rolled Steel Strips / Sheets", isCode: "IS 513" },
      { name: "Galvanized (GI / GP) Steel Sheets", isCode: "IS 277", note: "Mandatory QCO" },
      { name: "Steel Tubes for Structural Purposes", isCode: "IS 1161" },
      { name: "Stainless Steel Bars & Rods", isCode: "IS 6911" },
      { name: "Electrodes / Welding Rods", isCode: "IS 814" },
      { name: "High Strength Bolts, Nuts & Washers", isCode: "IS 1367" },
      { name: "Cast Iron Pipes & Fittings", isCode: "IS 1536" },
    ],
  },
  {
    id: "cement",
    icon: "🏗️",
    title: "Cement & Construction Materials",
    color: "bg-stone-500",
    products: [
      { name: "Ordinary Portland Cement (OPC) 53 Grade", isCode: "IS 269", note: "Mandatory QCO" },
      { name: "Ordinary Portland Cement (OPC) 43 Grade", isCode: "IS 8112", note: "Mandatory QCO" },
      { name: "Portland Pozzolana Cement (PPC)", isCode: "IS 1489", note: "Mandatory QCO" },
      { name: "Portland Slag Cement (PSC)", isCode: "IS 455", note: "Mandatory QCO" },
      { name: "Rapid Hardening Portland Cement", isCode: "IS 8041" },
      { name: "Fly Ash Bricks / Fly Ash Lime Bricks", isCode: "IS 12894" },
      { name: "AAC Blocks (Autoclaved Aerated Concrete)", isCode: "IS 2185 Part 3" },
      { name: "Ready Mix Concrete (RMC)", isCode: "IS 4926" },
      { name: "Steel Door Frames", isCode: "IS 4351" },
      { name: "PVC Door & Window Profiles", isCode: "IS 16093" },
    ],
  },
  {
    id: "household",
    icon: "🏠",
    title: "Household & Domestic Appliances",
    color: "bg-pink-500",
    products: [
      { name: "Domestic Pressure Cookers (Aluminium)", isCode: "IS 2347", note: "Mandatory QCO" },
      { name: "Domestic Pressure Cookers (Stainless Steel)", isCode: "IS 2347", note: "Mandatory QCO" },
      { name: "Liquefied Petroleum Gas (LPG) Cylinders", isCode: "IS 3196" },
      { name: "Domestic Gas Stoves / Cooktops", isCode: "IS 4246", note: "Mandatory QCO" },
      { name: "LPG Regulators", isCode: "IS 8737" },
      { name: "Rubber Hose for LPG", isCode: "IS 9573" },
      { name: "Drinking Water Storage Tanks (Plastic)", isCode: "IS 12701" },
      { name: "CPVC Pipes & Fittings", isCode: "IS 15778" },
      { name: "UPVC Pipes for Potable Water", isCode: "IS 4985" },
      { name: "Stainless Steel Utensils / Cookware", isCode: "IS 14756" },
    ],
  },
  {
    id: "safety",
    icon: "⛑️",
    title: "Safety & Protective Equipment",
    color: "bg-red-500",
    products: [
      { name: "Protective Helmets for Motorcycle Riders (ISI Helmet)", isCode: "IS 4151", note: "Mandatory QCO" },
      { name: "Industrial Safety Helmets", isCode: "IS 2925", note: "Mandatory QCO" },
      { name: "Safety Footwear / Industrial Shoes", isCode: "IS 15298" },
      { name: "High Visibility Jackets / Vests", isCode: "IS 15809" },
      { name: "Personal Protective Equipment (PPE Kits)", isCode: "IS 17423" },
      { name: "Fire Extinguishers", isCode: "IS 2171", note: "Mandatory QCO" },
      { name: "Life Jackets", isCode: "IS 1178" },
      { name: "Reflective Tape / Materials", isCode: "IS 15809" },
    ],
  },
  {
    id: "chemicals",
    icon: "🧪",
    title: "Chemicals, Fertilizers & Rubber",
    color: "bg-green-600",
    products: [
      { name: "Urea (Fertilizer)", isCode: "IS 2073", note: "Mandatory QCO" },
      { name: "Single Super Phosphate (SSP)", isCode: "IS 1112", note: "Mandatory QCO" },
      { name: "Di Ammonium Phosphate (DAP)", isCode: "IS 5765", note: "Mandatory QCO" },
      { name: "Potassium Chloride (MOP)", isCode: "IS 7408" },
      { name: "Solid Rubber Tyres", isCode: "IS 15652" },
      { name: "Automotive Rubber Tyres (2W)", isCode: "IS 2415" },
      { name: "Vulcanized Rubber Sheets", isCode: "IS 638" },
      { name: "PVC Compounds for Cables", isCode: "IS 5831" },
    ],
  },
];

export default function MandatoryProductsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = CATEGORIES.map(cat => ({
    ...cat,
    products: cat.products.filter(
      p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.isCode.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => !search || cat.products.length > 0);

  return (
    <>
      <SiteNavbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-[80px] pb-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-block bg-white/10 text-blue-200 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5">BIS Mandatory Products</div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">Products Requiring Mandatory BIS Certification</h1>
          <p className="text-gray-300 text-sm max-w-2xl mx-auto leading-relaxed mb-6">
            These products require ISI Mark / BIS License under Quality Control Orders (QCOs) issued by the Government of India. Manufacturing or importing these products without a valid BIS License is illegal and attracts penalties.
          </p>
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search product name or IS code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="hover:text-sky-600 dark:text-sky-400 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-50 font-medium">Mandatory Products</span>
          </div>
          <div className="flex gap-3">
            <a href="https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en" target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1">
              BIS Official List
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
            <a href="https://www.bis.gov.in/upcoming-qcos-notified-and-due-for-implementation/?lang=en" target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline flex items-center gap-1">
              Upcoming QCOs
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          </div>
        </div>
      </div>

      <main className="py-12 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Important Notice */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 flex gap-4">
            <div className="text-2xl flex-shrink-0">⚠️</div>
            <div>
              <div className="font-bold text-red-800 text-sm mb-1">Legal Requirement</div>
              <p className="text-red-700 text-sm leading-relaxed">
                Manufacturing, storing, selling or distributing products listed under Quality Control Orders (QCOs) without a valid BIS License and ISI Mark is a punishable offence under the BIS Act, 2016.
                Penalties include fines up to ₹2 lakh and imprisonment. <strong>Contact us immediately</strong> if your product is on this list and you don&apos;t have a BIS license.
              </p>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!activeCategory ? "bg-sky-600 text-white" : "bg-white border border-gray-200 text-zinc-600 dark:text-zinc-400 hover:border-sky-600 hover:text-sky-600 dark:text-sky-400"}`}
            >
              All Categories ({CATEGORIES.reduce((a, c) => a + c.products.length, 0)}+)
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${activeCategory === cat.id ? "bg-sky-600 text-white" : "bg-white border border-gray-200 text-zinc-600 dark:text-zinc-400 hover:border-sky-600 hover:text-sky-600 dark:text-sky-400"}`}
              >
                {cat.icon} {cat.title.split(" ")[0]} ({cat.products.length})
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="space-y-6">
            {filtered
              .filter(cat => !activeCategory || cat.id === activeCategory)
              .map(cat => (
                <div key={cat.id} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                    <div className={`w-9 h-9 rounded-xl ${cat.color} flex items-center justify-center text-lg flex-shrink-0`}>
                      {cat.icon}
                    </div>
                    <div>
                      <h2 className="font-black text-zinc-900 dark:text-zinc-50 text-base">{cat.title}</h2>
                      <p className="text-gray-400 text-xs">{cat.products.length} products listed</p>
                    </div>
                    <a
                      href={WA_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#25D366] font-bold hover:underline flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                      Enquire
                    </a>
                  </div>

                  {/* Products Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-none shadow-none rounded-none bg-transparent" style={{ border: "none", boxShadow: "none", borderRadius: 0 }}>
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-950">
                          <th className="text-left px-6 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-8">#</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product Name</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-36">IS Code</th>
                          <th className="text-left px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-40">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.products.map((p, i) => (
                          <tr key={p.name} className="border-t border-gray-50 hover:bg-blue-50/40 transition-colors">
                            <td className="px-6 py-3 text-xs text-gray-400">{i + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-800 font-medium">{p.name}</td>
                            <td className="px-4 py-3 text-xs font-mono font-bold text-sky-600 dark:text-sky-400">{p.isCode}</td>
                            <td className="px-4 py-3">
                              {p.note ? (
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${p.note.includes("CRS") ? "bg-purple-100 text-purple-700" : p.note.includes("Upcoming") || p.note.includes("2025") || p.note.includes("2026") ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                                  {p.note}
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active QCO</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>

          {/* Disclaimer + CTA */}
          <div className="mt-10 grid sm:grid-cols-2 gap-5">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="font-black text-zinc-900 dark:text-zinc-50 mb-2 text-sm">Is Your Product on This List?</h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-4">
                If you manufacture or import any product from the above list and don&apos;t yet have a BIS License, you need to act now. We can help you obtain BIS certification quickly and correctly.
              </p>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white text-sm font-bold rounded-xl hover:bg-[#1eb858] transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
                WhatsApp for Help
              </a>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-gray-200 rounded-2xl p-6">
              <h3 className="font-black text-zinc-900 dark:text-zinc-50 mb-2 text-sm">Note on This List</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                This list is for reference only and covers major product categories. The complete official list of BIS mandatory products is maintained by the Bureau of Indian Standards (BIS) and updated periodically as new QCOs are notified. Always verify with BIS or consult us for the latest status of your specific product.
              </p>
              <a href="https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline">
                View Official BIS Website
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />

      <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform" aria-label="WhatsApp">
        <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24"><path d={WA_PATH} /></svg>
      </a>
    </>
  );
}
