import type { Metadata } from "next";
import Image from "next/image";
import { asset } from "../../../lib/asset";
import Link from "next/link";
import AboutTabs from "../../../components/AboutTabs";
import SiteHeader from "../../../components/SiteHeader";
import Reveal from "../../../components/Reveal";

const MODULES = [
  {
    step: "Module 01",
    title: "Satellite Harmonization (MODIS + VIIRS)",
    summary:
      "Unifies 25 years of hotspots by removing the bias between sensors to build a continuous historical calendar.",
    points: [
      "Monthly calibration with the kₘ factor and confidence intervals.",
      "Integration with the Fire Weather Index (FWI).",
      "Leave-year-out cross-validation to measure temporal stability.",
    ],
  },
  {
    step: "Module 02",
    title: "Field IoT Stations",
    summary:
      "Autonomous nodes installed in forested areas that measure microclimate and lightning strikes in real time.",
    points: [
      "ESP32 microcontroller with a dual WiFi / long-range LoRa link.",
      "BME280 sensors (temperature and relative humidity), wind, rain and an AS3935 lightning detector.",
      "Local display + 5-LED alert light, powered by a solar panel.",
    ],
  },
  {
    step: "Module 03",
    title: "Origin Estimation and Calendar",
    summary:
      "Combines satellite activity, detected lightning and land context to prioritize preventive inspections.",
    points: [
      "Probabilistic classification of the probable origin (natural vs. human).",
      "Years × months matrix with filters by origin, anomaly and historical median.",
      "Export of harmonized series to CSV with per-sensor uncertainty.",
    ],
  },
];

const PIPELINE = [
  { label: "1. Capture", detail: "NASA FIRMS (MODIS/VIIRS) + ESP32 nodes" },
  { label: "2. Calibration", detail: "kₘ adjustment + FWI + anomaly filtering" },
  { label: "3. Inference", detail: "Origin probability and risk level" },
  { label: "4. Alert", detail: "Web calendar + 5 local LEDs in the field" },
];

export const metadata: Metadata = {
  title: "How it works — FuegoData",
  description: "Satellite harmonization, field IoT stations and probable-origin estimation.",
};

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-[100dvh] bg-[#0d0818] text-[#f4f6f8]">

      <SiteHeader />
      <AboutTabs />

      <main className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/4 h-[26rem] w-[26rem] rounded-full bg-violet-600/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-10 top-40 h-[20rem] w-[20rem] rounded-full bg-[#f97316]/10 blur-3xl"
        />

        {/* Header + main diagram */}
        <section className="relative border-b border-white/[0.06] bg-gradient-to-b from-[#130b24] via-[#0e091b] to-[#0d0818]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <Reveal>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                    System architecture
                  </span>
                  <h1 className="mt-4 max-w-3xl text-balance text-3xl font-bold uppercase leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl">
                    HOW{" "}
                    <span className="bg-gradient-to-r from-[#fb923c] to-violet-400 bg-clip-text text-transparent">
                      FUEGODATA
                    </span>{" "}
                    WORKS
                  </h1>
                </div>
                <p className="max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
                  Three coupled modules connect NASA orbital observations with
                  physical telemetry in the mountains, moving from passive
                  monitoring to operational anticipation.
                </p>
              </div>
            </Reveal>

            {/* System overview diagram */}
            <Reveal delayMs={80}>
              <div className="relative mt-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-gradient-to-r from-sky-500/20 via-violet-500/20 to-[#f97316]/20 blur-2xl"
                />
                <div className="relative overflow-hidden rounded-3xl border border-sky-400/25 bg-[#140d24] p-2 shadow-[0_0_50px_-14px_rgba(56,189,248,0.35)]">
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
                    <Image
                      src={asset("/images/funcionamiento-1.jpeg")}
                      alt="Diagram of the 4 system steps: Capture, Calibration, Inference and Alert"
                      fill
                      priority
                      sizes="(max-width: 1200px) 95vw, 1152px"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* 4-step flow */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PIPELINE.map((item, idx) => (
                <Reveal key={item.label} delayMs={idx * 60}>
                  <div className="h-full rounded-2xl border border-violet-400/20 bg-[#140d24]/90 p-4 transition-colors hover:border-sky-400/40">
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

        {/* Detailed modules */}
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

          <Reveal delayMs={140}>
            <div className="mt-10 grid items-center gap-8 overflow-hidden rounded-3xl border border-violet-400/25 bg-[#140d24] p-6 lg:grid-cols-12 lg:p-8">
              <div className="lg:col-span-6">
                <span className="inline-block rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-sky-300">
                  Harmonization engine
                </span>
                <h2 className="mt-3 text-2xl font-bold uppercase tracking-[-0.02em] text-white">
                  From raw data to{" "}
                  <span className="text-[#fb923c]">actionable alerts</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Every satellite observation and ESP32 node reading goes
                  through a unified pipeline that corrects the resolution
                  differences between MODIS and VIIRS, evaluates the FWI index
                  and computes the origin probability in seconds.
                </p>
              </div>
              <div className="lg:col-span-6">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
                  <Image
                    src={asset("/images/processing-data.jpg")}
                    alt="The FuegoData mascot processing sensor and satellite data streams"
                    fill
                    sizes="(max-width: 1024px) 90vw, 520px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={180}>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-violet-400/20 bg-[#161028] p-6">
              <div>
                <p className="text-sm font-semibold text-white">
                  Meet the team behind the platform
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Discover our multidisciplinary approach and the pilot case in
                  Chihuahua.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/team"
                  className="rounded-xl bg-gradient-to-r from-[#f97316] to-[#ea580c] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_-6px_rgba(249,115,22,0.65)] transition-all hover:brightness-110"
                >
                  Meet the team
                </Link>
                <Link
                  href="/"
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-white/30 hover:text-white"
                >
                  Open the map
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
