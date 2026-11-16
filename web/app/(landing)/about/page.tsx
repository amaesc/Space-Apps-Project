import type { Metadata } from "next";
import Image from "next/image";
import { asset } from "../../../lib/asset";
import AboutTabs from "../../../components/AboutTabs";
import SiteHeader from "../../../components/SiteHeader";
import FuegoHero from "../../../components/FuegoHero";
import HeroHarmonizationPreview from "../../../components/HeroHarmonizationPreview";
import Reveal from "../../../components/Reveal";

const IOT_SPECS = [
  "ESP32 (WiFi)",
  "DHT11 (Temp & RH)",
  "BMP280 (pressure)",
  "Flame + sound",
  "Planned: LoRa, wind & rain, AS3935 lightning",
  "Planned: display + 5 LEDs, solar",
];

const PLATFORM_VIEWS = [
  { name: "Interactive map", status: "MVP", desc: "Area of interest, recent and historical hotspots, and risk." },
  { name: "Burn calendar", status: "MVP", desc: "Years × months of harmonized detections vs. the historical median." },
  { name: "Area dashboard", status: "MVP", desc: "Current month vs. median, anomalies and alerts." },
  { name: "CSV downloads", status: "MVP", desc: "Harmonized series with uncertainty and sensor." },
  { name: "Hotspot detail", status: "Phase 2", desc: "Origin probability and main reasons." },
  { name: "Methodology", status: "Phase 2", desc: "Leave-year-out validation and FWI calibration." },
];

const TEAM_ROLES = [
  {
    code: "01",
    role: "Data Science & FIRMS",
    name: "Member 1",
    focus: "MODIS / VIIRS harmonization, kₘ factor and bootstrap validation.",
    accent: "text-[#fb923c]",
  },
  {
    code: "02",
    role: "Hardware IoT & ESP32",
    name: "Member 2",
    focus: "Field station (BME280, AS3935), LoRa/WiFi and telemetry.",
    accent: "text-sky-300",
  },
  {
    code: "03",
    role: "Frontend & Visualization",
    name: "Member 3",
    focus: "Interactive calendar, risk maps and user experience.",
    accent: "text-violet-300",
  },
  {
    code: "04",
    role: "Backend & Geospatial",
    name: "Member 4",
    focus: "CONAFOR, GOES-GLM and Open-Meteo integration, plus the data API.",
    accent: "text-amber-300",
  },
];

export const metadata: Metadata = {
  title: "About — FireData",
  description:
    "FireData by Team UNDEFINED: harmonized MODIS/VIIRS burn calendar, field IoT stations and probable fire origin for the Sierra de Chihuahua. NASA Space Apps Challenge 2026.",
};

