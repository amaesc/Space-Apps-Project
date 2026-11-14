"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import FlameLogo from "./FlameLogo";

// Navegación mínima y compartida: tres destinos, visibles siempre (sin menú oculto en móvil).
const LINKS = [
  { href: "/", label: "Map" },
  { href: "/data", label: "Data" },
  { href: "/about", label: "About" },
];

const ABOUT_PATHS = ["/about", "/challenge", "/how-it-works", "/team"];

export default function SiteHeader() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/about" ? ABOUT_PATHS.includes(pathname) : pathname === href;

  return (
    <header className="font-display sticky top-0 z-40 border-b border-white/10 bg-[#13122e]">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <FlameLogo size={26} />
          <span className="text-xl font-extrabold italic tracking-tight text-white">
            Fuego<span className="text-[#ff8a1f]">Data</span>
          </span>
        </Link>

        <ul className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    active
                      ? "bg-white text-[#0d0818]"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
