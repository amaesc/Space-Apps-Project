"use client";

import { type ReactNode, useCallback, useRef, useState, useSyncExternalStore } from "react";
import type { Basemap, MapApi } from "../components/ChihuahuaOsmMap";
import {
  CalendarIcon,
  CloseIcon,
  CloudIcon,
  DownloadIcon,
  FeatherIcon,
  FlameIcon,
  HelpIcon,
  LayersIcon,
  LocateIcon,
  ResetIcon,
  WarnIcon,
} from "../components/Icons";
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
} from "../lib/fire-data";

type Range = "24h" | "7d" | "all";
const RANGES: { id: Range; label: string; minutes: number }[] = [
  { id: "24h", label: "24HRS", minutes: 24 * 60 },
  { id: "7d", label: "7DAYS", minutes: 7 * 24 * 60 },
  { id: "all", label: "ALL", minutes: Number.POSITIVE_INFINITY },
];

const DISCLAIMER_KEY = "fd-disclaimer-ok";

// --- Estado del navegador sin setState en efectos --------------------------------
const desktopQuery = "(min-width: 768px)";
const subscribeDesktop = (cb: () => void) => {
  const mq = window.matchMedia(desktopQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useIsDesktop = () =>
  useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => true);

const readDisclaimerOk = () => {
  try {
    return localStorage.getItem(DISCLAIMER_KEY) === "1";
  } catch {
    return false;
  }
};
const noopSubscribe = () => () => {};
const useDisclaimerSeen = () => useSyncExternalStore(noopSubscribe, readDisclaimerOk, () => true);

export default function FireMapPage() {
  const data = useDashboardData();
  const slow = useSlowConnection();
  const now = useNow();
  const isDesktop = useIsDesktop();
  const disclaimerSeen = useDisclaimerSeen();

  const [range, setRange] = useState<Range>("7d");
  const [origin, setOrigin] = useState<"All" | FireOrigin>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [showStations, setShowStations] = useState(true);
  const [panelPref, setPanelPref] = useState<boolean | null>(null);
  const [modal, setModal] = useState<"help" | "calendar" | null>(null);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const mapApi = useRef<MapApi | null>(null);
  const onReady = useCallback((api: MapApi) => (mapApi.current = api), []);

  const panelOpen = panelPref ?? isDesktop;
  const showDisclaimer = modal === "help" || (!disclaimerSeen && !disclaimerDismissed);

  const maxMinutes = RANGES.find((r) => r.id === range)!.minutes;
  const events = data.hotspots.filter(
    (e) => (origin === "All" || e.origin === origin) && (now === null || minutesSince(e.detectedAt, now) <= maxMinutes)
  );
  const selected = events.find((e) => e.id === selectedId) ?? null;
  const riskLevel = Math.max(1, ...data.stations.map((s) => s.riskLevel));
  const risk = riskFor(riskLevel);

  const closeDisclaimer = (remember: boolean) => {
    if (remember) {
      try {
        localStorage.setItem(DISCLAIMER_KEY, "1");
      } catch {
        // sin almacenamiento: se mostrará de nuevo la próxima vez
      }
    }
    setDisclaimerDismissed(true);
    setModal(null);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SiteHeader />

      <div className="relative flex-1">
        <LazyMap
          events={events}
          stations={data.stations}
          showStations={showStations}
          basemap={basemap}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onReady={onReady}
        />

        {/* Avisos de conexión */}
        {(slow || data.status === "offline") && (
          <div className="absolute left-1/2 top-2 z-[1000] w-[min(92%,30rem)] -translate-x-1/2 rounded border border-black/40 bg-[#1f1f22]/95 px-3 py-2 text-center text-sm shadow-lg">
            {data.status === "offline" ? "Live data unavailable — showing demo data. " : "Slow connection detected. "}
            <a href={LITE_URL} className="font-bold text-fd-gold underline">
              Switch to Lite mode (~3 KB)
            </a>
          </div>
        )}

        {/* Celular: estado siempre visible; al tocarlo abre el panel */}
        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelPref(true)}
            className="absolute right-2 top-2 z-[1000] flex cursor-pointer items-center gap-2 rounded border border-black/50 bg-fd-panel/95 px-2.5 py-1.5 text-sm font-semibold shadow-lg md:hidden"
          >
            <span className="rounded px-1.5 uppercase" style={{ backgroundColor: risk.bg, color: risk.fg }}>
              {risk.level}
            </span>
            {events.length} hotspots ›
          </button>
        )}

        {/* Panel lateral (escritorio) / inferior (celular) */}
        {panelOpen && (
          <aside
            aria-label="Map panel"
            className="absolute inset-x-0 bottom-14 z-[1000] max-h-[55%] overflow-y-auto border-t border-black/50 bg-fd-panel/95 text-[15px] shadow-2xl md:inset-x-auto md:bottom-16 md:right-2 md:top-2 md:max-h-none md:w-[370px] md:rounded md:border"
          >
            <Section title="Fire danger" right={data.fetchedAt ? `Updated ${formatTime(data.fetchedAt)}` : data.status === "loading" ? "Loading…" : "Offline"}>
              <div className="flex items-center gap-3 px-3 py-3">
                <span className="rounded px-2.5 py-1 text-lg font-bold uppercase" style={{ backgroundColor: risk.bg, color: risk.fg }}>
                  {risk.level}
                </span>
                <ol aria-label={`Danger level ${riskLevel} of 5`} className="flex items-end gap-0.5">
                  {RISK_SCALE.map((r, i) => (
                    <li
                      key={r.level}
                      title={r.level}
                      className={`w-5 ${i + 1 === riskLevel ? "h-5 ring-2 ring-white" : "h-2.5 opacity-60"}`}
                      style={{ backgroundColor: r.bg }}
                    />
                  ))}
                </ol>
                {data.calendar && (
                  <span className="ml-auto text-right text-sm leading-tight text-white/80">
                    {data.calendar.current.month} vs median
                    <br />
                    <b className="text-white">
                      {data.calendar.current.anomalyPct > 0 ? "+" : ""}
                      {data.calendar.current.anomalyPct}%
                    </b>
                  </span>
                )}
              </div>
              {IS_DEMO_DATA && <p className="mx-3 mb-3 rounded bg-fd-gold/15 px-2 py-1 text-sm text-fd-gold">Demo data — not for operational use.</p>}
            </Section>

            <Section title={`Hotspots (${events.length})`}>
              <div className="flex items-center justify-center gap-3 px-3 pt-3">
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-pressed={range === r.id}
                    onClick={() => setRange(r.id)}
                    className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 text-xs font-bold ${
                      range === r.id ? "border-fd-gold bg-fd-gold text-black" : "border-white/30 text-white/80 hover:border-white/60"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Filter by probable origin" className="grid grid-cols-5 gap-px px-3 pt-3 text-xs">
                {(["All", ...ORIGINS] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={origin === o}
                    onClick={() => setOrigin(o)}
                    className={`flex min-h-9 cursor-pointer flex-col items-center justify-center gap-0.5 px-1 font-semibold ${
                      origin === o ? "bg-white text-black" : "bg-white/10 text-white/85 hover:bg-white/20"
                    }`}
                  >
                    {o !== "All" && <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[o].hex }} />}
                    {o === "Undetermined" ? "Undet." : o}
                  </button>
                ))}
              </div>
              <p className="px-3 pt-2 text-xs text-white/60">Circle size = intensity (FRP) · pulsing = last hour · ■ = field station</p>

              <ol className="mt-2 divide-y divide-white/10 border-t border-white/10">
                {events.length === 0 && <li className="px-3 py-4 text-sm text-white/70">No hotspots in this time range.</li>}
                {events.map((ev) => {
                  const isSel = ev.id === selected?.id;
                  return (
                    <li key={ev.id} className={isSel ? "bg-white/10" : ""}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(isSel ? null : ev.id)}
                        aria-expanded={isSel}
                        className="flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left hover:bg-white/5"
                      >
                        <span aria-hidden="true" className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[ev.origin].hex }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">
                            {ev.municipality} · {ev.zone}
                          </span>
                          <span className="block text-sm text-white/70">
                            {formatAgo(ev.detectedAt, now)} · {ev.origin} {ev.probability}% · {ev.sensor}
                          </span>
                        </span>
                        {ev.irregularUseAlert && <WarnIcon className="mt-1 h-4 w-4 shrink-0 text-red-400" />}
                      </button>
                      {isSel && (
                        <div className="px-3 pb-3 pl-8 text-sm">
                          <p className="text-white/80">
                            FRP {ev.frpMw} MW · {ev.lat.toFixed(3)}, {ev.lon.toFixed(3)}
                          </p>
                          {ev.irregularUseAlert && (
                            <p className="mt-1.5 rounded border border-red-400/50 bg-red-500/15 px-2 py-1 text-red-200">
                              Possible irregular burn — requires field verification.
                            </p>
                          )}
                          {ev.reasons.length > 0 && (
                            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-white/75">
                              {ev.reasons.map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                          )}
                          <a
                            href={directionsUrl(ev)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block rounded bg-fd-gold px-3 py-1.5 font-bold text-black hover:brightness-110"
                          >
                            Directions ↗
                          </a>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Section>

            <Section title={`Field stations (${data.stations.length})`}>
              <ul className="divide-y divide-white/10">
                {data.stations.map((s) => {
                  const r = riskFor(s.riskLevel);
                  return (
                    <li key={s.id} className="px-3 py-2.5">
                      <p className="flex items-center gap-2 font-semibold">
                        {s.name}
                        <span className="rounded px-1.5 text-xs font-bold uppercase" style={{ backgroundColor: r.bg, color: r.fg }}>
                          {r.level}
                        </span>
                      </p>
                      <p className="text-sm tabular-nums text-white/75">
                        {s.temperatureC} °C · {s.humidityPct}% RH · {s.windKmh} km/h · {s.lightningStrikes} strikes
                      </p>
                      <p className="text-xs text-white/55">
                        {s.id} · {formatAgo(s.recordedAt, now)} · {s.fallbackActive ? "weather backup" : "field sensor"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </Section>

            <Section title="Layers">
              <fieldset className="px-3 py-2.5">
                <legend className="sr-only">Basemap</legend>
                {(
                  [
                    ["satellite", "Satellite imagery"],
                    ["dark", "Dark street map (lighter download)"],
                  ] as const
                ).map(([id, label]) => (
                  <label key={id} className="flex cursor-pointer items-center gap-2 py-1">
                    <input type="radio" name="basemap" checked={basemap === id} onChange={() => setBasemap(id)} className="accent-[#f5c518]" />
                    {label}
                  </label>
                ))}
                <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-white/10 pt-2">
                  <input type="checkbox" checked={showStations} onChange={(e) => setShowStations(e.target.checked)} className="accent-[#f5c518]" />
                  Field stations (IoT)
                </label>
              </fieldset>
            </Section>
          </aside>
        )}

        {/* Barra de herramientas inferior */}
        <nav aria-label="Map tools" className="absolute inset-x-0 bottom-0 z-[1001] flex justify-center">
          <ul className="flex max-w-full overflow-x-auto border border-black/50 bg-[#1f1f22]/95 shadow-2xl md:mb-2 md:rounded">
            <Tool label="Layers" active={panelOpen} onClick={() => setPanelPref(!panelOpen)} icon={<LayersIcon />} />
            <Tool label="Location" onClick={() => mapApi.current?.locate()} icon={<LocateIcon />} />
            <Tool label="Reset" onClick={() => mapApi.current?.reset()} icon={<ResetIcon />} />
            <Tool label="Calendar" onClick={() => setModal("calendar")} icon={<CalendarIcon />} disabled={!data.calendar} />
            <Tool label="Download" onClick={() => downloadHotspotsCsv(events)} icon={<DownloadIcon />} />
            <li>
              <a href={LITE_URL} className="flex h-14 w-[3.35rem] flex-col items-center sm:w-[4.5rem] justify-center gap-0.5 text-[10px] font-semibold uppercase text-white/85 hover:bg-white/10 hover:text-fd-gold sm:text-[11px]">
                <FeatherIcon />
                Lite
              </a>
            </li>
            <Tool label="Help" onClick={() => setModal("help")} icon={<HelpIcon />} />
          </ul>
        </nav>

        {modal === "calendar" && data.calendar && (
          <Modal title="Harmonized burn calendar" onClose={() => setModal(null)} wide>
            <CalendarHeatmap calendar={data.calendar} />
          </Modal>
        )}

        {showDisclaimer && (
          <Modal title="Active fires / hotspots" onClose={() => closeDisclaimer(false)}>
            <ul className="space-y-3 text-[15px]">
              <li className="flex gap-3">
                <WarnIcon className="h-5 w-5 shrink-0 text-fd-gold" />
                Not for protecting life or property on its own. Satellite hotspots have limited accuracy; always confirm in the field.
              </li>
              <li className="flex gap-3">
                <FlameIcon className="h-5 w-5 shrink-0 text-red-400" />
                A hotspot can be a fire, hot smoke, agricultural burning or another heat source.
              </li>
              <li className="flex gap-3">
                <CloudIcon className="h-5 w-5 shrink-0 text-white/80" />
                Clouds and satellite overpass times can hide or delay detections.
              </li>
              <li className="flex gap-3">
                <HelpIcon className="h-5 w-5 shrink-0 text-sky-300" />
                The probable origin is a statistical estimate to prioritize inspections, not evidence.
              </li>
              {IS_DEMO_DATA && (
                <li className="rounded bg-fd-gold/15 px-3 py-2 font-semibold text-fd-gold">This prototype currently shows demo data.</li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => closeDisclaimer(true)}
              className="mt-5 w-full cursor-pointer rounded bg-fd-red py-2.5 text-lg font-bold text-white hover:bg-fd-red-dark"
            >
              OK, I understand
            </button>
          </Modal>
        )}
      </div>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: string; children: ReactNode }) {
  return (
    <section className="border-b border-black/40">
      <h2 className="flex items-center justify-between bg-fd-bar px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-white">
        {title}
        {right && <span className="text-xs font-normal normal-case text-white/75">{right}</span>}
      </h2>
      {children}
    </section>
  );
}

function Tool({ label, icon, onClick, active, disabled }: { label: string; icon: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={active}
        className={`flex h-14 w-[3.35rem] cursor-pointer flex-col sm:w-[4.5rem] items-center justify-center gap-0.5 text-[10px] font-semibold uppercase sm:text-[11px] disabled:cursor-not-allowed disabled:opacity-40 ${
          active ? "bg-white/15 text-fd-gold" : "text-white/85 hover:bg-white/10 hover:text-fd-gold"
        }`}
      >
        {icon}
        {label}
      </button>
    </li>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-[1200] flex items-center justify-center bg-black/55 p-3" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`max-h-full w-full overflow-y-auto rounded border border-black bg-[#141416] shadow-2xl ${wide ? "max-w-4xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between bg-gradient-to-b from-fd-red to-fd-red-dark px-4 py-2.5">
          <h2 className="text-xl font-semibold uppercase tracking-wide text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer rounded p-1 text-white hover:bg-black/25">
            <CloseIcon />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/** Calendario de quema armonizado: años × meses (MODIS → VIIRS con kₘ). */
function CalendarHeatmap({ calendar }: { calendar: BurnCalendar }) {
  const max = Math.max(...calendar.rows.flatMap((r) => r.months));
  const shade = (v: number) => `rgba(245, 120, 30, ${(0.08 + 0.92 * (v / max)).toFixed(2)})`;
  const rows = [...calendar.rows].reverse();
  return (
    <>
      <p className="text-sm text-white/75">
        Monthly hotspot activity, {rows[rows.length - 1].year}–{rows[0].year}. MODIS counts scaled to VIIRS with a monthly kₘ factor. Darker = more activity.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-0.5 text-center text-xs tabular-nums">
          <thead>
            <tr>
              <th className="w-12" />
              {calendar.monthLabels.map((m) => (
                <th key={m} scope="col" className="font-semibold text-white/80">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row" className="pr-1 text-right font-semibold text-white/80">{r.year}</th>
                {r.months.map((v, i) => (
                  <td key={i} title={`${calendar.monthLabels[i]} ${r.year}: ${v}`} className="h-4" style={{ backgroundColor: shade(v) }} />
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
    </>
  );
}
