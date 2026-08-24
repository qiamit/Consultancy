import { getBisQcoUpdates, type BisQcoUpdate } from "@backend/modules/bis/get-bis-qco-updates";

const STATUS_STYLES: Record<BisQcoUpdate["status"], { bg: string; text: string; label: string }> = {
  NEW: { bg: "bg-red-500/12 border-red-500/25",      text: "text-red-300",    label: "NEW" },
  HOT: { bg: "bg-orange-500/12 border-orange-500/25", text: "text-orange-300", label: "HOT" },
  UPD: { bg: "bg-blue-500/12 border-blue-500/25",    text: "text-blue-300",   label: "UPD" },
  ENF: { bg: "bg-rose-600/12 border-rose-500/25",    text: "text-rose-300",   label: "ENF" },
};

const SCHEME_LINKS = [
  {
    label: "Scheme I — ISI Mark",
    sub: "500+ products",
    url: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-i-mark-scheme/?lang=en",
    color: "border-blue-500/30 hover:bg-blue-500/15 hover:border-blue-400/50",
    dot: "bg-blue-400",
  },
  {
    label: "Scheme II — CRS",
    sub: "Electronics & IT",
    url: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-ii-registration-scheme/?lang=en",
    color: "border-green-500/30 hover:bg-green-500/15 hover:border-green-400/50",
    dot: "bg-green-400",
  },
  {
    label: "Conformity Assessment",
    sub: "Scheme IV",
    url: "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/scheme-4/?lang=en",
    color: "border-purple-500/30 hover:bg-purple-500/15 hover:border-purple-400/50",
    dot: "bg-purple-400",
  },
  {
    label: "Scheme X",
    sub: "Foreign Manufacturers",
    url: "https://www.bis.gov.in/products-under-compulsory-certification-scheme-x/?lang=en",
    color: "border-amber-500/30 hover:bg-amber-500/15 hover:border-amber-400/50",
    dot: "bg-amber-400",
  },
];

const UPCOMING_URL = "https://www.bis.gov.in/upcoming-qcos-notified-and-due-for-implementation/?lang=en";
const ALL_MANDATORY_URL = "https://www.bis.gov.in/product-certification/products-under-compulsory-certification/?lang=en";

export async function BisQcoUpdates() {
  const updates = await getBisQcoUpdates();

  return (
    <div className="flex-shrink-0 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        <p className="text-red-300 text-[10px] font-black uppercase tracking-widest">
          Trending QCO Updates
        </p>
        <span className="ml-auto text-white/25 text-[9px]">Daily · BIS.gov.in</span>
      </div>

      {/* Top 10 IS-wise updates */}
      <div className="space-y-1.5">
        {updates.map((u, i) => {
          const s = STATUS_STYLES[u.status];
          return (
            <a
              key={i}
              href={u.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex gap-2 items-start border rounded-lg px-2.5 py-2 transition-colors hover:brightness-110 ${s.bg}`}
            >
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-0.5">
                <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${s.bg} ${s.text}`}>
                  {s.label}
                </span>
                <span className="text-white/30 text-[8px] font-bold text-center leading-tight">{u.isCode}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white/85 text-[10px] font-bold leading-tight">{u.product}</p>
                <p className="text-white/55 text-[9px] leading-relaxed mt-0.5">{u.summary}</p>
                <p className="text-white/25 text-[8px] mt-0.5">{u.effectiveDate}</p>
              </div>
            </a>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-white/8" />

      {/* 3×2 grid: 4 schemes + 2 CTAs */}
      <div>
        <p className="text-white/35 text-[9px] font-black uppercase tracking-widest mb-2">Mandatory Lists & Quick Links</p>
        <div className="grid grid-cols-3 gap-1.5">

          {SCHEME_LINKS.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center text-center gap-1 bg-white/4 border rounded-lg px-1.5 py-2.5 transition-colors ${s.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
              <p className="text-white/85 text-[9px] font-black leading-tight">{s.label}</p>
              <p className="text-white/30 text-[8px] leading-tight">{s.sub}</p>
            </a>
          ))}

          <a
            href={ALL_MANDATORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center text-center gap-1 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 hover:border-blue-400/50 rounded-lg px-1.5 py-2.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-blue-200 text-[9px] font-black leading-tight">All Mandatory Products</p>
          </a>

          <a
            href={UPCOMING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center text-center gap-1 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 hover:border-amber-400/50 rounded-lg px-1.5 py-2.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-amber-200 text-[9px] font-black leading-tight">Upcoming QCOs</p>
          </a>

        </div>
      </div>

    </div>
  );
}
