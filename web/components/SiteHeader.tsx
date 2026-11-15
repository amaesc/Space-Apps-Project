"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LITE_URL } from "../lib/api";
import { asset } from "../lib/asset";
import { DataIcon, FeatherIcon, InfoIcon, MapIcon } from "./Icons";

// Barra superior roja estilo visor de datos: marca a la izquierda, accesos a la derecha.
const LINKS = [
  { href: "/", label: "Fire Map", Icon: MapIcon },
  { href: "/data", label: "Data", Icon: DataIcon },
  { href: "/agora", label: "Agora", Icon: FeatherIcon },
  { href: "/about", label: "About", Icon: InfoIcon },
];

const ABOUT_PATHS = ["/about", "/challenge", "/how-it-works", "/team"];

export default function SiteHeader() {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const isActive = (href: string) => (href === "/about" ? ABOUT_PATHS.includes(pathname) : pathname === href);

  return (
    <header className="sticky top-0 z-[1100] border-b border-black/40 bg-fd-red shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
      <nav aria-label="Main navigation" className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-white">
          <Image
            src={asset("/images/headerImages.png")}
            alt="FireData"
            width={32}
            height={32}
            priority
            className="h-8 w-8 shrink-0 rounded object-contain"
          />
          <span className="min-w-0 leading-tight">
            <span className="block text-[1.35rem] font-bold tracking-wide text-white">FireData</span>
            <span className="hidden truncate text-xs text-white/85 sm:block">Fire Information for the Sierra de Chihuahua</span>
          </span>
        </Link>

        <ul className="flex items-center gap-0.5 sm:gap-1">
          {LINKS.map(({ href, label, Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-2 text-[15px] font-semibold sm:px-3 sm:py-1.5 ${active ? "bg-black/25 text-fd-gold" : "text-white hover:bg-black/20 hover:text-fd-gold"
                    }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            {/* Modo ligero servido por la Raspberry Pi: ~3 KB, sin JavaScript */}
            <a
              href={LITE_URL}
              title="Lite mode for poor connections (~3 KB, no JavaScript)"
              aria-label="Lite mode"
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[15px] font-semibold text-white hover:bg-black/20 hover:text-fd-gold sm:px-3"
            >
              <FeatherIcon className="h-[18px] w-[18px]" />
              <span className="hidden sm:inline">Lite</span>
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
