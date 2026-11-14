"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type AuthUser,
  fetchServerSession,
  getStoredUser,
  logoutAll,
  subscribeAuthChange,
} from "../lib/auth";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/dashboard", label: "Plataforma" },
  { href: "/funcionamiento", label: "Tecnología" },
  { href: "/reto", label: "Impacto" },
  { href: "/equipo", label: "Acerca de" },
];

export default function FluidNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    const syncUser = async () => {
      const localUser = getStoredUser();
      if (localUser) {
        if (active) setUser(localUser);
        return;
      }
      const serverUser = await fetchServerSession();
      if (active) setUser(serverUser);
    };
    void syncUser();
    const unsubscribe = subscribeAuthChange(() => {
      void syncUser();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await logoutAll();
    setUser(null);
    setOpen(false);
  };

  return (
    <>
      <header className="font-display sticky top-0 z-40 border-b border-white/10 bg-[#13122e]/85 backdrop-blur-xl">
        <nav
          aria-label="Navegación principal"
          className="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-12 lg:py-5"
        >
          {/* Marca */}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <FlameLogo />
            <span className="text-2xl font-extrabold italic tracking-tight text-white sm:text-[1.7rem]">
              Fuego<span className="text-[#ff8a1f]">Data</span>
            </span>
            <span aria-hidden="true" className="hidden h-8 w-px bg-white/30 lg:block" />
            <span className="hidden text-base font-medium text-slate-200 lg:block">
              Inteligencia Ambiental
            </span>
          </Link>

          {/* Enlaces centrados */}
          <div className="hidden items-center gap-6 md:flex lg:gap-12">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-2 text-base transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${active
                      ? "font-bold text-white"
                      : "font-medium text-slate-200 hover:text-white"
                    }`}
                >
                  {link.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-3 left-1/2 h-[3px] w-[130%] -translate-x-1/2 rounded-full bg-linear-to-r from-[#ff8a1f] to-[#f05a0a] shadow-[0_0_10px_rgba(249,115,22,0.7)]"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Auth / Usuario en desktop + hamburguesa móvil */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/dashboard"
                  className="rounded-lg border border-orange-400/40 bg-[#f97316]/15 px-3 py-1.5 text-xs font-medium text-[#fb923c] transition-colors hover:bg-[#f97316]/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Panel
                </Link>
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
                <div className="flex flex-col gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-linear-to-r from-[#f97316] to-[#ea580c] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(249,115,22,0.6)]"
                  >
                    Ir al Panel
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full cursor-pointer rounded-xl border border-white/15 bg-white/4 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Cerrar sesión
                  </button>
                </div>
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

function FlameLogo() {
  return (
    <svg width="44" height="52" viewBox="0 0 44 52" aria-hidden="true">
      <defs>
        <linearGradient id="logo-flame-outer" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#f05a0a" />
          <stop offset="0.6" stopColor="#ff7a18" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
        <linearGradient id="logo-flame-inner" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ff9a2e" />
        </linearGradient>
      </defs>
      <path
        d="M22 2 C26 10 33 14 33 22 C36 19 37 15 36 11 C41 17 43 24 43 31 C43 43 34 51 22 51 C10 51 1 43 1 31 C1 23 5 17 10 13 C10 18 12 21 15 23 C14 14 17 7 22 2 Z"
        fill="url(#logo-flame-outer)"
      />
      <path
        d="M22 22 C24 28 31 31 31 39 C31 45 27 49 22 49 C17 49 13 45 13 39 C13 35 15 32 17 30 C17 33 18 35 20 36 C19 31 20 26 22 22 Z"
        fill="url(#logo-flame-inner)"
      />
    </svg>
  );
}