export default function AboutPage() {
  return (
    <div className="relative min-h-dvh bg-[#0d0818] text-[#f4f6f8]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-black"
      >
        Skip to main content
      </a>

      <SiteHeader />
      <AboutTabs />

      <main id="main-content">
        {/* 1. HERO */}
        <FuegoHero />

        {/* 2. INTERACTIVE DEMO */}
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
                The challenge · Interactive demo
              </span>
              <h2 className="mt-4 text-balance text-3xl font-bold uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl">
                WHY{" "}
                <span className="bg-linear-to-r from-[#fb923c] to-amber-300 bg-clip-text text-transparent">
                  HARMONIZE
                </span>{" "}
                MODIS AND VIIRS
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                Toggle between <strong className="text-white">Raw</strong>{" "}
                and <strong className="text-white">Harmonized</strong> to see
                how the gap between sensors is corrected, and click any month
                in the matrix.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="rounded-xl border border-white/10 bg-[#161028]/80 p-3.5">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                    Calibration
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-[#fb923c]">
                    kₘ factor + CI
                  </span>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#161028]/80 p-3.5">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                    Validation
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

        {/* 3. SYSTEM (compact bento: harmonization + IoT + origin) */}
        <section
          id="architecture"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"
        >
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                  The FireData system
                </span>
                <h2 className="mt-3 text-balance text-3xl font-bold uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl">
                  Three{" "}
                  <span className="bg-linear-to-r from-[#fb923c] to-violet-400 bg-clip-text text-transparent">
                    coupled
                  </span>{" "}
                  modules
                </h2>
              </div>
              <p className="max-w-md text-sm text-slate-400">
                Pilot case in the Sierra de Chihuahua, with Open-Meteo weather
                outside IoT coverage.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Harmonization */}
            <Reveal className="lg:col-span-7">
              <div className="relative h-full rounded-[1.75rem] border border-violet-400/20 bg-white/3 p-1.5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-linear-to-r from-transparent via-[#f97316] to-transparent opacity-75"
                />
                <div className="flex h-full flex-col justify-between overflow-hidden rounded-[1.375rem] bg-[#140d24] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]">
                  <div className="relative mb-5 h-40 w-full overflow-hidden rounded-2xl border border-white/10">
                    <Image
                      src={asset("/images/processing-data.jpg")}
                      alt="MODIS and VIIRS harmonization"
                      fill
                      sizes="(max-width: 1024px) 100vw, 600px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[#140d24] via-transparent to-transparent" />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      MODIS → VIIRS harmonization
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      Monthly <span className="font-mono text-white">kₘ</span>{" "}
                      factor calibrated on the overlap period (2012–2026), with{" "}
                      <strong className="text-white">bootstrap</strong> intervals
                      and CSV download.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Probable origin */}
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
                        src={asset("/images/fire-active.jpg")}
                        alt="Assessing the probable origin of a fire"
                        fill
                        sizes="(max-width: 1024px) 100vw, 420px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-[#140d24] via-transparent to-transparent" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      Probable origin and alerts{" "}
                      <span className="align-middle text-xs font-normal text-amber-300">(planned)</span>
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      Next phase: a classifier using CONAFOR records, GOES-GLM
                      lightning and CONANP polygons to prioritize inspections.
                      Not built yet: detections are currently shown as
                      &quot;Undetermined&quot;.
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-[#0d0818] px-3.5 py-2.5 font-mono text-xs text-amber-300">
                    Planned output: probable origin · lightning in last 5 days · distance to road
                  </div>
                </div>
              </div>
            </Reveal>

            {/* IoT station + resilience in a single clean row */}
            <Reveal delayMs={140} className="lg:col-span-12">
              <div className="relative rounded-[1.75rem] border border-violet-400/20 bg-white/3 p-1.5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-10 top-0 h-0.5 bg-linear-to-r from-transparent via-sky-400 to-transparent opacity-75"
                />
                <div className="grid items-center gap-6 rounded-[1.375rem] bg-[#140d24] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <h3 className="text-xl font-semibold text-white">
                      Field IoT station + resilience
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      Reports temperature, humidity, pressure, flame and sound; the
                      server combines readings into{" "}
                      <strong className="text-white">Hot-Dry-Windy</strong>.
                      Outside station coverage the map uses Open-Meteo.
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
                          src={asset("/images/mascot-pod.jpg")}
                          alt="Active IoT station"
                          fill
                          sizes="(max-width: 1024px) 50vw, 280px"
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-2 px-1 font-mono text-[11px] text-violet-300">
                        ESP32 telemetry live
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#0d0818] p-2">
                      <div className="relative aspect-video overflow-hidden rounded-xl">
                        <Image
                          src={asset("/images/error-frozen.jpg")}
                          alt="Automatic fallback with no signal"
                          fill
                          sizes="(max-width: 1024px) 50vw, 280px"
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-2 px-1 font-mono text-[11px] text-sky-300">
                        Fallback Open-Meteo
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 4. MVP VIEWS */}
        <section
          id="views"
          className="border-t border-white/6 bg-[#110a20]"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                    Product roadmap
                  </span>
                  <h2 className="mt-3 text-balance text-3xl font-bold uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl">
                    The system&rsquo;s{" "}
                    <span className="bg-linear-to-r from-[#fb923c] to-violet-400 bg-clip-text text-transparent">
                      6 views
                    </span>
                  </h2>
                </div>
                <span className="rounded-full border border-violet-400/20 bg-[#140d24] px-4 py-1.5 font-mono text-xs text-slate-300">
                  Pilot case: Sierra de Chihuahua
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

        {/* 5. TEAM */}
        <section
          id="team"
          className="border-t border-white/6 bg-[#0d0818]"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <Reveal>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="inline-block rounded-full border border-orange-400/30 bg-[#f97316]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#fb923c]">
                    Team UNDEFINED · NASA Space Apps 2026
                  </span>
                  <h2 className="mt-3 text-balance text-3xl font-bold uppercase leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl">
                    Building from{" "}
                    <span className="bg-linear-to-r from-[#fb923c] to-violet-400 bg-clip-text text-transparent">
                      Chihuahua
                    </span>
                  </h2>
                </div>
                <span className="rounded-full border border-violet-400/20 bg-[#140d24] px-4 py-1.5 font-mono text-xs text-slate-300">
                  Based in Chihuahua, Mexico
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
            Probabilistic estimates by zone to prioritize inspections; they are
            not legal evidence and do not point to specific properties or people.
          </p>
        </div>
      </footer>
    </div>
  );
}
