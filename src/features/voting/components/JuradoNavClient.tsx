"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: string;
  iconColor: string;
  activeIconColor?: string;
  /** Routes (besides href) that activate this item, e.g. detail pages. */
  matchPrefixes?: string[];
  /** Only active on exact href match (used for the menu root). */
  exactOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/jurado",
    label: "Menú",
    icon: "grid_view",
    iconColor: "text-tertiary",
    exactOnly: true,
  },
  {
    href: "/jurado/danzas",
    label: "Danzas",
    icon: "format_list_bulleted",
    iconColor: "text-tertiary",
    matchPrefixes: ["/jurado/danza"],
  },
  {
    href: "/jurado/calificar",
    label: "Emitir Voto",
    shortLabel: "Votar",
    icon: "how_to_vote",
    iconColor: "text-tertiary",
  },
  {
    href: "/jurado/mis-calificaciones",
    label: "Mis Votos",
    icon: "fact_check",
    iconColor: "text-secondary",
  },
  {
    href: "/jurado/credencial",
    label: "Mi Mesa",
    icon: "badge",
    iconColor: "text-primary",
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exactOnly) return pathname === item.href;
  return (
    pathname === item.href ||
    pathname.startsWith(item.href + "/") ||
    (item.matchPrefixes?.some((m) => pathname === m || pathname.startsWith(m + "/")) ?? false)
  );
}

function isItemActive(item: NavItem, pathname: string): boolean {
  return isActive(pathname, item);
}

export function JuradoNavDesktop() {
  const pathname = usePathname();

  return (
    <div className="hidden sm:flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-display font-semibold text-tertiary bg-tertiary/10 border border-tertiary/30 hover:bg-tertiary/20 transition-colors shadow-sm"
                : "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-display font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
            }
          >
            <span
              className={`ms text-lg ${item.iconColor}`}
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function JuradoNavMobile() {
  const pathname = usePathname();

  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 glass-strong border-t border-outline-variant/20 z-50 px-2 py-2">
      <div className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-tertiary bg-tertiary/15 border border-tertiary/30 shadow-sm"
                  : "flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-lg text-on-surface hover:bg-surface-container-high transition-colors"
              }
            >
              <span
                className={`ms text-xl ${active ? "text-tertiary" : item.iconColor}`}
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className={`text-[10px] font-display ${active ? "font-extrabold" : "font-semibold"}`}>
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
