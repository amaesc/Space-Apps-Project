import type { CSSProperties } from "react";
import Image from "next/image";
import FluidNav from "../components/FluidNav";
import HeroHarmonizationPreview from "../components/HeroHarmonizationPreview";
import Reveal from "../components/Reveal";

const IOT_SPECS = [
  "ESP32 (WiFi / LoRa)",
  "BME280 (Temp y HR)",
  "Viento y lluvia",
  "Rayos AS3935",
  "Pantalla + 5 LEDs",
  "Panel solar",
];

const PORTAL_FLAMES = [
  { left: "22%", size: "h-7 w-3", delay: "0s", duration: "2.4s", drift: "-10px", tone: "from-amber-300 via-[#f97316] to-transparent" },
  { left: "30%", size: "h-10 w-4", delay: "0.45s", duration: "2.8s", drift: "12px", tone: "from-yellow-200 via-[#fb923c] to-transparent" },
  { left: "38%", size: "h-8 w-3.5", delay: "1.1s", duration: "2.3s", drift: "-8px", tone: "from-amber-300 via-[#ea580c] to-transparent" },
  { left: "46%", size: "h-12 w-5", delay: "0.2s", duration: "3.0s", drift: "9px", tone: "from-yellow-200 via-[#f97316] to-transparent" },
  { left: "53%", size: "h-11 w-4", delay: "0.85s", duration: "2.6s", drift: "-12px", tone: "from-amber-200 via-[#fb923c] to-transparent" },
  { left: "61%", size: "h-9 w-3.5", delay: "1.4s", duration: "2.5s", drift: "11px", tone: "from-amber-300 via-[#f97316] to-transparent" },
  { left: "69%", size: "h-8 w-3", delay: "0.6s", duration: "2.7s", drift: "-9px", tone: "from-yellow-200 via-[#ea580c] to-transparent" },
  { left: "77%", size: "h-6 w-2.5", delay: "1.7s", duration: "2.2s", drift: "8px", tone: "from-amber-300 via-[#f97316] to-transparent" },
  { left: "35%", size: "h-2 w-2", delay: "0.3s", duration: "2.1s", drift: "16px", tone: "from-yellow-200 via-amber-400 to-transparent" },
  { left: "58%", size: "h-2 w-2", delay: "1.25s", duration: "2.0s", drift: "-15px", tone: "from-amber-200 via-[#fb923c] to-transparent" },
];

const PLATFORM_VIEWS = [
  { name: "Mapa interactivo", status: "MVP", desc: "Área de interés, puntos por origen y riesgo." },
  { name: "Calendario de quema", status: "MVP", desc: "Años × meses con filtro total, natural o humano." },
  { name: "Panel del área", status: "MVP", desc: "Mes actual vs. mediana, anomalías y alertas." },
  { name: "Descargas CSV", status: "MVP", desc: "Serie armonizada con incertidumbre y sensor." },
  { name: "Ficha de punto", status: "Fase 2", desc: "Probabilidad de origen y razones principales." },
  { name: "Metodología", status: "Fase 2", desc: "Validación leave-year-out y calibración FWI." },
];

