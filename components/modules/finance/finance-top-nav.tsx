"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FINANCE_SECTIONS,
  financeItemPath,
  findFinanceNavItem,
  type FinanceSectionId,
} from "./constants";

const linkBase =
  "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition sm:text-sm";
const linkActive =
  "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-800";
const linkIdle =
  "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white";

const tabBase =
  "relative w-full px-2 py-2.5 text-center text-xs font-semibold transition sm:px-3 sm:text-sm";
const tabActive =
  "bg-sky-50 text-sky-950 ring-1 ring-inset ring-sky-200/90 dark:bg-sky-950/40 dark:text-sky-50 dark:ring-sky-800";
const tabIdle =
  "bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white";

const PANEL_ID = "finance-section-modules";

function activeSectionFromPathname(pathname: string): FinanceSectionId | null {
  const prefix = "/dashboard/finance/";
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const parts = rest.split("/").filter(Boolean);
  if (parts.length !== 2) return null;
  const meta = findFinanceNavItem(parts[0], parts[1]);
  return meta ? meta.section.id : null;
}

export function FinanceTopNav() {
  const pathname = usePathname();
  const [activeSectionId, setActiveSectionId] = useState<FinanceSectionId>(
    FINANCE_SECTIONS[0].id,
  );
  /** Module links row: hidden until a section tab is opened (always shown on a concrete module URL). */
  const [panelExpanded, setPanelExpanded] = useState(false);

  useEffect(() => {
    const fromUrl = activeSectionFromPathname(pathname);
    if (fromUrl) {
      setActiveSectionId(fromUrl);
      setPanelExpanded(true);
      return;
    }
    if (pathname === "/dashboard/finance" || pathname === "/dashboard/finance/") {
      setPanelExpanded(false);
    }
  }, [pathname]);

  function handleSectionTabClick(sectionId: FinanceSectionId) {
    if (sectionId === activeSectionId && panelExpanded) {
      setPanelExpanded(false);
      return;
    }
    setActiveSectionId(sectionId);
    setPanelExpanded(true);
  }

  const activeSection = useMemo(
    () => FINANCE_SECTIONS.find((s) => s.id === activeSectionId) ?? FINANCE_SECTIONS[0],
    [activeSectionId],
  );

  return (
    <div className="w-full shrink-0">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div
          className={`grid grid-cols-2 bg-zinc-100/80 dark:bg-zinc-950/50 sm:grid-cols-5 ${
            panelExpanded
              ? "border-b border-zinc-200 dark:border-zinc-800"
              : ""
          }`}
          role="tablist"
          aria-label="Finance sections"
        >
          {FINANCE_SECTIONS.map((section) => {
            const selected = section.id === activeSectionId;
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-expanded={panelExpanded && selected}
                aria-controls={PANEL_ID}
                id={`finance-tab-${section.id}`}
                title={section.subtitle}
                onClick={() => handleSectionTabClick(section.id)}
                className={`${tabBase} border-zinc-200 sm:border-r sm:last:border-r-0 dark:border-zinc-800 ${
                  selected ? tabActive : tabIdle
                }`}
              >
                <span className="line-clamp-2 sm:line-clamp-none">{section.title}</span>
              </button>
            );
          })}
        </div>

        <nav
          id={PANEL_ID}
          role="tabpanel"
          hidden={!panelExpanded}
          aria-labelledby={`finance-tab-${activeSectionId}`}
          className="min-h-[3.25rem] px-2 py-3 sm:px-4"
          aria-label={`${activeSection.title} modules`}
        >
          <ul className="flex flex-wrap gap-2">
            {activeSection.items.map((item) => {
              const href = financeItemPath(activeSection.id, item.slug);
              const routeActive = pathname === href;
              return (
                <li key={item.slug}>
                  <Link
                    href={href}
                    className={`${linkBase} ${routeActive ? linkActive : linkIdle}`}
                    title={`${activeSection.title}: ${item.label} — ${item.description}`}
                  >
                    <span className="max-w-[14rem] sm:max-w-[16rem]">{item.label}</span>
                    {item.implemented ? (
                      <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                        Live
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        Soon
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
