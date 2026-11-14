"use client";

import Image from "next/image";
import { useState } from "react";

const NAV_LINKS = [
  { href: "#preview", label: "Calendario" },
  { href: "#arquitectura", label: "Sistema" },
  { href: "#vistas", label: "Vistas MVP" },
];

export default function FluidNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0d0818]/80 backdrop-blur-xl">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6"
        >
          {/* Marca */}
          <a
            href="#"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-orange-400/40 bg-[#1a122e] shadow-[0_0_16px_rgba(249,115,22,0.35)]">
              <Image
                src="/images/mascot-pod.jpg"
                alt="Mascota UNDEFINED"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
            <span className="font-mono text-sm font-bold tracking-[0.16em] text-white">
              UNDEFINED
            </span>
          </a>

          {/* Enlaces centrados */}
          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Botón derecho outlined con brillo */}
          <div className="flex items-center gap-2">
            <a
              href="#preview"
              className="hidden rounded-lg border border-orange-400/40 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white shadow-[0_0_20px_-6px_rgba(249,115,22,0.45)] transition-all duration-300 hover:border-orange-400/80 hover:bg-orange-500/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
            >
              Ver Demo
            </a>

            {/* Hamburguesa móvil */}
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden"
            >
              <span
                className={`absolute h-[1.5px] w-4 bg-current transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  open ? "rotate-45 translate-y-0" : "-translate-y-1"
                }`}
              />
              <span
                className={`absolute h-[1.5px] w-4 bg-current transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  open ? "-rotate-45 translate-y-0" : "translate-y-1"
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Overlay móvil */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-30 flex flex-col justify-center bg-[#0d0818]/95 px-8 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div className="space-y-6">
          {NAV_LINKS.map((link, idx) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${idx * 60}ms` : "0ms" }}
              className={`block text-3xl font-semibold tracking-tight text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
