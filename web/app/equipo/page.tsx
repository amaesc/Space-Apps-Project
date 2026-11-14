import Image from "next/image";
import Link from "next/link";
import FluidNav from "../../components/FluidNav";
import Reveal from "../../components/Reveal";

const TEAM_AREAS = [
  {
    area: "Ciencia de Datos y Satélite",
    desc: "Armonización estadística de series históricas MODIS y VIIRS, cálculo de factor kₘ, validación leave-year-out y calibración FWI.",
  },
  {
    area: "Hardware e IoT en Campo",
    desc: "Diseño de estaciones autónomas con ESP32 (WiFi/LoRa), sensores BME280, viento/lluvia, detector de rayos AS3935 y alimentación solar.",
  },
  {
    area: "Plataforma Web y Visualización",
    desc: "Interfaz interactiva para explorar el calendario de quema, anomalías por área, mapas de riesgo y exportación abierta en CSV.",
  },
];

const DATA_SOURCES = [
  { name: "NASA FIRMS (MODIS C6.1)", detail: "Puntos calientes históricos 2000–presente" },
  { name: "NASA / NOAA VIIRS (375 m)", detail: "Detección térmica de alta resolución espacial" },
  { name: "Índice Meteorológico FWI", detail: "Peligro de incendio calibrado con clima local" },
  { name: "Red IoT UNDEFINED", detail: "Microclima y rayos en la Sierra de Chihuahua" },
];

export default function EquipoPage() {
  return (
    <div className="relative min-h-[100dvh] bg-[#0d0818] text-[#f4f6f8]">
      <div
        aria-hidden="true"
        className="noise-overlay pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
      />

      <FluidNav />

      <main className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-1/3 h-[26rem] w-[26rem] rounded-full bg-violet-600/15 blur-3xl"
        />

        {/* Encabezado */}
        <section className="relative border-b border-white/[0.06] bg-gradient-to-b from-[#130b24] via-[#0e091b] to-[#0d0818]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-20">
            <Reveal className="lg:col-span-8">
              <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                NASA Space Apps Challenge 2026 · Chihuahua, Chih.
              </span>
              <h1 className="mt-4 text-balance text-3xl font-bold uppercase leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl">
                EQUIPO{" "}
                <span className="bg-gradient-to-r from-[#fb923c] via-[#f97316] to-amber-300 bg-clip-text text-transparent">
                  UNDEFINED
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
                Somos un equipo multidisciplinario enfocado en unir observación
                espacial abierta de la NASA con ingeniería IoT de bajo costo para
                proteger ecosistemas forestales y comunidades de la Sierra de
                Chihuahua.
              </p>
            </Reveal>

            <Reveal delayMs={100} className="lg:col-span-4">
              <div className="mx-auto flex max-w-xs items-center gap-4 rounded-2xl border border-orange-400/30 bg-[#140d24] p-5 shadow-[0_0_32px_-10px_rgba(249,115,22,0.45)]">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-orange-400/40 bg-[#1a122e]">
                  <Image
                    src="/images/mascot-pod.jpg"
                    alt="Mascota del equipo UNDEFINED"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-mono text-xs font-bold tracking-[0.14em] text-white">
                    UNDEFINED
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Caso piloto: Sierra de Chihuahua
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Áreas del equipo y fuentes */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <h2 className="text-2xl font-bold uppercase tracking-[-0.02em] text-white sm:text-3xl">
              Células de{" "}
              <span className="text-[#fb923c]">trabajo</span>
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TEAM_AREAS.map((item, idx) => (
              <Reveal key={item.area} delayMs={idx * 70}>
                <article className="h-full rounded-2xl border border-violet-400/20 bg-[#140d24] p-6">
                  <h3 className="text-base font-semibold text-white">
                    {item.area}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    {item.desc}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delayMs={140}>
            <div className="mt-14">
              <h2 className="text-xl font-bold uppercase tracking-[-0.02em] text-white sm:text-2xl">
                Fuentes de datos y transparencia
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {DATA_SOURCES.map((src) => (
                  <div
                    key={src.name}
                    className="rounded-xl border border-white/10 bg-[#140d24]/80 p-4"
                  >
                    <p className="font-mono text-xs font-semibold text-[#fb923c]">
                      {src.name}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-300">{src.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={180}>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#140d24] p-6">
              <p className="max-w-xl text-xs leading-relaxed text-slate-400">
                Nota metodológica: las estimaciones probabilísticas por zona
                tienen fines preventivos para priorizar inspecciones; no
                constituyen prueba legal ni señalan predios o personas.
              </p>
              <Link
                href="/"
                className="rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_-6px_rgba(249,115,22,0.65)] transition-all hover:brightness-110"
              >
                Volver al inicio
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
