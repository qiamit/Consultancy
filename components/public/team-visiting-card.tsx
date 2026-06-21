type TeamVisitingCardProps = {
  name: string;
  role: string;
  expertise: string[];
  phone: string;
  whatsapp: string;
  email: string;
  initial: string;
  accent?: "sky" | "indigo";
  compact?: boolean;
  className?: string;
};

const ACCENT = {
  sky: {
    header: "from-sky-600 via-sky-500 to-indigo-600",
    bar: "from-sky-600 to-indigo-600",
    ring: "ring-sky-100 dark:ring-sky-900/50",
    avatar: "from-sky-500 to-indigo-600",
    chip: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  indigo: {
    header: "from-indigo-600 via-indigo-500 to-violet-600",
    bar: "from-indigo-600 to-violet-600",
    ring: "ring-indigo-100 dark:ring-indigo-900/50",
    avatar: "from-indigo-500 to-violet-600",
    chip: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  },
};

function IconPhone({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"
      />
    </svg>
  );
}

function IconWhatsApp({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function TeamVisitingCard({
  name,
  role,
  expertise,
  phone,
  whatsapp,
  initial,
  accent = "sky",
  compact = false,
  className = "",
}: TeamVisitingCardProps) {
  const theme = ACCENT[accent];
  const tel = phone.replace(/\s/g, "");
  const waText = encodeURIComponent(`Hello ${name}, I need consultation from Quality Engineering.`);

  if (compact) {
    return (
      <article
        className={`overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900 ${className}`}
      >
        {/* Gradient header bar */}
        <div className={`relative bg-gradient-to-r ${theme.header} px-3 py-2.5`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_55%)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/80">Quality Engineering</p>
              <p className="text-[8px] text-white/60 tracking-wide">Certification Consultants · Raipur</p>
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
              <span className="text-[10px] font-black text-white">QE</span>
            </div>
          </div>
        </div>

        <div className="p-3 flex flex-col gap-2.5">
          {/* Identity row */}
          <div className="flex items-center gap-2.5">
            <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.avatar} text-xs font-black text-white shadow-md`}>
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 leading-tight">{name}</h3>
              <p className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 mt-0.5">{role}</p>
              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">{phone}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-700 to-transparent" />

          {/* Expertise chips */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1.5">Services & Expertise</p>
            <div className="flex flex-wrap gap-1">
              {expertise.map(item => (
                <span key={item} className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${theme.chip}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <a
              href={`tel:${tel}`}
              className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 text-[10px] font-bold text-zinc-700 transition-colors hover:border-sky-300 hover:text-sky-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:text-sky-400"
            >
              <IconPhone /> Call
            </a>
            <a
              href={`https://wa.me/${whatsapp}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
            >
              <IconWhatsApp /> WhatsApp
            </a>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-md shadow-zinc-900/5 ring-1 ${theme.ring} transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-700/80 dark:bg-zinc-900 dark:shadow-black/20 ${className}`}
    >
      <div className={`relative bg-gradient-to-r ${theme.header} px-4 py-3`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="relative flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/80">
              Quality Engineering
            </p>
            <p className="truncate text-[8px] font-semibold uppercase tracking-[0.14em] text-white/65">
              Certification Consultants · Raipur
            </p>
          </div>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <span className="text-[11px] font-black text-white">QE</span>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-3.5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.avatar} text-sm font-black text-white shadow-md`}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-base font-extrabold leading-tight text-zinc-900 dark:text-zinc-50">{name}</h3>
            <p className="mt-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">{role}</p>
          </div>
        </div>

        <div className="my-3 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-700" />

        <div className="flex flex-wrap gap-1">
          {expertise.map((item) => (
            <span
              key={item}
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${theme.chip}`}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <a
            href={`tel:${tel}`}
            className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 hover:text-sky-600 dark:border-zinc-700 dark:text-zinc-300"
          >
            <IconPhone />
            {phone}
          </a>
          <a
            href={`https://wa.me/${whatsapp}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
          >
            <IconWhatsApp />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}
