import Link from "next/link";
import type { ReactNode } from "react";
import { publicHero, publicBreadcrumb } from "@/components/public/public-theme";

export function PublicHero({
  badge,
  title,
  children,
  compact = false,
}: {
  badge: string;
  title: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`${publicHero.section} ${compact ? "!pt-[88px] !pb-14" : ""}`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className={publicHero.badge}>{badge}</div>
        <h1 className={publicHero.title}>{title}</h1>
        {children && (
          <div className={publicHero.subtitle}>{children}</div>
        )}
      </div>
    </section>
  );
}

export function PublicBreadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <div className={publicBreadcrumb.wrap}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {items.map((item, i) => (
            <span key={item.label} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {item.href ? (
                <Link href={item.href} className={publicBreadcrumb.link}>
                  {item.label}
                </Link>
              ) : (
                <span className={publicBreadcrumb.current}>{item.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
