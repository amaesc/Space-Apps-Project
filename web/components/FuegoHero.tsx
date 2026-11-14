import Image from "next/image";
import Link from "next/link";
import Reveal from "./Reveal";

const FEATURE_CARDS = [
  {
    title: "Satellite memory",
    lines: ["MODIS + VIIRS (2000 – 2026)"],
    href: "#preview",
    accent: "from-[#ff8a1f] to-[#f05a0a]",
    glow: "shadow-[-10px_0_30px_-12px_rgba(249,115,22,0.75)]",
    icon: <SatelliteIcon />,
  },
  {
    title: "Environmental monitoring",
    lines: ["IoT stations", "Weather data and backup"],
    href: "#architecture",
    accent: "from-[#a855f7] to-[#7c3aed]",
    glow: "shadow-[-10px_0_30px_-12px_rgba(168,85,247,0.75)]",
    icon: <TowerIcon />,
  },
  {
    title: "Origin analysis",
    lines: ["Integrated evidence", "Hypotheses and confidence level"],
    href: "#views",
    accent: "from-[#ff8a1f] to-[#f05a0a]",
    glow: "shadow-[-10px_0_30px_-12px_rgba(249,115,22,0.75)]",
    icon: <SearchFlameIcon />,
  },
];

export default function FuegoHero() {
  return (
    <section className="font-display relative overflow-hidden bg-linear-to-b from-[#0a0d2c] via-[#1b1640] to-[#1d1430]">
      {/* Violet sky glow and orange sunset on the horizon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 45% at 72% 62%, rgba(249,115,22,0.32) 0%, rgba(168,85,247,0.18) 45%, transparent 75%), radial-gradient(45% 40% at 20% 30%, rgba(88,64,180,0.22) 0%, transparent 70%)",
        }}
      />

      {/* Mountains and pines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-40 h-56 opacity-70"
        style={{ maskImage: "linear-gradient(to bottom, #000 55%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 55%, transparent)" }}
      >
        <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="h-full w-full">
          <path
            d="M0,190 L140,150 L260,175 L420,120 L560,170 L700,140 L860,185 L1000,130 L1160,175 L1300,135 L1440,165 L1440,320 L0,320 Z"
            fill="#2a1f4a"
            fillOpacity="0.55"
          />
          <path
            d="M0,235 L110,205 L230,228 L360,195 L500,232 L640,210 L780,240 L940,205 L1090,236 L1240,200 L1440,230 L1440,320 L0,320 Z"
            fill="#1c1636"
            fillOpacity="0.85"
          />
          <path
            d="M0,320 L0,268 L20,240 L38,268 L52,268 L70,226 L90,268 L110,268 L128,246 L146,268 L1290,268 L1310,240 L1328,268 L1346,268 L1366,222 L1386,268 L1404,268 L1422,236 L1440,262 L1440,320 Z"
            fill="#171230"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-[88rem] px-4 pb-28 pt-10 sm:px-6 lg:px-12 lg:pt-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
          <Reveal className="relative z-10">
            <p className="text-sm font-semibold tracking-[0.02em] text-slate-100 sm:text-base lg:text-lg">
              SATELLITE INTELLIGENCE <span className="font-extrabold text-[#ff8a1f]">+</span> IoT{" "}
              <span className="font-extrabold text-[#ff8a1f]">+</span> ENVIRONMENTAL ANALYSIS
            </p>

            <h1 className="mt-5 text-[2.4rem] font-extrabold leading-[1.12] tracking-[-0.025em] sm:text-5xl lg:text-[3.2rem] xl:whitespace-nowrap xl:text-[3.9rem]">
              <span className="block bg-linear-to-r from-white via-white to-slate-300 bg-clip-text text-transparent">
                Fire leaves traces.
              </span>
              <span className="block bg-linear-to-r from-[#ff9a2e] via-[#ff7a18] to-[#f05a0a] bg-clip-text text-transparent">
                Technology connects them.
              </span>
            </h1>

            <div aria-hidden="true" className="mt-6 flex items-center">
              <span className="h-1 w-32 rounded-full bg-linear-to-r from-[#ff8a1f] to-[#f05a0a]" />
              <span className="h-px w-16 bg-linear-to-r from-[#f05a0a]/60 to-transparent" />
            </div>

            <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-slate-200 sm:text-lg">
              25 years of MODIS and VIIRS satellite records, combined with IoT
              sensors and weather data to identify thermal activity patterns
              and estimate their probable origin.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link
                href="/"
                className="group inline-flex items-center gap-3 rounded-xl bg-linear-to-r from-[#ff8a1f] to-[#ea580c] px-8 py-4 text-lg font-extrabold text-white shadow-[0_12px_36px_-8px_rgba(249,115,22,0.95)] ring-1 ring-orange-300/40 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Open the map
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="#preview"
                className="inline-flex items-center gap-3 rounded-xl border border-white/40 bg-white/3 px-7 py-4 text-base font-semibold text-white transition-all duration-300 hover:border-white/70 hover:bg-white/8 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <CalendarIcon />
                Explore calendar
              </a>
            </div>
          </Reveal>

          <Reveal delayMs={120}>
            <div className="hero-art-mask relative mx-auto aspect-3/2 w-full max-w-2xl lg:-mr-12 lg:-mt-6 lg:w-[calc(100%+3rem)] lg:max-w-none">
              <Image
                src="/images/hero-fuegodata.jpg"
                alt="Laptop showing a thermal activity map of Mexico, a satellite, an IoT weather station and the FuegoData mascot"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>

        <Reveal delayMs={180}>
          <div className="mt-10 grid gap-5 md:grid-cols-3 lg:mt-4 lg:gap-6">
            {FEATURE_CARDS.map((card) => (
              <a
                key={card.title}
                href={card.href}
                className={`group relative flex items-center gap-6 overflow-hidden rounded-2xl border border-white/15 bg-[#1b1838]/70 px-6 py-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#221d44]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${card.glow}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-[3px] bg-linear-to-b ${card.accent}`}
                />
                <span className="shrink-0">{card.icon}</span>
                <span>
                  <span className="block text-lg font-bold text-white sm:text-xl">
                    {card.title}
                  </span>
                  {card.lines.map((line) => (
                    <span key={line} className="mt-0.5 block text-sm text-slate-300 sm:text-base">
                      {line}
                    </span>
                  ))}
                </span>
              </a>
            ))}
          </div>
        </Reveal>
      </div>

      {/* Bottom fire wave */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="hero-wave" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#f97316" stopOpacity="0.9" />
              <stop offset="0.35" stopColor="#f97316" stopOpacity="0.15" />
              <stop offset="0.6" stopColor="#ff8a1f" stopOpacity="0.9" />
              <stop offset="1" stopColor="#f97316" stopOpacity="0.95" />
            </linearGradient>
            <filter id="hero-wave-glow" x="-10%" y="-200%" width="120%" height="500%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <path
            d="M0,40 C240,70 420,95 720,80 C1000,66 1200,40 1440,20 L1440,100 L0,100 Z"
            fill="#120d22"
          />
          <path
            d="M0,40 C240,70 420,95 720,80 C1000,66 1200,40 1440,20"
            fill="none"
            stroke="url(#hero-wave)"
            strokeWidth="6"
            filter="url(#hero-wave-glow)"
          />
          <path
            d="M0,40 C240,70 420,95 720,80 C1000,66 1200,40 1440,20"
            fill="none"
            stroke="url(#hero-wave)"
            strokeWidth="2"
          />
        </svg>
      </div>
    </section>
  );
}

const iconGradientStops = (
  <>
    <stop offset="0" stopColor="#a78bfa" />
    <stop offset="1" stopColor="#f0abfc" />
  </>
);

function SatelliteIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ic-sat" x1="0" y1="0" x2="1" y2="1">
          {iconGradientStops}
        </linearGradient>
      </defs>
      <g transform="rotate(-45 32 32)">
        <g stroke="url(#ic-sat)" strokeWidth="2.4" strokeLinejoin="round">
          <rect x="2" y="25" width="18" height="14" rx="1" />
          <path d="M11 25 V39 M2 32 H20" strokeWidth="1.4" />
          <rect x="44" y="25" width="18" height="14" rx="1" />
          <path d="M53 25 V39 M44 32 H62" strokeWidth="1.4" />
          <path d="M20 32 H24 M40 32 H44" />
          <rect x="24" y="22" width="16" height="18" rx="3" />
        </g>
        <path d="M23 44 a9 9 0 0 0 18 0 Z" fill="#ff8a1f" />
        <path d="M32 44 V40" stroke="#ff8a1f" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

function TowerIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ic-tower" x1="0" y1="0" x2="1" y2="1">
          {iconGradientStops}
        </linearGradient>
      </defs>
      <g stroke="url(#ic-tower)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="20" r="4" />
        <path d="M24 12 a12 12 0 0 0 0 16 M40 12 a12 12 0 0 1 0 16" />
        <path d="M17 6 a20 20 0 0 0 0 28 M47 6 a20 20 0 0 1 0 28" />
        <path d="M32 24 L22 58 M32 24 L42 58 M26 44 L38 44 M24 52 L40 52 M27 40 L37 52 M37 40 L27 52" />
      </g>
    </svg>
  );
}

function SearchFlameIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="27" cy="27" r="17" stroke="#f1f5f9" strokeWidth="3" />
      <path d="M39.5 39.5 L54 54" stroke="#f1f5f9" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M27 15 C29 20 34 22 34 29 a7 7 0 0 1 -14 0 c0 -3 1.5 -5 3 -6.5 c0 2.5 1 4 2.5 4.5 C24 21 25 18 27 15 Z"
        fill="#ff8a1f"
      />
      <path d="M27 26 c1.5 2 3 3 3 5 a3 3 0 0 1 -6 0 c0 -2 1.5 -3 3 -5 Z" fill="#fde68a" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10 H21 M8 3 V7 M16 3 V7" />
      <path d="M7.5 14 h1 M11.5 14 h1 M15.5 14 h1 M7.5 17.5 h1 M11.5 17.5 h1" strokeWidth="2.2" />
    </svg>
  );
}

