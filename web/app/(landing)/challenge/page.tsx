import type { Metadata } from "next";
import Image from "next/image";
import { asset } from "../../../lib/asset";
import Link from "next/link";
import AboutTabs from "../../../components/AboutTabs";
import SiteHeader from "../../../components/SiteHeader";
import Reveal from "../../../components/Reveal";

const CHALLENGES = [
  {
    tag: "01 · Satellite discontinuity",
    title: "The MODIS–VIIRS gap",
    desc: "MODIS (since 2000) and VIIRS (since 2012) have different spatial resolutions and sensitivities (1 km vs. 375 m). Comparing raw counts creates artificial jumps in the historical series.",
  },
  {
    tag: "02 · Uncertain origin",
    title: "Natural fire vs. human activity",
    desc: "An isolated hotspot does not tell whether a fire was started by lightning or by agricultural or other human burning. Separating both patterns is key to prevention.",
  },
  {
    tag: "03 · The field gap",
    title: "Late alerts in rural areas",
    desc: "In mountain communities without reliable connectivity, satellite reports arrive late. Local solar-powered nodes with immediate physical signaling are needed.",
  },
];

const METRICS = [
  { label: "Historical series", value: "25 years (2000–2025)" },
  { label: "Integrated sensors", value: "MODIS + VIIRS" },
  { label: "Calibration", value: "kₘ factor + 95% CI" },
  { label: "Validation", value: "Leave-year-out" },
];

export const metadata: Metadata = {
  title: "The challenge — FuegoData",
  description: "Why harmonize MODIS and VIIRS fire data into a single calendar for the Sierra de Chihuahua.",
};

export default function ChallengePage() {
  return (
    <div className="relative min-h-[100dvh] bg-[#0d0818] text-[#f4f6f8]">

      <SiteHeader />
      <AboutTabs />

      <main className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-1/4 h-[26rem] w-[26rem] rounded-full bg-violet-600/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-10 top-32 h-[20rem] w-[20rem] rounded-full bg-[#f97316]/10 blur-3xl"
        />

        {/* Header */}
        <section className="relative border-b border-white/[0.06] bg-gradient-to-b from-[#130b24] via-[#0e091b] to-[#0d0818]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <Reveal>
                  <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                    NASA Space Apps Challenge · The Challenge
                  </span>
                  <h1 className="mt-4 max-w-2xl text-balance text-3xl font-bold uppercase leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl">
                    WHY{" "}
                    <span className="bg-gradient-to-r from-[#fb923c] via-[#f97316] to-amber-300 bg-clip-text text-transparent">
                      HARMONIZE FIRE
                    </span>{" "}
                    INTO A SINGLE CALENDAR
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
                    To anticipate critical wildfire seasons in the Sierra de
                    Chihuahua and other vulnerable regions, isolated hotspots
                    are not enough: we need a continuous, comparable historical
                    baseline connected to ground sensors.
                  </p>
                </Reveal>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
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

              <Reveal delayMs={120} className="lg:col-span-5">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-[#f97316]/25 via-violet-500/20 to-sky-400/20 blur-2xl"
                  />
                  <div className="relative overflow-hidden rounded-3xl border border-orange-400/30 bg-[#140d24] p-2 shadow-[0_0_50px_-12px_rgba(249,115,22,0.45)]">
                    <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                      <Image
                        src={asset("/images/reto-tabs.jpeg")}
                        alt="MODIS and VIIRS satellites projecting onto a fire calendar over the mountains, next to ground IoT stations"
                        fill
                        priority
                        sizes="(max-width: 1024px) 90vw, 440px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* The 3 core problems */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <Reveal>
            <h2 className="text-2xl font-bold uppercase tracking-[-0.02em] text-white sm:text-3xl">
              Three gaps we{" "}
              <span className="text-[#fb923c]">close</span>
            </h2>
          </Reveal>

          <Reveal delayMs={60}>
            <div className="relative mt-8 overflow-hidden rounded-3xl border border-violet-400/25 bg-[#140d24] p-2 shadow-[0_0_48px_-16px_rgba(139,92,246,0.4)]">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
                <Image
                  src={asset("/images/reto-tabs-2.jpeg")}
                  alt="Triptych of the three gaps: MODIS–VIIRS discontinuity, natural fire vs. human activity, and rural alerts with a solar IoT station"
                  fill
                  sizes="(max-width: 1200px) 95vw, 1152px"
                  className="object-cover"
                />
              </div>
            </div>
          </Reveal>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
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
                  Explore how we solve it, step by step
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Review the satellite + IoT architecture or go back to the
                  interactive calendar.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/how-it-works"
                  className="rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_-6px_rgba(249,115,22,0.65)] transition-all hover:brightness-110"
                >
                  See how it works
                </Link>
                <Link
                  href="/#preview"
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/30 hover:text-white"
                >
                  Try the calendar
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
