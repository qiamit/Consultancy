import { SidebarAside } from "./sidebar-aside";

export function SidebarFallback() {
  return (
    <SidebarAside>
      <div className="flex items-start gap-2 border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <div className="h-10 min-w-0 flex-1 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <div className="flex-1 space-y-2 px-3 py-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-9 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    </SidebarAside>
  );
}
