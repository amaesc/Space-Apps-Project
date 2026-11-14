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
import { LITE_URL, type ModelForecast, useDashboardData, useHistoricalFires, useModelForecast, useNasaFires, useNow, useSlowConnection, useWeatherGrid } from "../lib/api";
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
import {
  CONDITIONS,
  type ConditionDef,
  type ConditionLayer,
  conditionDef,
  type FireLayers,
  historyMonths,
  monthLabel,
  SATELLITE_LAYERS,
  type SatelliteLayer,
  type SatLegend,
} from "../lib/layers";

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
  const [conditionId, setConditionId] = useState<ConditionLayer | null>(null);
  const [satellite, setSatellite] = useState<SatelliteLayer | null>(null);
  const [fire, setFire] = useState<FireLayers>({ nasa: true, history: false, probability: false, cause: true });
  const months = historyMonths();
  const [historyMonth, setHistoryMonth] = useState(months.find((m) => m.endsWith("-05")) ?? months[0]);
  const [panelPref, setPanelPref] = useState<boolean | null>(null);
  const [modal, setModal] = useState<"help" | "calendar" | null>(null);
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const mapApi = useRef<MapApi | null>(null);
  const onReady = useCallback((api: MapApi) => (mapApi.current = api), []);

  // Capas bajo demanda: cada una se descarga solo al activarla.
  const condition = conditionDef(conditionId);
  const nasa = useNasaFires(fire.nasa);
  const history = useHistoricalFires(fire.history ? historyMonth : null);
  // El modelo se carga siempre (alimenta el panel de peligro); la cuadrícula de clima, solo si hace falta.
  const model = useModelForecast(true);
  const grid = useWeatherGrid((fire.probability && !model.data) || Boolean(condition?.grid));
  const toggleFire = (k: keyof FireLayers) => setFire((f) => ({ ...f, [k]: !f[k] }));

  const panelOpen = panelPref ?? isDesktop;
  const showDisclaimer = modal === "help" || (!disclaimerSeen && !disclaimerDismissed);

  const maxMinutes = RANGES.find((r) => r.id === range)!.minutes;
  const events = data.hotspots.filter(
    (e) => (origin === "All" || e.origin === origin) && (now === null || minutesSince(e.detectedAt, now) <= maxMinutes)
  );
  const selected = events.find((e) => e.id === selectedId) ?? null;
  // Peligro: nivel más alto del modelo a 72 h; si no está disponible, el de las estacas.
  const riskLevel = model.data ? Math.max(1, ...model.data.cells.map((c) => c.level)) : Math.max(1, ...data.stations.map((s) => s.riskLevel));
  const risk = riskFor(riskLevel);
  const highCells = model.data ? model.data.cells.filter((c) => c.level >= 3).length : null;

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
          condition={condition}
          grid={grid.data}
          showProbability={fire.probability}
          forecast={model.data}
          nasaFires={fire.nasa ? nasa.data?.fires ?? null : null}
          historyFires={fire.history ? history.data : null}
          showCause={fire.cause}
          satellite={satellite}
        />

        <MapLegend condition={condition} fire={fire} historyMonth={historyMonth} satellite={satellite} forecast={model.data} />

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
              <p className="mx-3 mb-2 text-sm text-white/75">
                {model.data ? (
                  <>
                    Highest 72-h fire risk in Chihuahua (model trained on NASA FIRMS, POWER and NDVI; AUC{" "}
                    {model.data.auc.toFixed(2)}).{" "}
                    <b className="text-white">{highCells}</b> cells at High or above.{" "}
                    <button type="button" onClick={() => setFire((f) => ({ ...f, probability: true }))} className="cursor-pointer font-semibold text-fd-gold underline">
                      Show on map
                    </button>
                  </>
                ) : model.status === "loading" ? (
                  "Loading 72-h fire risk model…"
                ) : (
                  "Model unavailable: showing field station danger."
                )}
              </p>
              {IS_DEMO_DATA && <p className="mx-3 mb-3 rounded bg-fd-gold/15 px-2 py-1 text-sm text-fd-gold">Probable-cause hotspots are demo data; NASA layers and the model use real data.</p>}
            </Section>

            <Section title="Layers">
              <div className="space-y-3 px-3 py-2.5">
                <fieldset>
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-fd-gold">Fire</legend>
                  <LayerCheck checked={fire.nasa} onChange={() => toggleFire("nasa")} label="NASA active fires" hint={fire.nasa ? layerHint(nasa.status, `VIIRS NOAA-20 + NOAA-21 · last 48 h · ${nasa.data?.fires.length ?? 0} in Chihuahua · up to ~3 h delay`) : "NASA FIRMS, VIIRS 375 m, last 48 h"} swatch={<span className="h-3 w-3 rounded-full border-2 border-[#ffe066] bg-[#ff2a00]" />} />
                  <LayerCheck checked={fire.history} onChange={() => toggleFire("history")} label="Historical fires" hint={fire.history ? layerHint(history.status, `${history.data?.length ?? 0} detections in ${monthLabel(historyMonth)} · ${historyMonth < "2020-01" ? "MODIS 1 km" : "VIIRS 375 m"}`) : "NASA archive by month: MODIS 2002–, VIIRS 2020–"} swatch={<span className="h-2.5 w-2.5 rounded-full bg-[#ff9f1c]" />}>
                    <select
                      value={historyMonth}
                      onChange={(e) => setHistoryMonth(e.target.value)}
                      aria-label="Historical month"
                      className="mt-1 w-full rounded border border-white/20 bg-[#141416] px-2 py-1 text-sm"
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>{monthLabel(m)}</option>
                      ))}
                    </select>
                  </LayerCheck>
                  <LayerCheck checked={fire.probability} onChange={() => toggleFire("probability")} label="Fire probability, next 72 h (our model)" hint={model.data ? `Trained on 6 years of NASA data · AUC ${model.data.auc.toFixed(2)} · corrected by IoT stations` : layerHint(grid.status, "Model unavailable: weather index shown instead")} swatch={<span className="h-3 w-3 bg-gradient-to-r from-[#16a34a] via-[#facc15] to-[#dc2626]" />} />
                  <LayerCheck checked={fire.cause} onChange={() => toggleFire("cause")} label="Probable cause of active fires" hint="Human · lightning · wildland, with probability" swatch={<span className="h-3 w-3 rounded-full bg-[#f97316] ring-2 ring-[#38bdf8]" />} />
                </fieldset>

                <fieldset className="border-t border-white/10 pt-2.5">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-fd-gold">Field station conditions</legend>
                  <label className="flex cursor-pointer items-center gap-2 py-0.5">
                    <input type="radio" name="condition" checked={conditionId === null} onChange={() => setConditionId(null)} className="accent-[#f5c518]" />
                    None
                  </label>
                  {CONDITIONS.map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 py-0.5">
                      <input type="radio" name="condition" checked={conditionId === c.id} onChange={() => setConditionId(c.id)} className="accent-[#f5c518]" />
                      {c.label}
                      {c.grid && <span className="text-xs text-white/50">+ statewide</span>}
                    </label>
                  ))}
                  <label className="mt-1 flex cursor-pointer items-center gap-2 py-0.5 text-sm text-white/80">
                    <input type="checkbox" checked={showStations} onChange={(e) => setShowStations(e.target.checked)} className="accent-[#f5c518]" />
                    Always show station markers
                  </label>
                </fieldset>

                <fieldset className="border-t border-white/10 pt-2.5">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-fd-gold">Satellite imagery (NASA GIBS)</legend>
                  <label className="flex cursor-pointer items-center gap-2 py-0.5">
                    <input type="radio" name="satellite" checked={satellite === null} onChange={() => setSatellite(null)} className="accent-[#f5c518]" />
                    None
                  </label>
                  {SATELLITE_LAYERS.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-start gap-2 py-0.5">
                      <input type="radio" name="satellite" checked={satellite === s.id} onChange={() => setSatellite(s.id)} className="mt-1 accent-[#f5c518]" />
                      <span className="min-w-0 flex-1 leading-tight">
                        {s.label}
                        <span className="block text-xs text-white/55">{s.hint}</span>
                        <SatLegendPreview legend={s.legend} />
                      </span>
                    </label>
                  ))}
                </fieldset>

                <fieldset className="border-t border-white/10 pt-2.5">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-fd-gold">Basemap</legend>
                  {(
                    [
                      ["satellite", "Satellite imagery"],
                      ["dark", "Dark street map (lighter download)"],
                    ] as const
                  ).map(([id, label]) => (
                    <label key={id} className="flex cursor-pointer items-center gap-2 py-0.5">
                      <input type="radio" name="basemap" checked={basemap === id} onChange={() => setBasemap(id)} className="accent-[#f5c518]" />
                      {label}
                    </label>
                  ))}
                </fieldset>
              </div>
            </Section>

            <Section title={`Probable cause · hotspots (${events.length})`}>
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
  const values = calendar.rows.flatMap((r) => r.months).filter((v): v is number => v !== null);
  const max = Math.max(1, ...values);
  const shade = (v: number | null) => (v === null ? "transparent" : `rgba(245, 120, 30, ${(0.08 + 0.92 * (v / max)).toFixed(2)})`);
  const rows = [...calendar.rows].reverse();
  const real = calendar.dataSource === "nasa";
  return (
    <>
      <p className="text-sm text-white/80">
        Monthly fire detections in Chihuahua, {rows[rows.length - 1].year}–{rows[0].year}. MODIS counts are scaled to VIIRS-equivalent with
        a monthly factor kₘ. Darker = more activity.
      </p>
      <p className={`mt-2 rounded px-2 py-1 text-sm ${real ? "bg-emerald-500/15 text-emerald-200" : "bg-fd-gold/15 text-fd-gold"}`}>
        {real
          ? "Source: real NASA FIRMS detections (MODIS 2002–, VIIRS NOAA-20 2020–), kₘ fitted on the overlap with 95% bootstrap CI."
          : `Illustrative series. The real NASA calendar is being built on our server${
              calendar.realCoverage !== null ? ` (${Math.round(calendar.realCoverage * 100)}% done)` : ""
            }.`}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-0.5 text-center text-xs tabular-nums">
          <thead>
            <tr>
              <th className="w-14" />
              {calendar.monthLabels.map((m) => (
                <th key={m} scope="col" className="font-semibold text-white/80">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <th scope="row" className="pr-1 text-right font-semibold text-white/80" title={r.source}>{r.year}</th>
                {r.months.map((v, i) => (
                  <td key={i} title={v === null ? "no data" : `${calendar.monthLabels[i]} ${r.year}: ${v}`} className="h-4" style={{ backgroundColor: shade(v) }} />
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="pr-1 pt-1 text-right font-semibold text-sky-300">Median</th>
              {calendar.monthlyMedians.map((v, i) => (
                <td key={i} className="pt-1 text-sky-300">{Math.round(v)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="pr-1 text-right font-semibold text-fd-gold">kₘ</th>
              {calendar.kmFactors.map((k, i) => {
                const ci = calendar.kmCi95?.[i];
                return (
                  <td key={i} className="text-fd-gold" title={ci ? `95% CI ${ci[0]}–${ci[1]}` : undefined}>
                    {k.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function layerHint(status: string, ready: string) {
  return status === "loading" ? "Loading…" : status === "error" ? "Unavailable right now" : ready;
}

function LayerCheck({
  checked,
  onChange,
  label,
  hint,
  swatch,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
  swatch: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="py-1">
      <label className="flex cursor-pointer items-start gap-2">
        <input type="checkbox" checked={checked} onChange={onChange} className="mt-1 accent-[#f5c518]" />
        <span className="mt-1 flex w-4 shrink-0 justify-center" aria-hidden="true">{swatch}</span>
        <span className="leading-tight">
          {label}
          <span className="block text-xs text-white/55">{hint}</span>
        </span>
      </label>
      {checked && children && <div className="pl-12">{children}</div>}
    </div>
  );
}

/** Leyenda de las capas activas, sobre el mapa (abajo a la izquierda). */
function MapLegend({
  condition,
  fire,
  historyMonth,
  satellite,
  forecast,
}: {
  condition: ConditionDef | null;
  fire: FireLayers;
  historyMonth: string;
  satellite: SatelliteLayer | null;
  forecast: ModelForecast | null;
}) {
  const rows: ReactNode[] = [];
  const sat = SATELLITE_LAYERS.find((s) => s.id === satellite);
  if (sat)
    rows.push(
      <div key="sat">
        <p className="font-semibold">{sat.label}</p>
        <SatLegendView legend={sat.legend} />
      </div>
    );
  if (fire.probability) {
    rows.push(
      <div key="prob">
        <p className="font-semibold">{forecast ? "Fire probability, next 72 h" : "Fire danger (weather index)"}</p>
        {forecast ? (
          <ul className="mt-0.5 space-y-0.5">
            {forecast.levels.map((l) => (
              <li key={l.level} className="flex items-center gap-1.5">
                <span className="h-2.5 w-4" style={{ backgroundColor: RISK_SCALE[l.level - 1].bg }} />
                {l.name}
                <span className="ml-auto text-white/60">≥ {(l.minProbability * 100).toFixed(l.minProbability < 0.1 ? 1 : 0)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-0.5 flex gap-px">
            {RISK_SCALE.map((r) => (
              <span key={r.level} className="h-2.5 flex-1" style={{ backgroundColor: r.bg }} title={r.level} />
            ))}
          </div>
        )}
        {forecast && (
          <p className="mt-1 text-[11px] leading-snug text-white/70">
            Data as of: fires {forecast.dataAsOf.fires}, weather {forecast.dataAsOf.weather}. Hover a cell to see why.
          </p>
        )}
      </div>
    );
  }
  if (condition) {
    const lg = condition.legend;
    rows.push(
      <div key="cond">
        <p className="font-semibold">{condition.label}</p>
        {"stops" in lg ? (
          <>
            <span className="mt-0.5 block h-2.5" style={{ background: `linear-gradient(to right, ${lg.stops.join(",")})` }} />
            <p className="flex justify-between text-[11px] text-white/70"><span>{lg.min}</span><span>{lg.max}</span></p>
          </>
        ) : (
          <ul className="mt-0.5 flex flex-wrap gap-x-2 text-[11px]">
            {lg.items.map((i) => (
              <li key={i.label} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5" style={{ backgroundColor: i.color }} />
                {i.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  const points: [boolean, string, string][] = [
    [fire.nasa, "NASA active fire (48 h) · faded = low confidence", "h-2.5 w-2.5 rounded-full border-2 border-[#ffe066] bg-[#ff2a00]"],
    [fire.history, `Historical · ${monthLabel(historyMonth)}`, "h-2 w-2 rounded-full bg-[#ff9f1c]"],
  ];
  const active = points.filter(([on]) => on);
  if (active.length) {
    rows.push(
      <ul key="pts" className="space-y-0.5">
        {active.map(([, label, cls]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span className={cls} />
            {label}
          </li>
        ))}
      </ul>
    );
  }
  if (fire.cause) {
    rows.push(
      <ul key="cause" className="flex flex-wrap gap-x-2">
        {ORIGINS.map((o) => (
          <li key={o} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ORIGIN_COLORS[o].hex }} />
            {o}
          </li>
        ))}
      </ul>
    );
  }
  if (!rows.length) return null;
  return (
    <div
      className={`absolute bottom-[5.5rem] left-2 z-[999] max-h-[45vh] space-y-2 overflow-y-auto rounded border border-black/50 bg-fd-panel/90 px-2.5 py-2 text-xs shadow-lg md:bottom-[5.75rem] md:max-h-[60vh] ${
        sat ? "w-64" : "w-56"
      }`}
    >
      {rows}
    </div>
  );
}

/** Simbología completa de una capa satelital (leyenda del mapa). */
function SatLegendView({ legend }: { legend: SatLegend }) {
  if (legend.kind === "gradient") {
    return (
      <div className="mt-1">
        <span className="block h-3" style={{ background: `linear-gradient(to right, ${legend.stops.join(",")})` }} />
        <div className="relative mt-0.5 h-3.5 text-[10px] text-white/80">
          {legend.ticks.map((tk) => (
            <span
              key={tk.label}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${Math.min(92, Math.max(8, tk.at * 100))}%` }}
            >
              {tk.label}
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-white/70">{legend.caption}</p>
      </div>
    );
  }
  return (
    <div className="mt-1">
      <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {legend.items.map((i) => (
          <li key={i.label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 shrink-0 border border-white/30" style={{ backgroundColor: i.color }} />
            <span className="leading-tight">{i.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[11px] leading-snug text-white/70">{legend.caption}</p>
    </div>
  );
}

/** Vista previa compacta de la simbología (panel de capas). */
function SatLegendPreview({ legend }: { legend: SatLegend }) {
  if (legend.kind === "gradient") {
    const first = legend.ticks[0]?.label;
    const last = legend.ticks[legend.ticks.length - 1]?.label;
    return (
      <span className="mt-1 flex items-center gap-1.5 text-[10px] text-white/60">
        {first}
        <span className="h-2 flex-1" style={{ background: `linear-gradient(to right, ${legend.stops.join(",")})` }} />
        {last}
      </span>
    );
  }
  return (
    <span className="mt-1 flex flex-wrap gap-0.5" aria-hidden="true">
      {legend.items.map((i) => (
        <span key={i.label} title={i.label} className="h-2 w-4 border border-white/20" style={{ backgroundColor: i.color }} />
      ))}
    </span>
  );
}
