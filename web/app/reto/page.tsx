import Link from "next/link";
import FluidNav from "../../components/FluidNav";
import Reveal from "../../components/Reveal";

const CHALLENGES = [
  {
    tag: "01 · Discontinuidad satelital",
    title: "Brecha entre MODIS y VIIRS",
    desc: "MODIS (desde 2000) y VIIRS (desde 2012) tienen resoluciones espaciales y sensibilidades distintas (1 km vs. 375 m). Comparar conteos crudos genera saltos artificiales en las series históricas.",
  },
  {
    tag: "02 · Origen incierto",
    title: "Fuego natural vs. actividad humana",
    desc: "Un punto caliente aislado no indica si el incendio comenzó por descarga eléctrica o por quema agrícola/antrópica. Separar ambos patrones es clave para la prevención.",
  },
  {
    tag: "03 · Brecha en campo",
    title: "Alertas tardías en zonas rurales",
    desc: "En comunidades serranas sin conectividad constante, los reportes satelitales llegan tarde. Se necesitan nodos locales con autonomía solar y señalización física inmediata.",
  },
];

const METRICS = [
  { label: "Serie histórica", value: "25 años (2000–2025)" },
  { label: "Sensores integrados", value: "MODIS + VIIRS" },
  { label: "Calibración", value: "Factor kₘ + IC 95%" },
  { label: "Validación", value: "Leave-year-out" },
];

export default function RetoPage() {
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
          className="pointer-events-none absolute -top-24 right-1/4 h-[26rem] w-[26rem] rounded-full bg-violet-600/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-10 top-32 h-[20rem] w-[20rem] rounded-full bg-[#f97316]/10 blur-3xl"
        />

        {/* Encabezado */}
        <section className="relative border-b border-white/[0.06] bg-gradient-to-b from-[#130b24] via-[#0e091b] to-[#0d0818]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <Reveal>
              <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                NASA Space Apps Challenge · El Reto
              </span>
              <h1 className="mt-4 max-w-3xl text-balance text-3xl font-bold uppercase leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl">
                POR QUÉ{" "}
                <span className="bg-gradient-to-r from-[#fb923c] via-[#f97316] to-amber-300 bg-clip-text text-transparent">
                  ARMONIZAR EL FUEGO
                </span>{" "}
                EN UN SOLO CALENDARIO
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300">
                Para anticipar temporadas críticas de incendios forestales en la
                Sierra de Chihuahua y otras regiones vulnerables, no basta con
                ver puntos calientes aislados: necesitamos una línea base
                histórica continua, comparable y conectada con sensores en tierra.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {METRICS.map((item, idx) => (
                <Reveal key={item.label} delayMs={idx * 60}>
                  <div className="rounded-2xl border border-violet-400/20 bg-[#140d24]/90 p-4">
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {item.label}
                    </span>
                    <span className="mt-1.5 block font-mono text-sm font-semibold text-white">
                      {item.value}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Los 3 problemas centrales */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <h2 className="text-2xl font-bold uppercase tracking-[-0.02em] text-white sm:text-3xl">
              Tres brechas que{" "}
              <span className="text-[#fb923c]">resolvemos</span>
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {CHALLENGES.map((item, idx) => (
              <Reveal key={item.title} delayMs={idx * 70}>
                <article className="h-full rounded-2xl border border-violet-400/20 bg-[#140d24] p-6 transition-colors hover:border-orange-400/40">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#fb923c]">
                    {item.tag}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                    {item.desc}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delayMs={180}>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-orange-400/25 bg-[#161028] p-6">
              <div>
                <p className="text-sm font-semibold text-white">
                  Explora cómo lo resolvemos paso a paso
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Revisa la arquitectura satelital + IoT o vuelve al calendario
                  interactivo.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/funcionamiento"
                  className="rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_-6px_rgba(249,115,22,0.65)] transition-all hover:brightness-110"
                >
                  Ver funcionamiento
                </Link>
                <Link
                  href="/#preview"
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/30 hover:text-white"
                >
                  Probar calendario
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
