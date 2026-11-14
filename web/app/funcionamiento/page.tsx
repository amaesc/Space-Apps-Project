import Link from "next/link";
import FluidNav from "../../components/FluidNav";
import Reveal from "../../components/Reveal";

const MODULES = [
  {
    step: "Módulo 01",
    title: "Armonización Satelital (MODIS + VIIRS)",
    summary:
      "Unifica 25 años de focos de calor eliminando el sesgo entre sensores para construir un calendario histórico continuo.",
    points: [
      "Calibración mensual con factor kₘ e intervalos de confianza.",
      "Integración con el índice meteorológico de incendios (FWI).",
      "Validación cruzada leave-year-out para medir estabilidad temporal.",
    ],
  },
  {
    step: "Módulo 02",
    title: "Estaciones IoT en Campo",
    summary:
      "Nodos autónomos instalados en zonas forestales que miden microclima y descargas eléctricas en tiempo real.",
    points: [
      "Microcontrolador ESP32 con enlace dual WiFi / LoRa de largo alcance.",
      "Sensores BME280 (temperatura y humedad relativa), viento, lluvia y detector de rayos AS3935.",
      "Pantalla local + semáforo de 5 LEDs alimentados por panel solar.",
    ],
  },
  {
    step: "Módulo 03",
    title: "Estimación de Origen y Calendario",
    summary:
      "Cruza actividad satelital, rayos detectados y contexto territorial para priorizar inspecciones preventivas.",
    points: [
      "Clasificación probabilística de origen probable (natural vs. humano).",
      "Matriz Años × Meses con filtros por origen, anomalía y mediana histórica.",
      "Exportación de series armonizadas en CSV con incertidumbre por sensor.",
    ],
  },
];

const PIPELINE = [
  { label: "1. Captura", detail: "NASA FIRMS (MODIS/VIIRS) + Nodos ESP32" },
  { label: "2. Calibración", detail: "Ajuste kₘ + FWI + filtrado de anomalías" },
  { label: "3. Inferencia", detail: "Probabilidad de origen y nivel de riesgo" },
  { label: "4. Alerta", detail: "Calendario web + 5 LEDs locales en campo" },
];

export default function FuncionamientoPage() {
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
          className="pointer-events-none absolute -top-24 left-1/4 h-[26rem] w-[26rem] rounded-full bg-violet-600/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-10 top-40 h-[20rem] w-[20rem] rounded-full bg-[#f97316]/10 blur-3xl"
        />

        {/* Encabezado */}
        <section className="relative border-b border-white/[0.06] bg-gradient-to-b from-[#130b24] via-[#0e091b] to-[#0d0818]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <Reveal>
              <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                Arquitectura del sistema
              </span>
              <h1 className="mt-4 max-w-3xl text-balance text-3xl font-bold uppercase leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl">
                CÓMO FUNCIONA{" "}
                <span className="bg-gradient-to-r from-[#fb923c] to-violet-400 bg-clip-text text-transparent">
                  UNDEFINED
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
                Tres módulos acoplados conectan observaciones orbitales de la
                NASA con telemetría física en la sierra para pasar del monitoreo
                pasivo a la anticipación operativa.
              </p>
            </Reveal>

            {/* Flujo en 4 pasos */}
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PIPELINE.map((item, idx) => (
                <Reveal key={item.label} delayMs={idx * 60}>
                  <div className="rounded-2xl border border-violet-400/20 bg-[#140d24]/90 p-4">
                    <span className="block font-mono text-xs font-semibold text-[#fb923c]">
                      {item.label}
                    </span>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                      {item.detail}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Módulos detallados */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-6 lg:grid-cols-3">
            {MODULES.map((mod, idx) => (
              <Reveal key={mod.step} delayMs={idx * 80}>
                <article className="flex h-full flex-col rounded-2xl border border-violet-400/20 bg-[#140d24] p-6 transition-colors hover:border-orange-400/40">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-[#fb923c]">
                    {mod.step}
                  </span>
                  <h2 className="mt-2.5 text-xl font-semibold text-white">
                    {mod.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {mod.summary}
                  </p>
                  <ul className="mt-5 space-y-2.5 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-slate-300">
                    {mod.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f97316]"
                        />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delayMs={180}>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-400/20 bg-[#161028] p-6">
              <div>
                <p className="text-sm font-semibold text-white">
                  Conoce al equipo detrás de la plataforma
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Descubre el enfoque multidisciplinario y el caso piloto en
                  Chihuahua.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/equipo"
                  className="rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_-6px_rgba(249,115,22,0.65)] transition-all hover:brightness-110"
                >
                  Ver equipo
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/30 hover:text-white"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
