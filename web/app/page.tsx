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
        <section className="relative overflow-hidden border-b border-white/6 bg-linear-to-b from-[#130b24] via-[#0e091b] to-[#0d0818]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-1/4 h-112 w-md rounded-full bg-violet-600/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-10 top-16 h-88 w-88 rounded-full bg-[#f97316]/15 blur-3xl"
          />

          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 lg:pb-20 lg:pt-16">
            <div className="grid items-center gap-12 lg:grid-cols-12">
              <Reveal className="lg:col-span-6">
                <div>
                  <h1 className="text-balance text-4xl font-bold uppercase leading-[1.03] tracking-[-0.02em] text-white sm:text-5xl lg:text-[3.5rem]">
                    <span className="bg-linear-to-r from-[#fb923c] via-[#f97316] to-amber-300 bg-clip-text text-transparent">
                      ARMONIZA EL FUEGO
                    </span>{" "}
                    <span className="block text-white">
                      EN UN SOLO{" "}
                      <span className="bg-linear-to-r from-[#fb923c] to-[#ea580c] bg-clip-text text-transparent">
                        CALENDARIO
                      </span>
                    </span>
                  </h1>

                  <p className="mt-5 max-w-[44ch] text-base leading-relaxed text-slate-300 sm:text-lg">
                    25 años de puntos calientes{" "}
                    <span className="font-mono text-sm text-sky-300">MODIS</span>{" "}
                    y{" "}
                    <span className="font-mono text-sm text-[#f59e0b]">
                      VIIRS
                    </span>{" "}
                    unificados con estaciones IoT en campo para anticipar
                    incendios y estimar su origen probable.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-6">
                    <a
                      href="#preview"
                      className="inline-flex items-center justify-center rounded-xl bg-linear-to-r from-[#f97316] to-[#ea580c] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_28px_-4px_rgba(249,115,22,0.7)] transition-all duration-300 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      Probar calendario
                    </a>

                    <a
                      href="#arquitectura"
                      className="border-b border-slate-400/60 pb-0.5 text-sm font-medium text-slate-200 transition-colors hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      Cómo funciona
                    </a>
                  </div>
                </div>
              </Reveal>

              {/* Mascota sobre anillos holográficos giratorios */}
              <Reveal delayMs={120} className="lg:col-span-6">
                <div className="relative mx-auto flex h-85 max-w-md items-center justify-center sm:h-95">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-24 flex h-80 w-[320px] items-center justify-center sm:-bottom-28 sm:h-90 sm:w-90"
                    style={{ transform: "perspective(700px) rotateX(74deg)" }}
                  >
                    <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.45)_0%,rgba(249,115,22,0.22)_45%,transparent_72%)] blur-md" />
                    <div className="absolute inset-0 animate-[spin_20s_linear_infinite]">
                      <svg viewBox="0 0 200 200" className="h-full w-full">
                        <circle
                          cx="100"
                          cy="100"
                          r="94"
                          fill="none"
                          stroke="#a855f7"
                          strokeOpacity="0.6"
                          strokeWidth="1.6"
                          strokeDasharray="8 8"
                        />
                      </svg>
                    </div>
                    <div className="absolute inset-6 animate-[spin_12s_linear_infinite_reverse]">
                      <svg viewBox="0 0 200 200" className="h-full w-full">
                        <circle
                          cx="100"
                          cy="100"
                          r="92"
                          fill="none"
                          stroke="#f97316"
                          strokeOpacity="0.85"
                          strokeWidth="2.4"
                          strokeDasharray="44 14 10 14"
                        />
                      </svg>
                    </div>
                    <div className="absolute inset-14 animate-[spin_16s_linear_infinite]">
                      <svg viewBox="0 0 200 200" className="h-full w-full">
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          fill="none"
                          stroke="#c084fc"
                          strokeOpacity="0.9"
                          strokeWidth="1.8"
                          strokeDasharray="28 10"
                        />
                      </svg>
                    </div>
                  </div>

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2 top-24 hidden font-mono text-[10px] leading-relaxed text-violet-300/45 sm:block"
                  >
                    <div>firms.area(&quot;CHIH&quot;)</div>
                    <div>km = 2.68 ± 0.14</div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-24 right-2 hidden text-right font-mono text-[10px] leading-relaxed text-orange-300/45 sm:block"
                  >
                    <div>esp32.hdw = HIGH</div>
                    <div>as3935.strikes = 0</div>
                  </div>

                  <div className="absolute left-3 top-8 flex h-14 w-14 items-center justify-center rounded-full border border-orange-400/50 bg-[#160f29]/90 shadow-[0_0_24px_rgba(249,115,22,0.3)] backdrop-blur-md">
                    <div className="text-center font-mono">
                      <span className="block text-xs font-bold text-[#fb923c]">
                        kₘ
                      </span>
                      <span className="block text-[8px] text-slate-400">
                        MODIS
                      </span>
                    </div>
                  </div>

                  <div className="absolute right-3 top-6 flex h-16 w-16 items-center justify-center rounded-full border border-violet-400/50 bg-[#160f29]/90 shadow-[0_0_24px_rgba(168,85,247,0.35)] backdrop-blur-md">
                    <div className="text-center font-mono">
                      <span className="block text-[10px] font-bold text-violet-300">
                        VIIRS
                      </span>
                      <span className="block text-[8px] text-slate-400">
                        375m
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 -mt-6 h-60 w-52 drop-shadow-[0_18px_38px_rgba(249,115,22,0.35)] sm:-mt-8 sm:h-68 sm:w-60">
                    <Image
                      src="/images/mascot-wave.png"
                      alt="Mascota UNDEFINED saludando"
                      fill
                      sizes="(max-width: 640px) 208px, 240px"
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Franja de 3 pasos conectados */}
            <Reveal delayMs={180}>
              <div className="mt-12 rounded-2xl border border-white/10 bg-[#140d24]/80 p-1.5 backdrop-blur-md">
                <div className="grid divide-y divide-white/[0.07] rounded-xl bg-[#0f091c]/90 md:grid-cols-3 md:divide-x md:divide-y-0">
                  {[
                    {
                      step: "01",
                      title: "Armonización kₘ",
                      detail: "MODIS + VIIRS (2000–2026)",
                      href: "#preview",
                      accent: "text-[#fb923c]",
                    },
                    {
                      step: "02",
                      title: "Estación IoT + Fallback",
                      detail: "ESP32 en campo u Open-Meteo",
                      href: "#arquitectura",
                      accent: "text-sky-300",
                    },
                    {
                      step: "03",
                      title: "Origen probable",
                      detail: "CONAFOR + GOES-GLM + CONANP",
                      href: "#vistas",
                      accent: "text-violet-300",
                    },
                  ].map((node) => (
                    <a
                      key={node.step}
                      href={node.href}
                      className="group flex items-center justify-between gap-3 px-5 py-4 transition-colors duration-300 hover:bg-white/3"
                    >
                      <div>
                        <span className="font-mono text-[10px] tracking-widest text-slate-500">
                          {node.step}
                        </span>
                        <p className="mt-0.5 text-sm font-medium text-white transition-colors group-hover:text-[#fb923c]">
                          {node.title}
                        </p>
                        <p className={`mt-0.5 font-mono text-[11px] ${node.accent}`}>
                          {node.detail}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="font-mono text-xs text-slate-600 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-slate-300"
                      >
                        →
                      </span>
                    </a>
                  ))}
                </div>
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
                        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] ${
                          view.status === "MVP"
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
