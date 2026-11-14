"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type AuthUser,
  clearStoredUser,
  getStoredUser,
  subscribeAuthChange,
} from "../lib/auth";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#preview", label: "Reto" },
  { href: "/#arquitectura", label: "Funcionamiento" },
  { href: "/#equipo", label: "Equipo" },
];

export default function FluidNav() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    syncUser();
    return subscribeAuthChange(syncUser);
  }, []);

  const handleLogout = () => {
    clearStoredUser();
    setOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/6 bg-[#0d0818]/80 backdrop-blur-xl">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6"
        >
          {/* Marca */}
          <Link
            href="/"
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
          </Link>

          {/* Enlaces centrados */}
          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth / Usuario en desktop + hamburguesa móvil */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex items-center gap-2 rounded-lg border border-violet-400/25 bg-white/3 px-2.5 py-1.5">
                  <span
                    aria-hidden="true"
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-[#f97316] to-[#ea580c] font-mono text-[10px] font-bold uppercase text-white"
                  >
                    {user.name.slice(0, 1)}
                  </span>
                  <span className="max-w-30 truncate text-xs font-medium text-slate-200">
                    {user.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/3 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:bg-white/7 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden rounded-lg border border-orange-400/40 bg-white/3 px-4 py-2 text-xs font-medium text-white shadow-[0_0_20px_-6px_rgba(249,115,22,0.45)] transition-all duration-300 hover:border-orange-400/80 hover:bg-orange-500/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
              >
                Iniciar sesión
              </Link>
            )}

            {/* Hamburguesa móvil */}
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-expanded={open}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/4 text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden"
            >
              <span
                className={`absolute h-[1.5px] w-4 bg-current transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "rotate-45 translate-y-0" : "-translate-y-1"
                  }`}
              />
              <span
                className={`absolute h-[1.5px] w-4 bg-current transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "-rotate-45 translate-y-0" : "translate-y-1"
                  }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Overlay móvil */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-30 flex flex-col justify-center bg-[#0d0818]/95 px-8 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
          }`}
      >
        <div className="space-y-6">
          {NAV_LINKS.map((link, idx) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: open ? `${idx * 60}ms` : "0ms" }}
              className={`block text-3xl font-semibold tracking-tight text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="border-t border-white/10 pt-6">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-[#f97316] to-[#ea580c] font-mono text-sm font-bold uppercase text-white"
                  >
                    {user.name.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-white">
                      {user.name}
                    </p>
                    <p className="font-mono text-xs text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full cursor-pointer rounded-xl border border-white/15 bg-white/4 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Cerrar sesión
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center rounded-xl bg-linear-to-r from-[#f97316] to-[#ea580c] px-5 py-3 text-base font-semibold text-white shadow-[0_0_28px_-4px_rgba(249,115,22,0.7)]"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
