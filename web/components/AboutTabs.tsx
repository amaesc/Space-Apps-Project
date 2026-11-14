"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/about", label: "Overview" },
  { href: "/challenge", label: "Challenge" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/team", label: "Team" },
];

/** Sub-navegación de la sección About (debajo del encabezado principal). */
export default function AboutTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="About sections" className="border-b border-white/10 bg-[#0f0b20]">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-1.5">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`block rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
