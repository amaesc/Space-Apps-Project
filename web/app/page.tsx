"use client";

import { useState } from "react";
import LazyMap from "../components/LazyMap";
import SiteHeader from "../components/SiteHeader";
import { LITE_URL, useDashboardData, useNow, useSlowConnection } from "../lib/api";
import {
  type BurnCalendar,
  directionsUrl,
  downloadHotspotsCsv,
  type FireOrigin,
  formatAgo,
  formatTime,
  IS_DEMO_DATA,
  minutesSince,
  ORIGIN_COLORS,
  ORIGINS,
  RISK_SCALE,
  riskFor,
  type Station,
} from "../lib/fire-data";

type Filter = "All" | FireOrigin;
const FILTERS: Filter[] = ["All", ...ORIGINS];

export default function DashboardPage() {
  const data = useDashboardData();
  const slow = useSlowConnection();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const events = filter === "All" ? data.hotspots : data.hotspots.filter((e) => e.origin === filter);
  const selected = events.find((e) => e.id === selectedId) ?? events[0] ?? null;
  const riskLevel = Math.max(1, ...data.stations.map((s) => s.riskLevel));
  const risk = riskFor(riskLevel);
  const last24h = now === null ? null : data.hotspots.filter((e) => minutesSince(e.detectedAt, now) <= 24 * 60).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      {/* Avisos de conexión */}
      {slow && (
        <p className="bg-sky-900/60 px-4 py-2 text-center text-sm">
          Slow connection detected.{" "}
          <a href={LITE_URL} className="font-bold underline">
            Switch to Lite mode (~3 KB)
          </a>
        </p>
      )}
      {data.status === "offline" && (
        <p className="bg-red-900/60 px-4 py-2 text-center text-sm">
          Live data unavailable — showing demo data. <a href={LITE_URL} className="font-bold underline">Try Lite mode</a>
        </p>
      )}

      {/* Estado */}
      <section aria-label="Current status" className="border-b border-white/10 bg-[#170f2a] py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4">
          <div className="flex items-center gap-3">
            <p className="flex items-center gap-2 text-lg font-bold">
              <span className="text-slate-300">Fire danger</span>
              <span className="rounded-md px-2.5 py-0.5 uppercase" style={{ backgroundColor: risk.bg, color: risk.fg }}>
                {risk.level}
              </span>
            </p>
            <ol aria-label={`Danger level ${riskLevel} of 5`} className="hidden items-end gap-0.5 sm:flex">
              {RISK_SCALE.map((r, i) => (
                <li
                  key={r.level}
                  title={r.level}
                  className={`w-5 rounded-sm ${i + 1 === riskLevel ? "h-5 ring-2 ring-white" : "h-2.5 opacity-60"}`}
                  style={{ backgroundColor: r.bg }}
                />
              ))}
            </ol>
          </div>
          <p>
            <b className="tabular-nums">{last24h ?? "–"}</b> <span className="text-slate-300">hotspots · 24 h</span>
          </p>
          {data.calendar && (
            <p>
              <span className="text-slate-300">{data.calendar.current.month} vs median</span>{" "}
              <b className="tabular-nums">
                {data.calendar.current.anomalyPct > 0 ? "+" : ""}
                {data.calendar.current.anomalyPct}%
              </b>
            </p>
          )}
          <p className="text-slate-300">
            {data.status === "loading" ? "Loading live data…" : data.fetchedAt ? `Updated ${formatTime(data.fetchedAt)}` : "Offline"}
          </p>
          {IS_DEMO_DATA && (
            <p className="rounded-md border border-amber-400/60 bg-amber-400/10 px-2 py-0.5 text-sm font-semibold text-amber-200">
              Demo data — not for operational use
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        {/* Filtros + descarga */}
        <div className="flex flex-wrap items-center justify-between gap-2 lg:col-span-2">
          <div role="group" aria-label="Filter by probable origin" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
                  filter === f ? "border-white bg-white text-[#0d0818]" : "border-white/15 bg-[#140d24] text-slate-200 hover:border-white/40"
                }`}
              >
                {f !== "All" && <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[f].hex }} />}
                {f}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => downloadHotspotsCsv(events)}
            className="min-h-10 cursor-pointer rounded-lg border border-white/25 px-4 text-sm font-semibold hover:bg-white/10"
          >
            Download CSV
          </button>
        </div>

        {/* Lista de focos */}
        <section aria-label="Latest hotspots" className="overflow-hidden rounded-xl border border-white/15 bg-[#140d24] lg:row-span-2">
          <h2 className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-base font-bold">
            Latest hotspots <span className="text-sm font-normal text-slate-300">{events.length}</span>
          </h2>
          <ol className="divide-y divide-white/10 lg:max-h-[640px] lg:overflow-y-auto">
            {events.map((ev) => {
              const isSel = ev.id === selected?.id;
              return (
                <li key={ev.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedId(ev.id)}
                    aria-current={isSel ? "true" : undefined}
                    className={`w-full cursor-pointer border-l-4 py-3 pl-3 pr-4 text-left ${isSel ? "border-white bg-white/10" : "border-transparent hover:bg-white/5"}`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-bold">{formatAgo(ev.detectedAt, now)}</span>
                      {ev.irregularUseAlert && <span className="text-xs font-bold uppercase text-red-300">Verify</span>}
                    </span>
                    <span className="mt-0.5 block font-semibold text-slate-100">
                      {ev.municipality} · {ev.zone}
                    </span>
                    <span className="mt-1.5 flex items-center gap-2 text-sm">
                      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[ev.origin].hex }} />
                      <span className="w-24 shrink-0 text-slate-200">{ev.origin}</span>
                      <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full rounded-full" style={{ width: `${ev.probability}%`, backgroundColor: ORIGIN_COLORS[ev.origin].hex }} />
                      </span>
                      <span className="w-10 text-right font-semibold tabular-nums">{ev.probability}%</span>
                    </span>
                    <span className="mt-1 block pr-24 text-sm text-slate-400">
                      {ev.sensor} · FRP {ev.frpMw} MW
                    </span>
                  </button>
                  <a
                    href={directionsUrl(ev)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Directions to ${ev.municipality}, ${ev.zone}`}
                    className="absolute bottom-2 right-3 rounded-md px-2 py-1 text-sm font-semibold text-sky-300 hover:bg-white/10 hover:underline"
                  >
                    Directions ↗
                  </a>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Mapa + ficha del foco */}
        <section aria-label="Map" className="flex flex-col gap-3">
          <div className="h-[55vh] min-h-80 overflow-hidden rounded-xl border border-white/15 bg-[#14121f] lg:h-[460px]">
            <LazyMap events={events} stations={data.stations} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          </div>

          {selected && (
            <article className="rounded-xl border border-white/15 bg-[#140d24] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">
                    {selected.municipality} — {selected.zone}
                  </h2>
                  <p className="text-sm text-slate-300">
                    {formatAgo(selected.detectedAt, now)} · {selected.sensor} · FRP {selected.frpMw} MW · {selected.lat.toFixed(2)}, {selected.lon.toFixed(2)}
                  </p>
                </div>
                <a
                  href={directionsUrl(selected)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center rounded-lg bg-white px-3 text-sm font-bold text-[#0d0818] hover:bg-slate-200"
                >
                  Directions ↗
                </a>
              </div>
              <p className="mt-2 font-semibold" style={{ color: ORIGIN_COLORS[selected.origin].hex }}>
                Probable origin: {selected.origin} ({selected.probability}%)
              </p>
              {selected.irregularUseAlert && (
                <p className="mt-2 rounded-md border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  Possible irregular burn — requires field verification.
                </p>
              )}
              {selected.reasons.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-slate-300">
                  {selected.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </article>
          )}
        </section>

        {/* Estaciones IoT + distribución */}
        <div className="grid gap-4 md:grid-cols-2 lg:col-span-2">
          <Stations stations={data.stations} now={now} />
          <OriginBars counts={ORIGINS.map((o) => [o, data.hotspots.filter((e) => e.origin === o).length] as const)} />
        </div>

        {data.calendar && (
          <div className="lg:col-span-2">
            <CalendarHeatmap calendar={data.calendar} />
          </div>
        )}
      </main>
    </div>
  );
}

function Stations({ stations, now }: { stations: Station[]; now: number | null }) {
  return (
    <section className="rounded-xl border border-white/15 bg-[#140d24] p-4">
      <h2 className="text-base font-bold">Field stations</h2>
      <ul className="mt-2 divide-y divide-white/10">
        {stations.map((s) => {
          const r = riskFor(s.riskLevel);
          return (
            <li key={s.id} className="py-2.5">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {s.name}
                <span className="rounded px-1.5 text-xs font-bold uppercase" style={{ backgroundColor: r.bg, color: r.fg }}>
                  {r.level}
                </span>
              </p>
              <p className="mt-0.5 text-sm tabular-nums text-slate-300">
                {s.temperatureC} °C · {s.humidityPct}% RH · {s.windKmh} km/h · {s.lightningStrikes} strikes
              </p>
              <p className="text-xs text-slate-400">
                {s.id} · {formatAgo(s.recordedAt, now)} · {s.fallbackActive ? "weather backup (sensor offline)" : "field sensor"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OriginBars({ counts }: { counts: readonly (readonly [FireOrigin, number])[] }) {
  const max = Math.max(1, ...counts.map(([, n]) => n));
  return (
    <section className="rounded-xl border border-white/15 bg-[#140d24] p-4">
      <h2 className="text-base font-bold">Hotspots by probable origin</h2>
      <ul className="mt-3 space-y-2">
        {counts.map(([origin, n]) => (
          <li key={origin} className="grid grid-cols-[7rem_1fr_2.5rem] items-center gap-2 text-sm">
            <span>{origin}</span>
            <span className="h-3 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, backgroundColor: ORIGIN_COLORS[origin].hex }} />
            </span>
            <span className="text-right font-semibold tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Calendario de quema armonizado: años × meses (MODIS → VIIRS con kₘ). */
function CalendarHeatmap({ calendar }: { calendar: BurnCalendar }) {
  const max = Math.max(...calendar.rows.flatMap((r) => r.months));
  const shade = (v: number) => `rgba(249, 115, 22, ${(0.08 + 0.92 * (v / max)).toFixed(2)})`;
  const rows = [...calendar.rows].reverse();
  return (
    <section className="rounded-xl border border-white/15 bg-[#140d24] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">Harmonized burn calendar, {rows[rows.length - 1].year}–{rows[0].year}</h2>
        <p className="text-sm text-slate-300">MODIS scaled to VIIRS with monthly kₘ · darker = more activity</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-0.5 text-center text-xs tabular-nums">
          <thead>
            <tr>
              <th className="w-12" />
              {calendar.monthLabels.map((m) => (
                <th key={m} scope="col" className="font-semibold text-slate-300">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row" className="pr-1 text-right font-semibold text-slate-300">{r.year}</th>
                {r.months.map((v, i) => (
                  <td key={i} title={`${calendar.monthLabels[i]} ${r.year}: ${v}`} className="h-5 rounded-sm" style={{ backgroundColor: shade(v) }} />
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="pr-1 pt-1 text-right font-semibold text-sky-300">Median</th>
              {calendar.monthlyMedians.map((v, i) => (
                <td key={i} className="pt-1 text-sky-300">{Math.round(v)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
