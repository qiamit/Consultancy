import Link from "next/link";

const WA_ICON = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

const QUICK_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Our Services", href: "/services" },
  { label: "Updates & News", href: "/updates" },
  { label: "Contact Us", href: "/contact" },
];

const SERVICES = [
  "BIS Product Certification",
  "CRS Registration",
  "NABL Accreditation",
  "QAI / IQAS / FDAS",
  "ISO 9001 / 14001 / 45001",
  "Calibration of Instruments",
  "Testing of Products",
  "CE Certification",
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <div className="mb-4">
            <span className="text-zinc-900 dark:text-zinc-50 font-bold text-xl">Quality Engineering</span>
            <div className="text-sky-600 dark:text-sky-400 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">Certification Consultants</div>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-5">
            Leading BIS certification consultancy in Raipur, Chhattisgarh. Your trusted compliance partner for product certification, accreditation, and ISO standards.
          </p>
          <a
            href="https://wa.me/919009413040"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#1eb858] transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d={WA_ICON}/></svg>
            WhatsApp Us
          </a>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-zinc-900 dark:text-zinc-100 font-bold text-xs uppercase tracking-widest mb-5">Quick Links</h3>
          <ul className="space-y-2.5">
            {QUICK_LINKS.map(l => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400 transition-colors flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-sky-600" />
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400 transition-colors flex items-center gap-2"
              >
                <span className="w-1 h-1 rounded-full bg-sky-600" />
                Mandatory Products (BIS)
              </a>
            </li>
          </ul>
        </div>

        {/* Services */}
        <div>
          <h3 className="text-zinc-900 dark:text-zinc-100 font-bold text-xs uppercase tracking-widest mb-5">Our Services</h3>
          <ul className="space-y-2.5">
            {SERVICES.map(s => (
              <li key={s}>
                <Link href="/services" className="text-sm text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400 transition-colors flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-indigo-500" />
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-zinc-900 dark:text-zinc-100 font-bold text-xs uppercase tracking-widest mb-5">Contact Us</h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <svg className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Plot No 7A, Avinash Logistic Park, SKS Road, Siltara Industrial Area, Phase 2, Raipur – 493221, CG</p>
            </div>
            <div className="flex gap-3">
              <svg className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"/>
              </svg>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                <a href="tel:+919009413040" className="block hover:text-sky-600 dark:hover:text-sky-400 transition-colors">+91 9009413040 (Amit)</a>
                <a href="tel:+918966003040" className="block hover:text-sky-600 dark:hover:text-sky-400 transition-colors">+91 8966003040 (Rakesh)</a>
              </div>
            </div>
            <div className="flex gap-3">
              <svg className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <a href="mailto:info@qengineering.in" className="text-sm text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400 transition-colors">info@qengineering.in</a>
            </div>
            <div className="flex gap-3">
              <svg className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>
              </svg>
              <a href="https://www.qengineering.in" className="text-sm text-zinc-500 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-400 transition-colors">www.qengineering.in</a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-zinc-500">© {new Date().getFullYear()} Quality Engineering. All rights reserved.</p>
          <p className="text-xs text-zinc-500">BIS Certification Consultants · Raipur, Chhattisgarh, India</p>
        </div>
      </div>
    </footer>
  );
}
