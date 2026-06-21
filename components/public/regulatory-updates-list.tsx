import Link from "next/link";
import { getRegulatoryUpdates } from "@/lib/updates/get-regulatory-updates";
import type { RegulatoryUpdate } from "@/lib/updates/types";

const WA_LINK =
  "https://wa.me/919009413040?text=Hello%2C%20I%20have%20a%20query%20about%20a%20BIS%20update";
const WA_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

function isUrgent(update: RegulatoryUpdate): boolean {
  return update.tag === "QCO Alert" || /mandatory|urgent|deadline|enforcement/i.test(update.title);
}

export async function RegulatoryUpdatesList() {
  const { updates, automated, fetchedAt, message, sourcesOk, sourcesTotal } =
    await getRegulatoryUpdates();

  return (
    <>
      {automated && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 mb-8 text-sm text-emerald-800 dark:text-emerald-200">
          <p className="font-semibold mb-1">AI-automated feed</p>
          <p className="text-emerald-700 dark:text-emerald-300 text-xs leading-relaxed">
            Summarized from official sources: BIS, ISO, NABL, QCI, QAI, IQAS ·{" "}
            {sourcesOk}/{sourcesTotal} sources reachable · Last refresh:{" "}
            {new Date(fetchedAt).toLocaleString("en-IN")}
          </p>
          {message && (
            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2">{message}</p>
          )}
        </div>
      )}

      <div className="space-y-5">
        {updates.map((u) => (
          <article
            key={`${u.source}-${u.title}`}
            className={`bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border transition-shadow hover:shadow-md ${
              isUrgent(u) ? "border-red-200 dark:border-red-900" : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${u.tagColor}`}>
                {u.tag}
              </span>
              {isUrgent(u) && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-600 text-white">
                  Urgent
                </span>
              )}
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
                {u.source}
              </span>
              <span className="text-gray-400 text-xs ml-auto">{u.date}</span>
            </div>
            <h3 className="font-black text-zinc-900 dark:text-zinc-50 text-base mb-3">{u.title}</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-4">{u.desc}</p>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={u.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-sky-400 text-xs font-bold hover:underline"
              >
                View on {u.source} →
              </a>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#25D366] text-xs font-bold hover:underline"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d={WA_PATH} />
                </svg>
                Ask us about this update
              </a>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
