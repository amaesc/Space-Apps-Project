"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  type AuthUser,
  clearStoredUser,
  getStoredUser,
  subscribeAuthChange,
} from "../../lib/auth";
import {
  DAILY_HARMONIZED_28D,
  downloadHotspotsCsv,
  type FireOrigin,
  HOTSPOT_EVENTS,
  ORIGIN_28D_TOTALS,
  ORIGIN_COLORS,
} from "../../lib/fire-data";

const ChihuahuaOsmMap = dynamic(
  () => import("../../components/ChihuahuaOsmMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-96 w-full items-center justify-center bg-[#0a0714] font-mono text-xs text-slate-400 lg:min-h-[420px]">
        Cargando mapa OpenStreetMap...
      </div>
    ),
  }
);

type OriginFilter = "Todos" | FireOrigin;

const ORIGIN_FILTERS: OriginFilter[] = [
  "Todos",
  "Humano",
  "Rayo",
  "Forestal",
  "Indeterminado",
];

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [originFilter, setOriginFilter] = useState<OriginFilter>("Todos");
  const [selectedId, setSelectedId] = useState<string>(HOTSPOT_EVENTS[0].id);
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    syncUser();
    return subscribeAuthChange(syncUser);
  }, []);

  const filteredEvents = useMemo(() => {
    if (originFilter === "Todos") return HOTSPOT_EVENTS;
    return HOTSPOT_EVENTS.filter((ev) => ev.origin === originFilter);
  }, [originFilter]);

  const activeEvent = useMemo(() => {
    return (
      filteredEvents.find((ev) => ev.id === selectedId) ??
      filteredEvents[0] ??
      null
    );
  }, [filteredEvents, selectedId]);

  const total28d = useMemo(() => {
    if (originFilter === "Todos") {
      return Object.values(ORIGIN_28D_TOTALS).reduce((acc, v) => acc + v, 0);
    }
    return ORIGIN_28D_TOTALS[originFilter];
  }, [originFilter]);

  const maxOriginCount = Math.max(...Object.values(ORIGIN_28D_TOTALS));
  const maxDailyCount = Math.max(...DAILY_HARMONIZED_28D.map((d) => d.count));

  // Coordenadas SVG para la gráfica de área (viewBox 420 x 130)
  const chartPoints = useMemo(() => {
    const width = 420;
    const height = 112;
    const padX = 16;
    const padY = 12;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;

    return DAILY_HARMONIZED_28D.map((d, idx) => {
      const x =
        padX + (idx / Math.max(DAILY_HARMONIZED_28D.length - 1, 1)) * usableW;
      const y = padY + (1 - d.count / (maxDailyCount + 12)) * usableH;
      return { ...d, x, y };
    });
  }, [maxDailyCount]);

  const linePath = chartPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)} 112 L ${chartPoints[0].x.toFixed(1)} 112 Z`;

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#0d0818] text-[#f4f6f8]">
      <div
        aria-hidden="true"
        className="noise-overlay pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
      />

      {/* Barra superior estilo centro de mando */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0d0818]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-orange-400/40 bg-[#1a122e] shadow-[0_0_16px_rgba(249,115,22,0.35)]">
                <Image
                  src="/images/mascot-pod.jpg"
                  alt="UNDEFINED"
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white sm:text-base">
                  Resumen de actividad térmica
                </h1>
                <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300 sm:inline-block">
                  MODIS + VIIRS
                </span>
              </div>
              <p className="font-mono text-[11px] text-slate-400">
                Sierra de Chihuahua · Ventana móvil 28 días
              </p>
            </div>
          </div>

          {/* Filtros + Acciones */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Filtrar por origen probable"
              className="hidden items-center gap-1 rounded-xl border border-white/10 bg-[#140d24] p-1 xl:flex"
            >
              {ORIGIN_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setOriginFilter(filter)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[11px] transition-colors ${
                    originFilter === filter
                      ? "bg-linear-to-r from-[#f97316] to-[#ea580c] text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => downloadHotspotsCsv(filteredEvents)}
              className="cursor-pointer rounded-lg border border-orange-400/40 bg-[#f97316]/15 px-3 py-1.5 font-mono text-xs font-medium text-[#fb923c] transition-colors hover:bg-[#f97316]/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Descargar CSV
            </button>

            <Link
              href="/"
              className="rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-white/8 hover:text-white"
            >
              Inicio
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-lg border border-violet-400/25 bg-[#140d24] px-2.5 py-1.5 text-xs text-slate-200 sm:inline-flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="max-w-28 truncate">{user.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => clearStoredUser()}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/4 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/8 hover:text-white"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-white/15 bg-white/4 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/8"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Cuerpo principal estilo ArcGIS Dark */}
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 gap-3 p-3 lg:grid-cols-[310px_minmax(0,1fr)] lg:p-4">
        {/* COLUMNA IZQUIERDA: KPI + Feed scrollable */}
        <aside className="flex flex-col gap-3">
          {/* KPI Card */}
          <section className="rounded-2xl border border-violet-400/20 bg-[#140d24] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Últimos 28 días
              </span>
              <span className="rounded-full border border-orange-400/30 bg-[#f97316]/15 px-2 py-0.5 font-mono text-[10px] text-[#fb923c]">
                +18% vs mediana
              </span>
            </div>

            <p className="mt-2 font-mono text-4xl font-bold tabular-nums tracking-tight text-white">
              {total28d.toLocaleString("es-MX")}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Puntos calientes armonizados ({originFilter.toLowerCase()})
            </p>

            {/* Telemetría IoT */}
            <div className="mt-3.5 flex items-center justify-between rounded-xl border border-white/8 bg-[#0d0818] px-3 py-2 font-mono text-[11px]">
              <span className="text-sky-300">ESP32-CHIH-04</span>
              <span className="text-amber-300">HDW Alto · 0 rayos</span>
            </div>
          </section>

          {/* Filtro compacto móvil/tablet */}
          <div className="flex flex-wrap gap-1.5 xl:hidden">
            {ORIGIN_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setOriginFilter(filter)}
                className={`cursor-pointer rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                  originFilter === filter
                    ? "border-orange-400/50 bg-[#f97316]/20 text-white"
                    : "border-white/10 bg-[#140d24] text-slate-400 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Feed de detecciones recientes */}
          <section className="flex min-h-80 flex-1 flex-col overflow-hidden rounded-2xl border border-violet-400/20 bg-[#140d24] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">
                Detecciones recientes
              </h2>
              <span className="font-mono text-[11px] text-slate-400">
                {filteredEvents.length} eventos
              </span>
            </div>

            <div className="max-h-[460px] flex-1 divide-y divide-white/6 overflow-y-auto">
              {filteredEvents.map((ev) => {
                const isSelected = activeEvent?.id === ev.id;
                const colors = ORIGIN_COLORS[ev.origin];
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedId(ev.id)}
                    className={`w-full cursor-pointer px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "bg-white/8"
                        : "hover:bg-white/4"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] ${colors.badge}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${colors.dot}`}
                        />
                        {ev.origin}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {ev.timestamp}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs font-semibold text-white">
                      {ev.municipality} · {ev.zone}
                    </p>

                    <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-slate-400">
                      <span>{ev.sensor}</span>
                      <span className="tabular-nums text-slate-300">
                        FRP {ev.frpMw} MW
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="border-t border-white/8 bg-[#0f091c] px-4 py-2 font-mono text-[10px] text-slate-500">
              Última sincronización: hace unos segundos
            </div>
          </section>
        </aside>

        {/* ÁREA PRINCIPAL DERECHA: Mapa arriba + 2 Gráficas abajo */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* MAPA OPENSTREETMAP INTERACTIVO */}
          <section className="relative min-h-96 flex-1 overflow-hidden rounded-2xl border border-orange-500/35 bg-[#0a0714] shadow-[0_24px_60px_-15px_rgba(0,0,0,0.8)] lg:min-h-[420px]">
            {/* Leyenda arriba izquierda */}
            <div className="absolute left-3 top-3 z-500 flex flex-wrap items-center gap-3 rounded-xl border border-white/12 bg-[#0d0818]/90 px-3 py-2 font-mono text-[10px] text-slate-300 backdrop-blur-md">
              {(Object.keys(ORIGIN_COLORS) as FireOrigin[]).map((origin) => (
                <span key={origin} className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${ORIGIN_COLORS[origin].dot}`}
                  />
                  {origin}
                </span>
              ))}
            </div>

            <ChihuahuaOsmMap
              events={filteredEvents}
              selectedId={activeEvent?.id ?? null}
              onSelect={setSelectedId}
            />

            {/* Tarjeta flotante del punto seleccionado (abajo izquierda) */}
            {activeEvent && (
              <div className="absolute bottom-3 left-3 z-500 max-w-xs rounded-xl border border-white/15 bg-[#0d0818]/90 px-3.5 py-2.5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] text-slate-400">
                    {activeEvent.id} · {activeEvent.sensor}
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-[#fb923c]">
                    {activeEvent.probability}% prob. {activeEvent.origin}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-white">
                  {activeEvent.municipality} — {activeEvent.zone}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                  {activeEvent.lat}, {activeEvent.lon} · FRP {activeEvent.frpMw} MW
                </p>
              </div>
            )}
          </section>

          {/* FILA INFERIOR: 2 GRÁFICAS */}
          <div className="grid gap-3 md:grid-cols-2">
            {/* Gráfica 1: Origen probable (Barras) */}
            <section className="rounded-2xl border border-violet-400/20 bg-[#140d24] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Distribución por origen probable
                </h2>
                <span className="font-mono text-[10px] text-slate-400">
                  Clic para filtrar
                </span>
              </div>

              <div className="mt-4 grid h-36 grid-cols-4 items-end gap-4 border-b border-white/10 px-2 pb-2">
                {(Object.keys(ORIGIN_28D_TOTALS) as FireOrigin[]).map(
                  (origin) => {
                    const count = ORIGIN_28D_TOTALS[origin];
                    const heightPct = Math.round((count / maxOriginCount) * 100);
                    const isActive =
                      originFilter === "Todos" || originFilter === origin;
                    return (
                      <button
                        key={origin}
                        type="button"
                        onClick={() =>
                          setOriginFilter((prev) =>
                            prev === origin ? "Todos" : origin
                          )
                        }
                        className={`group flex h-full cursor-pointer flex-col items-center justify-end gap-1.5 transition-opacity ${
                          isActive ? "opacity-100" : "opacity-35 hover:opacity-75"
                        }`}
                      >
                        <span className="font-mono text-[11px] tabular-nums text-slate-200">
                          {count}
                        </span>
                        <div
                          className="w-full max-w-12 rounded-t-md transition-all duration-500 group-hover:brightness-110"
                          style={{
                            height: `${heightPct}%`,
                            backgroundColor: ORIGIN_COLORS[origin].hex,
                          }}
                        />
                      </button>
                    );
                  }
                )}
              </div>

              <div className="mt-2 grid grid-cols-4 gap-4 px-2 text-center font-mono text-[10px] text-slate-300">
                {(Object.keys(ORIGIN_28D_TOTALS) as FireOrigin[]).map(
                  (origin) => (
                    <span key={origin} className="truncate">
                      {origin}
                    </span>
                  )
                )}
              </div>
            </section>

            {/* Gráfica 2: Conteo diario armonizado (Área / Línea) */}
            <section className="flex flex-col justify-between rounded-2xl border border-violet-400/20 bg-[#140d24] p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Conteo diario armonizado
                </h2>
                <span className="font-mono text-[11px] text-sky-300">
                  {hoveredDayIdx !== null
                    ? `${DAILY_HARMONIZED_28D[hoveredDayIdx].label}: ${DAILY_HARMONIZED_28D[hoveredDayIdx].count} pts`
                    : "Serie kₘ (28d)"}
                </span>
              </div>

              <div className="mt-3">
                <svg
                  viewBox="0 0 420 120"
                  className="h-32 w-full overflow-visible"
                  role="img"
                  aria-label="Gráfica de conteo diario armonizado"
                >
                  <defs>
                    <linearGradient id="areaSky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.38" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Líneas guía horizontales */}
                  {[28, 60, 92].map((y) => (
                    <line
                      key={y}
                      x1="12"
                      y1={y}
                      x2="408"
                      y2={y}
                      stroke="rgba(255,255,255,0.07)"
                      strokeDasharray="3 3"
                    />
                  ))}

                  <path d={areaPath} fill="url(#areaSky)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {chartPoints.map((pt, idx) => (
                    <g key={pt.label}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredDayIdx === idx ? 5 : 3.2}
                        fill={hoveredDayIdx === idx ? "#f97316" : "#38bdf8"}
                        stroke="#0d0818"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="12"
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDayIdx(idx)}
                        onMouseLeave={() => setHoveredDayIdx(null)}
                      />
                    </g>
                  ))}
                </svg>

                <div className="mt-1 flex justify-between px-2 font-mono text-[10px] text-slate-400">
                  <span>18 Oct</span>
                  <span>26 Oct</span>
                  <span>03 Nov</span>
                  <span>13 Nov</span>
                </div>
              </div>

              <p className="mt-2 text-right font-mono text-[10px] text-[#fb923c]/90">
                Datos ilustrativos de demostración · Sierra de Chihuahua
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