const TEAM_ROLES = [
  {
    code: "01",
    role: "Ciencia de Datos & FIRMS",
    name: "Integrante 1",
    focus: "Armonización MODIS / VIIRS, factor kₘ y validación bootstrap.",
    accent: "text-[#fb923c]",
  },
  {
    code: "02",
    role: "Hardware IoT & ESP32",
    name: "Integrante 2",
    focus: "Estación en campo (BME280, AS3935), LoRa/WiFi y telemetría.",
    accent: "text-sky-300",
  },
  {
    code: "03",
    role: "Frontend & Visualización",
    name: "Integrante 3",
    focus: "Calendario interactivo, mapas de riesgo y experiencia de usuario.",
    accent: "text-violet-300",
  },
  {
    code: "04",
    role: "Backend & Geoespacial",
    name: "Integrante 4",
    focus: "Integración CONAFOR, GOES-GLM, Open-Meteo y API de datos.",
    accent: "text-amber-300",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh bg-[#0d0818] text-[#f4f6f8]">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-black"
      >
        Saltar al contenido principal
      </a>

      <div
        aria-hidden="true"
        className="noise-overlay pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
      />

      <FluidNav />

      <main id="contenido-principal">
        {/* 1. HERO */}
        <section className="relative overflow-hidden border-b border-white/6 bg-linear-to-b from-[#09081b] via-[#130d2e] to-[#0d0818]">
          {/* Cielo nocturno: estrellas y resplandor cálido de horizonte */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.65) 50%, transparent 100%), radial-gradient(1.2px 1.2px at 26% 12%, rgba(196,181,253,0.7) 50%, transparent 100%), radial-gradient(1px 1px at 42% 24%, rgba(255,255,255,0.5) 50%, transparent 100%), radial-gradient(1.5px 1.5px at 58% 10%, rgba(254,240,138,0.75) 50%, transparent 100%), radial-gradient(1px 1px at 74% 20%, rgba(255,255,255,0.6) 50%, transparent 100%), radial-gradient(1.3px 1.3px at 88% 14%, rgba(186,230,253,0.7) 50%, transparent 100%), radial-gradient(1px 1px at 18% 38%, rgba(255,255,255,0.4) 50%, transparent 100%), radial-gradient(1px 1px at 66% 34%, rgba(255,255,255,0.45) 50%, transparent 100%), radial-gradient(1.2px 1.2px at 92% 36%, rgba(196,181,253,0.55) 50%, transparent 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-6 top-16 h-96 w-96 rounded-full bg-[#f97316]/20 blur-3xl"
          />

          {/* Silueta nocturna de sierra y bosque de pinos */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-56 sm:h-64"
          >
            <svg
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              className="h-full w-full"
            >
              <path
                d="M0,210 L130,155 L260,198 L400,130 L550,190 L700,140 L850,188 L990,122 L1150,180 L1300,136 L1440,182 L1440,320 L0,320 Z"
                fill="#110d29"
                fillOpacity="0.85"
              />
              <path
                d="M0,245 L90,210 L180,235 L290,190 L420,235 L560,195 L710,240 L860,195 L1010,235 L1160,185 L1310,230 L1440,200 L1440,320 L0,320 Z"
                fill="#0b091c"
                fillOpacity="0.95"
              />
              <path
                d="M0,320 L0,270 L18,242 L34,270 L46,270 L64,230 L82,270 L96,270 L114,244 L132,270 L156,270 L178,225 L200,270 L220,270 L240,248 L260,270 L295,270 L315,236 L335,270 L365,270 L385,250 L405,270 L460,270 L482,238 L504,270 L550,270 L570,248 L590,270 L660,270 L682,235 L704,270 L760,270 L780,246 L800,270 L865,270 L888,228 L911,270 L950,270 L972,245 L994,270 L1045,270 L1068,232 L1091,270 L1135,270 L1158,242 L1181,270 L1225,270 L1248,226 L1271,270 L1315,270 L1338,240 L1361,270 L1395,270 L1418,234 L1440,270 L1440,320 Z"
                fill="#070512"
              />
            </svg>
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 lg:pb-18 lg:pt-16">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              {/* Columna izquierda: copy y CTAs */}
              <Reveal className="lg:col-span-6">
                <div>
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
                    INTELIGENCIA SATELITAL + IoT + ANÁLISIS AMBIENTAL
                  </p>

                  <h1 className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-5xl lg:text-[3.25rem]">
                    El fuego deja huellas.{" "}
                    <span className="block bg-linear-to-r from-[#fb923c] via-[#f97316] to-amber-300 bg-clip-text text-transparent">
                      La tecnología las conecta.
                    </span>
                  </h1>

                  <div
                    aria-hidden="true"
                    className="mt-5 h-[3px] w-28 rounded-full bg-linear-to-r from-[#f97316] to-amber-400 shadow-[0_0_16px_rgba(249,115,22,0.7)]"
                  />

                  <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-slate-300">
                    25 años de registros satelitales{" "}
                    <span className="font-mono text-sm text-sky-300">MODIS</span>{" "}
                    y{" "}
                    <span className="font-mono text-sm text-amber-300">
                      VIIRS
                    </span>
                    , integrados con sensores IoT y datos meteorológicos para
                    identificar patrones de actividad térmica y estimar su
                    origen probable.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    <a
                      href="#preview"
                      className="inline-flex items-center gap-2.5 rounded-xl bg-linear-to-r from-[#f97316] to-[#ea580c] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_28px_-4px_rgba(249,115,22,0.75)] transition-all duration-300 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <span>Explorar calendario</span>
                    </a>

                    <a
                      href="#arquitectura"
                      className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-100 backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polygon points="10 8 16 12 10 16 10 8" />
                      </svg>
                      <span>Conocer la tecnología</span>
                    </a>
                  </div>
                </div>
              </Reveal>

              {/* Columna derecha: Satélite + Laptop con mapa + Estación IoT + Mascota */}
              <Reveal delayMs={120} className="lg:col-span-6">
                <div className="relative mx-auto flex h-88 max-w-lg items-end justify-center sm:h-96">
                  {/* Satélite superior con haz de luz */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute right-14 top-0 z-20 flex flex-col items-center sm:right-20"
                  >
                    <svg
                      width="78"
                      height="44"
                      viewBox="0 0 90 50"
                      fill="none"
                      className="drop-shadow-[0_0_14px_rgba(167,139,250,0.45)]"
                    >
                      <rect x="4" y="14" width="24" height="14" rx="2" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.2" />
                      <rect x="62" y="14" width="24" height="14" rx="2" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.2" />
                      <rect x="35" y="10" width="20" height="22" rx="3" fill="#1e1b4b" stroke="#c4b5fd" strokeWidth="1.5" />
                      <circle cx="45" cy="36" r="4" fill="#fb923c" />
                    </svg>
                    <div className=" -mt-1 h-16 w-28 bg-linear-to-b from-[#fb923c]/35 via-amber-400/10 to-transparent [clip-path:polygon(42%_0%,58%_0%,100%_100%,0%_100%)]" />
                  </div>

                  {/* Estación IoT izquierda */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-12 left-0 z-20 hidden sm:block"
                  >
                    <svg width="74" height="118" viewBox="0 0 80 125" fill="none">
                      <path d="M24 30 C32 20, 48 20, 56 30" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                      <path d="M30 37 C35 30, 45 30, 50 37" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
                      <rect x="38" y="42" width="4" height="72" rx="2" fill="#334155" />
                      <path d="M18 54 H60" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="18" cy="54" r="4" fill="#94a3b8" />
                      <polygon points="48,54 70,48 66,64 44,68" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
                      <rect x="31" y="74" width="18" height="22" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
                    </svg>
                  </div>

                  {/* Laptop con mapa de focos de calor */}
                  <div className="relative z-10 mb-8 w-[84%] max-w-[390px] sm:mr-10">
                    <div className="overflow-hidden rounded-2xl border border-violet-300/25 bg-[#0c0a1e]/95 p-3 shadow-[0_24px_60px_-12px_rgba(15,10,40,0.95)]">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-orange-400/80" />
                          <span className="h-2 w-2 rounded-full bg-violet-400/70" />
                          <span className="h-2 w-2 rounded-full bg-sky-400/70" />
                        </div>
                        <span className="font-mono text-[9px] text-slate-400">
                          MODIS + VIIRS · CHIH / MX
                        </span>
                      </div>

                      <div className="mt-2.5 grid grid-cols-12 gap-2.5">
                        {/* Mapa estilizado */}
                        <div className="relative col-span-8 h-36 overflow-hidden rounded-xl border border-white/[0.06] bg-[#080716]">
                          <svg
                            viewBox="0 0 220 140"
                            className="h-full w-full"
                            fill="none"
                          >
                            <path
                              d="M36 22 L78 18 L92 38 L120 48 L142 74 L176 70 L188 86 L162 104 L134 102 L106 118 L78 96 L56 66 L34 44 Z"
                              fill="#161436"
                              stroke="#6366f1"
                              strokeOpacity="0.6"
                              strokeWidth="1.5"
                            />
                            <circle cx="84" cy="46" r="10" fill="#f97316" fillOpacity="0.25" />
                            <circle cx="84" cy="46" r="4" fill="#fb923c" />
                            <circle cx="116" cy="86" r="14" fill="#f97316" fillOpacity="0.3" />
                            <circle cx="116" cy="86" r="5" fill="#fde047" />
                            <circle cx="144" cy="84" r="9" fill="#fb923c" fillOpacity="0.25" />
                            <circle cx="144" cy="84" r="3.5" fill="#f97316" />
                            <circle cx="164" cy="78" r="3" fill="#fb923c" />
                          </svg>
                        </div>

                        {/* Mini gráfica de barras */}
                        <div className="col-span-4 flex flex-col justify-between rounded-xl border border-white/[0.06] bg-[#0f0c24] p-2.5">
                          <span className="font-mono text-[8px] uppercase text-slate-400">
                            Tendencia
                          </span>
                          <div className="flex h-20 items-end gap-1.5">
                            {[38, 62, 48, 84, 58, 92].map((h, i) => (
                              <span
                                key={i}
                                style={{ height: `${h}%` }}
                                className={`w-full rounded-t-sm ${i >= 3
                                  ? "bg-linear-to-t from-[#ea580c] to-amber-300"
                                  : "bg-violet-500/60"
                                  }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Barras inferiores de telemetría */}
                      <div className="mt-2.5 space-y-1.5">
                        <div className="h-1.5 w-3/4 rounded-full bg-linear-to-r from-[#f97316] to-amber-400/70" />
                        <div className="h-1.5 w-1/2 rounded-full bg-violet-400/40" />
                      </div>
                    </div>
                    {/* Base de la laptop */}
                    <div className="mx-auto h-2.5 w-[106%] -ml-[3%] rounded-b-xl border-t border-white/15 bg-linear-to-r from-slate-700 via-slate-500 to-slate-700 shadow-lg" />
                  </div>

                  {/* Flamas ascendentes + Mascota en primer plano derecho */}
                  <div className="relative z-20 -ml-20 mb-2 flex h-52 w-44 shrink-0 items-end justify-center sm:-ml-24 sm:h-60 sm:w-52">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-2 bottom-2 top-0 overflow-hidden"
                    >
                      <div className="portal-plume absolute inset-x-4 bottom-0 h-36 rounded-full bg-linear-to-t from-[#f97316]/35 via-amber-400/15 to-transparent blur-xl" />
                      {PORTAL_FLAMES.slice(0, 6).map((flame, idx) => (
                        <span
                          key={idx}
                          style={
                            {
                              left: flame.left,
                              animationDelay: flame.delay,
                              "--flame-duration": flame.duration,
                              "--flame-drift": flame.drift,
                            } as CSSProperties
                          }
                          className={`portal-flame-particle absolute bottom-1 ${flame.size} rounded-full bg-linear-to-t ${flame.tone} blur-[1px]`}
                        />
                      ))}
                    </div>

                    <div className="relative z-10 h-48 w-40 drop-shadow-[0_14px_30px_rgba(249,115,22,0.45)] sm:h-56 sm:w-48">
                      <Image
                        src="/images/mascot-wave.png"
                        alt="Mascota UNDEFINED saludando"
                        fill
                        sizes="(max-width: 640px) 160px, 192px"
                        className="object-contain"
                        priority
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* 3 Tarjetas flotantes inferiores */}
            <Reveal delayMs={180}>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Memoria satelital",
                    line1: "MODIS + VIIRS (2000 – 2026)",
                    line2: "Serie histórica armonizada",
                    href: "#preview",
                    border: "border-orange-400/35 hover:border-orange-400/70",
                    iconBg: "bg-[#f97316]/15 text-[#fb923c] border-orange-400/30",
                    icon: (
                      <path d="M13 7 9 3 5 7l4 4m8 6 4-4-4-4-4 4m-5-1 6 6M3 21l6-6" />
                    ),
                  },
                  {
                    title: "Monitoreo ambiental",
                    line1: "Estaciones IoT",
                    line2: "Datos y respaldo meteorológico",
                    href: "#arquitectura",
                    border: "border-violet-400/35 hover:border-violet-400/70",
                    iconBg: "bg-violet-500/15 text-violet-300 border-violet-400/30",
                    icon: (
                      <>
                        <path d="M12 20v-8" />
                        <path d="M8.5 16.5a5 5 0 0 1 0-7" />
                        <path d="M15.5 16.5a5 5 0 0 0 0-7" />
                        <path d="M5 19a9 9 0 0 1 0-12" />
                        <path d="M19 19a9 9 0 0 0 0-12" />
                        <circle cx="12" cy="10" r="1.5" />
                      </>
                    ),
                  },
                  {
                    title: "Análisis del origen",
                    line1: "Evidencia integrada",
                    line2: "Hipótesis y nivel de confianza",
                    href: "#vistas",
                    border: "border-amber-400/35 hover:border-amber-400/70",
                    iconBg: "bg-amber-500/15 text-amber-300 border-amber-400/30",
                    icon: (
                      <>
                        <circle cx="11" cy="11" r="7" />
                        <path d="m21 21-4.3-4.3" />
                        <path d="M11 8v6M8 11h6" />
                      </>
                    ),
                  },
                ].map((card) => (
                  <a
                    key={card.title}
                    href={card.href}
                    className={`group flex items-center gap-4 rounded-2xl border ${card.border} bg-[#120d26]/85 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#171132]/90`}
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${card.iconBg}`}
                    >
                      <svg
                        aria-hidden="true"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {card.icon}
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-white transition-colors group-hover:text-[#fb923c]">
                        {card.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-300">
                        {card.line1}
                      </p>
                      <p className="text-xs text-slate-400">{card.line2}</p>
                    </div>
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* 2. DEMO INTERACTIVA */}
        <section
          id="preview"
          className="relative overflow-hidden border-b border-white/6 bg-[#110a20]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-violet-600/15 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-20">
            <Reveal className="lg:col-span-5">
              <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                El reto · Demostración interactiva
              </span>
              <h2 className="mt-4 text-balance text-3xl font-bold uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl">
                POR QUÉ{" "}
                <span className="bg-linear-to-r from-[#fb923c] to-amber-300 bg-clip-text text-transparent">
                  ARMONIZAR
                </span>{" "}
                MODIS Y VIIRS
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                Alterna entre <strong className="text-white">Sin armonizar</strong>{" "}
                y <strong className="text-white">Armonizado</strong> para ver
                cómo se corrige la brecha entre sensores, y haz clic en
                cualquier mes de la matriz.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="rounded-xl border border-white/10 bg-[#161028]/80 p-3.5">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                    Calibración
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#fb923c]">
                    Factor kₘ + IC
                  </span>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#161028]/80 p-3.5">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                    Validación
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-violet-300">
                    Leave-year-out
                  </span>
                </div>
              </div>
            </Reveal>

            <Reveal delayMs={100} className="lg:col-span-7">
              <HeroHarmonizationPreview />
            </Reveal>
          </div>
        </section>

        {/* 3. SISTEMA (Bento compacto: Armonización + IoT + Origen) */}
        <section
          id="arquitectura"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"
        >
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                  Sistema UNDEFINED
                </span>
                <h2 className="mt-3 text-balance text-3xl font-bold uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl">
                  Tres módulos{" "}
                  <span className="bg-linear-to-r from-[#fb923c] to-violet-400 bg-clip-text text-transparent">
                    acoplados
                  </span>
                </h2>
              </div>
              <p className="max-w-md text-sm text-slate-400">
                Caso piloto en la Sierra de Chihuahua, con respaldo automático
                de Open-Meteo y GOES-GLM fuera de cobertura IoT.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Armonización */}
            <Reveal className="lg:col-span-7">
              <div className="relative h-full rounded-[1.75rem] border border-violet-400/20 bg-white/3 p-1.5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-linear-to-r from-transparent via-[#f97316] to-transparent opacity-75"
                />
                <div className="flex h-full flex-col justify-between overflow-hidden rounded-[1.375rem] bg-[#140d24] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
                  <div className="relative mb-5 h-40 w-full overflow-hidden rounded-2xl border border-white/10">
                    <Image
                      src="/images/processing-data.jpg"
                      alt="Armonización MODIS y VIIRS"
                      fill
                      sizes="(max-width: 1024px) 100vw, 600px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#140d24] via-transparent to-transparent" />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      Armonización MODIS → VIIRS
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      Factor mensual <span className="font-mono text-white">kₘ</span>{" "}
                      calibrado en traslape (2012–2026) con intervalos por{" "}
                      <strong className="text-white">bootstrap</strong> y
                      descarga CSV.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Origen probable */}
            <Reveal delayMs={80} className="lg:col-span-5">
              <div className="relative h-full rounded-[1.75rem] border border-violet-400/20 bg-white/3 p-1.5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-linear-to-r from-transparent via-violet-400 to-transparent opacity-75"
                />
                <div className="flex h-full flex-col justify-between rounded-[1.375rem] bg-[#140d24] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
                  <div>
                    <div className="relative mb-5 h-40 w-full overflow-hidden rounded-2xl border border-white/10">
                      <Image
                        src="/images/fire-active.jpg"
                        alt="Evaluación de origen probable del incendio"
                        fill
                        sizes="(max-width: 1024px) 100vw, 420px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-[#140d24] via-transparent to-transparent" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      Origen probable y alertas
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      LightGBM + Regresión Logística con CONAFOR, GOES-GLM y
                      polígonos CONANP para priorizar inspecciones.
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-[#0d0818] px-3.5 py-2.5 font-mono text-xs text-amber-300">
                    Ej: 82% humano · Sin rayos 5d · 400 m de camino
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Estación IoT + Resiliencia en una sola fila limpia */}
            <Reveal delayMs={140} className="lg:col-span-12">
              <div className="relative rounded-[1.75rem] border border-violet-400/20 bg-white/3 p-1.5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-linear-to-r from-transparent via-sky-400 to-transparent opacity-75"
                />
                <div className="grid items-center gap-6 rounded-[1.375rem] bg-[#140d24] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <h3 className="text-xl font-semibold text-white">
                      Estación IoT en campo + Resiliencia
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      Calcula <strong className="text-white">Hot-Dry-Windy</strong>{" "}
                      y tormentas secas en sitio. Si pierde señal, cambia a
                      Open-Meteo y GOES-GLM automáticamente.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] text-sky-300">
                      {IOT_SPECS.map((spec) => (
                        <span
                          key={spec}
                          className="rounded-lg border border-white/10 bg-[#0d0818] px-2.5 py-1"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:col-span-7">
                    <div className="rounded-2xl border border-white/10 bg-[#0d0818] p-2">
                      <div className="relative aspect-video overflow-hidden rounded-xl">
                        <Image
                          src="/images/mascot-pod.jpg"
                          alt="Estación IoT activa"
                          fill
                          sizes="(max-width: 1024px) 50vw, 280px"
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-2 px-1 font-mono text-[11px] text-violet-300">
                        Telemetría ESP32 activa
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#0d0818] p-2">
                      <div className="relative aspect-video overflow-hidden rounded-xl">
                        <Image
                          src="/images/error-frozen.jpg"
                          alt="Respaldo automático sin señal"
                          fill
                          sizes="(max-width: 1024px) 50vw, 280px"
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-2 px-1 font-mono text-[11px] text-sky-300">
                        Fallback Open-Meteo / GLM
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 4. VISTAS MVP */}
        <section
          id="vistas"
          className="border-t border-white/6 bg-[#110a20]"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                    Roadmap del producto
                  </span>
                  <h2 className="mt-3 text-balance text-3xl font-bold uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl">
                    Las{" "}
                    <span className="bg-linear-to-r from-[#fb923c] to-violet-400 bg-clip-text text-transparent">
                      6 vistas
                    </span>{" "}
                    del sistema
                  </h2>
                </div>
                <span className="rounded-full border border-violet-400/20 bg-[#140d24] px-4 py-1.5 font-mono text-xs text-slate-300">
                  Caso piloto: Sierra de Chihuahua
                </span>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORM_VIEWS.map((view, idx) => (
                <Reveal key={view.name} delayMs={idx * 50}>
                  <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-[#140d24] p-5 transition-colors hover:border-orange-400/40">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {view.name}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] ${view.status === "MVP"
                          ? "bg-[#f97316]/15 text-[#fb923c]"
                          : "bg-white/6 text-slate-300"
                          }`}
                      >
                        {view.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      {view.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 5. EQUIPO */}
        <section
          id="equipo"
          className="border-t border-white/6 bg-[#0d0818]"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                    Equipo UNDEFINED · NASA Space Apps 2026
                  </span>
                  <h2 className="mt-3 text-balance text-3xl font-bold uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl">
                    Construyendo desde{" "}
                    <span className="bg-linear-to-r from-[#fb923c] to-violet-400 bg-clip-text text-transparent">
                      Chihuahua
                    </span>
                  </h2>
                </div>
                <span className="rounded-full border border-violet-400/20 bg-[#140d24] px-4 py-1.5 font-mono text-xs text-slate-300">
                  Sede: Chihuahua, Chih.
                </span>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TEAM_ROLES.map((member, idx) => (
                <Reveal key={member.code} delayMs={idx * 60}>
                  <div className="relative h-full overflow-hidden rounded-2xl border border-violet-400/20 bg-[#140d24] p-5 transition-colors hover:border-orange-400/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-mono text-xs font-bold ${member.accent}`}>
                        {member.code}
                      </span>
                      <span className="rounded-full border border-white/10 bg-[#0d0818] px-2.5 py-0.5 font-mono text-[10px] text-slate-400">
                        UNDEFINED
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-white">
                      {member.name}
                    </h3>
                    <p className={`mt-0.5 font-mono text-[11px] ${member.accent}`}>
                      {member.role}
                    </p>
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
                      {member.focus}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/6 bg-[#0d0818]">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-4 py-8 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
          <div>
            <span className="font-mono font-semibold text-slate-300">
              UNDEFINED
            </span>{" "}
            · NASA Space Apps Challenge 2026 · Chihuahua, Chih.
          </div>
          <p className="max-w-md sm:text-right">
            Estimaciones probabilísticas por zona para priorizar inspecciones; no
            constituyen prueba legal ni señalan predios o personas.
          </p>
        </div>
      </footer>
    </div>
  );
}
