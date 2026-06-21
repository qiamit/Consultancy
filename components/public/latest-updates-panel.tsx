import Link from "next/link";
import { getRegulatoryUpdates } from "@/lib/updates/get-regulatory-updates";
import type { RegulatoryUpdate } from "@/lib/updates/types";

function formatFetchedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function UpdateCard({ update }: { update: RegulatoryUpdate }) {
  return (
    <Link
      href={update.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 hover:border-sky-300 dark:hover:border-sky-700 rounded-xl p-3 transition-all"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${update.tagColor}`}>
          {update.tag}
        </span>
        <span className="text-gray-600 dark:text-zinc-500 text-xs">{update.date}</span>
        <span className="text-zinc-400 dark:text-zinc-600 text-[10px] ml-auto">{update.source}</span>
      </div>
      <p className="text-zinc-900 dark:text-zinc-100 text-sm font-bold leading-snug mb-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
        {update.title}
      </p>
      <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed line-clamp-2">
        {update.desc}
      </p>
    </Link>
  );
}

export async function LatestUpdatesPanel({ limit = 8 }: { limit?: number }) {
  const { updates, automated, fetchedAt } = await getRegulatoryUpdates();
  const items = updates.slice(0, limit);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-zinc-900 dark:text-zinc-50 font-bold text-sm block">
              Latest Updates
            </span>
            {automated && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 truncate block">
                AI · {formatFetchedAt(fetchedAt)}
              </span>
            )}
          </div>
        </div>
        <Link
          href="/updates"
          className="text-sky-600 dark:text-sky-400 text-xs font-semibold hover:text-sky-500 flex-shrink-0"
        >
          View all →
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {items.map((update) => (
          <UpdateCard key={`${update.source}-${update.title}`} update={update} />
        ))}
      </div>
    </>
  );
}

export function LatestUpdatesSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 animate-pulse" />
          <span className="text-zinc-900 dark:text-zinc-50 font-bold text-sm">Latest Updates</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 animate-pulse"
          >
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
            <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-1.5" />
            <div className="h-2 w-11/12 bg-zinc-200 dark:bg-zinc-700 rounded" />
          </div>
        ))}
      </div>
    </>
  );
}
