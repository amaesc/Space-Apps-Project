"use client";

import { useState } from "react";
import LazyMap from "../components/LazyMap";
import SiteHeader from "../components/SiteHeader";
import {
  directionsUrl,
  type FireOrigin,
  formatAgo,
  HOTSPOT_EVENTS,
  IS_DEMO_DATA,
  ORIGIN_COLORS,
  RISK_SCALE,
  type RiskLevel,
} from "../lib/fire-data";

type Filter = "All" | FireOrigin;
const FILTERS: Filter[] = ["All", "Human", "Lightning", "Wildland", "Undetermined"];

const RISK_LEVEL: RiskLevel = "High";

export default function MapPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedId, setSelectedId] = useState(HOTSPOT_EVENTS[0].id);

  const events = filter === "All" ? HOTSPOT_EVENTS : HOTSPOT_EVENTS.filter((e) => e.origin === filter);
  const selected = events.find((e) => e.id === selectedId) ?? events[0];
  const risk = RISK_SCALE.find((r) => r.level === RISK_LEVEL)!;
  const todayCount = HOTSPOT_EVENTS.filter((e) => e.timestamp.startsWith("Today")).length;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      {/* Estado */}
      <div className="border-b border-white/10 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 text-base">
          <p className="font-bold">
            Fire danger{" "}
            <span className="ml-1 rounded px-2 py-0.5 uppercase" style={{ backgroundColor: risk.bg, color: risk.fg }}>
              {risk.level}
            </span>
          </p>
          <p>
            <b>{todayCount}</b> hotspots today
          </p>
          <p className="text-slate-400">Updated 14:28</p>
          {IS_DEMO_DATA && <p className="text-sm font-semibold text-amber-300">Demo data</p>}
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section aria-label="Hotspots">
          {/* Filtro por origen */}
          <div role="group" aria-label="Filter by origin" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-sm font-semibold ${
                  filter === f ? "border-white bg-white text-black" : "border-white/20 text-slate-200"
                }`}
              >
                {f !== "All" && (
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[f].hex }} />
                )}
                {f}
              </button>
            ))}
          </div>

          {/* Lista */}
          <ol className="mt-3 divide-y divide-white/10 border-y border-white/10">
            {events.map((ev) => (
              <li key={ev.id} className={`flex items-center gap-3 ${ev.id === selected?.id ? "bg-white/10" : ""}`}>
                <button
                  type="button"
                  onClick={() => setSelectedId(ev.id)}
                  aria-current={ev.id === selected?.id ? "true" : undefined}
                  className="min-w-0 flex-1 cursor-pointer py-3 pl-2 text-left"
                >
                  <span className="block truncate text-base font-semibold">{ev.municipality} · {ev.zone}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-300">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[ev.origin].hex }} />
                    {formatAgo(ev)} · {ev.origin} {ev.probability}%
                  </span>
                </button>
                <a
                  href={directionsUrl(ev)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Directions to ${ev.municipality}, ${ev.zone}`}
                  className="mr-2 shrink-0 rounded-md border border-white/20 px-3 py-2 text-sm font-semibold"
                >
                  Go ↗
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Map" className="flex flex-col gap-2 md:sticky md:top-16 md:self-start">
          <div className="h-[60vh] min-h-72 overflow-hidden rounded-md border border-white/15 bg-[#14121f]">
            <LazyMap events={events} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          </div>
          {selected && (
            <p className="text-sm text-slate-300">
              <b className="text-white">{selected.municipality} — {selected.zone}</b>
              <br />
              {selected.lat}, {selected.lon} · {selected.sensor} · FRP {selected.frpMw} MW
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
